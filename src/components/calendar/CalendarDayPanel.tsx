import React from 'react';
import { Clock3, X } from 'lucide-react';
import {
  DAY_HEADER_FORMATTER,
  DayMetrics,
  STATUS_STYLES,
  TIME_FORMATTER,
  TYPE_LABELS,
  formatMinutesLabel,
  formatPercent,
  getCompletionRate,
} from '../../lib/calendar-utils';

interface CalendarDayPanelProps {
  open: boolean;
  onClose(): void;
  selectedDate: Date;
  dayMetrics: DayMetrics;
}

export function CalendarDayPanel({ open, onClose, selectedDate, dayMetrics }: CalendarDayPanelProps) {
  const completionRate = getCompletionRate(dayMetrics);

  React.useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-panel-title"
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[400px] transform border-l border-outline/15 bg-background/95 backdrop-blur-2xl transition-transform duration-500 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-outline/10 px-6 py-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-primary/90">Selected day</p>
              <h3
                id="calendar-day-panel-title"
                className="mt-2 font-headline text-2xl font-bold tracking-tight"
              >
                {DAY_HEADER_FORMATTER.format(selectedDate)}
              </h3>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline/12 bg-background text-on-surface-variant transition hover:-translate-y-px hover:border-primary/24 hover:text-primary"
              onClick={onClose}
              aria-label="Close day panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Day stats */}
          <div className="grid grid-cols-3 gap-2 px-6 py-4">
            {[
              ['Focus', formatMinutesLabel(dayMetrics.focusMinutes)],
              ['Pomodoros', String(dayMetrics.totalPomodoros)],
              ['Completion', formatPercent(completionRate)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-outline/10 bg-surface px-3 py-3 text-center">
                <p className="text-[9px] uppercase tracking-[0.22em] text-on-surface-variant/70">{label}</p>
                <p className="mt-1.5 text-xl font-bold text-on-surface">{value}</p>
              </div>
            ))}
          </div>

          {/* Sessions list */}
          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 pb-6">
            {dayMetrics.sessions.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="max-w-[220px] text-center text-sm leading-6 text-on-surface-variant/60">
                  No sessions on this day yet. Scheduled, completed, or skipped sessions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayMetrics.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-outline/10 bg-surface px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-on-surface">{session.title}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">{session.context}</p>
                      </div>
                      <span className={`shrink-0 self-start rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] ${STATUS_STYLES[session.status]}`}>
                        {session.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/70">
                      <span className="rounded-full border border-outline/10 bg-background px-2.5 py-1">
                        {TYPE_LABELS[session.type]}
                      </span>
                      <span className="rounded-full border border-outline/10 bg-background px-2.5 py-1">
                        {session.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-outline/10 bg-background px-2.5 py-1">
                        <Clock3 className="h-3 w-3" />
                        {TIME_FORMATTER.format(session.displayDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
