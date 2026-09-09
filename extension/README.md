# LebenslaufAI — Chrome Extension (Job Tailorer)

Extracts the job posting you are viewing on **LinkedIn, Xing or Indeed**, sends it to your
LebenslaufAI backend, generates a **tailored CV + cover letter**, and opens the result in your
web app editor.

## Install (development)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select this `extension/` folder

## Configure

1. Right-click the extension icon → **Options**
2. Set:
   - **API base URL** — default `http://localhost:8000/api/v1`
   - **Web app URL** — where generated CVs open, default `http://localhost:5173`

## Sign in (no password in the extension)

The extension never asks for your credentials. Click **🌐 Sign in via Website** — the
web app's own login page opens (email/password **or Google OAuth**). Once you're signed
in there, the extension harvests the session automatically and shows you as connected.

- Works because the SPA stores its JWT pair in `localStorage`, which the extension
  reads from any tab of the web app's origin.
- "Connect now" buttons re-scan open tabs if auto-detection misses.
- Tokens are refreshed by the service worker exactly like `services/api.ts` does.
4. If you point the API at a non-localhost server, Chrome will ask to grant host permission — accept it.

## Use

1. Open any job posting on LinkedIn (`/jobs/…`), Xing (`/jobs/…`) or Indeed
2. Click the floating **⚡ Tailor this job** button (bottom-right of the page),
   or open the popup and press **Tailor this page now**
3. The extension:
   - extracts title / company / description (JSON-LD `JobPosting` first, CSS fallbacks second)
   - calls `POST /resume/tailor` → saves a new ResumeVersion on the backend
   - generates a cover letter and persists it via `POST /resume/letters` (best effort)
   - opens `http://<app>/editor?versionId=<id>` with the finished CV loaded

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest: content-script matches, service worker, popup, options |
| `background.js` | Service worker: auth, token refresh, tailor pipeline, tab opening |
| `content/lebenslauf.js` | Per-page extractor (JSON-LD + selectors) + floating button UI (shadow DOM) |
| `popup/` | Toolbar popup: auth state, one-click tailor for active tab |
| `options/` | Server URLs, sign in/out, runtime host-permission grant |
| `icons/` | Generated brand icons |

## Publishing note (Chrome Web Store)

Because this extension injects content scripts into third-party sites, store review requires:
- a privacy policy URL,
- justification for each host permission,
- and avoiding broad `https://*/*` grants (this manifest uses targeted matches + optional runtime permissions).

## Platform support matrix

| Site | JSON-LD | Selector fallback |
|---|---|---|
| LinkedIn `/jobs/*` | ✅ | ✅ |
| Xing `/jobs/*` | ✅ | ✅ |
| Indeed (any TLD) | ✅ | ✅ |
| Other boards | ❌ | generic `<h1>` + main-text heuristic |

New platforms = add match patterns in `manifest.json` + a branch in `fromSelectors()`.
