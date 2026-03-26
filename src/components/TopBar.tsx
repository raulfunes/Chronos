import React from 'react';
import { Flame, Target } from 'lucide-react';
import { useChronos } from '../lib/chronos-context';

export function TopBar() {
  const { analytics } = useChronos();

  return (
    <header className="sticky top-0 z-40 mb-8 flex items-center justify-between rounded-[2rem] border border-outline/10 bg-background/80 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Operational dashboard</p>
        <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight">Build deliberate momentum</h2>
      </div>
      <div className="flex gap-3">
        <div className="rounded-2xl border border-outline/10 bg-surface px-4 py-3 text-right">
          <p className="flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">
            <Flame className="h-3 w-3 text-primary" />
            Streak
          </p>
          <p className="mt-1 text-xl font-bold">{analytics?.currentStreak ?? 0} days</p>
        </div>
        <div className="rounded-2xl border border-outline/10 bg-surface px-4 py-3 text-right">
          <p className="flex items-center justify-end gap-2 text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">
            <Target className="h-3 w-3 text-primary" />
            Active goals
          </p>
          <p className="mt-1 text-xl font-bold">{analytics?.activeGoals ?? 0}</p>
        </div>
      </div>
    </header>
  );
}
