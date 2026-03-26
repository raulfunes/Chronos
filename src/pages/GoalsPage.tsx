import React, { useMemo, useState } from 'react';
import { Panel } from '../components/shared/Panel';
import { useChronos } from '../lib/chronos-context';

export function GoalsPage() {
  const { goals, tasks, createGoal, createTask, deleteGoal, updateTask } = useChronos();
  const [goalForm, setGoalForm] = useState({ title: '', description: '', targetDate: '' });
  const [taskForm, setTaskForm] = useState({ goalId: '', title: '', estimatedSessions: 1, dueDate: '' });

  const taskGroups = useMemo(() => {
    return goals.map((goal) => ({
      goal,
      tasks: tasks.filter((task) => task.goalId === goal.id),
    }));
  }, [goals, tasks]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <Panel className="p-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Goals overview</p>
          <div className="mt-6 space-y-4">
            {taskGroups.length === 0 && <p className="text-sm text-on-surface-variant">Create your first goal to start structuring your work.</p>}
            {taskGroups.map(({ goal, tasks: goalTasks }) => (
              <div key={goal.id} className="rounded-[1.75rem] border border-outline/10 bg-background p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-primary">{goal.priority} priority</p>
                    <h3 className="mt-2 font-headline text-2xl font-bold">{goal.title}</h3>
                    <p className="mt-2 text-sm text-on-surface-variant">{goal.description || 'No description yet.'}</p>
                  </div>
                  <button className="text-xs uppercase tracking-[0.2em] text-on-surface-variant" onClick={() => void deleteGoal(goal.id)}>
                    Delete
                  </button>
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-linear-to-r from-primary to-primary-container" style={{ width: `${goal.progress}%` }} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                  <span>{goal.progress}% complete</span>
                  <span>{goal.completedTaskCount}/{goal.taskCount} tasks</span>
                  <span>{goal.completedSessions}/{goal.totalSessions} sessions</span>
                </div>
                <div className="mt-5 space-y-3">
                  {goalTasks.length === 0 && <p className="text-sm text-on-surface-variant">No tasks linked to this goal yet.</p>}
                  {goalTasks.map((task) => (
                    <button
                      key={task.id}
                      className="flex w-full items-center justify-between rounded-2xl border border-outline/10 bg-surface px-4 py-3 text-left"
                      onClick={() =>
                        void updateTask(task.id, {
                          goalId: task.goalId,
                          title: task.title,
                          description: task.description ?? undefined,
                          estimatedSessions: task.estimatedSessions,
                          dueDate: task.dueDate,
                          status: task.status === 'DONE' ? 'IN_PROGRESS' : 'DONE',
                        })
                      }
                    >
                      <span>
                        <span className="block font-semibold">{task.title}</span>
                        <span className="text-sm text-on-surface-variant">{task.estimatedSessions} estimated sessions</span>
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${task.status === 'DONE' ? 'bg-primary/15 text-primary' : 'bg-background text-on-surface-variant'}`}>
                        {task.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">New goal</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createGoal({
                title: goalForm.title,
                description: goalForm.description,
                targetDate: goalForm.targetDate || null,
                status: 'IN_PROGRESS',
              });
              setGoalForm({ title: '', description: '', targetDate: '' });
            }}
          >
            <input className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none" placeholder="Finish architecture review" value={goalForm.title} onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))} required />
            <textarea className="min-h-28 w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none" placeholder="Define why this goal matters" value={goalForm.description} onChange={(event) => setGoalForm((current) => ({ ...current, description: event.target.value }))} />
            <input type="date" className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none" value={goalForm.targetDate} onChange={(event) => setGoalForm((current) => ({ ...current, targetDate: event.target.value }))} />
            <button className="w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-[0.25em] text-background">Create goal</button>
          </form>
        </Panel>

        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">New task</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createTask({
                goalId: taskForm.goalId ? Number(taskForm.goalId) : null,
                title: taskForm.title,
                estimatedSessions: taskForm.estimatedSessions,
                dueDate: taskForm.dueDate || null,
                status: 'TODO',
              });
              setTaskForm({ goalId: '', title: '', estimatedSessions: 1, dueDate: '' });
            }}
          >
            <select className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none" value={taskForm.goalId} onChange={(event) => setTaskForm((current) => ({ ...current, goalId: event.target.value }))}>
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
            <input className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none" placeholder="Prepare outline" value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} required />
            <input type="number" min={1} className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none" value={taskForm.estimatedSessions} onChange={(event) => setTaskForm((current) => ({ ...current, estimatedSessions: Number(event.target.value) }))} />
            <input type="date" className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
            <button className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 text-sm font-bold uppercase tracking-[0.25em] text-on-surface">Create task</button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
