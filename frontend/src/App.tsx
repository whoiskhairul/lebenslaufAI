import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { AppShell } from './components/AppShell';
import { Landing } from './views/Landing';
import { Dashboard } from './views/Dashboard';
import { MasterProfile } from './views/MasterProfile';
import { Editor } from './views/EditorNew';
import { Settings } from './views/Settings';
import { LoginPage } from './views/auth/LoginPage';
import { RegisterPage } from './views/auth/RegisterPage';
import { AccountSecurityPage } from './views/auth/AccountSecurityPage';
import { navigateTo } from './utils/navigation';
import './css/globals.css';

export const App: React.FC = () => {
  const { isAuthenticated, initAuth } = useAuthStore();
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [routeParams, setRouteParams] = useState<{ appId?: string; tab?: string }>({});

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

  useEffect(() => {
    initAuth();
  }, [initAuth]);

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

  // 1. Unauthenticated Route Resolution
  if (!isAuthenticated) {
    if (currentPath === 'login') return <LoginPage />;
    if (currentPath === 'register') return <RegisterPage />;
    return <Landing />;
  }

  // 2. Authenticated Route Resolution (Normalize invalid or auth paths to 'dashboard')
  const validAuthenticatedViews = ['dashboard', 'master-profile', 'editor', 'security', 'settings'];
  const activeView = validAuthenticatedViews.includes(currentPath) ? currentPath : 'dashboard';

  return (
    <AppShell activeView={activeView} onNavigate={(view) => navigateTo(view)}>
      {activeView === 'dashboard' && (
        <Dashboard onNavigateToEditor={handleNavigateToEditor} activeAppId={routeParams.appId} />
      )}
      {activeView === 'master-profile' && <MasterProfile />}
      {activeView === 'editor' && (
        <Editor initialJobParams={{
          application_id: routeParams.appId,
          tab: routeParams.tab
        }} />
      )}
      {activeView === 'security' && <AccountSecurityPage />}
      {activeView === 'settings' && <Settings />}
    </AppShell>
  );
};
