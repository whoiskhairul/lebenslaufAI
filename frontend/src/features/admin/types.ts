export interface SeriesPoint { date: string; count: number }
export interface TemplateCount { template: string; count: number }
export interface TopUser { id: string; email: string; full_name?: string; resume_count: number }
export interface RecentEvent {
  id: string;
  user_email?: string | null;
  event_type: string;
  ip_address?: string;
  timestamp: string;
}

export interface Metrics {
  totals: { users: number; active_users: number; staff: number; resumes: number; cover_letters: number; applications: number; active_sessions: number };
  growth: { new_users_7d: number; new_users_30d: number; new_resumes_7d: number; new_resumes_30d: number; logins_7d: number; failed_logins_7d: number };
  engagement: { avg_ats_score: number; avg_resumes_per_user: number; verified_pct: number; locked_accounts: number };
  applications_by_status: Record<string, number>;
  templates: TemplateCount[];
  signup_series: SeriesPoint[];
  resume_series: SeriesPoint[];
  login_series: SeriesPoint[];
  top_users: TopUser[];
  recent_events: RecentEvent[];
}

export interface Pagination { page: number; page_size: number; total: number; total_pages: number }

export interface AdminUser {
  id: string; email: string; full_name?: string; is_active: boolean; is_staff: boolean;
  is_superuser: boolean; email_verified: boolean; two_factor_enabled: boolean;
  last_login?: string | null; last_login_ip?: string | null; date_joined: string;
  resume_count: number; cover_letter_count: number; application_count: number;
}

export interface UserDetail {
  user: AdminUser & { account_locked_until?: string | null };
  stats: { resumes: number; cover_letters: number; applications: number; sessions: number };
  recent_resumes: AdminResume[];
  recent_audit_logs: RecentEvent[];
}

export interface AdminResume {
  id: string; user_email: string; title: string; target_company: string;
  target_role: string; ats_score: number; template: string; created_at: string;
}

export interface AdminApplication {
  id: string; user_email: string; company: string; position: string;
  status: string; location?: string; resume_count: number; created_at: string;
}

export interface AuditLog extends RecentEvent { user_agent?: string; details?: Record<string, unknown> }

export interface SessionRow {
  id: string; user_email: string; ip_address?: string; user_agent?: string;
  device_info?: string; created_at: string; last_activity: string;
}

export type TabId = 'overview' | 'users' | 'resumes' | 'applications' | 'security';
