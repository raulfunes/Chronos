import { FocusAudioPreferences, GuestState, UserSettings } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8082/api/v1';
export const AUTH_STORAGE_KEY = 'chronos-auth';
export const GUEST_STORAGE_KEY = 'chronos-guest-state';
export const FOCUS_AUDIO_STORAGE_KEY = 'chronos-focus-audio';

export const DEFAULT_SETTINGS: UserSettings = {
  id: 1,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  desktopNotifications: true,
  theme: 'obsidian-sanctuary',
};

export const DEFAULT_GUEST_STATE: GuestState = {
  goals: [],
  tasks: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
};

export const DEFAULT_FOCUS_AUDIO_PREFERENCES: FocusAudioPreferences = {
  soundEnabled: true,
  ambientSound: 'NONE',
  ambientVolume: 35,
  audioScope: 'FOCUS_ONLY',
  spotifyPlaylistUri: '',
  spotifyPlaylistName: '',
  spotifyVolume: 70,
};
