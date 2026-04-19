import React from 'react';
import { ArrowRight, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { SESSION_LABELS } from '../../lib/focus-session-shared';
import { CustomScheduleBlock } from '../../lib/focus-session-shared';

interface CustomScheduleRunnerProps {
  activeBlock: CustomScheduleBlock | null;
  nextBlock: CustomScheduleBlock | null;
  blocksCount: number;
  currentBlockNumber: number;
  remainingBlocksCount: number;
  timerDisplay: string;
  timerLabel: string;
  timerSubLabel: string;
  isRunning: boolean;
  isTransitioning: boolean;
  isSavingBlock: boolean;
  secondsLeft: number;
  onReset(): void;
  onSkip(): void | Promise<void>;
  onPause(): void;
  onStart(): void | Promise<void>;
}

export function CustomScheduleRunner({
  activeBlock,
  nextBlock,
  blocksCount,
  currentBlockNumber,
  remainingBlocksCount,
  timerDisplay,
  timerLabel,
  timerSubLabel,
  isRunning,
  isTransitioning,
  isSavingBlock,
  secondsLeft,
  onReset,
  onSkip,
  onPause,
  onStart,
}: CustomScheduleRunnerProps) {
  return (
    <div className="mt-6 flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 rounded-[1.6rem] border border-outline/10 bg-background/50 px-5 py-4 opacity-75 backdrop-blur-md transition duration-200 hover:opacity-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-primary">
              {isTransitioning ? 'Transition countdown' : 'Custom flow running'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">
                {activeBlock
                  ? `${SESSION_LABELS[activeBlock.type]} • ${activeBlock.durationMinutes} min`
                  : 'Flow complete'}
              </span>
              <ArrowRight className="h-4 w-4 text-primary/70" />
              <span>
                {nextBlock
                  ? `${SESSION_LABELS[nextBlock.type]} • ${nextBlock.durationMinutes} min`
                  : 'End of flow'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-outline/10 bg-surface px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
              {currentBlockNumber} / {blocksCount}
            </span>
            <span className="rounded-full border border-outline/10 bg-surface px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
              {remainingBlocksCount} remaining
            </span>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto pt-6 pb-4">
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-8">
          <div className="flex flex-1 items-center justify-center">
            <div className="flex aspect-square w-full max-w-[330px] items-center justify-center rounded-full border border-outline/10 bg-background text-center shadow-[0_0_120px_rgba(255,181,160,0.12)] xl:max-w-[360px]">
              <div>
                <p className="font-headline text-[clamp(4rem,8vw,5.4rem)] font-extralight tracking-tighter">
                  {timerDisplay}
                </p>
                {isTransitioning ? (
                  <>
                    <p className="mt-4 text-xs uppercase tracking-[0.28em] text-primary">{timerLabel}</p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.42em] text-on-surface-variant">{timerSubLabel}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.42em] text-on-surface-variant">{timerSubLabel}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-primary">{timerLabel}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 pb-2">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="cursor-pointer rounded-full border border-outline/10 bg-background p-4 text-on-surface-variant transition hover:-translate-y-px hover:border-primary/25 hover:bg-primary/8 hover:text-primary"
                onClick={onReset}
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full border border-outline/10 bg-background p-4 text-on-surface-variant transition hover:-translate-y-px hover:border-primary/25 hover:bg-primary/8 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!activeBlock || isSavingBlock || secondsLeft <= 0 || isTransitioning}
                onClick={() => void onSkip()}
              >
                <SkipForward className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full bg-linear-to-r from-primary to-primary-container p-6 text-background shadow-[0_20px_40px_rgba(255,87,34,0.3)] transition hover:-translate-y-px hover:brightness-105 hover:shadow-[0_26px_48px_rgba(255,87,34,0.36)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!activeBlock || isSavingBlock || isTransitioning}
                onClick={isRunning ? onPause : () => void onStart()}
              >
                {isRunning ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full border border-outline/12 bg-background/80 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                {currentBlockNumber} / {blocksCount} {isTransitioning ? 'next' : 'active'}
              </span>
              <span className="rounded-full border border-outline/12 bg-background/80 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                {remainingBlocksCount} {isTransitioning ? 'queued' : 'remaining'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
