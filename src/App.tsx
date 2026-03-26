import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ChronosProvider, useChronos } from './lib/chronos-context';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StatusBanner } from './components/shared/StatusBanner';
import { AuthPage } from './pages/AuthPage';
import { FocusPage } from './pages/FocusPage';
import { GoalsPage } from './pages/GoalsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';

function AppShell() {
  const { clearError, error } = useChronos();
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />
      <main className="min-h-screen px-5 py-5 xl:ml-72 xl:px-10">
        <TopBar />
        <StatusBanner error={error} onDismiss={clearError} />
        <Outlet />
      </main>
    </div>
  );
}

function ProtectedRoute() {
  const { isAuthenticated, isReady } = useChronos();
  if (!isReady) {
    return <div className="flex min-h-screen items-center justify-center text-sm uppercase tracking-[0.3em] text-on-surface-variant">Loading Chronos</div>;
  }
  return isAuthenticated ? <AppShell /> : <Navigate to="/auth" replace />;
}

function PublicRoute() {
  const { isAuthenticated, isReady } = useChronos();
  if (!isReady) {
    return <div className="flex min-h-screen items-center justify-center text-sm uppercase tracking-[0.3em] text-on-surface-variant">Loading Chronos</div>;
  }
  return isAuthenticated ? <Navigate to="/focus" replace /> : <AuthPage />;
}

export default function App() {
  return (
    <ChronosProvider>
      <Routes>
        <Route path="/auth" element={<PublicRoute />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/focus" replace />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ChronosProvider>
  );
}
