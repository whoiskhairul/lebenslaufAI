import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard, UserCircle, Wand2, Settings as SettingsIcon, LogOut, Sun, Moon, Eye, Sliders, ChevronLeft, ChevronRight, ShieldCheck, Archive, Menu, X
} from 'lucide-react';
import styles from './AppShell.module.css';
import { Logo } from './Logo';

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
    { id: 'archived', label: 'Archived', icon: Archive },
    { id: 'master-profile', label: 'Profile', icon: UserCircle },
    { id: 'editor', label: 'Tailor', icon: Wand2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ...(user?.is_staff || user?.is_superuser
      ? [{ id: 'admin', label: 'Admin', icon: ShieldCheck }]
      : []),
  ];

  // Mobile bar stays at 4 slots no matter how the nav grows: the three
  // primary destinations plus a Menu holding everything else.
  const primaryMobileIds = ['dashboard', 'master-profile', 'editor'];
  const primaryMobileItems = navItems.filter((item) => primaryMobileIds.includes(item.id));
  const menuNavItems = navItems.filter((item) => !primaryMobileIds.includes(item.id));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuHoldsActiveView = menuNavItems.some((item) => item.id === activeView);
  const showPaneSwitcher = activeView === 'editor';

  // Center-slot choreography: mount closed so the max-width expand + pane
  // switcher spring-in transitions play, and delay unmount so the collapse
  // transition plays when leaving the editor.
  const [centerVisible, setCenterVisible] = useState(showPaneSwitcher);
  const [centerOpen, setCenterOpen] = useState(showPaneSwitcher);
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    if (showPaneSwitcher) {
      setCenterVisible(true);
      setCenterOpen(false);
      t1 = setTimeout(() => setCenterOpen(true), 30);
    } else {
      setCenterOpen(false);
      t2 = setTimeout(() => setCenterVisible(false), 500);
    }
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [showPaneSwitcher]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleMobileNavigate = (id: string) => {
    closeMobileMenu();
    onNavigate(id);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const renderNavItem = (item: { id: string; label: string; icon: typeof LayoutDashboard }) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    return (
      <button
        key={item.id}
        className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
        onClick={() => handleMobileNavigate(item.id)}
        aria-label={item.label}
        title={item.label}
      >
        <Icon size={20} />
        <span>{item.label}</span>
      </button>
    );
  };

  const renderMenuButton = () => (
    <button
      key="menu"
      type="button"
      className={`${styles.mobileNavItem} ${menuHoldsActiveView ? styles.mobileNavItemActive : ''}`}
      onClick={() => setMobileMenuOpen((prev) => !prev)}
      aria-label="More options"
      aria-haspopup="dialog"
      aria-expanded={mobileMenuOpen}
      title="Menu"
    >
      {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      <span>Menu</span>
    </button>
  );

  return (
    <div className={styles.container}>
      {/* Mobile Top Bar */}
      <header className={`${styles.header} no-print`}>
        <button
          className={styles.themeBtn}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className={styles.logoContainer}>
          <span className={styles.logoIcon}>
            <Logo size={20} />
          </span>
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
            <span className={styles.logoIconLarge}>
              <Logo size={26} />
            </span>
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
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className={styles.themeToggleIcon}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </span>
              <span className={styles.themeToggleLabel}>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </span>
              <span className={styles.themeToggleHint}>
                {theme === 'dark' ? 'On' : 'Off'}
              </span>
            </button>
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

      {/* Mobile Bottom Navigation Bar: always 4 slots (3 destinations +
          menu); editor pane switcher sits centered between two pairs */}
      {mobileMenuOpen && (
        <div
          className={styles.mobileMenuBackdrop}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
      <div
        className={`${styles.mobileMenuSheet} ${mobileMenuOpen ? styles.mobileMenuSheetOpen : ''} no-print`}
        role="dialog"
        aria-modal="false"
        aria-label="More options"
        aria-hidden={!mobileMenuOpen}
      >
        <div className={styles.mobileMenuGrabber} aria-hidden="true" />
        {menuNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              tabIndex={mobileMenuOpen ? 0 : -1}
              className={`${styles.mobileMenuItem} ${isActive ? styles.mobileMenuItemActive : ''}`}
              onClick={() => handleMobileNavigate(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <div className={styles.mobileMenuDivider} aria-hidden="true" />
        <button
          type="button"
          tabIndex={mobileMenuOpen ? 0 : -1}
          className={styles.mobileMenuItem}
          onClick={() => {
            toggleTheme();
            closeMobileMenu();
          }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
      <nav className={`${styles.mobileBottomNav} no-print`} aria-label="Mobile navigation">
        {centerVisible ? (
          <>
            <div className={styles.mobileNavSide}>
              {primaryMobileItems.slice(0, 2).map(renderNavItem)}
            </div>

            <div className={`${styles.mobileNavCenter} ${centerOpen ? styles.mobileNavCenterOpen : ''}`}>
              <div className={styles.mobilePaneSwitcher} aria-hidden={!centerOpen}>
                <button
                  type="button"
                  tabIndex={centerOpen ? 0 : -1}
                  className={`${styles.mobilePaneBtn} ${mobileActivePane === 'editor' ? styles.mobilePaneBtnActive : ''}`}
                  onClick={() => setMobileActivePane('editor')}
                  aria-label="Show editor controls"
                >
                  <Sliders size={15} />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  tabIndex={centerOpen ? 0 : -1}
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
              {primaryMobileItems.slice(2).map(renderNavItem)}
              {renderMenuButton()}
            </div>
          </>
        ) : (
          <div className={styles.mobileNavRow} role="group" aria-label="Primary">
            {primaryMobileItems.map(renderNavItem)}
            {renderMenuButton()}
          </div>
        )}
      </nav>
    </div>
  );
};
