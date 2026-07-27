export const navigateTo = (url: string, e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
  }

  // Handle section scrolling on landing page
  if (url.startsWith('#')) {
    const element = document.querySelector(url);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  window.history.pushState({}, '', cleanPath);
  window.dispatchEvent(new Event('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
