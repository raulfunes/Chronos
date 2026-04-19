import React, { useMemo, useState } from 'react';
import {
  EntityEditorIntent,
  EntityEditorModal,
  EntityEditorMode,
  GoalEditorDraft,
  TaskEditorDraft,
} from '../components/shared/EntityEditorModal';
import { Panel } from '../components/shared/Panel';
import { useChronos } from '../lib/chronos-context';
import { Goal, GoalInput, GoalStatus, Task, TaskInput, TaskStatus } from '../types';

const DEFAULT_GOAL_DRAFT: GoalEditorDraft = {
  title: '',
  description: '',
  status: 'IN_PROGRESS',
  priority: 'MEDIUM',
  targetDate: '',
};

const DEFAULT_TASK_DRAFT: TaskEditorDraft = {
  goalId: '',
  title: '',
  description: '',
  status: 'TODO',
  estimatedSessions: 1,
  dueDate: '',
};

type ViewMode = 'goals' | 'tasks';
type GoalListFilter = 'all' | 'with-tasks' | 'without-tasks';
type TaskListFilter = 'all' | 'with-goal' | 'no-goal';
type GoalStatusFilter = GoalStatus | 'ALL';
type TaskStatusFilter = TaskStatus | 'ALL';

type GoalModalState =
  | {
      kind: 'goal';
      intent: 'create';
      mode: 'form';
      draft: GoalEditorDraft;
    }
  | {
      kind: 'goal';
      intent: 'edit';
      mode: EntityEditorMode;
      entityId: number;
      draft: GoalEditorDraft;
    };

type TaskModalState =
  | {
      kind: 'task';
      intent: 'create';
      mode: 'form';
      draft: TaskEditorDraft;
    }
  | {
      kind: 'task';
      intent: 'edit';
      mode: EntityEditorMode;
      entityId: number;
      draft: TaskEditorDraft;
    };

type EntityModalState = GoalModalState | TaskModalState;

const GOAL_FILTER_OPTIONS: Array<{ value: GoalListFilter; label: string }> = [
  { value: 'all', label: 'All goals' },
  { value: 'with-tasks', label: 'With tasks' },
  { value: 'without-tasks', label: 'Without tasks' },
];

const TASK_FILTER_OPTIONS: Array<{ value: TaskListFilter; label: string }> = [
  { value: 'all', label: 'All tasks' },
  { value: 'with-goal', label: 'Linked to goal' },
  { value: 'no-goal', label: 'No goal' },
];

const GOAL_STATUS_OPTIONS: Array<{ value: GoalStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
];

const TASK_STATUS_OPTIONS: Array<{ value: TaskStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
];

function createGoalDraft(goal?: Goal): GoalEditorDraft {
  if (!goal) {
    return { ...DEFAULT_GOAL_DRAFT };
  }

  return {
    title: goal.title,
    description: goal.description ?? '',
    status: goal.status,
    priority: goal.priority,
    targetDate: goal.targetDate ?? '',
  };
}

function createTaskDraft(task?: Task): TaskEditorDraft {
  if (!task) {
    return { ...DEFAULT_TASK_DRAFT };
  }

  return {
    goalId: task.goalId == null ? '' : String(task.goalId),
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    estimatedSessions: task.estimatedSessions,
    dueDate: task.dueDate ?? '',
  };
}

function goalDraftToInput(draft: GoalEditorDraft): GoalInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    status: draft.status,
    priority: draft.priority,
    targetDate: draft.targetDate || null,
  };
}

function taskDraftToInput(draft: TaskEditorDraft): TaskInput {
  return {
    goalId: draft.goalId ? Number(draft.goalId) : null,
    title: draft.title.trim(),
    description: draft.description.trim(),
    status: draft.status,
    estimatedSessions: draft.estimatedSessions,
    dueDate: draft.dueDate || null,
  };
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function getGoalStatusClasses(status: GoalStatus) {
  switch (status) {
    case 'DONE':
      return 'bg-primary/15 text-primary';
    case 'IN_PROGRESS':
      return 'bg-secondary/14 text-secondary';
    case 'NOT_STARTED':
      return 'bg-background text-on-surface-variant';
  }
}

function getTaskStatusClasses(status: TaskStatus) {
  switch (status) {
    case 'DONE':
      return 'bg-primary/15 text-primary';
    case 'IN_PROGRESS':
      return 'bg-secondary/14 text-secondary';
    case 'TODO':
      return 'bg-background text-on-surface-variant';
  }
}

function handleInteractiveCardKeyDown(event: React.KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.currentTarget !== event.target) {
    return;
  }

  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  action();
}

export function GoalsPage() {
  const { goals, tasks, createGoal, createTask, updateGoal, deleteGoal, updateTask, deleteTask } = useChronos();
  const [viewMode, setViewMode] = useState<ViewMode>('goals');
  const [searchQuery, setSearchQuery] = useState('');
  const [goalStatusFilter, setGoalStatusFilter] = useState<GoalStatusFilter>('IN_PROGRESS');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('IN_PROGRESS');
  const [goalListFilter, setGoalListFilter] = useState<GoalListFilter>('all');
  const [taskListFilter, setTaskListFilter] = useState<TaskListFilter>('all');
  const [activeModal, setActiveModal] = useState<EntityModalState | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const sortedGoals = useMemo(() => sortByCreatedAtDesc(goals), [goals]);
  const sortedTasks = useMemo(() => sortByCreatedAtDesc(tasks), [tasks]);
  const goalOptions = useMemo(() => goals.map((goal) => ({ id: goal.id, title: goal.title })), [goals]);
  const normalizedSearchQuery = useMemo(() => normalizeSearch(searchQuery), [searchQuery]);

  const visibleGoals = useMemo(() => {
    return sortedGoals.filter((goal) => {
      if (goalStatusFilter !== 'ALL' && goal.status !== goalStatusFilter) {
        return false;
      }

      if (goalListFilter === 'with-tasks' && goal.taskCount === 0) {
        return false;
      }

      if (goalListFilter === 'without-tasks' && goal.taskCount > 0) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = `${goal.title} ${goal.description ?? ''}`.toLowerCase();
      return searchableText.includes(normalizedSearchQuery);
    });
  }, [sortedGoals, goalStatusFilter, goalListFilter, normalizedSearchQuery]);

  const visibleTasks = useMemo(() => {
    return sortedTasks.filter((task) => {
      if (taskStatusFilter !== 'ALL' && task.status !== taskStatusFilter) {
        return false;
      }

      if (taskListFilter === 'with-goal' && task.goalId == null) {
        return false;
      }

      if (taskListFilter === 'no-goal' && task.goalId != null) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = `${task.title} ${task.description ?? ''} ${task.goalTitle ?? ''}`.toLowerCase();
      return searchableText.includes(normalizedSearchQuery);
    });
  }, [sortedTasks, taskStatusFilter, taskListFilter, normalizedSearchQuery]);

  function openGoalModal(intent: EntityEditorIntent, goal?: Goal) {
    if (intent === 'create') {
      setActiveModal({
        kind: 'goal',
        intent: 'create',
        mode: 'form',
        draft: createGoalDraft(),
      });
      return;
    }

    if (!goal) {
      return;
    }

    setActiveModal({
      kind: 'goal',
      intent: 'edit',
      entityId: goal.id,
      mode: 'form',
      draft: createGoalDraft(goal),
    });
  }

  function openTaskModal(intent: EntityEditorIntent, task?: Task) {
    if (intent === 'create') {
      setActiveModal({
        kind: 'task',
        intent: 'create',
        mode: 'form',
        draft: createTaskDraft(),
      });
      return;
    }

    if (!task) {
      return;
    }

    setActiveModal({
      kind: 'task',
      intent: 'edit',
      entityId: task.id,
      mode: 'form',
      draft: createTaskDraft(task),
    });
  }

  function closeModal() {
    if (isSubmittingModal) {
      return;
    }

    setActiveModal(null);
  }

  function handleGoalDraftChange(patch: Partial<GoalEditorDraft>) {
    setActiveModal((current) =>
      current?.kind === 'goal'
        ? { ...current, draft: { ...current.draft, ...patch } }
        : current,
    );
  }

  function handleTaskDraftChange(patch: Partial<TaskEditorDraft>) {
    setActiveModal((current) =>
      current?.kind === 'task'
        ? { ...current, draft: { ...current.draft, ...patch } }
        : current,
    );
  }

  function toggleDeleteMode() {
    setActiveModal((current) => {
      if (!current || current.intent !== 'edit') {
        return current;
      }

      return {
        ...current,
        mode: current.mode === 'form' ? 'confirm-delete' : 'form',
      };
    });
  }

  async function handleModalSubmit() {
    if (!activeModal) {
      return;
    }

    setIsSubmittingModal(true);

    try {
      if (activeModal.kind === 'goal') {
        const payload = goalDraftToInput(activeModal.draft);

        if (activeModal.intent === 'create') {
          await createGoal(payload);
        } else {
          await updateGoal(activeModal.entityId, payload);
        }
      } else {
        const payload = taskDraftToInput(activeModal.draft);

        if (activeModal.intent === 'create') {
          await createTask(payload);
        } else {
          await updateTask(activeModal.entityId, payload);
        }
      }

      setActiveModal(null);
    } catch {
      return;
    } finally {
      setIsSubmittingModal(false);
    }
  }

  async function handleModalDelete() {
    if (!activeModal || activeModal.intent !== 'edit') {
      return;
    }

    setIsSubmittingModal(true);

    try {
      if (activeModal.kind === 'goal') {
        await deleteGoal(activeModal.entityId);
      } else {
        await deleteTask(activeModal.entityId);
      }

      setActiveModal(null);
    } catch {
      return;
    } finally {
      setIsSubmittingModal(false);
    }
  }

  function renderGoalCard(goal: Goal) {
    const targetDateLabel = formatDisplayDate(goal.targetDate);

    return (
      <div
        key={goal.id}
        aria-label={`Manage goal ${goal.title}`}
        className="cursor-pointer rounded-[1.75rem] border border-outline/10 bg-background p-5 transition duration-200 ease-out hover:-translate-y-px hover:border-primary/18 hover:bg-surface/48 hover:shadow-[0_20px_40px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        onClick={() => openGoalModal('edit', goal)}
        onKeyDown={(event) => handleInteractiveCardKeyDown(event, () => openGoalModal('edit', goal))}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.24em] text-primary">{goal.priority} priority</span>
              <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${getGoalStatusClasses(goal.status)}`}>
                {formatStatusLabel(goal.status)}
              </span>
            </div>
            <h3 className="mt-3 font-headline text-2xl font-bold">{goal.title}</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{goal.description || 'No description yet.'}</p>
          </div>
          <button
            className="cursor-pointer rounded-full border border-outline/12 bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant transition duration-200 ease-out hover:-translate-y-px hover:border-primary/22 hover:bg-surface-high hover:text-on-surface hover:shadow-[0_12px_26px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            onClick={(event) => {
              event.stopPropagation();
              openGoalModal('edit', goal);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
              }
            }}
            type="button"
          >
            Manage
          </button>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-linear-to-r from-primary to-primary-container" style={{ width: `${goal.progress}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
          <span>{goal.progress}% complete</span>
          <span>{goal.completedTaskCount}/{goal.taskCount} tasks</span>
          <span>{goal.completedSessions}/{goal.totalSessions} sessions</span>
          {targetDateLabel && <span>Target {targetDateLabel}</span>}
        </div>
      </div>
    );
  }

  function renderTaskCard(task: Task) {
    const dueDateLabel = formatDisplayDate(task.dueDate);

    return (
      <div
        key={task.id}
        aria-label={`Manage task ${task.title}`}
        className="cursor-pointer rounded-[1.75rem] border border-outline/10 bg-background p-5 transition duration-200 ease-out hover:-translate-y-px hover:border-primary/18 hover:bg-surface/48 hover:shadow-[0_20px_40px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        onClick={() => openTaskModal('edit', task)}
        onKeyDown={(event) => handleInteractiveCardKeyDown(event, () => openTaskModal('edit', task))}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${getTaskStatusClasses(task.status)}`}>
                {formatStatusLabel(task.status)}
              </span>
              <span className="text-[10px] uppercase tracking-[0.24em] text-primary">
                {task.goalTitle ? task.goalTitle : 'No goal'}
              </span>
            </div>
            <h3 className="mt-3 font-headline text-2xl font-bold">{task.title}</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{task.description || 'No description yet.'}</p>
          </div>
          <button
            className="cursor-pointer rounded-full border border-outline/12 bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant transition duration-200 ease-out hover:-translate-y-px hover:border-primary/22 hover:bg-surface-high hover:text-on-surface hover:shadow-[0_12px_26px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            onClick={(event) => {
              event.stopPropagation();
              openTaskModal('edit', task);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
              }
            }}
            type="button"
          >
            Manage
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
          <span>{task.estimatedSessions} estimated sessions</span>
          {dueDateLabel && <span>Due {dueDateLabel}</span>}
        </div>
      </div>
    );
  }

  const statusOptions = viewMode === 'goals' ? GOAL_STATUS_OPTIONS : TASK_STATUS_OPTIONS;
  const activeStatusFilter = viewMode === 'goals' ? goalStatusFilter : taskStatusFilter;
  const activeFilterOptions = viewMode === 'goals' ? GOAL_FILTER_OPTIONS : TASK_FILTER_OPTIONS;
  const activeRelationshipFilter = viewMode === 'goals' ? goalListFilter : taskListFilter;
  const activeResults = viewMode === 'goals' ? visibleGoals : visibleTasks;

  return (
    <>
      <Panel className="p-8">
        <div className="grid gap-6 xl:grid-cols-[490px_minmax(0,1fr)]">
          <aside className="self-start rounded-[1.8rem] border border-outline/10 bg-background p-5 xl:sticky xl:top-6">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Board filters</p>
            <h2 className="mt-3 font-headline text-2xl font-bold">Shape the view</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Switch between goals and tasks, then narrow the board by search, status, and relationship.
            </p>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.24em] text-primary">Show</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${
                      viewMode === 'goals'
                        ? 'bg-primary text-background shadow-[0_12px_24px_rgba(255,87,34,0.18)]'
                        : 'border border-outline/12 bg-surface text-on-surface-variant hover:border-primary/22 hover:text-on-surface'
                    }`}
                    onClick={() => setViewMode('goals')}
                    type="button"
                  >
                    Goals
                  </button>
                  <button
                    className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${
                      viewMode === 'tasks'
                        ? 'bg-primary text-background shadow-[0_12px_24px_rgba(255,87,34,0.18)]'
                        : 'border border-outline/12 bg-surface text-on-surface-variant hover:border-primary/22 hover:text-on-surface'
                    }`}
                    onClick={() => setViewMode('tasks')}
                    type="button"
                  >
                    Tasks
                  </button>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-[10px] uppercase tracking-[0.24em] text-primary">Search</span>
                <input
                  className="w-full rounded-2xl border border-outline/10 bg-surface px-4 py-3 outline-none transition focus:border-primary/24 focus:bg-surface-high/80"
                  placeholder={viewMode === 'goals' ? 'Filter goals by title or description' : 'Filter tasks by title, description, or goal'}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] uppercase tracking-[0.24em] text-primary">Status</span>
                <select
                  className="dark-select w-full cursor-pointer rounded-2xl border border-outline/10 bg-surface px-4 py-3 outline-none transition focus:border-primary/24 focus:bg-surface-high/80"
                  value={activeStatusFilter}
                  onChange={(event) => {
                    if (viewMode === 'goals') {
                      setGoalStatusFilter(event.target.value as GoalStatusFilter);
                      return;
                    }

                    setTaskStatusFilter(event.target.value as TaskStatusFilter);
                  }}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] uppercase tracking-[0.24em] text-primary">Filter</span>
                <select
                  className="dark-select w-full cursor-pointer rounded-2xl border border-outline/10 bg-surface px-4 py-3 outline-none transition focus:border-primary/24 focus:bg-surface-high/80"
                  value={activeRelationshipFilter}
                  onChange={(event) => {
                    if (viewMode === 'goals') {
                      setGoalListFilter(event.target.value as GoalListFilter);
                      return;
                    }

                    setTaskListFilter(event.target.value as TaskListFilter);
                  }}
                >
                  {activeFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-[1.4rem] border border-outline/10 bg-surface px-4 py-3">
                <span className="text-[10px] uppercase tracking-[0.24em] text-primary">Default sort</span>
                <p className="mt-2 text-sm text-on-surface">Newest created first</p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">The board opens focused on items currently in progress.</p>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-outline/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Operational board</p>
                <h2 className="mt-3 font-headline text-3xl font-bold">
                  {viewMode === 'goals' ? 'Goals in motion' : 'Tasks in motion'}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                  {viewMode === 'goals'
                    ? 'Open any goal to edit details, review progress, or confirm deletion without leaving the board.'
                    : 'Scan active tasks quickly, then open any item to edit, reassign, or confirm deletion from the shared modal.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="cursor-pointer rounded-full border border-outline/12 bg-background px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant transition duration-200 ease-out hover:-translate-y-px hover:border-primary/22 hover:bg-surface-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  onClick={() => openGoalModal('create')}
                  type="button"
                >
                  New goal
                </button>
                <button
                  className="cursor-pointer rounded-full border border-outline/12 bg-background px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant transition duration-200 ease-out hover:-translate-y-px hover:border-secondary/28 hover:bg-surface-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30"
                  onClick={() => openTaskModal('create')}
                  type="button"
                >
                  New task
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                <span>{activeResults.length} results</span>
                <span className="h-1 w-1 rounded-full bg-outline/30" />
                <span>{formatStatusLabel(activeStatusFilter === 'ALL' ? 'all statuses' : activeStatusFilter)}</span>
                <span className="h-1 w-1 rounded-full bg-outline/30" />
                <span>{viewMode === 'goals' ? 'Grouped as goals' : 'Listed as tasks'}</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {activeResults.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-outline/18 bg-background px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-on-surface">
                    {viewMode === 'goals'
                      ? 'No goals match the current filters.'
                      : 'No tasks match the current filters.'}
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Try adjusting the status or filter selector, or create a new {viewMode === 'goals' ? 'goal' : 'task'} from the buttons above.
                  </p>
                </div>
              ) : viewMode === 'goals' ? (
                visibleGoals.map(renderGoalCard)
              ) : (
                visibleTasks.map(renderTaskCard)
              )}
            </div>
          </div>
        </div>
      </Panel>

      {activeModal?.kind === 'goal' && (
        <EntityEditorModal
          kind="goal"
          intent={activeModal.intent}
          mode={activeModal.mode}
          draft={activeModal.draft}
          isSubmitting={isSubmittingModal}
          onChange={handleGoalDraftChange}
          onSubmit={() => void handleModalSubmit()}
          onRequestDelete={activeModal.intent === 'edit' ? toggleDeleteMode : undefined}
          onConfirmDelete={activeModal.intent === 'edit' ? () => void handleModalDelete() : undefined}
          onClose={closeModal}
        />
      )}

      {activeModal?.kind === 'task' && (
        <EntityEditorModal
          kind="task"
          intent={activeModal.intent}
          mode={activeModal.mode}
          draft={activeModal.draft}
          goals={goalOptions}
          isSubmitting={isSubmittingModal}
          onChange={handleTaskDraftChange}
          onSubmit={() => void handleModalSubmit()}
          onRequestDelete={activeModal.intent === 'edit' ? toggleDeleteMode : undefined}
          onConfirmDelete={activeModal.intent === 'edit' ? () => void handleModalDelete() : undefined}
          onClose={closeModal}
        />
      )}
    </>
  );
}
