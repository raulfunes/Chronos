import { AUTH_STORAGE_KEY, DEFAULT_GUEST_STATE, GUEST_STORAGE_KEY } from './constants';
import { AuthResponse, GuestState } from '../types';

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
