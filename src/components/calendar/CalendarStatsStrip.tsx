import React from 'react';
import { Flame, Target } from 'lucide-react';
import { formatMinutesClock, formatPercent } from '../../lib/calendar-utils';

interface CalendarStatsStripProps {
  monthLabel: string;
  focusMinutes: number;
  creditedSessions: number;
  completionRate: number;
  activeDays: number;
  activeDayGoal: number;
  streak: number;
}

export function CalendarStatsStrip({
  monthLabel,
  focusMinutes,
  creditedSessions,
  completionRate,
  activeDays,
  activeDayGoal,
  streak,
}: CalendarStatsStripProps) {
  const activeDayProgress = activeDayGoal === 0 ? 0 : Math.min(activeDays / activeDayGoal, 1);

  return (
    <div className="flex flex-wrap gap-3 pb-4">
      {/* Focus time */}
      <div className="flex min-w-[160px] flex-1 flex-col justify-between rounded-2xl border border-outline/10 bg-surface px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-primary/80">Focus · {monthLabel}</p>
        <p className="mt-2 font-headline text-2xl font-bold tracking-tight">{formatMinutesClock(focusMinutes)}</p>
      </div>

      {/* Credited sessions */}
      <div className="flex min-w-[110px] flex-1 flex-col justify-between rounded-2xl border border-outline/10 bg-surface px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-on-surface-variant/70">Sessions</p>
        <p className="mt-2 font-headline text-2xl font-bold">{creditedSessions}</p>
      </div>

      {/* Completion rate */}
      <div className="flex min-w-[120px] flex-1 flex-col justify-between rounded-2xl border border-outline/10 bg-surface px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-on-surface-variant/70">
          <Flame className="h-3 w-3 text-secondary" />
          Completion
        </span>
        <p className="mt-2 font-headline text-2xl font-bold">{formatPercent(completionRate)}</p>
      </div>

      {/* Active days with progress bar */}
      <div className="flex min-w-[160px] flex-1 flex-col justify-between rounded-2xl border border-outline/10 bg-surface px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-on-surface-variant/70">
          <Target className="h-3 w-3 text-primary" />
          Active days
        </span>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="font-headline text-2xl font-bold">{activeDays}</span>
            <span className="text-sm text-on-surface-variant">/ {activeDayGoal}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${activeDayProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="flex min-w-[100px] flex-1 flex-col justify-between rounded-2xl border border-outline/10 bg-surface px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-on-surface-variant/70">Streak</p>
        <p className="mt-2 font-headline text-2xl font-bold">{streak}<span className="ml-0.5 text-base font-normal text-on-surface-variant">d</span></p>
      </div>
    </div>
  );
}
