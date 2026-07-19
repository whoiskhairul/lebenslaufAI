import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { AppShell } from './components/AppShell';
import { Landing } from './views/Landing';
import { Dashboard } from './views/Dashboard';
import { MasterProfile } from './views/MasterProfile';
import { Editor } from './views/EditorNew';
import { Settings } from './views/Settings';
import './css/globals.css';

export const App: React.FC = () => {
  const { isAuthenticated, initAuth } = useAuthStore();
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [routeParams, setRouteParams] = useState<{ appId?: string; tab?: string }>({});

  const parseHash = () => {
    const hash = window.location.hash || '#dashboard';
    const cleanHash = hash.replace(/^#/, '');
    const [path, queryString] = cleanHash.split('?');
    
    const params = new URLSearchParams(queryString || '');
    const appId = params.get('appId') || undefined;
    const tab = params.get('tab') || undefined;
    
    return { path, appId, tab };
  };

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const handleHashChange = () => {
      const { path, appId, tab } = parseHash();
      const validPaths = ['dashboard', 'master-profile', 'editor', 'settings'];
      const targetPath = validPaths.includes(path) ? path : 'dashboard';
      
      setCurrentPath(targetPath);
      setRouteParams({ appId, tab });
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // initial parse

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigateToEditor = (params?: { company?: string; position?: string; desc?: string; application_id?: string }) => {
    if (params?.application_id) {
      window.location.hash = `editor?appId=${params.application_id}`;
    } else {
      window.location.hash = 'editor';
    }
  };

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <AppShell activeView={currentPath} onNavigate={(view) => {
      window.location.hash = view;
    }}>
      {currentPath === 'dashboard' && (
        <Dashboard onNavigateToEditor={handleNavigateToEditor} activeAppId={routeParams.appId} />
      )}
      {currentPath === 'master-profile' && <MasterProfile />}
      {currentPath === 'editor' && (
        <Editor initialJobParams={{
          application_id: routeParams.appId,
          tab: routeParams.tab
        }} />
      )}
      {currentPath === 'settings' && <Settings />}
    </AppShell>
  );
};
