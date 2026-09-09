/* LebenslaufAI content script — extraction only.
 * Runs on LinkedIn / Xing / Indeed job pages and answers "LSL_GET_JOB"
 * requests from the extension popup. No UI is injected into the page.
 *
 * Extraction priority:
 *   1. JSON-LD JobPosting (machine-readable, most reliable)
 *   2. Platform CSS selectors (multiple generations of markup)
 *   3. Meta-tag + link heuristics (og:title, /company/ links)
 *   4. Content-based description detector (keyword scan)
 *   5. Generic fallback (h1 + main text)
 */
(() => {
  if (window.__lebenslaufInjected) return;
  window.__lebenslaufInjected = true;

  const HOST = location.hostname;

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

    if (HOST.includes('linkedin.')) {
      title = q([
        '.job-details-jobs-unified-top-card__job-title h1',
        '.jobs-unified-top-card__job-title',
        'h1.top-card-layout__title',
        '.t-24.t-bold',
        'h1'
      ]);
      company = q([
        '[data-test-id="job-details-company-name"]',
        '.job-details-jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__subtitle-primary-grouping a',
        '.top-card-layout__second-subline a',
        'a[href*="/company/"]'
      ]);
      description = q([
        '#job-details',
        '.jobs-description__content .show-more-less-html__markup',
        '.show-more-less-html__markup',
        '.jobs-description__content',
        '.jobs-description-content__text',
        '[class*="jobs-description"]',
        '.jobs-box__html-content'
      ]);
    } else if (HOST.includes('indeed.')) {
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
    } else if (HOST.includes('xing.')) {
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
    const KEYWORDS =
      /responsibilit|requirement|qualificat|what you (?:will|'ll) do|what we(?:'re| are) looking for|about (?:the|this|us)|your (?:profile|role)|must[- ]have|nice[- ]to[- ]have|benefits|perks|ideal candidate|who you are/i;

    const candidates = [];
    document.querySelectorAll('div, section, article').forEach((el) => {
      const t = (el.innerText || '').trim();
      if (t.length < 400 || t.length > 20000) return;
      if (!KEYWORDS.test(t)) return;
      if (el.closest('nav, header, footer, aside')) return;
      candidates.push(el);
    });

    if (!candidates.length) return '';
    candidates.sort((a, b) =>
      (a.innerText || '').length - (b.innerText || '').length
    );
    return candidates[0].innerText.trim();
  }

  /* ---------------- orchestrator ---------------- */

  function extractJob() {
    const job = { position: '', company: '', description: '' };

    // 1. JSON-LD
    const ld = fromJsonLd();
    if (ld) {
      const org = ld.hiringOrganization || {};
      job.position = cleanText(ld.title || '');
      job.company = cleanText(typeof org === 'string' ? org : org.name || '');
      job.description = stripHtml(ld.description || '');
    }

    // 2. Platform selectors
    const fb = fromSelectors();
    if (!job.position && fb.position) job.position = fb.position;
    if (!job.company && fb.company) job.company = fb.company;
    if ((!job.description || job.description.length < 200) && fb.description) {
      job.description = fb.description;
    }

    // 3. Meta tags + company-link heuristics
    if (!job.position || !job.company) {
      const meta = fromMetaAndLinks();
      if (!job.position && meta.position) job.position = meta.position;
      if (!job.company && meta.company) job.company = meta.company;
    }

    // 4. Content-based description detection
    if (!job.description || job.description.length < 200) {
      const smart = smartDescription();
      if (smart.length > job.description.length) job.description = smart;
    }

    // 5. Generic fallbacks
    if (!job.position) {
      const h1 = document.querySelector('h1');
      if (h1) job.position = cleanText(h1.textContent);
    }
    if (!job.company) {
      // "at <Company>" pattern inside the description's first lines
      const m = job.description.slice(0, 600).match(/\bat\s+([A-Z][\w&.\- ]{2,40})(?:\s|,|\.|$)/);
      if (m) job.company = m[1].trim();
    }
    if (!job.description) {
      const main = document.querySelector('main') || document.body;
      job.description = (main.innerText || '').slice(0, 12000);
    }

    return {
      position: job.position.slice(0, 300),
      company: job.company.slice(0, 200),
      description: job.description.trim().slice(0, 12000)
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'LSL_GET_JOB') {
      const job = extractJob();
      sendResponse({ ok: job.description.length >= 80, job });
    }
  });
})();
