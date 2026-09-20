// Optional one-shot navigation guard (e.g. "unsaved changes?" confirm).
// Registered by views with ephemeral state (like the editor); consulted by
// navigateTo before any in-app route change. Receives the target path,
// return true to allow. Guards needing async UI (popover) stash the target
// and return false, then navigate programmatically on confirm.
let navGuard: ((target: string) => boolean) | null = null;
export const setNavGuard = (guard: ((target: string) => boolean) | null) => {
  navGuard = guard;
};

export const navigateTo = (url: string, e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
  }

  // Handle section scrolling on landing page
  if (url.startsWith('#')) {
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath !== '') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('popstate'));
      setTimeout(() => {
        const element = document.querySelector(url);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.querySelector(url);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    return;
  }


  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  if (navGuard && !navGuard(cleanPath)) return;
  window.history.pushState({}, '', cleanPath);
  window.dispatchEvent(new Event('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
