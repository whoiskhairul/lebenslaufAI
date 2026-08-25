import { Star, Lock, LogIn, AlertTriangle, ShieldCheck } from 'lucide-react';

export const PAGE_SIZE = 15;

export const TEMPLATE_LABELS: Record<string, string> = {
  modern_minimalist: 'Modern Minimalist',
  executive_professional: 'Executive Professional',
  creative_tech: 'Creative Tech',
  pixel_perfect_pdf: 'Pixel Perfect PDF',
  german_style_cv: 'German Style',
};

export const STATUS_COLORS: Record<string, string> = {
  wishlist: 'text-muted bg-mutedlight',
  preparing: 'text-warning bg-warning/10',
  applied: 'text-primary bg-primary/10',
  interview: 'text-secondary bg-secondary/10',
  offer: 'text-success bg-success/10',
  rejected: 'text-danger bg-danger/10',
};

export const EVENT_ICONS: Record<string, typeof LogIn> = {
  REGISTER: Star,
  LOGIN_SUCCESS: LogIn,
  LOGIN_FAILED: AlertTriangle,
  LOCKOUT: Lock,
  LOGOUT: LogIn,
  SOCIAL_LOGIN: LogIn,
  PASSWORD_RESET_REQ: AlertTriangle,
  PASSWORD_RESET_CONF: AlertTriangle,
  PASSWORD_CHANGE: ShieldCheck,
};

export const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
