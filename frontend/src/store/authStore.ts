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
  setAuth: (accessToken: string, refreshToken: string, user: User, sessionKey?: string) => void;
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
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  const sessionKey = typeof window !== 'undefined' ? localStorage.getItem('session_key') : null;
  const rawUserData = typeof window !== 'undefined' ? localStorage.getItem('user_data') : null;
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
      if (typeof window !== 'undefined') localStorage.removeItem('user_data');
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

  setAuth: (accessToken, refreshToken, user, sessionKey) => {

    // Purge any stale user state from previous logins
    const currentTheme = localStorage.getItem('app_theme') || 'dark';
    const currentSidebarCollapsed = localStorage.getItem('sidebar_collapsed');
    localStorage.clear();
    localStorage.setItem('app_theme', currentTheme);
    if (currentSidebarCollapsed !== null) localStorage.setItem('sidebar_collapsed', currentSidebarCollapsed);

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_data', JSON.stringify(user));
    if (sessionKey) localStorage.setItem('session_key', sessionKey);

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
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('auth_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    set((state) => ({
      accessToken,
      refreshToken: refreshToken || state.refreshToken,
    }));
  },


  setUser: (user) => {
    localStorage.setItem('user_data', JSON.stringify(user));
    set({ user });
  },

  setTwoFactorRequired: (required, email) => {
    set({ twoFactorRequired: required, pendingEmail: email || null });
  },

  logout: () => {
    const currentTheme = localStorage.getItem('app_theme') || 'dark';
    const currentSidebarCollapsed = localStorage.getItem('sidebar_collapsed');
    localStorage.clear();
    localStorage.setItem('app_theme', currentTheme);
    if (currentSidebarCollapsed !== null) localStorage.setItem('sidebar_collapsed', currentSidebarCollapsed);

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
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const sessionKey = localStorage.getItem('session_key');
    const rawUserData = localStorage.getItem('user_data');
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
        localStorage.removeItem('user_data');
        set({ theme, sidebarCollapsed: storedSidebarCollapsed });
      }
    } else {
      set({ theme, sidebarCollapsed: storedSidebarCollapsed });
    }
  }
}));
