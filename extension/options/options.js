/* Options: server URLs + website-based account connection.
 * No credentials are handled here — the website's own login page is used,
 * so Google OAuth and future providers keep working unchanged. */

const $ = (id) => document.getElementById(id);

function getSettings() {
  return new Promise((r) => chrome.storage.local.get(
    ['apiBase', 'appUrl', 'access', 'email'], r));
}

function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

async function ensureHostPermission(rawUrl) {
  try {
    const origin = new URL(rawUrl).origin + '/*';
    const granted = await chrome.permissions.contains({ origins: [origin] });
    if (granted) return true;
    return await chrome.permissions.request({ origins: [origin] });
  } catch (_) {
    // localhost is covered by manifest host_permissions already
    return /localhost|127\.0\.0\.1/.test(rawUrl);
  }
}

function note(el, text, isErr = false) {
  el.textContent = text;
  el.classList.remove('hidden');
  el.classList.toggle('err', isErr);
}

async function render() {
  const s = await getSettings();
  $('apiBase').value = s.apiBase || 'http://localhost:8000/api/v1';
  $('appUrl').value = s.appUrl || 'http://localhost:5173';

  const authed = !!s.access;
  $('signedInAs').classList.toggle('hidden', !authed);
  $('notConnected').classList.toggle('hidden', authed);
  if (authed) $('whoami').textContent = s.email || '';
}

$('saveServer').addEventListener('click', async () => {
  const apiBase = ($('apiBase').value || '').trim().replace(/\/+$/, '');
  const appUrl = ($('appUrl').value || '').trim().replace(/\/+$/, '');

  if (!/^https?:\/\//.test(apiBase) || !/^https?:\/\//.test(appUrl)) {
    note($('serverMsg'), 'Both URLs must start with http:// or https://', true);
    return;
  }

  await new Promise((r) => chrome.storage.local.set({ apiBase, appUrl }, r));
  await ensureHostPermission(apiBase);
  await ensureHostPermission(appUrl);
  note($('serverMsg'), 'Saved ✓');
});

$('websiteLoginBtn').addEventListener('click', async () => {
  const apiBase = ($('apiBase').value || '').trim().replace(/\/+$/, '');
  const appUrl = ($('appUrl').value || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//.test(apiBase)) await ensureHostPermission(apiBase);
  if (/^https?:\/\//.test(appUrl)) await ensureHostPermission(appUrl);

  note($('authMsg'), 'Opening the website login… sign in there; the extension connects automatically.');
  await send({
    type: 'OPEN_WEBSITE_LOGIN',
    apiBase,
    appUrl
  });
});

$('connectNowAlt').addEventListener('click', async () => {
  const res = await send({ type: 'CONNECT_NOW' });
  note($('authMsg'),
    res?.ok ? 'Connected ✓' : 'No logged-in web-app tab found. Open the site and sign in first.',
    !res?.ok);
});

$('connectNowBtn').addEventListener('click', async () => {
  const res = await send({ type: 'CONNECT_NOW' });
  note($('authMsg'), res?.ok ? 'Re-connected ✓' : 'Could not find a logged-in tab.', !res?.ok);
});

$('logoutBtn').addEventListener('click', async () => {
  await send({ type: 'LOGOUT' });
  render();
});

function normalize(u) {
  u = (u || '').replace(/\/+$/, '');
  return u;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'LSL_STATE') render();
});
chrome.storage.onChanged.addListener(() => render());

render();
