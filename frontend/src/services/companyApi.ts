export interface CompanySuggestion {
  name: string;
  domain: string;
  logo: string;
}

const AUTOCOMPLETE_URL = 'https://autocomplete.clearbit.com/v1/companies/suggest?query=';

/**
 * Search public Clearbit autocomplete API for company suggestions.
 * Returns [] on short queries or network failures so callers can
 * gracefully fall back to free-text entry (no domain).
 */
export async function fetchCompanySuggestions(query: string, signal?: AbortSignal): Promise<CompanySuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(`${AUTOCOMPLETE_URL}${encodeURIComponent(q)}`, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item: any) => item && item.name && item.domain)
      .map((item: any) => {
        const domainStr = String(item.domain);
        // Clearbit stopped returning `logo` (null since Sept 2025) and
        // logo.clearbit.com is shut down — build our own working URL.
        const logoStr = logoUrlForDomain(domainStr) || String(item.logo || '');
        return {
          name: String(item.name),
          domain: domainStr,
          logo: logoStr,
        };
      });
  } catch (err: any) {
    // AbortError is expected during debounced typing — swallow it.
    if (err?.name === 'AbortError') return [];
    console.warn('Company autocomplete lookup failed:', err);
    return [];
  }
}

/** Build ordered logo URLs for a saved company domain.
 * Primary: unavatar.io (high-quality logo, 404s when unknown).
 * Secondary: DuckDuckGo favicon service (also 404s when unknown).
 * Note: logo.clearbit.com was shut down Dec 2025, and Google's
 * favicon endpoint always returns a generic globe (never 404s),
 * so neither is suitable anymore. */
export function logoUrlsForDomain(domain?: string | null): string[] {
  if (!domain) return [];
  const clean = domain.trim().toLowerCase();
  if (!clean) return [];
  return [
    `https://unavatar.io/${clean}?fallback=false`,
    `https://icons.duckduckgo.com/ip3/${clean}.ico`,
  ];
}

/** Build a logo URL for a saved company domain (first choice). */
export function logoUrlForDomain(domain?: string | null): string | null {
  const urls = logoUrlsForDomain(domain);
  return urls.length > 0 ? urls[0] : null;
}
