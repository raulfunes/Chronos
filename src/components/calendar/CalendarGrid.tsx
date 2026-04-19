import React from 'react';
import { DAY_HEADER_FORMATTER, DayMetrics, INTENSITY_LEGEND, WEEKDAY_LABELS, getIntensityClass } from '../../lib/calendar-utils';

interface GridDay {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  metrics: DayMetrics;
  isToday: boolean;
}

interface CalendarGridProps {
  gridDays: GridDay[];
  selectedDayKey: string;
  onDayClick(dayKey: string): void;
  monthlyActiveFocusDays: number;
}

export function CalendarGrid({ gridDays, selectedDayKey, onDayClick, monthlyActiveFocusDays }: CalendarGridProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="flex h-full min-w-[640px] flex-col overflow-hidden rounded-[1.5rem] border border-outline/30">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 divide-x divide-outline/30 border-b border-outline/30">
            {WEEKDAY_LABELS.map((weekday) => (
              <div
                key={weekday}
                className="bg-[#181716] px-3 py-2.5 text-center text-[10px] uppercase tracking-[0.28em] text-on-surface-variant/70"
              >
                {weekday}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 divide-x divide-y divide-outline/30 bg-background overflow-hidden">
            {gridDays.map((day) => {
              const dotCount = Math.min(4, day.metrics.totalPomodoros);
              const isSelected = day.key === selectedDayKey;
              const dayLabel = day.metrics.focusMinutes > 0
                ? `${day.metrics.focusMinutes} min`
                : day.metrics.sessions.length > 0
                  ? `${day.metrics.sessions.length} item${day.metrics.sessions.length === 1 ? '' : 's'}`
                  : 'Open';

              if (!day.inCurrentMonth) {
                return (
                  <div
                    key={day.key}
                    className="flex flex-col bg-background/55 px-3 py-2.5 text-on-surface-variant/25"
                  >
                    <span className="text-sm font-semibold">{day.date.getDate()}</span>
                    {day.isToday ? (
                      <span className="mt-1 self-start rounded-full border border-secondary/18 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] text-secondary/65">
                        Today
                      </span>
                    ) : null}
                  </div>
                );
              }

              return (
                <button
                  key={day.key}
                  type="button"
                  className={`flex cursor-pointer flex-col bg-background px-3 py-2.5 text-left transition duration-200 ease-out ${
                    isSelected
                      ? 'ring-1 ring-inset ring-primary/38 bg-surface shadow-[0_16px_30px_rgba(0,0,0,0.18)]'
                      : day.isToday
                        ? 'ring-1 ring-inset ring-secondary/28 bg-surface/88 hover:bg-surface'
                        : 'hover:bg-surface/84'
                  }`}
                  onClick={() => onDayClick(day.key)}
                  aria-label={`Open details for ${DAY_HEADER_FORMATTER.format(day.date)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-base font-semibold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {day.date.getDate()}
                    </span>
                    {day.isToday ? (
                      <span className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] ${
                        isSelected
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : 'border-secondary/18 bg-secondary/10 text-secondary'
                      }`}>
                        Today
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/50">
                    {dayLabel}
                  </p>

                  <div className="mt-auto flex items-center gap-1">
                    {Array.from({ length: dotCount }).map((_, index) => (
                      <span
                        key={`${day.key}-dot-${index + 1}`}
                        className={`h-2 w-2 rounded-full ${getIntensityClass(day.metrics.focusMinutes)}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline/10 bg-background/70 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[9px] uppercase tracking-[0.28em] text-on-surface-variant/60">Intensity</span>
          {INTENSITY_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
              <span className="text-[9px] uppercase tracking-[0.18em] text-on-surface-variant/60">{item.label}</span>
            </div>
          ))}
        </div>
        <span className="text-[9px] uppercase tracking-[0.22em] text-primary/75">
          {monthlyActiveFocusDays} active day{monthlyActiveFocusDays === 1 ? '' : 's'} this month
        </span>
      </div>
    </div>
  );
}
