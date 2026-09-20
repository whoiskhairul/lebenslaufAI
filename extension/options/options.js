/* Options: server URLs only (auth-free).
 * Sign-in happens on the website itself. URL defaults live in ../config.js. */

const CFG = globalThis.LSL_CONFIG;

const $ = (id) => document.getElementById(id);

function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

function getSettings() {
  return new Promise((r) => chrome.storage.local.get(['apiBase', 'appUrl'], r));
}

async function ensureHostPermission(rawUrl) {
  try {
    const origin = CFG.originPattern(rawUrl);
    const granted = await chrome.permissions.contains({ origins: [origin] });
    if (granted) return true;
    return await chrome.permissions.request({ origins: [origin] });
  } catch (_) {
    return CFG.isLocalUrl(rawUrl);
  }
}

function note(el, text, isErr = false) {
  el.textContent = text;
  el.classList.remove('hidden');
  el.classList.toggle('err', isErr);
}

async function render() {
  const s = await getSettings();
  $('apiBase').placeholder = CFG.DEFAULT_API_BASE;
  $('appUrl').placeholder = CFG.DEFAULT_APP_URL;
  $('apiBase').value = s.apiBase || CFG.DEFAULT_API_BASE;
  $('appUrl').value = s.appUrl || CFG.DEFAULT_APP_URL;
}

async function applyPreset(name) {
  const preset = CFG.ENVIRONMENTS[name];
  if (!preset) return;
  await new Promise((r) => chrome.storage.local.set({ apiBase: preset.apiBase, appUrl: preset.appUrl }, r));
  await ensureHostPermission(preset.apiBase);
  await ensureHostPermission(preset.appUrl);
  render();
  note($('serverMsg'), name === 'production' ? 'Switched to Production ✓' : 'Switched to Local ✓');
}

$('useLocal').addEventListener('click', () => applyPreset('local'));
$('useProd').addEventListener('click', () => applyPreset('production'));

$('saveServer').addEventListener('click', async () => {
  const apiBase = ($('apiBase').value || '').trim().replace(/\/+$/, '');
  const appUrl = ($('appUrl').value || '').trim().replace(/\/+$/, '');

  if (!/^https?:\/\//.test(apiBase) || !/^https?:\/\//.test(appUrl)) {
    note($('serverMsg'), 'Both URLs must start with http:// or https://', true);
    return;
  }

  await send({ type: 'SAVE_SETTINGS', apiBase, appUrl });
  await ensureHostPermission(apiBase);
  await ensureHostPermission(appUrl);
  note($('serverMsg'), 'Saved ✓');
});

chrome.storage.onChanged.addListener(() => render());

render();
