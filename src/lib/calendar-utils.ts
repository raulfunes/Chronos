import { FocusSession, SessionStatus, SessionType } from '../types';

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2026, i, 1)),
}));

export const STATUS_STYLES: Record<SessionStatus, string> = {
  SCHEDULED: 'border-outline/12 bg-background/70 text-on-surface-variant',
  RUNNING: 'border-primary/25 bg-primary/12 text-primary',
  PAUSED: 'border-outline/12 bg-surface-high text-on-surface',
  COMPLETED: 'border-secondary/20 bg-secondary/10 text-secondary',
  SKIPPED: 'border-primary/20 bg-primary/10 text-primary',
  CANCELLED: 'border-outline/12 bg-background text-on-surface-variant',
};

export const TYPE_LABELS: Record<SessionType, string> = {
  POMODORO: 'Pomodoro',
  SHORT_BREAK: 'Short break',
  LONG_BREAK: 'Long break',
};

export const INTENSITY_LEGEND = [
  { label: '1–24 min', className: 'bg-primary/30' },
  { label: '25–49 min', className: 'bg-primary/48' },
  { label: '50–89 min', className: 'bg-primary/72' },
  { label: '90+ min', className: 'bg-secondary/85' },
];

export const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
export const DAY_HEADER_FORMATTER = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
export const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' });

export const compactSelectClassName = 'dark-select h-10 cursor-pointer rounded-2xl border border-outline/12 bg-background px-3 text-sm text-on-surface outline-none transition hover:-translate-y-px hover:border-primary/24 focus:border-primary/28';

export interface CalendarSessionView {
  id: number;
  title: string;
  context: string | null;
  status: SessionStatus;
  type: SessionType;
  durationMinutes: number;
  displayDate: Date;
  dayKey: string;
  isPomodoro: boolean;
  isFocusCredited: boolean;
}

export interface DayMetrics {
  key: string;
  date: Date;
  sessions: CalendarSessionView[];
  focusMinutes: number;
  totalPomodoros: number;
  creditedPomodoros: number;
  completedPomodoros: number;
  skippedPomodoros: number;
  cancelledPomodoros: number;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function createDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function isSameDay(left: Date, right: Date) {
  return createDayKey(left) === createDayKey(right);
}

export function getCalendarGridStart(monthStart: Date) {
  const offset = (monthStart.getDay() + 6) % 7;
  return addDays(monthStart, -offset);
}

export function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getSessionDisplayDate(session: FocusSession) {
  const value = session.completedAt ?? session.scheduledFor ?? session.startedAt ?? session.createdAt;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(session.createdAt) : parsed;
}

export function isFocusCreditedSession(session: FocusSession) {
  return session.type === 'POMODORO' && (session.status === 'COMPLETED' || session.status === 'SKIPPED');
}

export function createEmptyDayMetrics(date: Date): DayMetrics {
  return {
    key: createDayKey(date),
    date,
    sessions: [],
    focusMinutes: 0,
    totalPomodoros: 0,
    creditedPomodoros: 0,
    completedPomodoros: 0,
    skippedPomodoros: 0,
    cancelledPomodoros: 0,
  };
}

export function resolveSessionTitle(session: FocusSession) {
  return session.taskTitle ?? session.goalTitle ?? 'General session';
}

export function resolveSessionContext(session: FocusSession) {
  if (session.taskTitle && session.goalTitle) return `Goal: ${session.goalTitle}`;
  if (session.taskTitle) return 'Task-linked focus';
  if (session.goalTitle) return `Goal: ${session.goalTitle}`;
  return 'Independent focus';
}

export function formatMinutesClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatMinutesLabel(totalMinutes: number) {
  if (totalMinutes === 0) return '0 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function getCompletionRate(metrics: Pick<DayMetrics, 'completedPomodoros' | 'skippedPomodoros' | 'cancelledPomodoros'>) {
  const denominator = metrics.completedPomodoros + metrics.skippedPomodoros + metrics.cancelledPomodoros;
  return denominator === 0 ? 0 : metrics.completedPomodoros / denominator;
}

export function getIntensityClass(focusMinutes: number) {
  if (focusMinutes >= 90) return 'bg-secondary/85';
  if (focusMinutes >= 50) return 'bg-primary/72';
  if (focusMinutes >= 25) return 'bg-primary/48';
  if (focusMinutes >= 1) return 'bg-primary/30';
  return 'bg-outline/35';
}

export function buildConsistencyNote({
  monthLabel,
  streak,
  activeDays,
  focusMinutes,
  activeGoals,
}: {
  monthLabel: string;
  streak: number;
  activeDays: number;
  focusMinutes: number;
  activeGoals: number;
}) {
  const goalCopy = `${activeGoals} active goal${activeGoals === 1 ? '' : 's'}`;
  const focusCopy = formatMinutesLabel(focusMinutes);

  if (focusMinutes === 0) {
    return `${monthLabel} is still open. No credited focus has landed yet, so the archive is ready for a first strong session across ${goalCopy}.`;
  }
  if (streak >= 7) {
    return `Momentum is compounding. A ${streak}-day streak and ${focusCopy} of credited focus are keeping ${goalCopy} in motion.`;
  }
  if (activeDays >= 5) {
    return `${monthLabel} is holding steady with ${activeDays} active focus days and ${focusCopy} of credited work.`;
  }
  return `${monthLabel} is taking shape. ${activeDays} active focus days have already produced ${focusCopy} across ${goalCopy}.`;
}
