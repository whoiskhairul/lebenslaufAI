import { create } from 'zustand';

export interface UserProfile {
  bio?: string;
  job_title?: string;
  target_industry?: string;
  phone_number?: string;
  location?: string;
  website?: string;
  github_url?: string;
  linkedin_url?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar?: string;

  timezone?: string;
  locale?: string;
  two_factor_enabled: boolean;
  email_verified: boolean;
  account_locked_until?: string | null;
  last_login_ip?: string | null;
  date_joined?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
  profile?: UserProfile;
}

export interface UserSession {
  id: string;
  session_key: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
  is_current: boolean;
}

const AUTH_KEYS = ['access_token', 'auth_token', 'refresh_token', 'user_data', 'session_key'];

// Token storage honors "remember me": persistent logins live in
// localStorage, session-only logins in sessionStorage (cleared when the
// tab closes). Readers check localStorage first, then sessionStorage.
const readToken = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
};

const isPersistentSession = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('access_token') !== null;
};

const writeToken = (key: string, value: string | null, persistent: boolean) => {
  if (typeof window === 'undefined') return;
  if (value === null) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    return;
  }
  if (persistent) {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  }
};

const clearAuthKeys = () => {
  if (typeof window === 'undefined') return;
  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  sessionKey: string | null;
  user: User | null;
  isAuthenticated: boolean;
  twoFactorRequired: boolean;
  pendingEmail: string | null;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  mobileActivePane: 'preview' | 'editor';

  // Actions
  setAuth: (accessToken: string, refreshToken: string, user: User, sessionKey?: string, persistent?: boolean) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: User) => void;
  setTwoFactorRequired: (required: boolean, email?: string) => void;
  logout: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebarCollapsed: () => void;
  setMobileActivePane: (pane: 'preview' | 'editor') => void;
  initAuth: () => void;
}

const getInitialState = () => {
  const accessToken = readToken('access_token');
  const refreshToken = readToken('refresh_token');
  const sessionKey = readToken('session_key');
  const rawUserData = readToken('user_data');
  const storedTheme = (typeof window !== 'undefined' ? localStorage.getItem('app_theme') : null) as 'light' | 'dark' | null;
  const storedSidebarCollapsed = typeof window !== 'undefined' ? localStorage.getItem('sidebar_collapsed') === 'true' : false;
  
  const theme = storedTheme || 'dark';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  let user = null;
  let isAuthenticated = false;

  if (accessToken && rawUserData) {
    try {
      user = JSON.parse(rawUserData);
      isAuthenticated = true;
    } catch (e) {
      writeToken('user_data', null, true);
    }
  }

  return {
    accessToken,
    refreshToken,
    sessionKey,
    user,
    isAuthenticated,
    twoFactorRequired: false,
    pendingEmail: null,
    theme,
    sidebarCollapsed: storedSidebarCollapsed,
    mobileActivePane: 'preview' as 'preview' | 'editor'
  };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setAuth: (accessToken, refreshToken, user, sessionKey, persistent = true) => {

    // Purge stale auth state only; unrelated keys (AI credentials,
    // theme, drafts, sidebar preference) must survive login and logout.
    clearAuthKeys();

    writeToken('access_token', accessToken, persistent);
    writeToken('auth_token', accessToken, persistent);
    writeToken('refresh_token', refreshToken, persistent);
    writeToken('user_data', JSON.stringify(user), persistent);
    if (sessionKey) writeToken('session_key', sessionKey, persistent);

    set({
      accessToken,
      refreshToken,
      sessionKey: sessionKey || null,
      user,
      isAuthenticated: true,
      twoFactorRequired: false,
      pendingEmail: null,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    const persistent = isPersistentSession();
    writeToken('access_token', accessToken, persistent);
    writeToken('auth_token', accessToken, persistent);
    if (refreshToken) writeToken('refresh_token', refreshToken, persistent);
    set((state) => ({
      accessToken,
      refreshToken: refreshToken || state.refreshToken,
    }));
  },


  setUser: (user) => {
    writeToken('user_data', JSON.stringify(user), isPersistentSession());
    set({ user });
  },

  setTwoFactorRequired: (required, email) => {
    set({ twoFactorRequired: required, pendingEmail: email || null });
  },

  logout: () => {
    const { accessToken, refreshToken, sessionKey } = useAuthStore.getState();
    // Tell the backend so the refresh token is blacklisted and the
    // session row deactivated. Fire-and-forget: local logout proceeds
    // even when offline. (Access tokens expire on their own within
    // the hour; they cannot be revoked client-side.)
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      void fetch(`${base}/auth/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ...(refreshToken ? { refresh: refreshToken } : {}),
          ...(sessionKey ? { session_key: sessionKey } : {}),
        }),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // ignore: logout is local-first
    }
    clearAuthKeys();

    set({
      accessToken: null,
      refreshToken: null,
      sessionKey: null,
      user: null,
      isAuthenticated: false,
      twoFactorRequired: false,
      pendingEmail: null,
    });

    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new Event('popstate'));
  },


  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
    set({ theme });
  },

  toggleSidebarCollapsed: () => {
    set((state) => {
      const next = !state.sidebarCollapsed;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar_collapsed', String(next));
      }
      return { sidebarCollapsed: next };
    });
  },

  setMobileActivePane: (pane: 'preview' | 'editor') => {
    set({ mobileActivePane: pane });
  },

  initAuth: () => {
    const accessToken = readToken('access_token');
    const refreshToken = readToken('refresh_token');
    const sessionKey = readToken('session_key');
    const rawUserData = readToken('user_data');
    const storedTheme = localStorage.getItem('app_theme') as 'light' | 'dark' | null;
    const storedSidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    
    const theme = storedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    if (accessToken && rawUserData) {
      try {
        const user = JSON.parse(rawUserData);
        set({
          accessToken,
          refreshToken,
          sessionKey,
          user,
          isAuthenticated: true,
          theme,
          sidebarCollapsed: storedSidebarCollapsed
        });
      } catch (e) {
        writeToken('user_data', null, true);
        set({ theme, sidebarCollapsed: storedSidebarCollapsed });
      }
    } else {
      set({ theme, sidebarCollapsed: storedSidebarCollapsed });
    }
  }
}));
