/* LebenslaufAI Job Tailorer — MV3 service worker (auth-free).
 *
 * The extension never touches login tokens. It extracts the job posting from
 * the active tab and opens the web-app editor pre-filled
 * (…/editor?company=&position=&jd=). Sign-in happens on the website itself;
 * a deep-link opened while logged out is restored after login by the app.
 *
 * URL defaults live in config.js (single source).
 */
try { importScripts('config.js'); } catch (_) {}

const CFG = globalThis.LSL_CONFIG;
const DEFAULTS = CFG.DEFAULTS;
const normalizeApiBase = CFG.normalizeApiBase;
const normalizeAppUrl = CFG.normalizeAppUrl;

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(Object.keys(DEFAULTS), (s) => resolve({ ...DEFAULTS, ...s }));
  });
}

function setSettings(patch) {
  return new Promise((resolve) => chrome.storage.local.set(patch, resolve));
}

/* NOTE: no SPA re-inject here on purpose. The popup injects
 * ['config.js', 'content/lebenslauf.js'] on demand and polls while the lazy
 * detail pane loads — one injection path instead of two. */

async function openEditorWithJob(job) {
  const { appUrl } = await getSettings();
  const url = CFG.editorUrl(appUrl, job || {});
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
          sendResponse({ apiBase: s.apiBase, appUrl: s.appUrl });
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
          const url = await openEditorWithJob(msg.job || {});
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
