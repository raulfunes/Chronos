import {
  AnalyticsSummary,
  AuthResponse,
  CalendarEntry,
  FocusSession,
  FocusSessionInput,
  Goal,
  GoalInput,
  IntegrationAccount,
  IntegrationConnectStartResponse,
  IntegrationLink,
  IntegrationLinkInput,
  IntegrationProvider,
  IntegrationTokenRefreshResponse,
  SettingsInput,
  Task,
  TaskInput,
  UserSettings,
} from '../types';
import { API_BASE_URL } from './constants';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, method: HttpMethod = 'GET', token?: string | null, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorBody: Record<string, unknown> = {};
    if (errorText) {
      try {
        errorBody = JSON.parse(errorText) as Record<string, unknown>;
      } catch {
        errorBody = { message: errorText };
      }
    }
    const message = typeof errorBody.message === 'string' ? errorBody.message : 'Request failed';
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const rawBody = await response.text();
  if (!rawBody.trim()) {
    return undefined as T;
  }

  return JSON.parse(rawBody) as T;
}

export const api = {
  register: (payload: { displayName: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/register', 'POST', null, payload),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', 'POST', null, payload),
  guest: () => request<AuthResponse>('/auth/guest', 'POST'),
  me: (token: string) => request<AuthResponse>('/me', 'GET', token),
  getGoals: (token: string) => request<Goal[]>('/goals', 'GET', token),
  createGoal: (token: string, payload: GoalInput) => request<Goal>('/goals', 'POST', token, payload),
  updateGoal: (token: string, id: number, payload: GoalInput) => request<Goal>(`/goals/${id}`, 'PATCH', token, payload),
  deleteGoal: (token: string, id: number) => request<void>(`/goals/${id}`, 'DELETE', token),
  getTasks: (token: string) => request<Task[]>('/tasks', 'GET', token),
  createTask: (token: string, payload: TaskInput) => request<Task>('/tasks', 'POST', token, payload),
  updateTask: (token: string, id: number, payload: TaskInput) => request<Task>(`/tasks/${id}`, 'PATCH', token, payload),
  deleteTask: (token: string, id: number) => request<void>(`/tasks/${id}`, 'DELETE', token),
  getSessions: (token: string) => request<FocusSession[]>('/sessions', 'GET', token),
  createSession: (token: string, payload: FocusSessionInput) => request<FocusSession>('/sessions', 'POST', token, payload),
  updateSession: (token: string, id: number, payload: FocusSessionInput) =>
    request<FocusSession>(`/sessions/${id}`, 'PATCH', token, payload),
  completeSession: (token: string, id: number) => request<FocusSession>(`/sessions/${id}/complete`, 'POST', token),
  deleteSession: (token: string, id: number) => request<void>(`/sessions/${id}`, 'DELETE', token),
  getCalendar: (token: string) => request<CalendarEntry[]>('/calendar', 'GET', token),
  getSettings: (token: string) => request<UserSettings>('/settings', 'GET', token),
  updateSettings: (token: string, payload: SettingsInput) => request<UserSettings>('/settings', 'PATCH', token, payload),
  getAnalytics: (token: string) => request<AnalyticsSummary>('/analytics/summary', 'GET', token),
  getIntegrations: (token: string) => request<IntegrationAccount[]>('/integrations', 'GET', token),
  getIntegration: (token: string, accountId: number) => request<IntegrationAccount>(`/integrations/${accountId}`, 'GET', token),
  startIntegrationConnect: (token: string, provider: IntegrationProvider) =>
    request<IntegrationConnectStartResponse>(`/integrations/${provider}/connect/start`, 'POST', token),
  deleteIntegration: (token: string, accountId: number) => request<void>(`/integrations/${accountId}`, 'DELETE', token),
  updateIntegrationConfig: (token: string, accountId: number, config: Record<string, unknown>) =>
    request<IntegrationAccount>(`/integrations/${accountId}/config`, 'PATCH', token, { config }),
  refreshIntegrationToken: (token: string, accountId: number) =>
    request<IntegrationTokenRefreshResponse>(`/integrations/${accountId}/refresh-token`, 'POST', token),
  getIntegrationLinks: (token: string, accountId: number) =>
    request<IntegrationLink[]>(`/integrations/${accountId}/links`, 'GET', token),
  createIntegrationLink: (token: string, accountId: number, payload: IntegrationLinkInput) =>
    request<IntegrationLink>(`/integrations/${accountId}/links`, 'POST', token, payload),
  deleteIntegrationLink: (token: string, accountId: number, linkId: number) =>
    request<void>(`/integrations/${accountId}/links/${linkId}`, 'DELETE', token),
};
