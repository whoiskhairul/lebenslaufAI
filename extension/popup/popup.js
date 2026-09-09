/* Popup: reflects auth state; sign-in happens on the website itself
 * (credentials / Google OAuth live there). "Tailor this job" extracts the
 * posting from the active tab and opens the web-app editor pre-filled. */

console.log('[LSL popup] script loading…');

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
  const authed = !!state.authed;

  $('loggedOut').classList.toggle('hidden', authed);
  $('loggedIn').classList.toggle('hidden', !authed);

  if (authed) {
    $('userEmail').textContent = state.email || 'Connected';
    $('apiBase').textContent = state.apiBase || '';
  } else {
    $('apiBase').textContent = state.apiBase || '';
  }
}

// Show which copy of the extension this popup belongs to (detects duplicates)
try {
  const m = chrome.runtime.getManifest();
  const v = document.createElement('div');
  v.textContent = `v${m.version} · id:${chrome.runtime.id.slice(0, 8)}`;
  v.style.cssText = 'padding:0 16px 10px;font-size:9px;color:#94A3B8;';
  document.body.appendChild(v);
  console.log('[LSL popup] extension id:', chrome.runtime.id);
} catch (_) {}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'LSL_STATE') render();
});

/** Ask the content script for the job. If the tab was opened before the
 *  extension was installed/reloaded, inject the extractor and retry once. */
async function getJobFromTab(tabId) {
  const ask = () => new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'LSL_GET_JOB' }, (res) => {
      resolve(chrome.runtime.lastError ? null : res);
    });
  });

  let out = await ask();
  if (!out) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/lebenslauf.js']
      });
      await new Promise((r) => setTimeout(r, 300));
      out = await ask();
    } catch (e) {
      console.error('Content-script injection failed:', e);
    }
  }
  return out;
}

async function tailorActiveTab(btn) {
  try {
    console.log('[LSL popup] ⚡ tailor clicked');
    btn.disabled = true;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[LSL popup] active tab:', tab?.id, tab?.url);
    if (!tab || !/^https?:/.test(tab.url || '')) {
      btn.disabled = false;
      showStatus('Open a job posting page first.', true);
      return;
    }

    showStatus('Reading job from this tab…');
    const out = await getJobFromTab(tab.id);
    console.log('[LSL popup] extraction result:', out);

    if (!out?.ok || !out.job || out.job.description.length < 80) {
      btn.disabled = false;
      showStatus('No job posting detected — open a job listing on LinkedIn, Xing or Indeed.', true);
      return;
    }

    showStatus('Opening the editor with this job…');
    const res = await send({ type: 'LSL_TAILOR', job: out.job });
    console.log('[LSL popup] tailor response:', res);

    btn.disabled = false;
    if (res && res.ok === false) {
      if (res.error === 'NOT_AUTHED') {
        showStatus('Connect your account first — click "Sign in via Website".', true);
      } else {
        showStatus(res.error || 'Something went wrong.', true);
      }
      return;
    }

    // success: editor opened in a new tab
    window.close();
  } catch (e) {
    console.error('[LSL popup] tailor error:', e);
    btn.disabled = false;
    showStatus('Error: ' + (e?.message || e), true);
  }
}

/* Bind via event DELEGATION on document — immune to any per-button
 * attachment order/timing issues. Every click is logged so nothing can
 * fail silently. */
document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  console.log('[LSL popup] click on #' + (t.id || t.className));
  switch (t.id) {
    case 'tailorBtn':      tailorActiveTab(t); break;
    case 'websiteLogin':   websiteLogin(t); break;
    case 'connectNow':
    case 'connectNow2':    connectNow(t); break;
    case 'openApp':        openApp(); break;
    case 'goOptions':      chrome.runtime.openOptionsPage(); break;
    case 'logoutBtn':      (async () => { await send({ type: 'LOGOUT' }); render(); })(); break;
  }
});

async function websiteLogin(btn) {
  showStatus('Opening the website login…');
  const s = await send({ type: 'GET_STATE' }) || {};
  for (const u of [s.appUrl, s.apiBase].filter(Boolean)) {
    try {
      const origin = new URL(u).origin + '/*';
      const has = await chrome.permissions.contains({ origins: [origin] });
      if (!has) await chrome.permissions.request({ origins: [origin] });
    } catch (_) { /* localhost dev origins are pre-granted via manifest */ }
  }
  await send({ type: 'OPEN_WEBSITE_LOGIN', apiBase: s.apiBase, appUrl: s.appUrl });
}

async function connectNow(btn) {
  const s = await send({ type: 'GET_STATE' }) || {};
  try {
    const origin = new URL(s.appUrl).origin + '/*';
    const has = await chrome.permissions.contains({ origins: [origin] });
    if (!has) await chrome.permissions.request({ origins: [origin] });
  } catch (_) {}

  const res = await send({ type: 'CONNECT_NOW' });
  if (!res?.ok) showStatus('No logged-in website tab found — open the site and sign in first.', true);
  else render();
}

function openApp() {
  send({ type: 'GET_STATE' }).then((s) => {
    chrome.tabs.create({ url: `${(s?.appUrl || 'http://localhost:5173').replace(/\/$/, '')}` });
  });
}

render();
