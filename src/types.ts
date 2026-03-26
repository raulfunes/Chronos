export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type SessionType = 'POMODORO' | 'SHORT_BREAK' | 'LONG_BREAK';
export type SessionStatus = 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type UserRole = 'USER' | 'GUEST';
export type AmbientSound = 'NONE' | 'RAIN' | 'RIVER' | 'WHITE_NOISE';
export type AudioScope = 'FOCUS_ONLY' | 'ALL_SESSIONS';
export type IntegrationProvider = 'SPOTIFY' | 'JIRA';
export type IntegrationStatus = 'ACTIVE' | 'NEEDS_RECONNECT' | 'ERROR';
export type IntegrationAuthType = 'OAUTH2_AUTHORIZATION_CODE' | 'API_TOKEN';

export interface User {
  userId: number;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface AuthResponse extends User {
  token: string | null;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  status: GoalStatus;
  priority: GoalPriority;
  targetDate: string | null;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  totalSessions: number;
  completedSessions: number;
  createdAt: string;
}

export interface Task {
  id: number;
  goalId: number | null;
  goalTitle: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  estimatedSessions: number;
  dueDate: string | null;
  createdAt: string;
}

export interface FocusSession {
  id: number;
  goalId: number | null;
  goalTitle: string | null;
  taskId: number | null;
  taskTitle: string | null;
  type: SessionType;
  status: SessionStatus;
  durationMinutes: number;
  remainingSeconds: number;
  scheduledFor: string | null;
  startedAt: string | null;
  lastResumedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CalendarEntry {
  sessionId: number;
  goalId: number | null;
  goalTitle: string | null;
  taskId: number | null;
  taskTitle: string | null;
  type: SessionType;
  status: SessionStatus;
  durationMinutes: number;
  scheduledFor: string | null;
}

export interface TimerPreset {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export interface UserSettings extends TimerPreset {
  id: number;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  theme: string;
  ambientSound: AmbientSound;
  ambientVolume: number;
  audioScope: AudioScope;
}

export interface AnalyticsSummary {
  activeGoals: number;
  completedTasks: number;
  completedSessions: number;
  focusMinutes: number;
  currentStreak: number;
  goalProgress: Array<{
    goalId: number;
    title: string;
    progress: number;
  }>;
}

export interface GoalInput {
  title: string;
  description?: string;
  status?: GoalStatus;
  priority?: GoalPriority;
  targetDate?: string | null;
}

export interface TaskInput {
  goalId?: number | null;
  title: string;
  description?: string;
  status?: TaskStatus;
  estimatedSessions?: number;
  dueDate?: string | null;
}

export interface FocusSessionInput {
  goalId?: number | null;
  taskId?: number | null;
  type: SessionType;
  status?: SessionStatus;
  durationMinutes?: number;
  scheduledFor?: string | null;
}

export interface SettingsInput {
  focusMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
  desktopNotifications?: boolean;
  soundEnabled?: boolean;
  theme?: string;
  ambientSound?: AmbientSound;
  ambientVolume?: number;
  audioScope?: AudioScope;
}

export interface IntegrationAccount {
  id: number;
  provider: IntegrationProvider;
  providerAccountId: string;
  displayName: string | null;
  status: IntegrationStatus;
  authType: IntegrationAuthType;
  scopes: string[];
  config: Record<string, unknown>;
  lastSyncedAt: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConnectStartResponse {
  provider: IntegrationProvider;
  redirectUrl: string;
}

export interface IntegrationTokenRefreshResponse {
  accessToken: string;
  expiresAt: string;
}

export interface IntegrationLink {
  id: number;
  integrationAccountId: number;
  chronosEntityType: string;
  chronosEntityId: number;
  externalEntityType: string;
  externalEntityId: string;
  externalParentId: string | null;
  linkType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationLinkInput {
  chronosEntityType: string;
  chronosEntityId: number;
  externalEntityType: string;
  externalEntityId: string;
  externalParentId?: string | null;
  linkType: string;
  metadata?: Record<string, unknown>;
}

export interface GuestState {
  goals: Goal[];
  tasks: Task[];
  sessions: FocusSession[];
  settings: UserSettings;
}
