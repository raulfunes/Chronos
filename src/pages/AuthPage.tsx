import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../components/shared/Panel';
import { useChronos } from '../lib/chronos-context';

export function AuthPage() {
  const navigate = useNavigate();
  const { login, register, loginAsGuest } = useChronos();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate('/focus');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGuest() {
    setSubmitting(true);
    setError(null);
    try {
      await loginAsGuest();
      navigate('/focus');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest session failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,181,160,0.12),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(102,217,204,0.08),_transparent_30%)]" />
      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="flex min-h-[540px] flex-col justify-between bg-linear-to-br from-surface to-background p-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-primary">Chronos MVP</p>
            <h1 className="mt-4 max-w-lg font-headline text-5xl font-extrabold tracking-tight">
              Productivity that turns intention into measurable sessions.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-on-surface-variant">
              Plan goals, convert them into focus blocks, execute Pomodoros, and inspect your progress without depending on mock data.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Goals', 'Track meaningful outcomes and their real completion rate.'],
              ['Focus', 'Run active sessions with presets and completion logging.'],
              ['Calendar', 'See scheduled and completed work in one place.'],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-outline/10 bg-surface/70 p-4">
                <p className="font-headline text-lg font-bold">{title}</p>
                <p className="mt-2 text-sm text-on-surface-variant">{copy}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-8">
          <div className="mb-8 flex rounded-2xl bg-background p-1">
            <button
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${mode === 'login' ? 'bg-primary text-background' : 'text-on-surface-variant'}`}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${mode === 'register' ? 'bg-primary text-background' : 'text-on-surface-variant'}`}
              onClick={() => setMode('register')}
            >
              Create account
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-on-surface-variant">Display name</span>
                <input
                  className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none ring-0"
                  value={form.displayName}
                  onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-on-surface-variant">Email</span>
              <input
                type="email"
                className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none ring-0"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-on-surface-variant">Password</span>
              <input
                type="password"
                className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 outline-none ring-0"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                minLength={8}
              />
            </label>

            {error && <p className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{error}</p>}

            <button className="w-full rounded-2xl bg-linear-to-r from-primary to-primary-container px-4 py-4 font-headline text-sm font-bold uppercase tracking-[0.25em] text-background" disabled={submitting}>
              {submitting ? 'Processing' : mode === 'login' ? 'Enter Chronos' : 'Create workspace'}
            </button>
          </form>

          <div className="my-6 h-px bg-outline/10" />

          <button
            className="w-full rounded-2xl border border-outline/10 bg-background px-4 py-4 text-sm font-semibold text-on-surface-variant transition hover:text-on-surface"
            disabled={submitting}
            onClick={handleGuest}
          >
            Continue in guest mode
          </button>
        </Panel>
      </div>
    </div>
  );
}
