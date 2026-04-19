import {
  AUTH_STORAGE_KEY,
  DEFAULT_FOCUS_AUDIO_PREFERENCES,
  DEFAULT_GUEST_STATE,
  FOCUS_AUDIO_STORAGE_KEY,
  GUEST_STORAGE_KEY,
} from './constants';
import { AuthResponse, FocusAudioPreferences, GuestState } from '../types';

export function readAuth(): AuthResponse | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  return raw ? JSON.parse(raw) as AuthResponse : null;
}

export function writeAuth(value: AuthResponse | null) {
  if (!value) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
}

export function readGuestState(): GuestState {
  const raw = localStorage.getItem(GUEST_STORAGE_KEY);
  return raw ? JSON.parse(raw) as GuestState : DEFAULT_GUEST_STATE;
}

export function writeGuestState(value: GuestState) {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(value));
}

export function readFocusAudioPreferences(scope: string): FocusAudioPreferences {
  const raw = localStorage.getItem(`${FOCUS_AUDIO_STORAGE_KEY}:${scope}`);
  if (!raw) {
    return DEFAULT_FOCUS_AUDIO_PREFERENCES;
  }

  try {
    return {
      ...DEFAULT_FOCUS_AUDIO_PREFERENCES,
      ...JSON.parse(raw) as FocusAudioPreferences,
    };
  } catch {
    return DEFAULT_FOCUS_AUDIO_PREFERENCES;
  }
}

export function writeFocusAudioPreferences(scope: string, value: FocusAudioPreferences) {
  localStorage.setItem(`${FOCUS_AUDIO_STORAGE_KEY}:${scope}`, JSON.stringify(value));
}
