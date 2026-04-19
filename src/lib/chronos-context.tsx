import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from './api';
import { DEFAULT_FOCUS_AUDIO_PREFERENCES, DEFAULT_SETTINGS } from './constants';
import {
  readAuth,
  readFocusAudioPreferences,
  readGuestState,
  writeAuth,
  writeFocusAudioPreferences,
  writeGuestState,
} from './storage';
import {
  AnalyticsSummary,
  AuthResponse,
  CalendarEntry,
  FocusAudioPreferences,
  FocusSession,
  FocusSessionInput,
  Goal,
  GoalInput,
  GuestState,
  IntegrationAccount,
  IntegrationLink,
  IntegrationLinkInput,
  IntegrationProvider,
  IntegrationTokenRefreshResponse,
  SessionStatus,
  SettingsInput,
  Task,
  TaskInput,
  UserSettings,
} from '../types';

interface ChronosUiError {
  id: number;
  message: string;
}

interface ChronosContextValue {
  auth: AuthResponse | null;
  goals: Goal[];
  tasks: Task[];
  sessions: FocusSession[];
  calendar: CalendarEntry[];
  settings: UserSettings;
  focusAudio: FocusAudioPreferences;
  integrations: IntegrationAccount[];
  analytics: AnalyticsSummary | null;
  isReady: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  error: ChronosUiError | null;
  login(payload: { email: string; password: string }): Promise<void>;
  register(payload: { displayName: string; email: string; password: string }): Promise<void>;
  loginAsGuest(): Promise<void>;
  logout(): void;
  refresh(): Promise<void>;
  createGoal(payload: GoalInput): Promise<void>;
  updateGoal(id: number, payload: GoalInput): Promise<void>;
  deleteGoal(id: number): Promise<void>;
  createTask(payload: TaskInput): Promise<void>;
  updateTask(id: number, payload: TaskInput): Promise<void>;
  deleteTask(id: number): Promise<void>;
  createSession(payload: FocusSessionInput): Promise<FocusSession | void>;
  updateSession(id: number, payload: FocusSessionInput): Promise<void>;
  completeSession(id: number): Promise<void>;
  deleteSession(id: number): Promise<void>;
  updateSettings(payload: SettingsInput): Promise<void>;
  updateFocusAudio(payload: Partial<FocusAudioPreferences>): void;
  startIntegrationConnect(provider: IntegrationProvider): Promise<string | null>;
  disconnectIntegration(accountId: number): Promise<void>;
  updateIntegrationConfig(accountId: number, config: Record<string, unknown>): Promise<void>;
  refreshIntegrationToken(accountId: number): Promise<IntegrationTokenRefreshResponse | null>;
  getIntegrationLinks(accountId: number): Promise<IntegrationLink[]>;
  createIntegrationLink(accountId: number, payload: IntegrationLinkInput): Promise<IntegrationLink | void>;
  deleteIntegrationLink(accountId: number, linkId: number): Promise<void>;
  showError(message: string): void;
  clearError(): void;
}

const ChronosContext = createContext<ChronosContextValue | undefined>(undefined);

function authResponseEquals(left: AuthResponse | null, right: AuthResponse | null) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.userId === right.userId
    && left.email === right.email
    && left.displayName === right.displayName
    && left.role === right.role
    && left.token === right.token;
}

function durationToSeconds(durationMinutes: number) {
  return durationMinutes * 60;
}

function isFocusCreditedSession(session: FocusSession) {
  return session.type === 'POMODORO'
    && (session.status === 'COMPLETED' || session.status === 'SKIPPED');
}

function normalizeSession(session: FocusSession): FocusSession {
  return {
    ...session,
    remainingSeconds: session.remainingSeconds ?? (
      session.status === 'COMPLETED' || session.status === 'SKIPPED'
        ? 0
        : durationToSeconds(session.durationMinutes)
    ),
    lastResumedAt: session.lastResumedAt ?? (session.status === 'RUNNING' ? session.startedAt : null),
  };
}

function resolveRunningSessionRemainingSeconds(session: FocusSession, referenceDate: Date) {
  if (session.status !== 'RUNNING' || !session.lastResumedAt) {
    return Math.max(0, session.remainingSeconds);
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((referenceDate.getTime() - new Date(session.lastResumedAt).getTime()) / 1000),
  );

  return Math.max(0, session.remainingSeconds - elapsedSeconds);
}

function pauseSessionState(session: FocusSession, referenceDate: Date): FocusSession {
  return {
    ...session,
    status: 'PAUSED',
    remainingSeconds: resolveRunningSessionRemainingSeconds(session, referenceDate),
    lastResumedAt: null,
    completedAt: null,
  };
}

function resumeSessionState(session: FocusSession, referenceDate: Date): FocusSession {
  const nowIso = referenceDate.toISOString();
  return {
    ...session,
    status: 'RUNNING',
    remainingSeconds: session.remainingSeconds > 0 ? session.remainingSeconds : durationToSeconds(session.durationMinutes),
    startedAt: session.startedAt ?? nowIso,
    lastResumedAt: nowIso,
    completedAt: null,
  };
}

function completeSessionState(session: FocusSession, referenceDate: Date): FocusSession {
  const nowIso = referenceDate.toISOString();
  return {
    ...session,
    status: 'COMPLETED',
    remainingSeconds: 0,
    startedAt: session.startedAt ?? nowIso,
    lastResumedAt: null,
    completedAt: nowIso,
  };
}

function skipSessionState(session: FocusSession, referenceDate: Date): FocusSession {
  const nowIso = referenceDate.toISOString();
  return {
    ...session,
    status: 'SKIPPED',
    remainingSeconds: 0,
    startedAt: session.startedAt ?? nowIso,
    lastResumedAt: null,
    completedAt: null,
  };
}

function cancelSessionState(session: FocusSession, referenceDate: Date): FocusSession {
  return {
    ...session,
    status: 'CANCELLED',
    remainingSeconds: session.status === 'RUNNING'
      ? resolveRunningSessionRemainingSeconds(session, referenceDate)
      : session.remainingSeconds,
    lastResumedAt: null,
    completedAt: null,
  };
}

function scheduleSessionState(session: FocusSession): FocusSession {
  return {
    ...session,
    status: 'SCHEDULED',
    remainingSeconds: session.startedAt ? session.remainingSeconds : durationToSeconds(session.durationMinutes),
    lastResumedAt: null,
    completedAt: null,
  };
}

function applySessionStatus(session: FocusSession, status: SessionStatus, referenceDate: Date): FocusSession {
  const normalizedSession = normalizeSession(session);

  switch (status) {
    case 'RUNNING':
      return resumeSessionState(normalizedSession, referenceDate);
    case 'PAUSED':
      return normalizedSession.status === 'RUNNING'
        ? pauseSessionState(normalizedSession, referenceDate)
        : {
            ...normalizedSession,
            status: 'PAUSED',
            lastResumedAt: null,
            completedAt: null,
          };
    case 'COMPLETED':
      return completeSessionState(normalizedSession, referenceDate);
    case 'SKIPPED':
      return skipSessionState(normalizedSession, referenceDate);
    case 'CANCELLED':
      return cancelSessionState(normalizedSession, referenceDate);
    case 'SCHEDULED':
      return scheduleSessionState(normalizedSession);
  }
}

function markTaskDoneIfNeeded(tasks: Task[], session: FocusSession) {
  if (session.status !== 'COMPLETED' || session.type !== 'POMODORO' || !session.taskId) {
    return tasks;
  }

  return tasks.map((task) =>
    task.id === session.taskId
      ? { ...task, status: 'DONE' as const }
      : task,
  );
}

function createAnalytics(goals: Goal[], tasks: Task[], sessions: FocusSession[]): AnalyticsSummary {
  const focusMinutes = sessions
    .filter((session) => isFocusCreditedSession(session))
    .reduce((sum, session) => sum + session.durationMinutes, 0);
  const completionDays = new Set(
    sessions
      .filter((session) => session.status === 'COMPLETED' && session.completedAt)
      .map((session) => new Date(session.completedAt as string).toISOString().slice(0, 10)),
  );

  let streak = 0;
  const cursor = new Date();
  while (completionDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return {
    activeGoals: goals.filter((goal) => goal.status !== 'DONE').length,
    completedTasks: tasks.filter((task) => task.status === 'DONE').length,
    completedSessions: sessions.filter((session) => session.status === 'COMPLETED').length,
    focusMinutes,
    currentStreak: streak,
    goalProgress: goals.map((goal) => ({
      goalId: goal.id,
      title: goal.title,
      progress: goal.progress,
    })),
  };
}

function createCalendar(sessions: FocusSession[]): CalendarEntry[] {
  return sessions
    .filter((session) => session.scheduledFor)
    .map((session) => ({
      sessionId: session.id,
      goalId: session.goalId,
      goalTitle: session.goalTitle,
      taskId: session.taskId,
      taskTitle: session.taskTitle,
      type: session.type,
      status: session.status,
      durationMinutes: session.durationMinutes,
      scheduledFor: session.scheduledFor,
    }));
}

function rehydrateGuest(): GuestState {
  const state = readGuestState();
  return {
    ...state,
    sessions: (state.sessions ?? []).map((session) => normalizeSession(session as FocusSession)),
    settings: state.settings ?? DEFAULT_SETTINGS,
  };
}

function getFocusAudioScope(auth: AuthResponse | null) {
  if (!auth || auth.role === 'GUEST') {
    return 'guest';
  }

  return `user:${auth.userId}`;
}

export function ChronosProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [focusAudio, setFocusAudio] = useState<FocusAudioPreferences>(DEFAULT_FOCUS_AUDIO_PREFERENCES);
  const [integrations, setIntegrations] = useState<IntegrationAccount[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<ChronosUiError | null>(null);

  const isAuthenticated = Boolean(auth);
  const isGuest = auth?.role === 'GUEST';

  useEffect(() => {
    const savedAuth = readAuth();
    if (!savedAuth) {
      setIsReady(true);
      return;
    }
    setAuth(savedAuth);
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    setFocusAudio(readFocusAudioPreferences(getFocusAudioScope(auth)));

    if (auth.role === 'GUEST') {
      const guest = rehydrateGuest();
      setGoals(guest.goals);
      setTasks(guest.tasks);
      setSessions(guest.sessions);
      setSettings(guest.settings);
      setIntegrations([]);
      setCalendar(createCalendar(guest.sessions));
      setAnalytics(createAnalytics(guest.goals, guest.tasks, guest.sessions));
      setIsReady(true);
      return;
    }

    void refresh().finally(() => setIsReady(true));
  }, [auth?.token, auth?.role]);

  const showError = useCallback((message: string) => {
    setError({
      id: Date.now() + Math.random(),
      message,
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  async function refresh() {
    if (!auth) {
      return;
    }

    if (auth.role === 'GUEST') {
      const guest = rehydrateGuest();
      hydrateGuestState(guest);
      return;
    }

    try {
      const token = auth.token ?? '';
      const [me, goalsData, tasksData, sessionsData, settingsData, analyticsData, calendarData, integrationsData] = await Promise.all([
        api.me(token),
        api.getGoals(token),
        api.getTasks(token),
        api.getSessions(token),
        api.getSettings(token),
        api.getAnalytics(token),
        api.getCalendar(token),
        api.getIntegrations(token),
      ]);

      const nextAuth: AuthResponse = { ...auth, ...me, token };
      if (!authResponseEquals(auth, nextAuth)) {
        setAuth(nextAuth);
        writeAuth(nextAuth);
      }
      setGoals(goalsData);
      setTasks(tasksData);
      setSessions(sessionsData.map((session) => normalizeSession(session)));
      setSettings(settingsData);
      setIntegrations(integrationsData);
      setAnalytics(analyticsData);
      setCalendar(calendarData);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        logout();
      }
      showError(err instanceof Error ? err.message : 'Failed to refresh application');
    }
  }

  function hydrateGuestState(guest: GuestState) {
    const normalizedSessions = guest.sessions.map((session) => normalizeSession(session));
    setGoals(guest.goals);
    setTasks(guest.tasks);
    setSessions(normalizedSessions);
    setSettings(guest.settings);
    setIntegrations([]);
    setCalendar(createCalendar(normalizedSessions));
    setAnalytics(createAnalytics(guest.goals, guest.tasks, normalizedSessions));
    writeGuestState({ ...guest, sessions: normalizedSessions });
    setError(null);
  }

  async function login(payload: { email: string; password: string }) {
    const response = await api.login(payload);
    setAuth(response);
    writeAuth(response);
    setError(null);
  }

  async function register(payload: { displayName: string; email: string; password: string }) {
    const response = await api.register(payload);
    setAuth(response);
    writeAuth(response);
    setError(null);
  }

  async function loginAsGuest() {
    const response = await api.guest();
    setAuth(response);
    writeAuth(response);
    hydrateGuestState(rehydrateGuest());
  }

  function logout() {
    setAuth(null);
    setGoals([]);
    setTasks([]);
    setSessions([]);
    setCalendar([]);
    setAnalytics(null);
    setSettings(DEFAULT_SETTINGS);
    setFocusAudio(DEFAULT_FOCUS_AUDIO_PREFERENCES);
    setIntegrations([]);
    writeAuth(null);
  }

  async function withRemoteMutation(action: () => Promise<void>) {
    try {
      await action();
      setError(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Request failed');
      throw err;
    }
  }

  async function createGoal(payload: GoalInput) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      const nextGoal: Goal = {
        id: Date.now(),
        title: payload.title,
        description: payload.description ?? null,
        status: payload.status ?? 'NOT_STARTED',
        priority: payload.priority ?? 'MEDIUM',
        targetDate: payload.targetDate ?? null,
        progress: 0,
        taskCount: 0,
        completedTaskCount: 0,
        totalSessions: 0,
        completedSessions: 0,
        createdAt: new Date().toISOString(),
      };
      hydrateGuestState({ ...guest, goals: [nextGoal, ...guest.goals] });
      return;
    }
    await withRemoteMutation(async () => {
      await api.createGoal(auth.token ?? '', payload);
      await refresh();
    });
  }

  async function updateGoal(id: number, payload: GoalInput) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      hydrateGuestState({
        ...guest,
        goals: guest.goals.map((goal) => (goal.id === id ? { ...goal, ...payload } : goal)),
      });
      return;
    }
    await withRemoteMutation(async () => {
      await api.updateGoal(auth.token ?? '', id, payload);
      await refresh();
    });
  }

  async function deleteGoal(id: number) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      hydrateGuestState({
        ...guest,
        goals: guest.goals.filter((goal) => goal.id !== id),
        tasks: guest.tasks.map((task) => (task.goalId === id ? { ...task, goalId: null, goalTitle: null } : task)),
        sessions: guest.sessions.map((session) =>
          session.goalId === id ? { ...session, goalId: null, goalTitle: null } : session,
        ),
      });
      return;
    }
    await withRemoteMutation(async () => {
      await api.deleteGoal(auth.token ?? '', id);
      await refresh();
    });
  }

  async function createTask(payload: TaskInput) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      const goal = guest.goals.find((item) => item.id === payload.goalId);
      const task: Task = {
        id: Date.now(),
        goalId: payload.goalId ?? null,
        goalTitle: goal?.title ?? null,
        title: payload.title,
        description: payload.description ?? null,
        status: payload.status ?? 'TODO',
        estimatedSessions: payload.estimatedSessions ?? 1,
        dueDate: payload.dueDate ?? null,
        createdAt: new Date().toISOString(),
      };
      hydrateGuestState({ ...guest, tasks: [task, ...guest.tasks] });
      return;
    }
    await withRemoteMutation(async () => {
      await api.createTask(auth.token ?? '', payload);
      await refresh();
    });
  }

  async function updateTask(id: number, payload: TaskInput) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      const goal = guest.goals.find((item) => item.id === payload.goalId);
      hydrateGuestState({
        ...guest,
        tasks: guest.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                ...payload,
                goalTitle: payload.goalId ? goal?.title ?? null : null,
              }
            : task,
        ),
      });
      return;
    }
    await withRemoteMutation(async () => {
      await api.updateTask(auth.token ?? '', id, payload);
      await refresh();
    });
  }

  async function deleteTask(id: number) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      hydrateGuestState({
        ...guest,
        tasks: guest.tasks.filter((task) => task.id !== id),
        sessions: guest.sessions.map((session) =>
          session.taskId === id ? { ...session, taskId: null, taskTitle: null } : session,
        ),
      });
      return;
    }
    await withRemoteMutation(async () => {
      await api.deleteTask(auth.token ?? '', id);
      await refresh();
    });
  }

  async function createSession(payload: FocusSessionInput) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      const goal = guest.goals.find((item) => item.id === payload.goalId);
      const task = guest.tasks.find((item) => item.id === payload.taskId);
      const session: FocusSession = {
        id: Date.now(),
        goalId: goal?.id ?? null,
        goalTitle: goal?.title ?? null,
        taskId: task?.id ?? null,
        taskTitle: task?.title ?? null,
        type: payload.type,
        status: payload.status ?? 'SCHEDULED',
        durationMinutes: payload.durationMinutes ?? settings.focusMinutes,
        remainingSeconds: durationToSeconds(payload.durationMinutes ?? settings.focusMinutes),
        scheduledFor: payload.scheduledFor ?? null,
        startedAt: null,
        lastResumedAt: null,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      const referenceDate = new Date();
      const nextSession = applySessionStatus(session, session.status, referenceDate);
      const nextSessions = nextSession.status === 'RUNNING'
        ? guest.sessions.map((item) => item.status === 'RUNNING' ? pauseSessionState(item, referenceDate) : item)
        : guest.sessions;
      const nextTasks = markTaskDoneIfNeeded(guest.tasks, nextSession);
      hydrateGuestState({ ...guest, tasks: nextTasks, sessions: [nextSession, ...nextSessions] });
      return nextSession;
    }
    let createdSession: FocusSession | undefined;
    await withRemoteMutation(async () => {
      createdSession = await api.createSession(auth.token ?? '', payload);
      await refresh();
    });
    return createdSession;
  }

  async function updateSession(id: number, payload: FocusSessionInput) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      const currentSession = guest.sessions.find((session) => session.id === id);
      if (!currentSession) {
        return;
      }
      const referenceDate = new Date();
      const goalId = payload.goalId === undefined ? currentSession.goalId : payload.goalId ?? null;
      const taskId = payload.taskId === undefined ? currentSession.taskId : payload.taskId ?? null;
      const goal = guest.goals.find((item) => item.id === goalId);
      const task = guest.tasks.find((item) => item.id === taskId);
      const nextSessionBase = normalizeSession({
        ...currentSession,
        goalId,
        goalTitle: goalId ? goal?.title ?? null : null,
        taskId,
        taskTitle: taskId ? task?.title ?? null : null,
        type: payload.type,
        durationMinutes: payload.durationMinutes ?? currentSession.durationMinutes,
        scheduledFor: payload.scheduledFor === undefined ? currentSession.scheduledFor : payload.scheduledFor ?? null,
      });
      const nextStatus = payload.status ?? currentSession.status;
      const nextSession = applySessionStatus(nextSessionBase, nextStatus, referenceDate);
      const nextSessions = guest.sessions.map((session) => {
        if (session.id === id) {
          return nextSession;
        }
        if (nextStatus === 'RUNNING' && session.status === 'RUNNING') {
          return pauseSessionState(session, referenceDate);
        }
        return session;
      });
      const nextTasks = markTaskDoneIfNeeded(guest.tasks, nextSession);
      hydrateGuestState({
        ...guest,
        tasks: nextTasks,
        sessions: nextSessions,
      });
      return;
    }
    await withRemoteMutation(async () => {
      await api.updateSession(auth.token ?? '', id, payload);
      await refresh();
    });
  }

  async function completeSession(id: number) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      const nextSessions = guest.sessions.map((session) =>
        session.id === id
          ? completeSessionState(session, new Date())
          : session,
      );
      const nextTasks = guest.tasks.map((task) =>
        nextSessions.some((session) =>
          session.id === id
            && session.taskId === task.id
            && session.type === 'POMODORO'
            && session.status === 'COMPLETED'
        )
          ? { ...task, status: 'DONE' as const }
          : task,
      );
      hydrateGuestState({ ...guest, sessions: nextSessions, tasks: nextTasks });
      return;
    }
    await withRemoteMutation(async () => {
      await api.completeSession(auth.token ?? '', id);
      await refresh();
    });
  }

  async function deleteSession(id: number) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      hydrateGuestState({ ...guest, sessions: guest.sessions.filter((session) => session.id !== id) });
      return;
    }
    await withRemoteMutation(async () => {
      await api.deleteSession(auth.token ?? '', id);
      await refresh();
    });
  }

  async function updateSettings(payload: SettingsInput) {
    if (!auth) return;
    if (isGuest) {
      const guest = rehydrateGuest();
      hydrateGuestState({
        ...guest,
        settings: { ...guest.settings, ...payload },
      });
      return;
    }
    await withRemoteMutation(async () => {
      await api.updateSettings(auth.token ?? '', payload);
      await refresh();
    });
  }

  function updateFocusAudio(payload: Partial<FocusAudioPreferences>) {
    const scope = getFocusAudioScope(auth);
    setFocusAudio((current) => {
      const nextValue = { ...current, ...payload };
      writeFocusAudioPreferences(scope, nextValue);
      return nextValue;
    });
  }

  async function startIntegrationConnect(provider: IntegrationProvider) {
    if (!auth || isGuest) {
      return null;
    }
    let redirectUrl: string | null = null;
    await withRemoteMutation(async () => {
      const response = await api.startIntegrationConnect(auth.token ?? '', provider);
      redirectUrl = response.redirectUrl;
    });
    return redirectUrl;
  }

  async function disconnectIntegration(accountId: number) {
    if (!auth || isGuest) {
      return;
    }
    await withRemoteMutation(async () => {
      await api.deleteIntegration(auth.token ?? '', accountId);
      await refresh();
    });
  }

  async function updateIntegrationConfig(accountId: number, config: Record<string, unknown>) {
    if (!auth || isGuest) {
      return;
    }
    await withRemoteMutation(async () => {
      await api.updateIntegrationConfig(auth.token ?? '', accountId, config);
      await refresh();
    });
  }

  async function refreshIntegrationToken(accountId: number) {
    if (!auth || isGuest) {
      return null;
    }
    let response: IntegrationTokenRefreshResponse | null = null;
    await withRemoteMutation(async () => {
      response = await api.refreshIntegrationToken(auth.token ?? '', accountId);
      if (response) {
        setIntegrations((current) => current.map((integration) => (
          integration.id === accountId
            ? { ...integration, tokenExpiresAt: response.expiresAt }
            : integration
        )));
      }
    });
    return response;
  }

  async function getIntegrationLinks(accountId: number) {
    if (!auth || isGuest) {
      return [];
    }
    try {
      const links = await api.getIntegrationLinks(auth.token ?? '', accountId);
      setError(null);
      return links;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Request failed');
      throw err;
    }
  }

  async function createIntegrationLink(accountId: number, payload: IntegrationLinkInput) {
    if (!auth || isGuest) {
      return;
    }
    let createdLink: IntegrationLink | undefined;
    await withRemoteMutation(async () => {
      createdLink = await api.createIntegrationLink(auth.token ?? '', accountId, payload);
    });
    return createdLink;
  }

  async function deleteIntegrationLink(accountId: number, linkId: number) {
    if (!auth || isGuest) {
      return;
    }
    await withRemoteMutation(async () => {
      await api.deleteIntegrationLink(auth.token ?? '', accountId, linkId);
    });
  }

  const value = useMemo(
    () => ({
      auth,
      goals,
      tasks,
      sessions,
      calendar,
      settings,
      focusAudio,
      integrations,
      analytics,
      isReady,
      isAuthenticated,
      isGuest,
      error,
      login,
      register,
      loginAsGuest,
      logout,
      refresh,
      createGoal,
      updateGoal,
      deleteGoal,
      createTask,
      updateTask,
      deleteTask,
      createSession,
      updateSession,
      completeSession,
      deleteSession,
      updateSettings,
      updateFocusAudio,
      startIntegrationConnect,
      disconnectIntegration,
      updateIntegrationConfig,
      refreshIntegrationToken,
      getIntegrationLinks,
      createIntegrationLink,
      deleteIntegrationLink,
      showError,
      clearError,
    }),
    [auth, goals, tasks, sessions, calendar, settings, focusAudio, integrations, analytics, isReady, isAuthenticated, isGuest, error],
  );

  return <ChronosContext.Provider value={value}>{children}</ChronosContext.Provider>;
}

export function useChronos() {
  const context = useContext(ChronosContext);
  if (!context) {
    throw new Error('useChronos must be used inside ChronosProvider');
  }
  return context;
}
