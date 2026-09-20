/* LebenslaufAI extension — SINGLE SOURCE OF TRUTH for all URLs / hosts.
 *
 * Why this file exists: the same localhost defaults, job-board hosts and URL
 * helpers were previously copy-pasted in background.js / popup.js / options.js
 * / content/lebenslauf.js (+ manifest.json + *.html placeholders). Edit here;
 * everything else reads from `globalThis.LSL_CONFIG`.
 *
 * Wiring (MV3 classic scripts, no bundler):
 *   manifest.json  -> content_scripts: ["config.js", "content/lebenslauf.js"]
 *   background.js  -> importScripts('config.js') at top (service worker)
 *   popup.html     -> <script src="../config.js"> before popup.js
 *   options.html   -> <script src="../config.js"> before options.js
 *   popup fallback inject must pass files: ['config.js',
 *     'content/lebenslauf.js'] in that order.
 * NOTE: manifest.json `matches` / `host_permissions` cannot import JS, so the
 * literal lists there are generated FROM the arrays below — keep them in sync
 * (see MANIFEST_MATCHES / HOST_PERMISSIONS).
 */
(function () {
  /* ---- environment switch: flip ONE variable to change defaults ----
   *  'local'      -> localhost backend + localhost frontend (dev)
   *  'production' -> vercel backend + vercel frontend (live)
   *  Stored values in chrome.storage.local override these defaults, so after
   *  flipping, use Options → "Use Local" / "Use Production" (or reinstall)
   *  on installs that already saved URLs. */
  const ACTIVE_ENV = 'production'; // 'local' | 'production'

  const ENVIRONMENTS = {
    local: {
      appUrl: 'http://localhost:5173',
      apiBase: 'http://localhost:8000/api/v1'
    },
    production: {
      appUrl: 'https://lebenslaufai.vercel.app',
      apiBase: 'https://lebenslauf-ai-4iv7.vercel.app/api/v1'
    }
  };

  const DEFAULT_APP_URL = ENVIRONMENTS[ACTIVE_ENV].appUrl;
  const DEFAULT_API_BASE = ENVIRONMENTS[ACTIVE_ENV].apiBase;
  const DEFAULT_API_ORIGIN = new URL(DEFAULT_API_BASE).origin;
  const API_SUFFIX = '/api/v1';
  const LOGIN_PATH = '/login';
  const EDITOR_PATH = '/editor';

  const LOCALHOST_RE = /localhost|127\.0\.0\.1/;

  // Keep in sync with manifest.json (it cannot import this file).
  // Only job-board origins are pre-granted; app origins (local/vercel) need
  // no manifest entry since the extension never scripts those tabs anymore —
  // Options requests them at runtime for custom URLs.
  const MANIFEST_MATCHES = [
    'https://*.linkedin.com/*',
    'https://www.linkedin.com/*',
    'https://www.xing.com/jobs/*',
    'https://www.xing.com/karriere/jobs/*',
    'https://*.indeed.com/*',
    'https://indeed.com/*'
  ];
  const HOST_PERMISSIONS = [
    'https://*.linkedin.com/*',
    'https://www.linkedin.com/*'
  ];

  function normalizeApiBase(url) {
    let u = (url || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//.test(u)) u = DEFAULT_API_ORIGIN;
    if (!u.endsWith(API_SUFFIX)) u += API_SUFFIX;
    return u;
  }

  function normalizeAppUrl(url) {
    return (url || '').trim().replace(/\/+$/, '') || DEFAULT_APP_URL;
  }

  function originPattern(rawUrl) {
    return new URL(rawUrl).origin + '/*';
  }

  function isLocalUrl(rawUrl) {
    return LOCALHOST_RE.test(rawUrl || '');
  }

  /** 'linkedin' | 'indeed' | 'xing' | null — centralises all hostname checks. */
  function jobHost(hostname) {
    const h = (hostname || '').toLowerCase();
    if (h.includes('linkedin.')) return 'linkedin';
    if (h.includes('indeed.')) return 'indeed';
    if (h.includes('xing.')) return 'xing';
    return null;
  }

  /** Strict detail-URL check (view / selected search hit). List/feed pages fail. */
  function isJobDetailUrl(href) {
    try {
      const u = new URL(href);
      const p = jobHost(u.hostname);
      const path = u.pathname.toLowerCase();
      if (p === 'linkedin') {
        if (/\/jobs\/view\//.test(path)) return true;
        if (/\/jobs\//.test(path) && (u.searchParams.get('currentJobId') || /\/jobs\/collections\//.test(path))) return true;
        return false;
      }
      if (p === 'indeed') {
        if (/viewjob|jobsearch.*jk=|rc\.clkl|jobs.*vjk/i.test(href)) return true;
        if (u.searchParams.get('jk') || u.searchParams.get('vjk')) return true;
        return false;
      }
      if (p === 'xing') {
        if (/\/jobs\/.+/.test(path) && !/\/jobs\/?$/.test(path)) return true;
        return false;
      }
      return false;
    } catch (_) { return false; }
  }

  function loginUrl(appUrl) {
    return normalizeAppUrl(appUrl) + LOGIN_PATH;
  }

  function editorUrl(appUrl, job) {
    const base = normalizeAppUrl(appUrl);
    const params = new URLSearchParams();
    if (job?.company) params.set('company', job.company.slice(0, 200));
    if (job?.position) params.set('position', job.position.slice(0, 300));
    if (job?.description) params.set('jd', job.description.slice(0, 12000));
    const qs = params.toString();
    return base + EDITOR_PATH + (qs ? '?' + qs : '');
  }

  globalThis.LSL_CONFIG = {
    ACTIVE_ENV,
    ENVIRONMENTS,
    DEFAULT_API_BASE,
    DEFAULT_APP_URL,
    DEFAULTS: { apiBase: DEFAULT_API_BASE, appUrl: DEFAULT_APP_URL },
    MANIFEST_MATCHES,
    HOST_PERMISSIONS,
    normalizeApiBase,
    normalizeAppUrl,
    originPattern,
    isLocalUrl,
    jobHost,
    isJobDetailUrl,
    loginUrl,
    editorUrl
  };
})();
