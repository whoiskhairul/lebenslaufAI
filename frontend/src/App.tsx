import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { AppShell } from './components/AppShell';
import { Landing } from './views/Landing';
import { Dashboard } from './views/Dashboard';
import { MasterProfile } from './views/MasterProfile';
import { Editor } from './views/EditorNew';
import { Settings } from './views/Settings';
import { AdminPanel } from './features/admin/AdminPanel';
import { LoginPage } from './views/auth/LoginPage';
import { RegisterPage } from './views/auth/RegisterPage';
import { AccountSecurityPage } from './views/auth/AccountSecurityPage';
import { navigateTo } from './utils/navigation';
import './css/globals.css';

const parseRoute = () => {
  const pathname = window.location.pathname.replace(/^\//, '');
  const hash = (window.location.hash || '').replace(/^#/, '');
  const rawPath = pathname || hash || 'dashboard';

  const [cleanPath, queryString] = rawPath.split('?');
  const params = new URLSearchParams(queryString || window.location.search);
  const appId = params.get('appId') || undefined;
  const tab = params.get('tab') || undefined;

  return { path: cleanPath, appId, tab };
};

export const App: React.FC = () => {
  // Subscribe only to the auth flag: store changes like theme, sidebar or the
  // mobile pane switcher must NOT re-render App (and remount child fetch effects)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Synchronously parse route on initial mount to avoid 1st frame flash
  const initialRoute = parseRoute();
  const [currentPath, setCurrentPath] = useState(initialRoute.path);
  const [routeParams, setRouteParams] = useState({ appId: initialRoute.appId, tab: initialRoute.tab });


  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      const { path, appId, tab } = parseRoute();
      setCurrentPath(path);
      setRouteParams({ appId, tab });
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleNavigateToEditor = (params?: { application_id?: string }) => {
    if (params?.application_id) {
      navigateTo(`/editor?appId=${params.application_id}`);
    } else {
      navigateTo('/editor');
    }
  };

  // Stable identity: Editor refetches everything when this object changes,
  // so it must only change when the actual route params change.
  // NOTE: must stay ABOVE the early returns — hooks cannot be conditional.
  const initialJobParams = useMemo(
    () => ({ application_id: routeParams.appId, tab: routeParams.tab }),
    [routeParams.appId, routeParams.tab]
  );

  // 1. Unauthenticated Route Resolution
  if (!isAuthenticated) {
    if (currentPath === 'login') return <LoginPage />;
    if (currentPath === 'register') return <RegisterPage />;
    return <Landing />;
  }

  // 2. Authenticated Route Resolution (Normalize invalid or auth paths to 'dashboard')
  const user = useAuthStore.getState().user;
  const isAdmin = !!user?.is_staff || !!user?.is_superuser;
  const validAuthenticatedViews = ['dashboard', 'master-profile', 'editor', 'security', 'settings', 'admin'];
  const normalizedPath =
    currentPath === 'admin' && !isAdmin ? 'dashboard' : currentPath;
  const activeView = validAuthenticatedViews.includes(normalizedPath) ? normalizedPath : 'dashboard';

  return (
    <AppShell activeView={activeView} onNavigate={(view) => navigateTo(view)}>
      {activeView === 'dashboard' && (
        <Dashboard onNavigateToEditor={handleNavigateToEditor} activeAppId={routeParams.appId} />
      )}
      {activeView === 'master-profile' && <MasterProfile />}
      {activeView === 'editor' && (
        <Editor initialJobParams={initialJobParams} />
      )}
      {activeView === 'security' && <AccountSecurityPage />}
      {activeView === 'settings' && <Settings />}
      {activeView === 'admin' && isAdmin && <AdminPanel />}
    </AppShell>
  );
};
