import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Goal, GoalPriority, GoalStatus, TaskStatus } from '../../types';

const GOAL_STATUS_OPTIONS: GoalStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE'];
const GOAL_PRIORITY_OPTIONS: GoalPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const TASK_STATUS_OPTIONS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export type EntityEditorIntent = 'create' | 'edit';
export type EntityEditorMode = 'form' | 'confirm-delete';

export interface GoalEditorDraft {
  title: string;
  description: string;
  status: GoalStatus;
  priority: GoalPriority;
  targetDate: string;
}

export interface TaskEditorDraft {
  goalId: string;
  title: string;
  description: string;
  status: TaskStatus;
  estimatedSessions: number;
  dueDate: string;
}

type SharedEntityEditorModalProps = {
  intent: EntityEditorIntent;
  mode: EntityEditorMode;
  isSubmitting: boolean;
  onClose(): void;
  onSubmit(): void;
  onRequestDelete?(): void;
  onConfirmDelete?(): void;
};

type GoalEntityEditorModalProps = SharedEntityEditorModalProps & {
  kind: 'goal';
  draft: GoalEditorDraft;
  onChange(patch: Partial<GoalEditorDraft>): void;
};

type TaskEntityEditorModalProps = SharedEntityEditorModalProps & {
  kind: 'task';
  draft: TaskEditorDraft;
  goals: Array<Pick<Goal, 'id' | 'title'>>;
  onChange(patch: Partial<TaskEditorDraft>): void;
};

export type EntityEditorModalProps = GoalEntityEditorModalProps | TaskEntityEditorModalProps;

const fieldClassName = 'w-full rounded-2xl border border-outline/12 bg-background px-4 py-4 text-on-surface outline-none transition focus:border-primary/30 focus:bg-surface-high/70';
const textareaClassName = `${fieldClassName} min-h-28 resize-none`;
const selectClassName = `dark-select ${fieldClassName} cursor-pointer`;

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getEntityLabel(kind: 'goal' | 'task') {
  return kind === 'goal' ? 'goal' : 'task';
}

function getEntityName(kind: 'goal' | 'task', title: string) {
  const normalizedTitle = title.trim();
  return normalizedTitle || `Untitled ${getEntityLabel(kind)}`;
}

export function EntityEditorModal(props: EntityEditorModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || props.isSubmitting) {
        return;
      }

      event.preventDefault();
      props.onClose();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [props.isSubmitting, props.onClose]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || props.isSubmitting) {
      return;
    }

    props.onClose();
  }

  const entityLabel = getEntityLabel(props.kind);
  const entityName = getEntityName(props.kind, props.draft.title);
  const titleId = `${props.kind}-${props.intent}-modal-title`;
  const deleteSummary = props.kind === 'goal'
    ? 'Deleting this goal detaches linked tasks and focus sessions. Detached tasks stay visible in No goal.'
    : 'Deleting this task preserves historical focus sessions and only removes the task link.';
  const isDeleteMode = props.intent === 'edit' && props.mode === 'confirm-delete';
  const submitLabel = props.intent === 'create' ? `Create ${entityLabel}` : 'Save changes';
  const submittingLabel = props.intent === 'create' ? 'Creating...' : 'Saving...';

  let eyebrow = props.intent === 'create'
    ? `New ${entityLabel}`
    : `${formatEnumLabel(entityLabel)} editor`;
  let heading = props.intent === 'create'
    ? `Create ${formatEnumLabel(entityLabel)}`
    : entityName;
  let subtitle = props.intent === 'create'
    ? `Fill in the details for the new ${entityLabel}.`
    : `Review details, update the ${entityLabel}, or move into the delete confirmation flow.`;

  if (isDeleteMode) {
    eyebrow = `Confirm ${entityLabel} deletion`;
    heading = `Delete ${formatEnumLabel(entityLabel)}?`;
    subtitle = 'This action removes the entity but keeps linked session history intact.';
  }

  let content: React.ReactNode;

  if (isDeleteMode) {
    content = (
      <div className="mt-6 space-y-5">
        <div className="rounded-[1.6rem] border border-[#ff8f6a]/20 bg-[#ff5722]/[0.08] p-5 shadow-[0_16px_40px_rgba(255,87,34,0.08)]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#ff5722]/[0.16] p-3 text-[#ffb39d]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-on-surface">Delete {entityLabel}?</p>
              <p className="text-sm leading-6 text-on-surface-variant">
                <span className="font-semibold text-on-surface">{entityName}</span> will be removed permanently.
              </p>
              <p className="text-sm leading-6 text-on-surface-variant">{deleteSummary}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="cursor-pointer rounded-2xl border border-outline/12 bg-background px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:-translate-y-px hover:border-outline/28 hover:bg-surface-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45"
            onClick={props.onRequestDelete}
            type="button"
            disabled={props.isSubmitting}
          >
            Back
          </button>
          <button
            className="cursor-pointer rounded-2xl border border-[#ff8f6a]/24 bg-[#ff5722]/[0.12] px-5 py-3 text-sm font-bold uppercase tracking-[0.22em] text-[#ffd2c3] shadow-[0_16px_34px_rgba(255,87,34,0.14)] transition hover:-translate-y-px hover:border-[#ff8f6a]/44 hover:bg-[#ff5722]/[0.2] hover:shadow-[0_22px_44px_rgba(255,87,34,0.22)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={props.onConfirmDelete}
            type="button"
            disabled={props.isSubmitting}
          >
            {props.isSubmitting ? 'Deleting...' : `Confirm delete ${entityLabel}`}
          </button>
        </div>
      </div>
    );
  } else if (props.kind === 'goal') {
    const saveDisabled = props.isSubmitting || !props.draft.title.trim();

    content = (
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <div className="space-y-4">
          <input
            className={fieldClassName}
            placeholder="Name this goal"
            value={props.draft.title}
            onChange={(event) => props.onChange({ title: event.target.value })}
            required
            disabled={props.isSubmitting}
          />
          <textarea
            className={textareaClassName}
            placeholder="Capture the intent behind this goal"
            value={props.draft.description}
            onChange={(event) => props.onChange({ description: event.target.value })}
            disabled={props.isSubmitting}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Status</span>
            <select
              className={selectClassName}
              value={props.draft.status}
              onChange={(event) => props.onChange({ status: event.target.value as GoalStatus })}
              disabled={props.isSubmitting}
            >
              {GOAL_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Priority</span>
            <select
              className={selectClassName}
              value={props.draft.priority}
              onChange={(event) => props.onChange({ priority: event.target.value as GoalPriority })}
              disabled={props.isSubmitting}
            >
              {GOAL_PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {formatEnumLabel(priority)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Target date</span>
          <input
            type="date"
            className={fieldClassName}
            value={props.draft.targetDate}
            onChange={(event) => props.onChange({ targetDate: event.target.value })}
            disabled={props.isSubmitting}
          />
        </label>

        <div className={`flex flex-col gap-3 border-t border-outline/10 pt-5 ${props.intent === 'edit' ? 'sm:flex-row sm:items-center sm:justify-between' : 'sm:items-end'}`}>
          {props.intent === 'edit' && (
            <button
              className="cursor-pointer rounded-2xl border border-[#ff8f6a]/18 bg-[#ff5722]/[0.05] px-5 py-3 text-sm font-semibold text-[#ffb39d] transition hover:-translate-y-px hover:border-[#ff8f6a]/38 hover:bg-[#ff5722]/[0.12] hover:text-[#ffd6cb] disabled:cursor-not-allowed disabled:opacity-45"
              onClick={props.onRequestDelete}
              type="button"
              disabled={props.isSubmitting}
            >
              <span className="inline-flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete goal
              </span>
            </button>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              className="cursor-pointer rounded-2xl border border-outline/12 bg-background px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:-translate-y-px hover:border-outline/28 hover:bg-surface-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45"
              onClick={props.onClose}
              type="button"
              disabled={props.isSubmitting}
            >
              Cancel
            </button>
            <button
              className="cursor-pointer rounded-2xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.24em] text-background shadow-[0_18px_34px_rgba(255,87,34,0.16)] transition hover:-translate-y-px hover:brightness-105 hover:shadow-[0_24px_42px_rgba(255,87,34,0.22)] disabled:cursor-not-allowed disabled:opacity-45"
              type="submit"
              disabled={saveDisabled}
            >
              {props.isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </div>
      </form>
    );
  } else {
    const saveDisabled = props.isSubmitting || !props.draft.title.trim() || props.draft.estimatedSessions < 1;

    content = (
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <div className="space-y-4">
          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Linked goal</span>
            <select
              className={selectClassName}
              value={props.draft.goalId}
              onChange={(event) => props.onChange({ goalId: event.target.value })}
              disabled={props.isSubmitting}
            >
              <option value="">No goal</option>
              {props.goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>
          <input
            className={fieldClassName}
            placeholder="Task title"
            value={props.draft.title}
            onChange={(event) => props.onChange({ title: event.target.value })}
            required
            disabled={props.isSubmitting}
          />
          <textarea
            className={textareaClassName}
            placeholder="Describe the work or definition of done"
            value={props.draft.description}
            onChange={(event) => props.onChange({ description: event.target.value })}
            disabled={props.isSubmitting}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Status</span>
            <select
              className={selectClassName}
              value={props.draft.status}
              onChange={(event) => props.onChange({ status: event.target.value as TaskStatus })}
              disabled={props.isSubmitting}
            >
              {TASK_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Estimated sessions</span>
            <input
              type="number"
              min={1}
              className={fieldClassName}
              value={props.draft.estimatedSessions}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                props.onChange({ estimatedSessions: Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1 });
              }}
              disabled={props.isSubmitting}
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Due date</span>
          <input
            type="date"
            className={fieldClassName}
            value={props.draft.dueDate}
            onChange={(event) => props.onChange({ dueDate: event.target.value })}
            disabled={props.isSubmitting}
          />
        </label>

        <div className={`flex flex-col gap-3 border-t border-outline/10 pt-5 ${props.intent === 'edit' ? 'sm:flex-row sm:items-center sm:justify-between' : 'sm:items-end'}`}>
          {props.intent === 'edit' && (
            <button
              className="cursor-pointer rounded-2xl border border-[#ff8f6a]/18 bg-[#ff5722]/[0.05] px-5 py-3 text-sm font-semibold text-[#ffb39d] transition hover:-translate-y-px hover:border-[#ff8f6a]/38 hover:bg-[#ff5722]/[0.12] hover:text-[#ffd6cb] disabled:cursor-not-allowed disabled:opacity-45"
              onClick={props.onRequestDelete}
              type="button"
              disabled={props.isSubmitting}
            >
              <span className="inline-flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete task
              </span>
            </button>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              className="cursor-pointer rounded-2xl border border-outline/12 bg-background px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:-translate-y-px hover:border-outline/28 hover:bg-surface-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45"
              onClick={props.onClose}
              type="button"
              disabled={props.isSubmitting}
            >
              Cancel
            </button>
            <button
              className="cursor-pointer rounded-2xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.24em] text-background shadow-[0_18px_34px_rgba(255,87,34,0.16)] transition hover:-translate-y-px hover:brightness-105 hover:shadow-[0_24px_42px_rgba(255,87,34,0.22)] disabled:cursor-not-allowed disabled:opacity-45"
              type="submit"
              disabled={saveDisabled}
            >
              {props.isSubmitting ? submittingLabel : submitLabel}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(12,10,10,0.72)] px-4 py-8 backdrop-blur-md"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="glass-panel max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-outline/14 bg-surface/92 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.5)] sm:p-8"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
            <div>
              <h2 className="font-headline text-3xl font-bold text-on-surface" id={titleId}>
                {heading}
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{subtitle}</p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className="cursor-pointer rounded-full border border-outline/12 bg-background p-3 text-on-surface-variant transition hover:border-primary/25 hover:bg-surface-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45"
            onClick={props.onClose}
            type="button"
            disabled={props.isSubmitting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {content}
      </div>
    </div>
  );
}
