import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Panel } from '../components/shared/Panel';
import { useChronos } from '../lib/chronos-context';
import { FocusSession, FocusSessionInput, IntegrationAccount, SessionType } from '../types';

const SESSION_LABELS: Record<SessionType, string> = {
  POMODORO: 'Pomodoro',
  SHORT_BREAK: 'Short Break',
  LONG_BREAK: 'Long Break',
};

function getPresetSeconds(type: SessionType, focusMinutes: number, shortBreakMinutes: number, longBreakMinutes: number) {
  if (type === 'POMODORO') {
    return focusMinutes * 60;
  }
  if (type === 'SHORT_BREAK') {
    return shortBreakMinutes * 60;
  }
  return longBreakMinutes * 60;
}

function getActiveSessionTimestamp(session: FocusSession) {
  return session.lastResumedAt ?? session.startedAt ?? session.createdAt;
}

function getRecoverableSession(sessions: FocusSession[]) {
  return [...sessions]
    .filter((session) => session.status === 'RUNNING' || session.status === 'PAUSED')
    .sort((a, b) => Number(new Date(getActiveSessionTimestamp(b))) - Number(new Date(getActiveSessionTimestamp(a))))[0];
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

function getSpotifyConfig(integration: IntegrationAccount | null) {
  return {
    selectedPlaylistUri: typeof integration?.config.selectedPlaylistUri === 'string' ? integration.config.selectedPlaylistUri : '',
    selectedPlaylistName: typeof integration?.config.selectedPlaylistName === 'string' ? integration.config.selectedPlaylistName : '',
    spotifyVolume: typeof integration?.config.spotifyVolume === 'number' ? integration.config.spotifyVolume : 70,
  };
}

export function FocusPage() {
  const {
    goals,
    tasks,
    settings,
    sessions,
    integrations,
    createSession,
    updateSession,
    completeSession,
    deleteSession,
    updateIntegrationConfig,
    refreshIntegrationToken,
  } = useChronos();
  const [selectedType, setSelectedType] = useState<SessionType>('POMODORO');
  const [selectedGoalId, setSelectedGoalId] = useState<number | ''>('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60);
  const [spotifyConfig, setSpotifyConfig] = useState(getSpotifyConfig(null));
  const autoCompletingSessionId = useRef<number | null>(null);
  const hasActiveSession = activeSessionId !== null;
  const activeSession = activeSessionId === null ? null : sessions.find((session) => session.id === activeSessionId) ?? null;
  const spotifyIntegration = integrations.find((integration) => integration.provider === 'SPOTIFY') ?? null;

  useEffect(() => {
    if (!hasActiveSession) {
      setSecondsLeft(getPresetSeconds(
        selectedType,
        settings.focusMinutes,
        settings.shortBreakMinutes,
        settings.longBreakMinutes,
      ));
    }
  }, [selectedType, settings, hasActiveSession]);

  useEffect(() => {
    setSpotifyConfig(getSpotifyConfig(spotifyIntegration));
  }, [spotifyIntegration]);

  useEffect(() => {
    if (!isRunning || !activeSession) {
      return;
    }

    const timer = window.setInterval(() => {
      const nextSecondsLeft = getSessionSecondsLeft(activeSession);

      if (nextSecondsLeft <= 0) {
        window.clearInterval(timer);
        setSecondsLeft(0);
        void handleComplete(activeSession.id);
        return;
      }

      setSecondsLeft(nextSecondsLeft);
    }, 250);

    return () => window.clearInterval(timer);
  }, [isRunning, activeSession]);

  useEffect(() => {
    const recoverableSession = getRecoverableSession(sessions);

    if (!recoverableSession) {
      autoCompletingSessionId.current = null;
      setActiveSessionId(null);
      setIsRunning(false);
      return;
    }

    const nextSecondsLeft = getSessionSecondsLeft(recoverableSession);
    if (recoverableSession.status === 'RUNNING' && nextSecondsLeft <= 0) {
      if (autoCompletingSessionId.current !== recoverableSession.id) {
        autoCompletingSessionId.current = recoverableSession.id;
        void handleComplete(recoverableSession.id);
      }
      return;
    }

    autoCompletingSessionId.current = null;
    setActiveSessionId(recoverableSession.id);
    setSelectedType(recoverableSession.type);
    setSelectedGoalId(recoverableSession.goalId ?? '');
    setSelectedTaskId(recoverableSession.taskId ?? '');
    setSecondsLeft(nextSecondsLeft);
    setIsRunning(recoverableSession.status === 'RUNNING');
  }, [sessions]);

  async function handleStart() {
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
  }

  async function handlePause() {
    if (!activeSession) {
      return;
    }
    setIsRunning(false);
    await updateSession(activeSession.id, buildSessionPayload(activeSession, 'PAUSED'));
  }

  async function handleComplete(sessionId = activeSessionId) {
    if (!sessionId) {
      return;
    }
    setIsRunning(false);
    await completeSession(sessionId);
    setActiveSessionId(null);
  }

  async function handleReset(nextType = selectedType) {
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
    if (type === selectedType && !hasActiveSession) {
      return;
    }
    if (hasActiveSession) {
      await handleReset(type);
    }
    setSelectedType(type);
  }

  async function handleSaveSpotifyConfig() {
    if (!spotifyIntegration) {
      return;
    }
    await updateIntegrationConfig(spotifyIntegration.id, {
      selectedPlaylistUri: spotifyConfig.selectedPlaylistUri.trim() || null,
      selectedPlaylistName: spotifyConfig.selectedPlaylistName.trim() || null,
      spotifyVolume: spotifyConfig.spotifyVolume,
    });
  }

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const linkedTasks = selectedGoalId === '' ? tasks : tasks.filter((task) => task.goalId === Number(selectedGoalId));
  const latestSessions = sessions.slice(0, 5);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <Panel className="relative overflow-hidden p-10">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Focus cycle</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {(['POMODORO', 'SHORT_BREAK', 'LONG_BREAK'] as SessionType[]).map((type) => (
            <button
              key={type}
              className={`rounded-full px-5 py-3 text-xs font-bold uppercase tracking-[0.25em] ${selectedType === type ? 'bg-primary text-background' : 'bg-background text-on-surface-variant'}`}
              onClick={() => void handleSelectType(type)}
            >
              {SESSION_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center">
          <div className="flex h-72 w-72 items-center justify-center rounded-full border border-outline/10 bg-background text-center shadow-[0_0_120px_rgba(255,181,160,0.12)]">
            <div>
              <p className="font-headline text-7xl font-extralight tracking-tighter">
                {minutes}:{seconds}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.4em] text-on-surface-variant">remaining</p>
            </div>
          </div>
          <div className="mt-10 flex items-center gap-4">
            <button className="rounded-full border border-outline/10 bg-background p-4 text-on-surface-variant" onClick={() => void handleReset()}>
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              className="rounded-full bg-linear-to-r from-primary to-primary-container p-6 text-background shadow-lg shadow-primary/20"
              onClick={isRunning ? () => void handlePause() : () => void handleStart()}
            >
              {isRunning ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </button>
          </div>
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Link session</p>
          <div className="mt-5 space-y-4">
            <select
              className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none"
              value={selectedGoalId}
              disabled={hasActiveSession}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedGoalId(value === '' ? '' : Number(value));
                setSelectedTaskId('');
              }}
            >
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
            <select
              className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none"
              value={selectedTaskId}
              disabled={hasActiveSession}
              onChange={(event) => setSelectedTaskId(event.target.value === '' ? '' : Number(event.target.value))}
            >
              <option value="">No task</option>
              {linkedTasks.map((task) => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
          </div>
        </Panel>

        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Session audio</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-outline/10 bg-background px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Ambient</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                {settings.soundEnabled
                  ? `${settings.ambientSound} at ${settings.ambientVolume}% • ${settings.audioScope}`
                  : 'Session audio is disabled in settings.'}
              </p>
            </div>

            {!spotifyIntegration ? (
              <div className="rounded-2xl border border-dashed border-outline/20 px-4 py-4 text-sm text-on-surface-variant">
                Connect Spotify from Settings to attach playlist playback to this focus workflow.
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-outline/10 bg-background px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Connected account</p>
                  <p className="mt-2 font-semibold">{spotifyIntegration.displayName ?? spotifyIntegration.providerAccountId}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {spotifyIntegration.status} • token {spotifyIntegration.tokenExpiresAt ? `expires ${new Date(spotifyIntegration.tokenExpiresAt).toLocaleString()}` : 'managed server-side'}
                  </p>
                </div>

                <label className="block rounded-2xl border border-outline/10 bg-background px-4 py-4">
                  <span className="block text-xs uppercase tracking-[0.2em] text-on-surface-variant">Playlist URI</span>
                  <input
                    className="mt-3 w-full bg-transparent outline-none"
                    value={spotifyConfig.selectedPlaylistUri}
                    onChange={(event) => setSpotifyConfig((current) => ({ ...current, selectedPlaylistUri: event.target.value }))}
                    placeholder="spotify:playlist:37i9dQZF1DX8NTLI2TtZa6"
                  />
                </label>

                <label className="block rounded-2xl border border-outline/10 bg-background px-4 py-4">
                  <span className="block text-xs uppercase tracking-[0.2em] text-on-surface-variant">Playlist label</span>
                  <input
                    className="mt-3 w-full bg-transparent outline-none"
                    value={spotifyConfig.selectedPlaylistName}
                    onChange={(event) => setSpotifyConfig((current) => ({ ...current, selectedPlaylistName: event.target.value }))}
                    placeholder="Deep focus"
                  />
                </label>

                <label className="block rounded-2xl border border-outline/10 bg-background px-4 py-4">
                  <span className="block text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                    Spotify volume {spotifyConfig.spotifyVolume}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    className="mt-3 w-full accent-primary"
                    value={spotifyConfig.spotifyVolume}
                    onChange={(event) => setSpotifyConfig((current) => ({ ...current, spotifyVolume: Number(event.target.value) }))}
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-[0.25em] text-background"
                    onClick={() => void handleSaveSpotifyConfig()}
                  >
                    Save audio config
                  </button>
                  <button
                    className="rounded-2xl border border-outline/10 px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant"
                    onClick={() => void refreshIntegrationToken(spotifyIntegration.id)}
                  >
                    Refresh token
                  </button>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Recent sessions</p>
          <div className="mt-5 space-y-3">
            {latestSessions.length === 0 && <p className="text-sm text-on-surface-variant">No sessions recorded yet.</p>}
            {latestSessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-outline/10 bg-background px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{SESSION_LABELS[session.type]}</p>
                <p className="mt-2 font-semibold">{session.taskTitle ?? session.goalTitle ?? 'Unlinked session'}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{session.durationMinutes} min • {session.status}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
