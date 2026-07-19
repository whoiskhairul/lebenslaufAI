import { create } from 'zustand';

interface UserDetails {
  userId: string;
  email: string;
  fullName: string;
}

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  
  // Actions
  login: (token: string, details: UserDetails) => void;
  logout: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  userId: null,
  email: null,
  fullName: null,
  isAuthenticated: false,
  theme: 'dark', // default to premium dark mode

  login: (token, details) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_id', details.userId);
    localStorage.setItem('user_email', details.email);
    localStorage.setItem('user_name', details.fullName);
    
    set({
      token,
      userId: details.userId,
      email: details.email,
      fullName: details.fullName,
      isAuthenticated: true
    });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    
    set({
      token: null,
      userId: null,
      email: null,
      fullName: null,
      isAuthenticated: false
    });
  },

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
    set({ theme });
  },

  initAuth: () => {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    const email = localStorage.getItem('user_email');
    const fullName = localStorage.getItem('user_name') || '';
    const storedTheme = localStorage.getItem('app_theme') as 'light' | 'dark' | null;
    
    const theme = storedTheme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    if (token && userId && email) {
      set({
        token,
        userId,
        email,
        fullName,
        isAuthenticated: true,
        theme
      });
    } else {
      set({ theme });
    }
  }
}));
