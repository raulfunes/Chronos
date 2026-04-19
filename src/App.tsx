import React from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ChronosProvider, useChronos } from './lib/chronos-context';
import { Sidebar } from './components/Sidebar';
import { StatusBanner } from './components/shared/StatusBanner';
import { AuthPage } from './pages/AuthPage';
import { FocusPage } from './pages/FocusPage';
import { GoalsPage } from './pages/GoalsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'chronos-sidebar-collapsed';

function readInitialSidebarCollapsed() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
}

function AppShell() {
  const location = useLocation();
  const isFocusPage = location.pathname === '/focus';
  const isCalendarPage = location.pathname === '/calendar';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(readInitialSidebarCollapsed);

  React.useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <div className={`bg-background ${isFocusPage ? 'h-dvh overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
      <div className={`desktop-app-scale bg-background text-on-surface ${isFocusPage ? 'desktop-focus-shell overflow-hidden' : 'min-h-screen'}`}>
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((current) => !current)}
        />
        <main
          className={`transition-[margin] duration-300 md:ml-28 ${
            isSidebarCollapsed ? 'xl:ml-28' : 'xl:ml-72'
          } ${isFocusPage ? 'desktop-focus-main flex flex-col overflow-hidden' : 'min-h-screen'}`}
        >
          <div className={isFocusPage ? 'min-h-0 flex-1 overflow-hidden' : ''}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function AppFrame() {
  const location = useLocation();
  const { clearError, error } = useChronos();
  const isFocusPage = location.pathname === '/focus';

  return (
    <>
      <StatusBanner error={error} onDismiss={clearError} layout={isFocusPage ? 'focus' : 'default'} />
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
    </>
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
      <AppFrame />
    </ChronosProvider>
  );
}
