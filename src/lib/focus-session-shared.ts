import { AmbientSound, AudioScope, SessionType } from '../types';

export type ScheduleMode = 'SINGLE' | 'CUSTOM';
export type CustomStage = 'BUILDER' | 'RUNNING' | 'TRANSITION';
export type CustomBlockOutcome = 'DONE' | 'SKIPPED';

export interface CustomScheduleBlock {
  id: number;
  type: SessionType;
  durationMinutes: number;
}

export const FOCUS_SESSION_TYPES: SessionType[] = ['POMODORO', 'SHORT_BREAK', 'LONG_BREAK'];

export const SESSION_LABELS: Record<SessionType, string> = {
  POMODORO: 'Pomodoro',
  SHORT_BREAK: 'Short break',
  LONG_BREAK: 'Long break',
};

export const SESSION_BADGE_CLASSES: Record<SessionType, string> = {
  POMODORO: 'border-primary/20 bg-primary/10 text-primary',
  SHORT_BREAK: 'border-secondary/20 bg-secondary/10 text-secondary',
  LONG_BREAK: 'border-secondary/20 bg-secondary/10 text-secondary',
};

export const SCHEDULE_MODE_LABELS: Record<ScheduleMode, string> = {
  SINGLE: 'Single session',
  CUSTOM: 'Custom schedule',
};

export const AMBIENT_SOUND_OPTIONS: Array<{ value: AmbientSound; label: string }> = [
  { value: 'NONE', label: 'No ambient sound' },
  { value: 'RAIN', label: 'Rain' },
  { value: 'RIVER', label: 'River' },
  { value: 'WHITE_NOISE', label: 'White noise' },
];

export const AUDIO_SCOPE_OPTIONS: Array<{ value: AudioScope; label: string }> = [
  { value: 'FOCUS_ONLY', label: 'Only pomodoro' },
  { value: 'ALL_SESSIONS', label: 'All session blocks' },
];

export const CUSTOM_SCHEDULE_TOOLTIP_LINES = [
  'This custom flow stays local to the browser.',
  'Completed pomodoros persist normally.',
  'Skipped pomodoros persist only rounded worked minutes.',
  'Break blocks never persist.',
  'Goal and task links apply only to pomodoro blocks.',
];

export function formatDurationLabel(totalMinutes: number) {
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }

  return `${totalMinutes} min`;
}

export function formatClock(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function getCustomBlockStatusLabel(outcome: CustomBlockOutcome | undefined, isActive: boolean, isUpcoming: boolean) {
  if (outcome === 'DONE') {
    return 'Completed';
  }
  if (outcome === 'SKIPPED') {
    return 'Skipped';
  }
  if (isActive) {
    return 'Current';
  }
  if (isUpcoming) {
    return 'Queued';
  }
  return 'Ready';
}

export function getCustomBlockHeadline(type: SessionType) {
  if (type === 'POMODORO') {
    return 'Deep work interval';
  }
  if (type === 'SHORT_BREAK') {
    return 'Short recovery';
  }
  return 'Long reset';
}
