/* LebenslaufAI content script — extraction only.
 * Answers "LSL_GET_JOB" with { ok, job, reason }. ok is true ONLY for real
 * job postings (feed / list / company pages return ok:false).
 *
 * Priority: JSON-LD JobPosting → scoped selectors (longest non-company
 * match) → "About the job" heading anchor (LinkedIn, EN+DE) → keyword scan
 * on detail pages. Meta title + company links fill gaps, never validate.
 */
(() => {
  if (window.__lebenslaufInjected) return;
  window.__lebenslaufInjected = true;

  // Hosts / URL helpers live in ../config.js (single source). Content bundle
  // is injected as ['config.js', 'content/lebenslauf.js'] so LSL_CONFIG exists.
  const CFG = globalThis.LSL_CONFIG || null;
  const HOST = location.hostname;
  const PLATFORM = CFG ? CFG.jobHost(HOST) : (HOST.includes('linkedin.') ? 'linkedin' : HOST.includes('indeed.') ? 'indeed' : HOST.includes('xing.') ? 'xing' : null);

  /* ---------------- helpers ---------------- */

  function stripHtml(html) {
    const el = document.createElement('div');
    el.innerHTML = html || '';
    return (el.textContent || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** Strip site suffixes and rating artifacts from titles/company names. */
  function cleanText(t) {
    return (t || '')
      .replace(/\s*[-–|·]\s*(LinkedIn|XING|Indeed|stepstone)\b.*$/i, '')
      .replace(/\s*\|\s*(LinkedIn|XING|Indeed|stepstone)\b.*$/i, '')
      .replace(/^\s*\d\.\d\s*/, '')            // Indeed rating prefix
      .replace(/\s*\d\.\d\s*$/, '')            // trailing rating
      .replace(/\s+/g, ' ')
      .trim();
  }

  function q(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const t = (el.textContent || el.content || el.getAttribute('content') || '').trim();
          if (t) return { el, text: t };
        }
      } catch (_) { /* invalid selector on old browsers */ }
    }
    return null;
  }

  function norm(s) {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  const ABOUT_JOB_HEADINGS = new Set([
    'about the job',
    'über die stelle', 'ueber die stelle', 'stellenbeschreibung',
    'über den job', 'aufgabenbeschreibung', 'jobbeschreibung'
  ]);

  const COMPANY_EXCLUDE = 'nav, header, footer, aside, [class*="company"], [class*="about-company"], [class*="employer"], [class*="insight"]';

  const MIN_DESC = 200; // strict: below this it is a preview/list, not a JD

  // config.js is always injected first (manifest order + popup fallback),
  // so this is just a null-safe one-liner — no duplicated URL logic here.
  function onDetailPage() {
    try { return globalThis.LSL_CONFIG.isJobDetailUrl(location.href); }
    catch (_) { return false; }
  }

  /** Click LinkedIn "Show more" inside the job detail so innerText is full. */
  function expandShowMore() {
    try {
      const root = document.querySelector('#job-details, .jobs-description__content, .jobs-search__job-details, .job-view-layout, main') || document;
      root.querySelectorAll('button').forEach((b) => {
        const t = norm(b.textContent || b.getAttribute('aria-label'));
        if (/show more|mehr anzeigen|plus afficher/.test(t)) {
          if (!b.closest(COMPANY_EXCLUDE)) { try { b.click(); } catch (_) {} }
        }
      });
    } catch (_) {}
  }

  /** Longest non-company match across selectors (first-hit would grab the
   *  "About the company" block that reuses the same LinkedIn classes). */
  function qBest(selectors) {
    let best = null;
    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          if (el.closest(COMPANY_EXCLUDE)) return;
          const t = (el.innerText || el.textContent || '').trim();
          if (t.length < MIN_DESC) return;
          if (!best || t.length > best.text.length) best = { el, text: t };
        });
      } catch (_) {}
    }
    return best;
  }

  /** Stable anchor: almost every LinkedIn JD starts right after an
   *  "About the job" / "Über die Stelle" heading. Exact-match the heading
   *  so "About the company" never matches, then read parent/next sibling. */
  function findAboutTheJobSection() {
    const heads = document.querySelectorAll('main h2, main h3, main h4, h2, h3, h4, div, span');
    for (const h of heads) {
      if (h.closest(COMPANY_EXCLUDE)) continue;
      // Heading text itself must be short — avoids matching the whole JD block.
      const own = norm(h.childNodes.length === 1 && h.childNodes[0].nodeType === 3
        ? h.textContent
        : (h.innerText || '').split('\n')[0]);
      if (!ABOUT_JOB_HEADINGS.has(own) && !ABOUT_JOB_HEADINGS.has(norm(h.textContent).slice(0, 60))) continue;
      if (norm(h.textContent).length > 60) continue;
      const scope = h.parentElement || h;
      const pool = [scope, scope.nextElementSibling, h.nextElementSibling].filter(Boolean);
      // Also consider the heading's section container (LinkedIn wraps
      // heading + description in the same <section>/<div>).
      if (scope.parentElement) pool.push(scope.parentElement);
      let best = '';
      for (const c of pool) {
        const t = (c.innerText || c.textContent || '').trim();
        // Must be substantially longer than the heading itself.
        if (t.length > 200 && t.length <= 20000 && t.length > best.length) best = t;
      }
      if (best.length >= 200) return best;
    }
    return '';
  }

  /* ---------------- source 1: JSON-LD ---------------- */

  function fromJsonLd() {
    const out = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const parsed = JSON.parse(s.textContent);
        const queue = Array.isArray(parsed) ? parsed : [parsed];
        while (queue.length) {
          const node = queue.shift();
          if (!node || typeof node !== 'object') continue;
          if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);
          const type = node['@type'];
          if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
            out.push(node);
          }
        }
      } catch (_) { /* malformed ld+json — ignore */ }
    });
    return out[0] || null;
  }

  /* ---------------- source 2: platform selectors ---------------- */

  function fromSelectors() {
    let title = null, company = null, description = null;

    if (PLATFORM === 'linkedin') {
      title = q([
        '.job-details-jobs-unified-top-card__job-title h1',
        '.jobs-unified-top-card__job-title',
        '.jobs-details__main-content h1',
        '.jobs-search__job-details h1',
        '.job-view-layout h1',
        'h1.top-card-layout__title',
        '.t-24.t-bold',
        'h1'
      ]);
      // Scope company link to the detail/top-card first, fall back to any.
      company = q([
        '[data-test-id="job-details-company-name"]',
        '.job-details-jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__subtitle-primary-grouping a',
        '.jobs-details__main-content a[href*="/company/"]',
        '.top-card-layout__second-subline a'
      ]) || q(['main a[href*="/company/"]', 'a[href*="/company/"]']);
      description = qBest([
        '#job-details',
        '.jobs-search__job-details .show-more-less-html__markup',
        '.jobs-description__content .show-more-less-html__markup',
        '.jobs-details__main-content .show-more-less-html__markup',
        '.show-more-less-html__markup',
        '.jobs-description__content',
        '.jobs-description-content__text',
        '[class*="jobs-description"]',
        '.jobs-box__html-content',
        '.jobs-search__job-details'
      ]);
    } else if (PLATFORM === 'indeed') {
      title = q([
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        '.jobsearch-JobInfoHeader-title',
        'h1'
      ]);
      company = q([
        '[data-testid="company-name"]',
        '[data-testid="inlineHeader-companyName"]',
        '[data-company-name]',
        '.jobsearch-InlineCompanyRating a',
        '.jobsearch-InlineCompanyRating div:first-child'
      ]);
      description = q([
        '#jobDescriptionText',
        '[data-testid="jobsearch-jobDescriptionText"]'
      ]);
    } else if (PLATFORM === 'xing') {
      title = q([
        '[data-testid="job-title"]',
        'h1[data-testid="job-detail-title"]',
        'h1'
      ]);
      company = q([
        '[data-testid="job-company-name"]',
        '[data-testid="job-detail-company"] a',
        'a[href*="/companies/"]'
      ]);
      description = q([
        '[data-testid="job-description"]',
        '[itemprop="description"]'
      ]);
    }

    return {
      position: title ? cleanText(title.text) : '',
      company: company ? cleanText(company.text) : '',
      description: description ? (description.el.innerText || description.text).trim() : ''
    };
  }

  /* ---------------- source 3: meta + link heuristics ---------------- */

  function fromMetaAndLinks() {
    const out = { position: '', company: '' };

    // og:title / <title> usually looks like "Senior Dev - Acme | LinkedIn"
    const meta =
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[name="title"]')?.content ||
      document.title || '';
    const cleanedMeta = cleanText(meta);
    if (cleanedMeta) {
      const parts = cleanedMeta.split(/\s+[-–|]\s+/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        out.position = parts[0];
        out.company = parts[parts.length - 1];
      } else {
        out.position = cleanedMeta;
      }
    }

    // Company links are stable across redesigns: /company/ (LinkedIn),
    // /companies/ (Xing), /cmp/ (Indeed)
    if (!out.company) {
      const a = document.querySelector(
        'main a[href*="/company/"], a[href*="/company/"], ' +
        'a[href*="/companies/"], a[href*="/cmp/"]'
      );
      if (a) out.company = cleanText(a.textContent);
    }

    return out;
  }

  /* ---------------- source 4: content-based description ---------------- */

  function smartDescription() {
    // EN + DE job signals. "About the company / Über das Unternehmen" is
    // deliberately NOT a positive signal — it caused company-blurb wins.
    const JOB_SIGNAL =
      /responsibilit|requirement|qualificat|what you (?:will|'ll) do|what we(?:'re| are) looking for|your (?:profile|role)|must[- ]have|nice[- ]to[- ]have|benefits|perks|ideal candidate|who you are|aufgaben|anforderungen|qualifikation|profil|wir bieten|tätigkeiten|taetigkeiten|was du mitbringst|was sie mitbringen|deine aufgaben|ihre aufgaben/i;

    const candidates = [];
    document.querySelectorAll('main div, main section, main article, div, section, article').forEach((el) => {
      const t = (el.innerText || '').trim();
      if (t.length < 200 || t.length > 20000) return;
      if (!JOB_SIGNAL.test(t.slice(0, 4000))) return;
      if (el.closest(COMPANY_EXCLUDE)) return;
      // Skip list cards on search-results pages (short previews).
      if (el.closest('[class*="search-results__list"], [class*="job-card"], ul')) {
        if (t.length < 800) return;
      }
      candidates.push({ el, text: t });
    });

    if (!candidates.length) return '';
    // Longest wins: the full JD is longer than any company blurb or preview.
    candidates.sort((a, b) => b.text.length - a.text.length);
    return candidates[0].text.trim();
  }

  /* Strict: feed / list / company pages return ok:false. Meta title and
   * company links only fill gaps — they never validate a page. */

  function extractJob() {
    const job = { position: '', company: '', description: '' };
    let evidence = 0; // independent JD signals (need ≥1)

    try { expandShowMore(); } catch (_) {}

    // 1. JSON-LD with a real description.
    const ld = fromJsonLd();
    if (ld) {
      const org = ld.hiringOrganization || {};
      const d = stripHtml(ld.description || '');
      if (d.length >= MIN_DESC) {
        job.position = cleanText(ld.title || '');
        job.company = cleanText(typeof org === 'string' ? org : org.name || '');
        job.description = d;
        evidence++;
      }
    }

    // 2. Selectors (longest non-company match) + heading anchor (LinkedIn).
    const fb = fromSelectors();
    if (!job.position && fb.position) job.position = fb.position;
    if (!job.company && fb.company) job.company = fb.company;
    if (job.description.length < MIN_DESC && fb.description && fb.description.length >= MIN_DESC) {
      job.description = fb.description;
      evidence++;
    }
    if (PLATFORM === 'linkedin') {
      try {
        const anchored = findAboutTheJobSection();
        if (anchored.length >= MIN_DESC && anchored.length >= job.description.length) {
          job.description = anchored;
          evidence++;
        }
      } catch (_) {}
    }

    // 3. Keyword scan — only on detail pages or with prior evidence, so a
    // big feed full of keywords can't validate.
    if (job.description.length < MIN_DESC) {
      const smart = smartDescription();
      if (smart.length >= MIN_DESC && (onDetailPage() || evidence > 0)) {
        job.description = smart;
        evidence++;
      }
    }

    // 4. Fill title/company gaps (never validates on its own).
    if (evidence > 0 && (!job.position || !job.company)) {
      const meta = fromMetaAndLinks();
      if (!job.position && meta.position) job.position = meta.position;
      if (!job.company && meta.company) job.company = meta.company;
    }

    job.position = job.position.slice(0, 300);
    job.company = job.company.slice(0, 200);
    job.description = job.description.trim().slice(0, 12000);

    const valid = evidence > 0 && job.description.length >= MIN_DESC && job.position.length >= 3;
    return {
      job,
      valid,
      reason: valid ? 'OK' : (job.description.length < MIN_DESC ? 'NO_DESCRIPTION' : (!job.position ? 'NO_TITLE' : 'NO_EVIDENCE'))
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'LSL_GET_JOB') {
      const { job, valid, reason } = extractJob();
      sendResponse({ ok: valid, job, reason });
    }
  });
})();
