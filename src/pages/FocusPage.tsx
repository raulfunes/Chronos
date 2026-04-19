import React, { useState } from 'react';
import { Flame, Pause, Play, Rewind, SlidersHorizontal, SkipForward } from 'lucide-react';
import { FaSpotify } from 'react-icons/fa6';
import { AtmosphereDrawer } from '../components/focus/AtmosphereDrawer';
import { CustomScheduleBuilder } from '../components/focus/CustomScheduleBuilder';
import { CustomScheduleRunner } from '../components/focus/CustomScheduleRunner';
import { FocusHelpTooltip } from '../components/focus/FocusHelpTooltip';
import { FocusTimerPanel } from '../components/focus/FocusTimerPanel';
import { ScheduleMode, SCHEDULE_MODE_LABELS } from '../lib/focus-session-shared';
import { useChronos } from '../lib/chronos-context';
import { useFocusSessionController } from '../lib/use-focus-session-controller';

export function FocusPage() {
  const { analytics } = useChronos();
  const [atmosphereOpen, setAtmosphereOpen] = useState(false);

  const {
    goals,
    linkedTasks,
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
    currentTimerDisplay,
    currentTimerSeconds,
    totalTimerSeconds,
    timerLabel,
    timerSubLabel,
    updateFocusAudio,
    handleSpotifyConnect,
    handleSwitchMode,
    handleSelectGoal,
    handleSelectTask,
    singleSession,
    customFlow,
  } = useFocusSessionController();

  const sessionName =
    selectedTaskId !== ''
      ? (linkedTasks.find((t) => t.id === Number(selectedTaskId))?.title ?? timerLabel)
      : selectedGoalId !== ''
        ? (goals.find((g) => g.id === Number(selectedGoalId))?.title ?? timerLabel)
        : timerLabel;

  const activeGoalTitle =
    selectedGoalId !== ''
      ? (goals.find((g) => g.id === Number(selectedGoalId))?.title ?? null)
      : null;

  const spotifyLabel = spotify.currentTrack?.name ?? spotify.selectedPlaylist?.name ?? 'Spotify';
  const spotifyMeta = spotify.currentTrack?.artistNames ?? spotify.statusText;
  const showSpotifyMiniPlayer = Boolean(spotifyIntegration && (spotify.currentTrack || spotify.selectedPlaylist));

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden px-20 py-5">
      {/* Atmospheric background blurs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-80 w-80 rounded-full bg-primary/12 blur-[120px]" />
        <div className="absolute -bottom-16 left-[10%] h-72 w-72 rounded-full bg-primary/6 blur-[100px]" />
      </div>

      {/* Focus header */}
      <div className="relative z-10 flex items-center justify-between pb-5">
        <div className="flex items-center gap-1">
          {(['SINGLE', 'CUSTOM'] as ScheduleMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={!canSwitchMode && scheduleMode !== mode}
              className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition ${
                scheduleMode === mode
                  ? 'bg-primary/12 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40'
              }`}
              onClick={() => void handleSwitchMode(mode)}
            >
              {SCHEDULE_MODE_LABELS[mode]}
            </button>
          ))}
          {scheduleMode === 'CUSTOM' ? <FocusHelpTooltip /> : null}
        </div>

        <div className="flex items-center gap-5">
          {(analytics?.currentStreak ?? 0) > 0 && (
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                <Flame className="h-3 w-3 text-primary" />
                Streak: {analytics!.currentStreak}
              </span>
              <div className="mt-1 h-[2px] w-6 rounded-full bg-secondary" />
            </div>
          )}

          {activeGoalTitle && (
            <span className="max-w-[180px] truncate text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Active: {activeGoalTitle}
            </span>
          )}

          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-outline/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant transition hover:border-primary/20 hover:text-on-surface"
            onClick={() => setAtmosphereOpen(true)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Atmosphere
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative z-10 min-h-0 flex-1">
        {scheduleMode === 'SINGLE' ? (
          <FocusTimerPanel
            selectedType={selectedType}
            isRunning={isRunning}
            timerDisplay={currentTimerDisplay}
            timerLabel={timerLabel}
            timerSubLabel={timerSubLabel}
            sessionName={sessionName}
            currentSeconds={currentTimerSeconds}
            totalSeconds={totalTimerSeconds}
            onSelectType={singleSession.onSelectType}
            onStart={singleSession.onStart}
            onPause={singleSession.onPause}
            onReset={singleSession.onReset}
          />
        ) : isCustomBuilderView ? (
          <CustomScheduleBuilder
            blocks={customFlow.blocks}
            totalMinutes={customFlow.totalMinutes}
            hasRecoverableSession={hasRecoverableSession}
            onInsertBlock={customFlow.onInsertBlock}
            onReorderBlock={customFlow.onReorderBlock}
            onUpdateBlock={customFlow.onUpdateBlock}
            onDeleteBlock={customFlow.onDeleteBlock}
            onLoadClassicPomodoro={customFlow.onLoadClassicPomodoro}
            onStartFlow={customFlow.onStartFlow}
          />
        ) : (
          <CustomScheduleRunner
            activeBlock={customFlow.activeBlock}
            nextBlock={customFlow.nextBlock}
            blocksCount={customFlow.blocks.length}
            currentBlockNumber={customFlow.currentBlockNumber}
            remainingBlocksCount={customFlow.remainingBlocksCount}
            timerDisplay={currentTimerDisplay}
            timerLabel={timerLabel}
            timerSubLabel={timerSubLabel}
            isRunning={customFlow.isRunning}
            isTransitioning={customFlow.isTransitioning}
            isSavingBlock={customFlow.isSavingBlock}
            secondsLeft={customFlow.secondsLeft}
            onReset={customFlow.onReset}
            onSkip={customFlow.onSkip}
            onPause={customFlow.onPause}
            onStart={customFlow.onRunnerStart}
          />
        )}
      </div>

      {/* Floating Spotify mini-player */}
      {showSpotifyMiniPlayer && (
        <div className="absolute bottom-0 right-0 z-20">
          <div className="flex items-center gap-4 rounded-2xl border border-outline/10 bg-surface/90 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            {spotify.currentTrack?.albumArtUrl ? (
              <img
                src={spotify.currentTrack.albumArtUrl}
                alt={spotify.currentTrack.albumName}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#22d15c]/12 text-[#22d15c]">
                <FaSpotify size={18} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight text-secondary">
                <FaSpotify size={11} />
                {spotify.isPlaying ? 'Playing' : 'Ready'}
              </span>
              <p className="mt-1 truncate text-xs font-bold text-on-surface">{spotifyLabel}</p>
              <p className="truncate text-[10px] text-on-surface-variant">{spotifyMeta}</p>
            </div>
            <button
              type="button"
              disabled={!spotify.canControlPlayback}
              className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => void spotify.skipToPreviousTrack()}
            >
              <Rewind className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!spotify.canControlPlayback}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary transition hover:bg-primary/18 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => void spotify.togglePlayback()}
            >
              {spotify.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
            </button>
            <button
              type="button"
              disabled={!spotify.canControlPlayback}
              className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => void spotify.skipToNextTrack()}
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <AtmosphereDrawer
        open={atmosphereOpen}
        onClose={() => setAtmosphereOpen(false)}
        goals={goals}
        linkedTasks={linkedTasks}
        selectedGoalId={selectedGoalId}
        selectedTaskId={selectedTaskId}
        hasLockedLinking={hasLockedLinking}
        isGuest={isGuest}
        spotifyIntegration={spotifyIntegration}
        spotify={spotify}
        focusAudio={focusAudio}
        onUpdateFocusAudio={updateFocusAudio}
        onSpotifyConnect={handleSpotifyConnect}
        onSelectGoal={handleSelectGoal}
        onSelectTask={handleSelectTask}
      />
    </div>
  );
}
