import React from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { FOCUS_SESSION_TYPES, SESSION_LABELS } from '../../lib/focus-session-shared';
import { SessionType } from '../../types';

const RING_RADIUS = 220;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface FocusTimerPanelProps {
  selectedType: SessionType;
  isRunning: boolean;
  timerDisplay: string;
  timerLabel: string;
  timerSubLabel: string;
  sessionName: string;
  currentSeconds: number;
  totalSeconds: number;
  onSelectType(type: SessionType): void | Promise<void>;
  onStart(): void | Promise<void>;
  onPause(): void | Promise<void>;
  onReset(): void | Promise<void>;
}

export function FocusTimerPanel({
  selectedType,
  isRunning,
  timerDisplay,
  timerLabel,
  timerSubLabel,
  sessionName,
  currentSeconds,
  totalSeconds,
  onSelectType,
  onStart,
  onPause,
  onReset,
}: FocusTimerPanelProps) {
  const progress = totalSeconds > 0 ? currentSeconds / totalSeconds : 1;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center py-4">
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {FOCUS_SESSION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition ${
              selectedType === type
                ? 'bg-primary/15 text-primary shadow-[0_0_20px_rgba(255,181,160,0.12)]'
                : 'text-on-surface-variant hover:bg-surface-high/50 hover:text-on-surface'
            }`}
            onClick={() => void onSelectType(type)}
          >
            {SESSION_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="mb-10 text-center">
        <span className="block text-[11px] font-bold uppercase tracking-[0.4em] text-primary">
          Current Focus Session
        </span>
        <h2 className="mt-3 font-headline text-3xl font-semibold tracking-tight text-on-surface">
          {sessionName}
        </h2>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="relative h-[400px] w-[400px] xl:h-[440px] xl:w-[440px]">
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 460 460"
          >
            <circle
              cx="230"
              cy="230"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/10"
            />
            <circle
              cx="230"
              cy="230"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="text-primary transition-[stroke-dashoffset] duration-500 ease-linear"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>

          <div className="absolute inset-[20px] flex flex-col items-center justify-center rounded-full bg-surface shadow-[0_0_80px_rgba(255,181,160,0.06)]">
            <span className="font-headline text-[5.5rem] font-bold leading-none tracking-tighter text-on-surface xl:text-[6rem]">
              {timerDisplay}
            </span>
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                {timerSubLabel}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
                {timerLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center gap-6">
        <button
          type="button"
          title="Reset"
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface"
          onClick={() => void onReset()}
        >
          <RotateCcw className="h-6 w-6" />
        </button>

        <button
          type="button"
          className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-background shadow-[0_0_40px_rgba(255,181,160,0.25)] transition hover:scale-105 hover:shadow-[0_0_56px_rgba(255,181,160,0.35)] active:scale-95"
          onClick={isRunning ? () => void onPause() : () => void onStart()}
        >
          {isRunning
            ? <Pause className="h-10 w-10" style={{ fill: 'currentColor' }} />
            : <Play className="h-10 w-10 translate-x-0.5" style={{ fill: 'currentColor' }} />}
        </button>

        <div className="flex h-14 w-14 items-center justify-center rounded-full text-on-surface-variant/25">
          <SkipForward className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
