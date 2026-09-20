/* Popup (auth-free): extracts the posting from the active tab and opens the
 * web-app editor pre-filled. Sign-in happens on the website itself. */

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) console.error('[LSL popup] MISSING ELEMENT #' + id);
  return el;
};

function showStatus(text, isErr = false) {
  const el = $('statusLine');
  el.textContent = text;
  el.classList.remove('hidden');
  el.classList.toggle('err', isErr);
}

function send(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      resolve(chrome.runtime.lastError ? { ok: false, error: chrome.runtime.lastError.message } : res);
    });
  });
}

async function render() {
  const state = await send({ type: 'GET_STATE' });
  if (!state) return;
  $('apiBase').textContent = state.apiBase || '';
}

// Show which copy of the extension this popup belongs to (detects duplicates)
try {
  const m = chrome.runtime.getManifest();
  const v = document.createElement('div');
  v.textContent = `v${m.version} · id:${chrome.runtime.id.slice(0, 8)}`;
  v.style.cssText = 'padding:0 16px 10px;font-size:9px;color:#94A3B8;';
  document.body.appendChild(v);
} catch (_) {}

/** Ask the content script for the job. Injects on demand (tab predates
 *  install, or SPA navigation skipped auto-inject) and polls ~3s while the
 *  lazy detail pane loads. The content script answers ok:false on list/feed
 *  pages, so the verdict is trusted as-is — no length checks here. */
async function getJobFromTab(tabId) {
  const ask = () => new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'LSL_GET_JOB' }, (res) => {
      resolve(chrome.runtime.lastError ? null : res);
    });
  });

  let out = await ask();
  if (out?.ok) return out;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['config.js', 'content/lebenslauf.js']
    });
  } catch (e) {
    console.error('Content-script injection failed:', e);
  }

  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 500));
    out = await ask();
    if (out?.ok) return out;
  }
  return out;
}

async function tailorActiveTab(btn) {
  try {
    btn.disabled = true;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/.test(tab.url || '')) {
      btn.disabled = false;
      showStatus('Open a job posting page first.', true);
      return;
    }

    showStatus('Reading job from this tab…');
    const out = await getJobFromTab(tab.id);

    if (!out?.ok || !out.job) {
      btn.disabled = false;
      showStatus('No job details on this page — open a specific job posting (e.g. LinkedIn Jobs → click a job so its description is shown).', true);
      return;
    }

    showStatus('Opening the editor with this job…');
    await send({ type: 'LSL_TAILOR', job: out.job });

    // success: editor opened in a new tab
    window.close();
  } catch (e) {
    console.error('[LSL popup] tailor error:', e);
    btn.disabled = false;
    showStatus('Error: ' + (e?.message || e), true);
  }
}

/* Event delegation: every button click is handled in one place. */
document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  switch (t.id) {
    case 'tailorBtn': tailorActiveTab(t); break;
    case 'openApp':   openApp(); break;
    case 'goOptions': chrome.runtime.openOptionsPage(); break;
  }
});

function openApp() {
  send({ type: 'GET_STATE' }).then((s) => {
    chrome.tabs.create({ url: globalThis.LSL_CONFIG.normalizeAppUrl(s?.appUrl) });
  });
}

render();
