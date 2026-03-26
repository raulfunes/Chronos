import React from 'react';
import { Calendar, CheckSquare, LogOut, Settings, Timer } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useChronos } from '../lib/chronos-context';

const navItems = [
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/goals', label: 'Goals', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { auth, analytics, logout } = useChronos();

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-72 border-r border-outline/15 bg-background/95 px-5 py-8 backdrop-blur xl:flex xl:flex-col">
      <div className="mb-12 flex items-center gap-4 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-container text-background shadow-lg shadow-primary/20">
          <Timer className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight">Chronos</h1>
          <p className="text-[10px] uppercase tracking-[0.35em] text-on-surface-variant/60">Rhythmic Sanctuary</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-headline transition ${
                active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-[2rem] border border-primary/10 bg-primary/5 p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Momentum</p>
        <p className="mt-3 font-headline text-4xl font-bold">{analytics?.completedSessions ?? 0}</p>
        <p className="text-sm text-on-surface-variant">completed sessions</p>
        <p className="mt-6 text-xs uppercase tracking-[0.24em] text-on-surface-variant/60">
          {analytics?.focusMinutes ?? 0} focused minutes
        </p>
      </div>

      <div className="mt-auto rounded-[2rem] border border-outline/10 bg-surface p-5">
        <p className="text-sm font-semibold">{auth?.displayName}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
          {auth?.role === 'GUEST' ? 'Guest mode' : auth?.email}
        </p>
        <button
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-outline/10 bg-background px-4 py-3 text-sm font-semibold text-on-surface-variant transition hover:text-on-surface"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
