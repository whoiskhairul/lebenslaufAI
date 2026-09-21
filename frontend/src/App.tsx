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
import { NotFound } from './views/NotFound';
import { navigateTo } from './utils/navigation';
import './css/globals.css';

const parseRoute = () => {
  const pathname = window.location.pathname.replace(/^\//, '');
  const hash = (window.location.hash || '').replace(/^#/, '');
  // "" (bare domain) is kept distinct from "dashboard": the root shows the
  // landing page for guests and the dashboard for logged-in users.
  const rawPath = (pathname || hash).replace(/^\//, '');

  const [cleanPath, queryString] = rawPath.split('?');
  const params = new URLSearchParams(queryString || window.location.search);
  const appId = params.get('appId') || undefined;
  const tab = params.get('tab') || undefined;
  const versionId = params.get('versionId') || undefined;
  const jd = params.get('jd') || undefined;
  const companyName = params.get('company') || undefined;
  const positionName = params.get('position') || undefined;

  return { path: cleanPath, appId, tab, versionId, jd, companyName, positionName };
};

export const App: React.FC = () => {
  // Subscribe only to the auth flag: store changes like theme, sidebar or the
  // mobile pane switcher must NOT re-render App (and remount child fetch effects)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Synchronously parse route on initial mount to avoid 1st frame flash
  const initialRoute = parseRoute();
  const [currentPath, setCurrentPath] = useState(initialRoute.path);
  const [routeParams, setRouteParams] = useState({
    appId: initialRoute.appId, tab: initialRoute.tab, versionId: initialRoute.versionId,
    jd: initialRoute.jd, companyName: initialRoute.companyName, positionName: initialRoute.positionName
  });


  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      const { path, appId, tab, versionId, jd, companyName, positionName } = parseRoute();
      setCurrentPath(path);
      setRouteParams({ appId, tab, versionId, jd, companyName, positionName });
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
    () => ({
      application_id: routeParams.appId,
      tab: routeParams.tab,
      version_id: routeParams.versionId,
      company: routeParams.companyName,
      position: routeParams.positionName,
      desc: routeParams.jd
    }),
    [routeParams.appId, routeParams.tab, routeParams.versionId,
     routeParams.companyName, routeParams.positionName, routeParams.jd]
  );

  // Route resolution (must stay ABOVE the early returns — hooks cannot be conditional)
  const user = useAuthStore.getState().user;
  const isAdmin = !!user?.is_staff || !!user?.is_superuser;

  // Auth-independent route classification: unknown paths → 404 page.
  const publicPaths = ['', 'login', 'register'];
  const protectedPaths = ['dashboard', 'master-profile', 'editor', 'security', 'settings', 'admin'];
  const isNotFound = !publicPaths.includes(currentPath) && !protectedPaths.includes(currentPath);

  // View actually rendered:
  // - logged-in users on "/", "/login" or "/register" land on the dashboard
  //   (auth pages are "unavailable" once logged in);
  // - "/admin" without permission also resolves to the dashboard, so the
  //   route's existence is not revealed to non-admins;
  // - logged-out users hitting a protected path are redirected to login.
  const activeView = isAuthenticated
    ? currentPath === '' || currentPath === 'login' || currentPath === 'register' || (currentPath === 'admin' && !isAdmin)
      ? 'dashboard'
      : currentPath
    : currentPath === '' || currentPath === 'login' || currentPath === 'register'
      ? currentPath
      : 'login';

  // Keep the address bar in sync with the view that is actually rendered:
  // "/" normalizes to /dashboard when logged in, protected paths redirect to
  // /login when logged out, and unavailable auth pages redirect to
  // /dashboard when logged in. Unknown paths keep their URL and show 404.
  useEffect(() => {
    if (isNotFound) return;
    const { pathname, search, hash } = window.location;
    if (pathname === `/${activeView}`) return;
    const isAuthRedirect = !isAuthenticated && !publicPaths.includes(currentPath);
    if (isAuthRedirect) {
      // Remember where the user wanted to go so login can send them back
      // (e.g. /editor?appId=… instead of always /dashboard).
      const original = `${pathname}${search}${hash}`;
      window.history.replaceState({}, '', `/login?next=${encodeURIComponent(original)}`);
      return;
    }
    // Carry over query params, including those that arrived inside a
    // hash-route (e.g. "/#editor?appId=1" opened by the extension).
    const hashQuery = hash.includes('?') ? `?${hash.split('?')[1]}` : '';
    window.history.replaceState({}, '', `/${activeView}${search || hashQuery}`);
  }, [isAuthenticated, activeView, currentPath, isNotFound]);

  // 1. Unknown paths → 404 (sidebar stays available when logged in)
  if (isNotFound) {
    return isAuthenticated ? (
      <AppShell activeView="not-found" onNavigate={(view) => navigateTo(view)}>
        <NotFound />
      </AppShell>
    ) : (
      <NotFound />
    );
  }

  // 2. Unauthenticated Route Resolution (protected paths render the login page)
  if (!isAuthenticated) {
    if (currentPath === 'register') return <RegisterPage />;
    if (currentPath === '') return <Landing />;
    return <LoginPage />;
  }

  // 3. Authenticated Route Resolution
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
