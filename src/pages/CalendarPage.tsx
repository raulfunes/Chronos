import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarDayPanel } from '../components/calendar/CalendarDayPanel';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { CalendarStatsStrip } from '../components/calendar/CalendarStatsStrip';
import {
  MONTH_FORMATTER,
  MONTH_OPTIONS,
  CalendarSessionView,
  DayMetrics,
  addDays,
  compactSelectClassName,
  createDayKey,
  createEmptyDayMetrics,
  getCalendarGridStart,
  getCompletionRate,
  getDaysInMonth,
  getMonthKey,
  getSessionDisplayDate,
  isFocusCreditedSession,
  isSameDay,
  isSameMonth,
  parseDayKey,
  resolveSessionContext,
  resolveSessionTitle,
  startOfDay,
  startOfMonth,
} from '../lib/calendar-utils';
import { useChronos } from '../lib/chronos-context';

export function CalendarPage() {
  const { sessions, analytics, goals } = useChronos();
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const todayKey = createDayKey(today);
  const [visibleMonth, setVisibleMonth] = React.useState(() => startOfMonth(today));
  const [selectedDayKey, setSelectedDayKey] = React.useState(() => todayKey);
  const [isDayPanelOpen, setIsDayPanelOpen] = React.useState(false);
  const visibleMonthKey = getMonthKey(visibleMonth);
  const monthLabel = MONTH_FORMATTER.format(visibleMonth);

  const yearOptions = React.useMemo(() => {
    const years = new Set<number>();
    const currentYear = today.getFullYear();
    for (let y = currentYear - 3; y <= currentYear + 3; y += 1) years.add(y);
    sessions.forEach((s) => years.add(getSessionDisplayDate(s).getFullYear()));
    return Array.from(years).sort((a, b) => a - b);
  }, [sessions, today]);

  const sessionViews = React.useMemo<CalendarSessionView[]>(() => (
    [...sessions]
      .map((session) => {
        const displayDate = getSessionDisplayDate(session);
        return {
          id: session.id,
          title: resolveSessionTitle(session),
          context: resolveSessionContext(session),
          status: session.status,
          type: session.type,
          durationMinutes: session.durationMinutes,
          displayDate,
          dayKey: createDayKey(displayDate),
          isPomodoro: session.type === 'POMODORO',
          isFocusCredited: isFocusCreditedSession(session),
        };
      })
      .sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime())
  ), [sessions]);

  const dayMetricsMap = React.useMemo<Map<string, DayMetrics>>(() => {
    const map = new Map<string, DayMetrics>();
    sessionViews.forEach((session) => {
      const existing = map.get(session.dayKey) ?? createEmptyDayMetrics(startOfDay(session.displayDate));
      existing.sessions.push(session);
      if (session.isPomodoro) {
        existing.totalPomodoros += 1;
        if (session.isFocusCredited) {
          existing.focusMinutes += session.durationMinutes;
          existing.creditedPomodoros += 1;
        }
        if (session.status === 'COMPLETED') existing.completedPomodoros += 1;
        if (session.status === 'SKIPPED') existing.skippedPomodoros += 1;
        if (session.status === 'CANCELLED') existing.cancelledPomodoros += 1;
      }
      map.set(session.dayKey, existing);
    });
    return map;
  }, [sessionViews]);

  const visibleMonthMetrics = React.useMemo<DayMetrics[]>(() => {
    const days: DayMetrics[] = [];
    dayMetricsMap.forEach((day) => {
      if (isSameMonth(day.date, visibleMonth)) days.push(day);
    });
    return days.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [dayMetricsMap, visibleMonth]);

  const gridDays = React.useMemo(() => {
    const gridStart = getCalendarGridStart(visibleMonth);
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const key = createDayKey(date);
      const inCurrentMonth = isSameMonth(date, visibleMonth);
      return {
        date,
        key,
        inCurrentMonth,
        metrics: inCurrentMonth ? dayMetricsMap.get(key) ?? createEmptyDayMetrics(date) : createEmptyDayMetrics(date),
        isToday: isSameDay(date, today),
      };
    });
  }, [dayMetricsMap, today, visibleMonth]);

  const monthlyFocusMinutes = visibleMonthMetrics.reduce((sum, d) => sum + d.focusMinutes, 0);
  const monthlyActiveFocusDays = visibleMonthMetrics.filter((d) => d.focusMinutes > 0).length;
  const monthlyCompletedPomodoros = visibleMonthMetrics.reduce((sum, d) => sum + d.completedPomodoros, 0);
  const monthlySkippedPomodoros = visibleMonthMetrics.reduce((sum, d) => sum + d.skippedPomodoros, 0);
  const monthlyCancelledPomodoros = visibleMonthMetrics.reduce((sum, d) => sum + d.cancelledPomodoros, 0);
  const monthlyCompletionRate = getCompletionRate({
    completedPomodoros: monthlyCompletedPomodoros,
    skippedPomodoros: monthlySkippedPomodoros,
    cancelledPomodoros: monthlyCancelledPomodoros,
  });
  const activeDayGoal = isSameMonth(today, visibleMonth) ? today.getDate() : getDaysInMonth(visibleMonth);

  const selectedDate = React.useMemo(() => parseDayKey(selectedDayKey), [selectedDayKey]);
  const selectedDayMetrics = dayMetricsMap.get(selectedDayKey) ?? createEmptyDayMetrics(selectedDate);

  const handleMonthChange = React.useCallback((year: number, month: number) => {
    setVisibleMonth(startOfMonth(new Date(year, month, 1)));
    setIsDayPanelOpen(false);
  }, []);

  React.useEffect(() => {
    setSelectedDayKey((current) => {
      if (current.startsWith(visibleMonthKey)) return current;
      if (isSameMonth(today, visibleMonth)) return todayKey;
      return visibleMonthMetrics[0]?.key ?? createDayKey(visibleMonth);
    });
  }, [today, todayKey, visibleMonth, visibleMonthKey, visibleMonthMetrics]);

  function handleDayClick(dayKey: string) {
    setSelectedDayKey(dayKey);
    setIsDayPanelOpen(true);
  }

  return (
    <div className="flex h-dvh flex-col px-10 py-10 xl:px-20">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.34em] text-primary/90">Performance archive</p>
          <h2 className="mt-1.5 font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            {monthLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            className={`${compactSelectClassName} min-w-[88px]`}
            value={visibleMonth.getMonth()}
            onChange={(e) => handleMonthChange(visibleMonth.getFullYear(), Number(e.target.value))}
            aria-label="Select month"
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            className={`${compactSelectClassName} min-w-[90px]`}
            value={visibleMonth.getFullYear()}
            onChange={(e) => handleMonthChange(Number(e.target.value), visibleMonth.getMonth())}
            aria-label="Select year"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-outline/12 bg-surface text-on-surface-variant transition hover:-translate-y-px hover:border-primary/24 hover:text-primary"
            onClick={() => handleMonthChange(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-outline/12 bg-surface text-on-surface-variant transition hover:-translate-y-px hover:border-primary/24 hover:text-primary"
            onClick={() => handleMonthChange(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <CalendarStatsStrip
        monthLabel={monthLabel}
        focusMinutes={monthlyFocusMinutes}
        creditedSessions={monthlyCompletedPomodoros}
        completionRate={monthlyCompletionRate}
        activeDays={monthlyActiveFocusDays}
        activeDayGoal={activeDayGoal}
        streak={analytics?.currentStreak ?? 0}
      />

      {/* Calendar grid */}
      <CalendarGrid
        gridDays={gridDays}
        selectedDayKey={selectedDayKey}
        onDayClick={handleDayClick}
        monthlyActiveFocusDays={monthlyActiveFocusDays}
      />

      {/* Day detail panel */}
      <CalendarDayPanel
        open={isDayPanelOpen}
        onClose={() => setIsDayPanelOpen(false)}
        selectedDate={selectedDate}
        dayMetrics={selectedDayMetrics}
      />
    </div>
  );
}
