import React from 'react';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard, UserCircle, Wand2, Settings as SettingsIcon, LogOut, Sun, Moon, Eye, Sliders, ChevronLeft, ChevronRight, ShieldCheck
} from 'lucide-react';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activeView, onNavigate }) => {
  const { user, logout, theme, setTheme, sidebarCollapsed, toggleSidebarCollapsed, mobileActivePane, setMobileActivePane } = useAuthStore();
  const fullName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'master-profile', label: 'Profile', icon: UserCircle },
    { id: 'editor', label: 'Tailor', icon: Wand2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ...(user?.is_staff || user?.is_superuser
      ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }]
      : []),
  ];

  const leftNavItems = navItems.slice(0, Math.ceil(navItems.length / 2));
  const rightNavItems = navItems.slice(Math.ceil(navItems.length / 2));
  const showPaneSwitcher = activeView === 'editor';

  const renderNavItem = (item: { id: string; label: string; icon: typeof LayoutDashboard }) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    return (
      <button
        key={item.id}
        className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
        onClick={() => onNavigate(item.id)}
        aria-label={item.label}
        title={item.label}
      >
        <Icon size={20} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className={styles.container}>
      {/* Mobile Top Bar */}
      <header className={`${styles.header} no-print`}>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className={styles.logoContainer}>
          <span className={styles.logoIcon}>📄</span>
          <h1 className={styles.logoText}>LebenslaufAI</h1>
        </div>
        <button className={styles.logoutIconBtn} onClick={logout} aria-label="Logout" title="Logout">
          <LogOut size={20} />
        </button>
      </header>

      <div className={styles.workspace}>
        {/* Navigation Sidebar (desktop / large tablets) */}
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''} no-print`}>
          {/* Desktop Collapse Toggle Button */}
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={toggleSidebarCollapsed}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label="Toggle sidebar collapse"
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className={styles.sidebarLogo}>
            <span className={styles.logoIconLarge}>📄</span>
            <span className={styles.logoTitle}>LebenslaufAI</span>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`${styles.navItem} ${activeView === item.id ? styles.active : ''}`}
                  title={item.label}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon size={20} className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.userProfile} title={`${fullName || 'User'} (${email || ''})`}>
              <div className={styles.userAvatar}>
                {(fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <p className={styles.userName}>{fullName || 'User Profile'}</p>
                <p className={styles.userEmail}>{email || ''}</p>
              </div>
            </div>
            <button className={styles.logoutBtn} onClick={logout} title="Logout">
              <LogOut size={18} className={styles.logoutIcon} />
              <span className={styles.logoutLabel}>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Pane */}
        <main className={styles.content}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar: nav split left/right, editor pane switcher in the middle */}
      <nav className={`${styles.mobileBottomNav} no-print`} aria-label="Mobile navigation">
        <div className={styles.mobileNavSide}>
          {leftNavItems.map(renderNavItem)}
        </div>

        <div className={`${styles.mobileNavCenter} ${showPaneSwitcher ? styles.mobileNavCenterOpen : ''}`}>
          <div className={styles.mobilePaneSwitcher} aria-hidden={!showPaneSwitcher}>
            <button
              type="button"
              tabIndex={showPaneSwitcher ? 0 : -1}
              className={`${styles.mobilePaneBtn} ${mobileActivePane === 'editor' ? styles.mobilePaneBtnActive : ''}`}
              onClick={() => setMobileActivePane('editor')}
              aria-label="Show editor controls"
            >
              <Sliders size={15} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              tabIndex={showPaneSwitcher ? 0 : -1}
              className={`${styles.mobilePaneBtn} ${mobileActivePane === 'preview' ? styles.mobilePaneBtnActive : ''}`}
              onClick={() => setMobileActivePane('preview')}
              aria-label="Show CV canvas"
            >
              <Eye size={15} />
              <span>Canvas</span>
            </button>
          </div>
        </div>

        <div className={styles.mobileNavSide}>
          {rightNavItems.map(renderNavItem)}
        </div>
      </nav>
    </div>
  );
};
