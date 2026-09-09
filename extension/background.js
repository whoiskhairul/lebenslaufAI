/* LebenslaufAI Job Tailorer — MV3 service worker.
 *
 * Responsibilities:
 *  1. Account connection: opens the website's own login page (so Google
 *     OAuth etc. work) and harvests the JWT pair from localStorage once the
 *     SPA has signed in.
 *  2. Editor deep-links: takes job data extracted by the popup/content
 *     script and opens the web-app editor with company/position/description
 *     pre-filled, so the user just clicks "Analyze & Tailor".
 */

const DEFAULTS = {
  apiBase: 'http://localhost:8000/api/v1',
  appUrl: 'http://localhost:5173',
  access: null,
  refresh: null,
  email: null
};

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(Object.keys(DEFAULTS), (s) => resolve({ ...DEFAULTS, ...s }));
  });
}

function setSettings(patch) {
  return new Promise((resolve) => chrome.storage.local.set(patch, resolve));
}

function clearAuth() {
  return setSettings({ access: null, refresh: null, email: null });
}

/* Users sometimes paste the bare server origin. Normalise so every call
 * lands on /api/v1 regardless of what was entered in Options. */
function normalizeApiBase(url) {
  let u = (url || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(u)) u = 'http://localhost:8000';
  if (!u.endsWith('/api/v1')) u += '/api/v1';
  return u;
}

function normalizeAppUrl(url) {
  return (url || '').trim().replace(/\/+$/, '') || 'http://localhost:5173';
}

/* ---------------- website-login harvesting ---------------- */

function extractTokenScript() {
  // Runs IN THE PAGE context of the web app.
  try {
    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    let email = null;
    try { email = JSON.parse(localStorage.getItem('user_data') || 'null')?.email || null; } catch (_) {}
    return { access, refresh, email };
  } catch (_) {
    return { access: null, refresh: null, email: null };
  }
}

/** Try to pull tokens out of any open tab whose origin matches appUrl. */
async function tryHarvestFromOpenTabs() {
  const s = await getSettings();
  if (s.access) return true;
  let appOrigin;
  try { appOrigin = new URL(normalizeAppUrl(s.appUrl)).origin; } catch (_) { return false; }

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url || !tab.url.startsWith(appOrigin)) continue;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractTokenScript
      });
      const t = results?.[0]?.result;
      if (t && t.access && t.refresh) {
        await setSettings({ access: t.access, refresh: t.refresh, email: t.email });
        return true;
      }
    } catch (_) { /* cannot script that tab */ }
  }
  return false;
}

// Auto-harvest whenever the user logs into the website while unauthenticated.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  (async () => {
    const s = await getSettings();
    if (s.access) return;
    let appOrigin;
    try { appOrigin = new URL(normalizeAppUrl(s.appUrl)).origin; } catch (_) { return; }
    if (!tab.url.startsWith(appOrigin)) return;

    // Give the SPA a beat to persist tokens after a successful login redirect.
    setTimeout(() => tryHarvestFromOpenTabs(), 1200);
  })();
});

async function openWebsiteLogin() {
  const s = await getSettings();
  const appUrl = normalizeAppUrl(s.appUrl);

  // If an app tab is already open & logged in, just harvest now.
  if (await tryHarvestFromOpenTabs()) {
    await setSettings({});
    return { ok: true, alreadyConnected: true };
  }

  await chrome.tabs.create({ url: `${appUrl}/login` });
  return { ok: true, openedLogin: true };
}

/* ---------------- editor deep-link ---------------- */

async function openEditorWithJob(job) {
  const { appUrl } = await getSettings();
  const base = normalizeAppUrl(appUrl);

  const params = new URLSearchParams();
  if (job.company) params.set('company', job.company.slice(0, 200));
  if (job.position) params.set('position', job.position.slice(0, 300));
  if (job.description) params.set('jd', job.description.slice(0, 12000));

  const url = `${base}/editor${params.toString() ? '?' + params.toString() : ''}`;
  await chrome.tabs.create({ url });
  return url;
}

/* ---------------- message router ---------------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg?.type) {
        case 'PING':
          sendResponse({ ok: true });
          break;

        case 'GET_STATE': {
          const s = await getSettings();
          sendResponse({ authed: !!s.access, email: s.email, apiBase: s.apiBase, appUrl: s.appUrl });
          break;
        }

        case 'OPEN_WEBSITE_LOGIN': {
          if (msg.apiBase || msg.appUrl) {
            await setSettings({
              ...(msg.apiBase ? { apiBase: normalizeApiBase(msg.apiBase) } : {}),
              ...(msg.appUrl ? { appUrl: normalizeAppUrl(msg.appUrl) } : {})
            });
          }
          const r = await openWebsiteLogin();
          console.log('[LSL] OPEN_WEBSITE_LOGIN →', JSON.stringify(r));
          sendResponse(r);
          break;
        }

        case 'CONNECT_NOW': {
          const ok = await tryHarvestFromOpenTabs();
          console.log('[LSL] CONNECT_NOW →', ok);
          sendResponse({ ok });
          break;
        }

        case 'LOGOUT': {
          await clearAuth();
          sendResponse({ ok: true });
          break;
        }

        case 'SAVE_SETTINGS': {
          await setSettings({
            apiBase: normalizeApiBase(msg.apiBase),
            appUrl: normalizeAppUrl(msg.appUrl)
          });
          sendResponse({ ok: true });
          break;
        }

        case 'LSL_TAILOR': {
          // "tailor" now means: extract data → open pre-filled editor.
          let s = await getSettings();
          let connected = !!s.access;
          if (!connected) {
            console.log('[LSL] no token yet, harvesting from open app tabs…');
            connected = await tryHarvestFromOpenTabs();
          }
          console.log('[LSL] connected:', connected);

          if (!connected) {
            sendResponse({ ok: false, error: 'NOT_AUTHED' });
            break;
          }

          const url = await openEditorWithJob(msg.job || {});
          console.log('[LSL] opened editor:', url);
          sendResponse({ ok: true, url });
          break;
        }

        default:
          sendResponse({ ok: false, error: 'Unknown message' });
      }
    } catch (e) {
      console.error('[LSL] handler error:', e);
      sendResponse({ ok: false, error: String(e && e.message || e) });
    }
  })();
  return true; // async response
});
