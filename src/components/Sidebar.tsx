import React from 'react';
import { Calendar, CheckSquare, ChevronsLeft, ChevronsRight, LogOut, Settings, Timer } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useChronos } from '../lib/chronos-context';

const navItems = [
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/goals', label: 'Goals', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle(): void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { auth, analytics, logout } = useChronos();
  const identityInitial = auth?.displayName?.charAt(0).toUpperCase() ?? 'C';

  return (
    <aside
      className={`fixed left-0 top-0 z-50 hidden h-full overflow-visible border-r border-outline/15 bg-background/95 py-8 backdrop-blur transition-[width,padding] duration-300 md:flex md:flex-col ${
        collapsed ? 'w-28 px-4' : 'w-28 px-4 xl:w-72 xl:px-5'
      }`}
    >
      {/* Toggle — only meaningful at xl+ */}
      <button
        type="button"
        className="absolute right-0 top-8 hidden h-10 w-10 translate-x-1/2 items-center justify-center rounded-full border border-outline/12 bg-surface text-on-surface-variant shadow-[0_16px_34px_rgba(0,0,0,0.28)] transition hover:border-primary/25 hover:text-primary xl:flex"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>

      {/* Logo */}
      <div className={`mb-12 flex items-center justify-center ${!collapsed ? 'xl:gap-4 xl:px-2 xl:justify-start' : ''}`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-container text-background shadow-lg shadow-primary/20">
          <Timer className="h-6 w-6" />
        </div>
        {!collapsed ? (
          <div className="hidden xl:block">
            <h1 className="font-headline text-2xl font-extrabold tracking-tight">Chronos</h1>
            <p className="text-[10px] uppercase tracking-[0.35em] text-on-surface-variant/60">Rhythmic Sanctuary</p>
          </div>
        ) : null}
      </div>

      {/* Nav */}
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center justify-center rounded-2xl py-3 font-headline transition ${
                !collapsed ? 'xl:gap-3 xl:justify-start xl:px-4' : 'px-0'
              } ${
                active ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              {!collapsed ? <span className="hidden xl:inline">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      {/* Momentum card */}
      <div className="mt-8 rounded-[2rem] border border-primary/10 bg-primary/5">
        {/* Compact — always at md, hidden at xl when expanded */}
        <div className={`p-4 text-center ${!collapsed ? 'xl:hidden' : ''}`}>
          <p className="font-headline text-2xl font-bold">{analytics?.focusMinutes ?? 0}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-primary/80">Min</p>
        </div>
        {/* Full — only at xl when expanded */}
        {!collapsed ? (
          <div className="hidden p-5 xl:block">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Momentum</p>
            <p className="mt-3 font-headline text-4xl font-bold">{analytics?.completedSessions ?? 0}</p>
            <p className="text-sm text-on-surface-variant">completed sessions</p>
            <p className="mt-6 text-xs uppercase tracking-[0.24em] text-on-surface-variant/60">
              {analytics?.focusMinutes ?? 0} focused minutes
            </p>
          </div>
        ) : null}
      </div>

      {/* User card */}
      <div className="mt-auto rounded-[2rem] border border-outline/10 bg-surface">
        {/* Compact — always at md, hidden at xl when expanded */}
        <div className={`p-4 ${!collapsed ? 'xl:hidden' : ''}`}>
          <div className="flex flex-col items-center gap-4">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full border border-outline/12 bg-background text-sm font-semibold text-on-surface"
              title={auth?.role === 'GUEST' ? 'Guest mode' : auth?.email}
            >
              {identityInitial}
            </div>
            <button
              type="button"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-outline/10 bg-background text-on-surface-variant transition duration-200 ease-out hover:-translate-y-0.5 hover:border-outline/30 hover:bg-surface-high hover:text-on-surface active:translate-y-0 active:scale-[0.99]"
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Full — only at xl when expanded */}
        {!collapsed ? (
          <div className="hidden p-5 xl:block">
            <p className="text-sm font-semibold">{auth?.displayName}</p>
            <div className="group relative mt-1">
              <p
                className="truncate text-[11px] uppercase tracking-[0.18em] text-on-surface-variant"
                title={auth?.role === 'GUEST' ? 'Guest mode' : auth?.email}
              >
                {auth?.role === 'GUEST' ? 'Guest mode' : auth?.email}
              </p>
              {auth?.role !== 'GUEST' ? (
                <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-56 rounded-xl border border-outline/20 bg-surface-high/95 px-3 py-2 text-[11px] normal-case tracking-normal text-on-surface opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.32)] transition duration-150 ease-out group-hover:opacity-100">
                  {auth?.email}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="group mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-outline/10 bg-background px-4 py-3 text-sm font-semibold text-on-surface-variant transition duration-200 ease-out hover:-translate-y-0.5 hover:border-outline/30 hover:bg-surface-high hover:text-on-surface active:translate-y-0 active:scale-[0.99]"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 transition duration-200 ease-out group-hover:translate-x-0.5" />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
