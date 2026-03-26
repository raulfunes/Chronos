import React from 'react';
import { Panel } from '../components/shared/Panel';
import { useChronos } from '../lib/chronos-context';

export function CalendarPage() {
  const { calendar, analytics } = useChronos();
  const grouped = calendar.reduce<Record<string, typeof calendar>>((acc, entry) => {
    const key = entry.scheduledFor ? new Date(entry.scheduledFor).toISOString().slice(0, 10) : 'unscheduled';
    acc[key] = [...(acc[key] ?? []), entry];
    return acc;
  }, {});

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel className="p-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Calendar</p>
        <div className="mt-6 space-y-5">
          {Object.keys(grouped).length === 0 && <p className="text-sm text-on-surface-variant">No scheduled sessions yet.</p>}
          {Object.entries(grouped).map(([day, entries]: [string, typeof calendar]) => (
            <div key={day} className="rounded-[1.75rem] border border-outline/10 bg-background p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">{day === 'unscheduled' ? 'Unscheduled' : day}</p>
              <div className="mt-4 space-y-3">
                {entries.map((entry) => (
                  <div key={entry.sessionId} className="rounded-2xl border border-outline/10 bg-surface px-4 py-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{entry.taskTitle ?? entry.goalTitle ?? 'General session'}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{entry.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">{entry.type} • {entry.durationMinutes} min</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Summary</p>
          <div className="mt-5 grid gap-3">
            {[
              ['Focus minutes', analytics?.focusMinutes ?? 0],
              ['Completed sessions', analytics?.completedSessions ?? 0],
              ['Completed tasks', analytics?.completedTasks ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-outline/10 bg-background px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
                <p className="mt-2 font-headline text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Goal progress</p>
          <div className="mt-5 space-y-4">
            {(analytics?.goalProgress ?? []).map((goal) => (
              <div key={goal.goalId}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{goal.title}</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-background">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
