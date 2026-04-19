import { useEffect, useMemo, useRef, useState } from 'react';
import { AmbientAudioEngine } from './ambient-audio';
import { useChronos } from './chronos-context';
import {
  CustomBlockOutcome,
  CustomScheduleBlock,
  CustomStage,
  ScheduleMode,
  SESSION_LABELS,
  formatClock,
} from './focus-session-shared';
import { useSpotifyPlayback } from './use-spotify-playback';
import { FocusSession, FocusSessionInput, SessionType } from '../types';

const CUSTOM_TRANSITION_SECONDS = 3;
const CUSTOM_TRANSITION_DUCK_FACTOR = 0.25;
const CUSTOM_TRANSITION_DUCK_ATTACK_MS = 120;
const CUSTOM_TRANSITION_DUCK_RELEASE_MS = 180;

function getPresetMinutes(
  type: SessionType,
  focusMinutes: number,
  shortBreakMinutes: number,
  longBreakMinutes: number,
) {
  if (type === 'POMODORO') {
    return focusMinutes;
  }
  if (type === 'SHORT_BREAK') {
    return shortBreakMinutes;
  }
  return longBreakMinutes;
}

function getPresetSeconds(
  type: SessionType,
  focusMinutes: number,
  shortBreakMinutes: number,
  longBreakMinutes: number,
) {
  return getPresetMinutes(type, focusMinutes, shortBreakMinutes, longBreakMinutes) * 60;
}

function buildClassicPomodoroPreset(
  focusMinutes: number,
  shortBreakMinutes: number,
  longBreakMinutes: number,
): CustomScheduleBlock[] {
  return [
    { id: 1, type: 'POMODORO', durationMinutes: focusMinutes },
    { id: 2, type: 'SHORT_BREAK', durationMinutes: shortBreakMinutes },
    { id: 3, type: 'POMODORO', durationMinutes: focusMinutes },
    { id: 4, type: 'SHORT_BREAK', durationMinutes: shortBreakMinutes },
    { id: 5, type: 'POMODORO', durationMinutes: focusMinutes },
    { id: 6, type: 'SHORT_BREAK', durationMinutes: shortBreakMinutes },
    { id: 7, type: 'POMODORO', durationMinutes: focusMinutes },
    { id: 8, type: 'LONG_BREAK', durationMinutes: longBreakMinutes },
  ];
}

function getSessionTimestamp(session: FocusSession) {
  return session.lastResumedAt ?? session.startedAt ?? session.createdAt;
}

function getRecoverableSession(sessions: FocusSession[]) {
  return [...sessions]
    .filter((session) => session.status === 'RUNNING' || session.status === 'PAUSED')
    .sort((left, right) => Number(new Date(getSessionTimestamp(right))) - Number(new Date(getSessionTimestamp(left))))[0];
}

function getSessionSecondsLeft(session: FocusSession) {
  if (session.status !== 'RUNNING' || !session.lastResumedAt) {
    return session.remainingSeconds;
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(session.lastResumedAt).getTime()) / 1000),
  );

  return Math.max(0, session.remainingSeconds - elapsedSeconds);
}

function buildSessionPayload(session: FocusSession, status: FocusSession['status']): FocusSessionInput {
  return {
    goalId: session.goalId,
    taskId: session.taskId,
    type: session.type,
    status,
    durationMinutes: session.durationMinutes,
    scheduledFor: session.scheduledFor,
  };
}

function shouldPlayAmbient(type: SessionType, scope: 'FOCUS_ONLY' | 'ALL_SESSIONS') {
  return scope === 'ALL_SESSIONS' || type === 'POMODORO';
}

function getRoundedWorkedMinutes(plannedMinutes: number, secondsLeft: number) {
  const plannedSeconds = plannedMinutes * 60;
  const elapsedSeconds = Math.max(0, plannedSeconds - Math.max(0, secondsLeft));
  return Math.max(0, Math.round(elapsedSeconds / 60));
}

function isPomodoro(type: SessionType) {
  return type === 'POMODORO';
}

export function useFocusSessionController() {
  const {
    goals,
    tasks,
    settings,
    sessions,
    focusAudio,
    integrations,
    isGuest,
    createSession,
    updateSession,
    completeSession,
    deleteSession,
    updateFocusAudio,
    startIntegrationConnect,
    refreshIntegrationToken,
    showError,
  } = useChronos();

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('SINGLE');
  const [selectedType, setSelectedType] = useState<SessionType>('POMODORO');
  const [selectedGoalId, setSelectedGoalId] = useState<number | ''>('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60);
  const [customStage, setCustomStage] = useState<CustomStage>('BUILDER');
  const [customBlocks, setCustomBlocks] = useState<CustomScheduleBlock[]>([]);
  const [customActiveIndex, setCustomActiveIndex] = useState(0);
  const [customSecondsLeft, setCustomSecondsLeft] = useState(0);
  const [customIsRunning, setCustomIsRunning] = useState(false);
  const [customCompletionPending, setCustomCompletionPending] = useState(false);
  const [isSavingCustomBlock, setIsSavingCustomBlock] = useState(false);
  const [customBlockOutcomes, setCustomBlockOutcomes] = useState<Record<number, CustomBlockOutcome>>({});
  const [transitionSecondsLeft, setTransitionSecondsLeft] = useState(0);
  const [transitionFromBlock, setTransitionFromBlock] = useState<CustomScheduleBlock | null>(null);
  const [transitionToBlock, setTransitionToBlock] = useState<CustomScheduleBlock | null>(null);
  const ambientAudioRef = useRef<AmbientAudioEngine | null>(null);
  const autoCompletingSessionId = useRef<number | null>(null);
  const nextCustomBlockId = useRef(1);
  const customResumeBaseSecondsRef = useRef(0);
  const customLastResumedAtRef = useRef<number | null>(null);
  const customBlockStartedAtRef = useRef<string | null>(null);
  const transitionIntervalIdRef = useRef<number | null>(null);
  const transitionTargetIndexRef = useRef<number | null>(null);

  const activeSession = activeSessionId === null
    ? null
    : sessions.find((session) => session.id === activeSessionId) ?? null;
  const recoverableSession = useMemo(() => getRecoverableSession(sessions), [sessions]);
  const hasRecoverableSession = recoverableSession !== undefined;
  const customActiveBlock = customBlocks[customActiveIndex] ?? null;
  const flowActiveBlock = customStage === 'TRANSITION' ? transitionFromBlock : customActiveBlock;
  const linkedTasks = selectedGoalId === ''
    ? tasks
    : tasks.filter((task) => task.goalId === Number(selectedGoalId));
  const customTotalMinutes = customBlocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  const customCompletedCount = Object.keys(customBlockOutcomes).length;
  const isTransitioning = scheduleMode === 'CUSTOM' && customStage === 'TRANSITION';
  const remainingBlocksCount = customBlocks.length === 0
    ? 0
    : isTransitioning
      ? Math.max(0, customBlocks.length - customCompletedCount)
      : Math.max(0, customBlocks.length - customCompletedCount - (customActiveBlock ? 1 : 0));
  const latestSessions = sessions.slice(0, 5);
  const spotifyIntegration = integrations.find((integration) => integration.provider === 'SPOTIFY') ?? null;
  const isCustomBuilderView = scheduleMode === 'CUSTOM' && customStage === 'BUILDER';
  const isCustomRunningView = scheduleMode === 'CUSTOM' && customStage !== 'BUILDER';
  const hasLockedLinking = Boolean(activeSession) || isCustomRunningView || isSavingCustomBlock || customCompletionPending;
  const canSwitchMode = !activeSession && customStage === 'BUILDER' && !isSavingCustomBlock && !customCompletionPending;
  const flowCurrentBlockNumber = isTransitioning
    ? (transitionTargetIndexRef.current ?? customActiveIndex) + 1
    : customActiveBlock
      ? customActiveIndex + 1
      : 0;
  const flowNextBlock = isTransitioning
    ? transitionToBlock
    : customBlocks[customActiveIndex + 1] ?? null;
  const currentTimerSeconds = isTransitioning
    ? transitionSecondsLeft
    : isCustomRunningView
      ? customSecondsLeft
      : secondsLeft;
  const totalTimerSeconds = isTransitioning
    ? CUSTOM_TRANSITION_SECONDS
    : isCustomRunningView && flowActiveBlock
      ? Math.max(60, flowActiveBlock.durationMinutes * 60)
      : getPresetSeconds(selectedType, settings.focusMinutes, settings.shortBreakMinutes, settings.longBreakMinutes);
  const timerLabel = isTransitioning
    ? 'Starting next block'
    : isCustomRunningView
      ? flowActiveBlock
        ? SESSION_LABELS[flowActiveBlock.type]
        : 'Custom flow'
      : SESSION_LABELS[selectedType];
  const currentTimerDisplay = formatClock(currentTimerSeconds);
  const timerSubLabel = isTransitioning
    ? (transitionToBlock ? SESSION_LABELS[transitionToBlock.type] : 'Preparing')
    : isCustomRunningView
      ? customCompletionPending
        ? 'Finishing block'
        : customActiveBlock
          ? `${flowCurrentBlockNumber} of ${customBlocks.length}`
          : 'Flow complete'
      : activeSession
        ? 'Remaining'
        : 'Ready';
  const activeSessionAudioType = scheduleMode === 'CUSTOM'
    ? customStage === 'TRANSITION'
      ? transitionFromBlock?.type ?? null
      : customIsRunning
        ? customActiveBlock?.type ?? null
        : null
    : isRunning
      ? activeSession?.type ?? selectedType
      : null;
  const spotify = useSpotifyPlayback({
    integration: spotifyIntegration,
    focusAudio,
    activeSessionType: activeSessionAudioType,
    updateFocusAudio,
    refreshIntegrationToken,
    showError,
  });

  useEffect(() => {
    ambientAudioRef.current = new AmbientAudioEngine();
    return () => {
      if (transitionIntervalIdRef.current !== null) {
        window.clearInterval(transitionIntervalIdRef.current);
        transitionIntervalIdRef.current = null;
      }
      ambientAudioRef.current?.destroy();
      ambientAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeSession && scheduleMode === 'SINGLE') {
      setSecondsLeft(getPresetSeconds(
        selectedType,
        settings.focusMinutes,
        settings.shortBreakMinutes,
        settings.longBreakMinutes,
      ));
    }
  }, [activeSession, scheduleMode, selectedType, settings.focusMinutes, settings.longBreakMinutes, settings.shortBreakMinutes]);

  useEffect(() => {
    if (!recoverableSession) {
      autoCompletingSessionId.current = null;
      setActiveSessionId(null);
      setIsRunning(false);
      return;
    }

    const nextSeconds = getSessionSecondsLeft(recoverableSession);
    if (recoverableSession.status === 'RUNNING' && nextSeconds <= 0) {
      if (autoCompletingSessionId.current !== recoverableSession.id) {
        autoCompletingSessionId.current = recoverableSession.id;
        void handleCompleteSingle(recoverableSession.id);
      }
      return;
    }

    autoCompletingSessionId.current = null;
    setScheduleMode('SINGLE');
    restoreCustomBuilder(customBlocks, true);
    setActiveSessionId(recoverableSession.id);
    setSelectedType(recoverableSession.type);
    setSelectedGoalId(recoverableSession.goalId ?? '');
    setSelectedTaskId(recoverableSession.taskId ?? '');
    setSecondsLeft(nextSeconds);
    setIsRunning(recoverableSession.status === 'RUNNING');
  }, [recoverableSession]);

  useEffect(() => {
    if (!isRunning || !activeSession) {
      return;
    }

    const timer = window.setInterval(() => {
      const nextSeconds = getSessionSecondsLeft(activeSession);

      if (nextSeconds <= 0) {
        window.clearInterval(timer);
        setSecondsLeft(0);
        void handleCompleteSingle(activeSession.id);
        return;
      }

      setSecondsLeft(nextSeconds);
    }, 250);

    return () => window.clearInterval(timer);
  }, [activeSession, isRunning]);

  useEffect(() => {
    if (!customIsRunning || !customActiveBlock) {
      return;
    }

    const timer = window.setInterval(() => {
      const nextSeconds = getCurrentCustomSecondsLeft();

      if (nextSeconds <= 0) {
        window.clearInterval(timer);
        setCustomSecondsLeft(0);
        void finalizeCustomBlock();
        return;
      }

      setCustomSecondsLeft(nextSeconds);
    }, 250);

    return () => window.clearInterval(timer);
  }, [customActiveBlock, customCompletionPending, customIsRunning]);

  useEffect(() => {
    const shouldPlay = Boolean(
      activeSessionAudioType
      && focusAudio.soundEnabled
      && focusAudio.ambientSound !== 'NONE'
      && shouldPlayAmbient(activeSessionAudioType, focusAudio.audioScope),
    );

    if (!shouldPlay) {
      ambientAudioRef.current?.stop();
      return;
    }

    void ambientAudioRef.current?.play(focusAudio.ambientSound, focusAudio.ambientVolume);
  }, [
    activeSessionAudioType,
    customActiveBlock?.type,
    customIsRunning,
    focusAudio.ambientSound,
    focusAudio.ambientVolume,
    focusAudio.audioScope,
    focusAudio.soundEnabled,
    isRunning,
    scheduleMode,
    transitionFromBlock?.type,
    customStage,
  ]);

  function getCurrentCustomSecondsLeft() {
    if (!customIsRunning || customLastResumedAtRef.current === null) {
      return customSecondsLeft;
    }

    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - customLastResumedAtRef.current) / 1000),
    );

    return Math.max(0, customResumeBaseSecondsRef.current - elapsedSeconds);
  }

  function clearTransitionCountdown() {
    if (transitionIntervalIdRef.current !== null) {
      window.clearInterval(transitionIntervalIdRef.current);
      transitionIntervalIdRef.current = null;
    }
  }

  function clearTransitionState() {
    clearTransitionCountdown();
    transitionTargetIndexRef.current = null;
    setTransitionSecondsLeft(0);
    setTransitionFromBlock(null);
    setTransitionToBlock(null);
  }

  function stopTransitionAudio(restoreAmbient = true) {
    ambientAudioRef.current?.stopTransitionCues();
    if (restoreAmbient) {
      ambientAudioRef.current?.restoreAmbient(CUSTOM_TRANSITION_DUCK_RELEASE_MS);
    }
  }

  function resetCustomRuntime(clearOutcomes: boolean) {
    stopTransitionAudio();
    clearTransitionState();
    setCustomStage('BUILDER');
    setCustomActiveIndex(0);
    setCustomSecondsLeft(0);
    setCustomIsRunning(false);
    setCustomCompletionPending(false);
    setIsSavingCustomBlock(false);
    customResumeBaseSecondsRef.current = 0;
    customLastResumedAtRef.current = null;
    customBlockStartedAtRef.current = null;
    if (clearOutcomes) {
      setCustomBlockOutcomes({});
    }
  }

  function restoreCustomBuilder(nextBlocks = customBlocks, clearOutcomes = true) {
    setCustomBlocks(nextBlocks);
    resetCustomRuntime(clearOutcomes);
  }

  function getDefaultBlockMinutes(type: SessionType) {
    return getPresetMinutes(
      type,
      settings.focusMinutes,
      settings.shortBreakMinutes,
      settings.longBreakMinutes,
    );
  }

  function createCustomBlock(type: SessionType, durationMinutes = getDefaultBlockMinutes(type)): CustomScheduleBlock {
    const nextId = nextCustomBlockId.current;
    nextCustomBlockId.current += 1;
    return {
      id: nextId,
      type,
      durationMinutes: Math.max(1, durationMinutes),
    };
  }

  function primeAmbient() {
    return ambientAudioRef.current?.prime() ?? Promise.resolve();
  }

  function playSessionStartCue() {
    if (!focusAudio.soundEnabled) {
      return;
    }

    ambientAudioRef.current?.playSessionStartCue();
  }

  function playSessionCompleteCue() {
    if (!focusAudio.soundEnabled) {
      return;
    }

    ambientAudioRef.current?.playSessionCompleteCue();
  }

  function startCustomTransition(fromBlock: CustomScheduleBlock, nextIndex: number) {
    const nextBlock = customBlocks[nextIndex];
    if (!nextBlock) {
      restoreCustomBuilder(customBlocks, true);
      return;
    }

    stopTransitionAudio(false);
    clearTransitionState();

    transitionTargetIndexRef.current = nextIndex;
    setCustomStage('TRANSITION');
    setCustomIsRunning(false);
    setCustomCompletionPending(false);
    setCustomSecondsLeft(0);
    setTransitionFromBlock(fromBlock);
    setTransitionToBlock(nextBlock);
    setTransitionSecondsLeft(CUSTOM_TRANSITION_SECONDS);

    if (focusAudio.soundEnabled) {
      ambientAudioRef.current?.duckAmbient(CUSTOM_TRANSITION_DUCK_FACTOR, CUSTOM_TRANSITION_DUCK_ATTACK_MS);
      ambientAudioRef.current?.playBlockTransitionCue();
      ambientAudioRef.current?.playCountdownTick(3);
    }

    let remaining = CUSTOM_TRANSITION_SECONDS;
    transitionIntervalIdRef.current = window.setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        clearTransitionCountdown();
        const targetIndex = transitionTargetIndexRef.current;
        const shouldKeepAmbientAfterTransition = Boolean(
          focusAudio.soundEnabled
          && focusAudio.ambientSound !== 'NONE'
          && shouldPlayAmbient(nextBlock.type, focusAudio.audioScope),
        );
        if (shouldKeepAmbientAfterTransition) {
          ambientAudioRef.current?.stopTransitionCues();
          ambientAudioRef.current?.restoreAmbient(CUSTOM_TRANSITION_DUCK_RELEASE_MS);
        } else {
          ambientAudioRef.current?.stop();
        }
        clearTransitionState();

        if (typeof targetIndex === 'number') {
          beginCustomBlock(targetIndex, true, true);
          return;
        }

        restoreCustomBuilder(customBlocks, true);
        return;
      }

      setTransitionSecondsLeft(remaining);
      if (focusAudio.soundEnabled && (remaining === 2 || remaining === 1)) {
        ambientAudioRef.current?.playCountdownTick(remaining);
      }
    }, 1000);
  }

  function beginCustomBlock(index: number, autoStart: boolean, playStartCueOnLaunch = false) {
    const block = customBlocks[index];
    if (!block) {
      restoreCustomBuilder(customBlocks, true);
      return;
    }

    const plannedSeconds = Math.max(60, block.durationMinutes * 60);
    setCustomStage('RUNNING');
    setCustomActiveIndex(index);
    setCustomSecondsLeft(plannedSeconds);
    setCustomCompletionPending(false);
    customResumeBaseSecondsRef.current = plannedSeconds;
    customLastResumedAtRef.current = autoStart ? Date.now() : null;
    customBlockStartedAtRef.current = new Date().toISOString();
    setCustomIsRunning(autoStart);

    if (autoStart && playStartCueOnLaunch) {
      playSessionStartCue();
    }
  }

  function handleInsertCustomBlock(insertIndex: number, type: SessionType) {
    const nextBlocks = [...customBlocks];
    nextBlocks.splice(insertIndex, 0, createCustomBlock(type));
    setCustomBlocks(nextBlocks);
  }

  function handleReorderCustomBlock(blockId: number, insertIndex: number) {
    setCustomBlocks((current) => {
      const sourceIndex = current.findIndex((block) => block.id === blockId);
      if (sourceIndex === -1) {
        return current;
      }

      const boundedInsertIndex = Math.max(0, Math.min(insertIndex, current.length));
      const targetIndex = boundedInsertIndex > sourceIndex ? boundedInsertIndex - 1 : boundedInsertIndex;
      if (targetIndex === sourceIndex) {
        return current;
      }

      const nextBlocks = [...current];
      const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
      nextBlocks.splice(targetIndex, 0, movedBlock);
      return nextBlocks;
    });
  }

  function handleUpdateCustomBlock(id: number, patch: Partial<Pick<CustomScheduleBlock, 'type' | 'durationMinutes'>>) {
    setCustomBlocks((current) => current.map((block) => (
      block.id === id
        ? {
            ...block,
            ...patch,
            durationMinutes: Math.max(1, patch.durationMinutes ?? block.durationMinutes),
          }
        : block
    )));
  }

  function handleDeleteCustomBlock(id: number) {
    setCustomBlocks((current) => current.filter((block) => block.id !== id));
  }

  function handleLoadClassicPomodoro() {
    const preset = buildClassicPomodoroPreset(
      settings.focusMinutes,
      settings.shortBreakMinutes,
      settings.longBreakMinutes,
    ).map((block) => createCustomBlock(block.type, block.durationMinutes));
    restoreCustomBuilder(preset, true);
  }

  function buildCustomSessionPayload(
    block: CustomScheduleBlock,
    status: 'COMPLETED' | 'SKIPPED',
    durationMinutes: number,
  ): FocusSessionInput {
    const isFocusBlock = isPomodoro(block.type);

    return {
      goalId: isFocusBlock ? (selectedGoalId === '' ? null : Number(selectedGoalId)) : null,
      taskId: isFocusBlock ? (selectedTaskId === '' ? null : Number(selectedTaskId)) : null,
      type: block.type,
      status,
      durationMinutes,
      scheduledFor: customBlockStartedAtRef.current ?? new Date().toISOString(),
    };
  }

  async function persistCustomBlock(
    block: CustomScheduleBlock,
    outcome: CustomBlockOutcome,
    runtimeSecondsLeft = customSecondsLeft,
  ) {
    if (!isPomodoro(block.type)) {
      return true;
    }

    const creditedMinutes = outcome === 'DONE'
      ? block.durationMinutes
      : getRoundedWorkedMinutes(block.durationMinutes, runtimeSecondsLeft);

    if (creditedMinutes <= 0) {
      return true;
    }

    setIsSavingCustomBlock(true);
    try {
      await createSession(buildCustomSessionPayload(
        block,
        outcome === 'DONE' ? 'COMPLETED' : 'SKIPPED',
        creditedMinutes,
      ));
      return true;
    } catch {
      return false;
    } finally {
      setIsSavingCustomBlock(false);
    }
  }

  function advanceCustomFlow(outcome: CustomBlockOutcome) {
    if (!customActiveBlock) {
      restoreCustomBuilder(customBlocks, true);
      return;
    }

    const completedBlock = customActiveBlock;

    setCustomBlockOutcomes((current) => ({
      ...current,
      [completedBlock.id]: outcome,
    }));

    const nextIndex = customActiveIndex + 1;
    if (nextIndex >= customBlocks.length) {
      restoreCustomBuilder(customBlocks, true);
      playSessionCompleteCue();
      return;
    }

    startCustomTransition(completedBlock, nextIndex);
  }

  async function finalizeCustomBlock() {
    if (!customActiveBlock || customCompletionPending) {
      return;
    }

    setCustomCompletionPending(true);
    setCustomIsRunning(false);
    customLastResumedAtRef.current = null;
    customResumeBaseSecondsRef.current = 0;

    const persisted = await persistCustomBlock(customActiveBlock, 'DONE');
    if (!persisted) {
      setCustomCompletionPending(false);
      return;
    }

    setCustomCompletionPending(false);
    advanceCustomFlow('DONE');
  }

  async function handleCustomSkip() {
    if (!customActiveBlock || isSavingCustomBlock || customCompletionPending || customStage === 'TRANSITION') {
      return;
    }

    const liveSecondsLeft = getCurrentCustomSecondsLeft();
    if (liveSecondsLeft <= 0) {
      return;
    }

    setCustomSecondsLeft(liveSecondsLeft);
    setCustomIsRunning(false);
    customLastResumedAtRef.current = null;
    customResumeBaseSecondsRef.current = 0;

    const persisted = await persistCustomBlock(customActiveBlock, 'SKIPPED', liveSecondsLeft);
    if (!persisted) {
      return;
    }

    advanceCustomFlow('SKIPPED');
  }

  async function handleCustomStartFlow() {
    if (customBlocks.length === 0 || hasRecoverableSession || isSavingCustomBlock) {
      return;
    }

    await primeAmbient();
    setCustomBlockOutcomes({});
    beginCustomBlock(0, true, true);
  }

  async function handleCustomRunnerStart() {
    if (!customActiveBlock || isSavingCustomBlock || customStage === 'TRANSITION') {
      return;
    }

    await primeAmbient();

    if (customSecondsLeft <= 0 || customCompletionPending) {
      await finalizeCustomBlock();
      return;
    }

    customResumeBaseSecondsRef.current = customSecondsLeft;
    customLastResumedAtRef.current = Date.now();
    if (!customBlockStartedAtRef.current) {
      customBlockStartedAtRef.current = new Date().toISOString();
    }
    setCustomIsRunning(true);
    setCustomCompletionPending(false);
  }

  function handleCustomPause() {
    if (customStage === 'TRANSITION') {
      return;
    }

    const liveSecondsLeft = getCurrentCustomSecondsLeft();
    setCustomSecondsLeft(liveSecondsLeft);
    setCustomIsRunning(false);
    customResumeBaseSecondsRef.current = liveSecondsLeft;
    customLastResumedAtRef.current = null;
  }

  function handleCustomReset() {
    restoreCustomBuilder(customBlocks, true);
  }

  async function handleStartSingle() {
    await primeAmbient();

    if (activeSession) {
      await updateSession(activeSession.id, buildSessionPayload(activeSession, 'RUNNING'));
      setIsRunning(true);
      return;
    }

    const durationMinutes = Math.max(1, Math.ceil(secondsLeft / 60));
    const createdSession = await createSession({
      goalId: selectedGoalId === '' ? null : Number(selectedGoalId),
      taskId: selectedTaskId === '' ? null : Number(selectedTaskId),
      type: selectedType,
      status: 'RUNNING',
      durationMinutes,
      scheduledFor: new Date().toISOString(),
    });

    setActiveSessionId(createdSession?.id ?? null);
    setIsRunning(true);
    if (createdSession) {
      playSessionStartCue();
    }
  }

  async function handlePauseSingle() {
    if (!activeSession) {
      return;
    }

    setIsRunning(false);
    await updateSession(activeSession.id, buildSessionPayload(activeSession, 'PAUSED'));
  }

  async function handleCompleteSingle(sessionId = activeSessionId) {
    if (!sessionId) {
      return;
    }

    setIsRunning(false);
    await completeSession(sessionId);
    setActiveSessionId(null);
    playSessionCompleteCue();
  }

  async function handleResetSingle(nextType = selectedType) {
    setIsRunning(false);
    if (activeSessionId) {
      await deleteSession(activeSessionId);
      setActiveSessionId(null);
    }

    setSecondsLeft(getPresetSeconds(
      nextType,
      settings.focusMinutes,
      settings.shortBreakMinutes,
      settings.longBreakMinutes,
    ));
  }

  async function handleSelectType(type: SessionType) {
    if (type === selectedType && !activeSession) {
      return;
    }

    if (activeSession) {
      await handleResetSingle(type);
    }

    setSelectedType(type);
  }

  async function handleSwitchMode(nextMode: ScheduleMode) {
    if (scheduleMode === nextMode || !canSwitchMode) {
      return;
    }

    setScheduleMode(nextMode);
    if (nextMode === 'SINGLE') {
      restoreCustomBuilder(customBlocks, true);
      return;
    }

    await handleResetSingle();
  }

  function handleSelectGoal(value: number | '') {
    setSelectedGoalId(value);
    setSelectedTaskId('');
  }

  function handleSelectTask(value: number | '') {
    setSelectedTaskId(value);
  }

  async function handleSpotifyConnect() {
    if (isGuest) {
      return;
    }

    const redirectUrl = await startIntegrationConnect('SPOTIFY');
    if (redirectUrl) {
      window.location.assign(redirectUrl);
    }
  }

  const customProgressList = customBlocks.map((block, index) => {
    const outcome = customBlockOutcomes[block.id];
    const isCurrent = customActiveBlock?.id === block.id;
    const statusLabel = outcome === 'DONE'
      ? 'Done'
      : outcome === 'SKIPPED'
        ? 'Skipped'
        : isCurrent
          ? 'Current'
          : index > customActiveIndex
            ? 'Next'
            : 'Ready';

    return { block, index, statusLabel, isCurrent };
  });

  return {
    goals,
    linkedTasks,
    latestSessions,
    focusAudio,
    isGuest,
    spotifyIntegration,
    spotify,
    scheduleMode,
    selectedType,
    selectedGoalId,
    selectedTaskId,
    isRunning,
    hasRecoverableSession,
    hasLockedLinking,
    canSwitchMode,
    isCustomBuilderView,
    isCustomRunningView,
    currentTimerSeconds,
    totalTimerSeconds,
    currentTimerDisplay,
    timerLabel,
    timerSubLabel,
    updateFocusAudio,
    handleSpotifyConnect,
    handleSwitchMode,
    handleSelectGoal,
    handleSelectTask,
    singleSession: {
      onSelectType: handleSelectType,
      onStart: handleStartSingle,
      onPause: handlePauseSingle,
      onReset: handleResetSingle,
    },
    customFlow: {
      stage: customStage,
      blocks: customBlocks,
      activeBlock: flowActiveBlock,
      activeIndex: customActiveIndex,
      secondsLeft: customSecondsLeft,
      isRunning: customIsRunning,
      isTransitioning,
      completionPending: customCompletionPending,
      isSavingBlock: isSavingCustomBlock,
      totalMinutes: customTotalMinutes,
      currentBlockNumber: flowCurrentBlockNumber,
      nextBlock: flowNextBlock,
      transitionSecondsLeft,
      transitionFromBlock,
      transitionToBlock,
      remainingBlocksCount,
      outcomes: customBlockOutcomes,
      progressList: customProgressList,
      onInsertBlock: handleInsertCustomBlock,
      onReorderBlock: handleReorderCustomBlock,
      onUpdateBlock: handleUpdateCustomBlock,
      onDeleteBlock: handleDeleteCustomBlock,
      onLoadClassicPomodoro: handleLoadClassicPomodoro,
      onStartFlow: handleCustomStartFlow,
      onRunnerStart: handleCustomRunnerStart,
      onPause: handleCustomPause,
      onReset: handleCustomReset,
      onSkip: handleCustomSkip,
    },
  };
}

export type FocusSessionController = ReturnType<typeof useFocusSessionController>;
