// ============================================================================
// KLARITY WEB RETRIEVAL / SEARCH PIPELINE (RAG)
// Zero-key live web search scraper using duck-duck-scrape + resilient fallbacks
// ============================================================================

let ddgModule = null;
async function getDdgScraper() {
  if (ddgModule) return ddgModule;
  try {
    ddgModule = require('duck-duck-scrape');
    return ddgModule;
  } catch {
    try {
      ddgModule = await import('duck-duck-scrape');
      return ddgModule;
    } catch {
      return null;
    }
  }
}

/**
 * Clean HTML tags, entities, and excess whitespace from scraped text snippets
 */
function cleanSnippetText(raw = '') {
  if (!raw) return '';
  return String(raw)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determine whether an incoming user prompt needs live/external web information
 */
function shouldTriggerWebSearch(prompt = '') {
  if (!prompt || typeof prompt !== 'string') return false;
  const trimmed = prompt.trim();
  if (trimmed.length < 4) return false;

  const lower = trimmed.toLowerCase();
  const conversationalOnly = new Set([
    'hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'clear', 'reset', 'help', 'bye'
  ]);
  if (conversationalOnly.has(lower)) return false;

  const triggerKeywords = [
    // Financial & Market Data
    'apr', '0%', '0 apr', 'rate', 'rates', 'interest', 'yield', 'hysa', 'savings',
    'card', 'credit card', 'cash back', 'cashback', 'rewards', 'bonus', 'transfer',
    'stock', 'market', 'etf', 'index', 's&p', 'nasdaq', 'crypto', 'bitcoin', 'inflation', 'fed',
    'loan', 'mortgage', 'refinance', 'auto loan', 'lease', 'irs', 'tax', 'limit', 'contribution',
    // Local, Utility & Consumer Deals
    'gas', 'cheapest', 'cheap', 'price', 'prices', 'cost', 'deal', 'deals', 'promo', 'rebate',
    'electric', 'ev', 'tesla', 'hybrid', 'charger', 'charging', 'pge', 'pg&e', 'sce', 'sdge', 'water',
    'grocery', 'groceries', 'costco', 'walmart', 'target', 'trader joe', 'safeway', 'supermarket',
    'near me', 'nearby', 'in my city', 'in my area', 'local', 'around here', 'fresno', 'california',
    // Temporal & Search Intent
    'current', 'currently', 'today', 'latest', 'new', 'now', '2025', '2026', 'recent',
    'search', 'look up', 'find', 'compare', 'best', 'top', 'recommend', 'review', 'vs',
    'what is', 'who is', 'where is', 'how much', 'when is', 'why is', 'weather', 'news', 'internet', 'web', 'online', 'browse', 'browsing'
  ];

  if (triggerKeywords.some(kw => lower.includes(kw))) {
    return true;
  }

  // Trigger on explicit questions
  if (
    lower.includes('?') ||
    /^(what|where|when|who|which|how|why|can|should|is|are|do|does)\b/i.test(lower)
  ) {
    return true;
  }

  return false;
}

/**
 * Primary Scraper: duck-duck-scrape library
 */
async function scrapeWithDuckDuckScrape(cleanQuery, maxResults = 5) {
  const ddg = await getDdgScraper();
  if (!ddg || typeof ddg.search !== 'function') return [];

  try {
    const searchOpts = ddg.SafeSearchType
      ? { safeSearch: ddg.SafeSearchType.MODERATE }
      : {};
    const response = await Promise.race([
      ddg.search(cleanQuery, searchOpts),
      new Promise((_, reject) => setTimeout(() => reject(new Error('ddg timeout')), 4500))
    ]);

    if (response && Array.isArray(response.results) && response.results.length > 0) {
      const parsed = [];
      for (const item of response.results) {
        const title = cleanSnippetText(item.title || '');
        const snippet = cleanSnippetText(item.description || item.snippet || '');
        const url = item.url || '';
        if (snippet.length > 25 && !snippet.includes('Sponsored')) {
          parsed.push({ title, snippet, url });
        }
        if (parsed.length >= maxResults) break;
      }
      return parsed;
    }
  } catch (err) {
    // Fall through to HTML Lite scraper if duck-duck-scrape hits VQD rate limit
  }
  return [];
}

/**
 * Fallback 1: Zero-Key DuckDuckGo HTML Lite Scraper
 */
async function scrapeWithDdgLite(cleanQuery, maxResults = 5) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      body: `q=${encodeURIComponent(cleanQuery)}`
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const html = await res.text();

    const titles = [];
    const urls = [];
    const linkRe = /<a[^>]*class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(html)) !== null && titles.length < maxResults + 3) {
      urls.push(lm[1]);
      titles.push(cleanSnippetText(lm[2]));
    }

    const snippets = [];
    const tdRe = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;
    let sm;
    while ((sm = tdRe.exec(html)) !== null && snippets.length < maxResults + 3) {
      const cleaned = cleanSnippetText(sm[1]);
      if (cleaned.length > 25 && !cleaned.includes('DuckDuckGo') && !cleaned.includes('Sponsored')) {
        snippets.push(cleaned);
      }
    }

    const results = [];
    for (let i = 0; i < snippets.length && results.length < maxResults; i++) {
      results.push({
        title: titles[i] || `Search Result ${i + 1}`,
        snippet: snippets[i],
        url: urls[i] || ''
      });
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Fallback 2: DuckDuckGo Instant Answer JSON API
 */
async function scrapeWithDdgInstantApi(cleanQuery, maxResults = 5) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'KlarityDesktop/1.0' }
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    const results = [];

    if (data.AbstractText) {
      results.push({
        title: cleanSnippetText(data.Heading || cleanQuery),
        snippet: cleanSnippetText(data.AbstractText),
        url: data.AbstractURL || ''
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= maxResults) break;
        if (topic.Text) {
          results.push({
            title: cleanSnippetText(topic.FirstURL ? topic.FirstURL.split('/').pop().replace(/_/g, ' ') : 'Related'),
            snippet: cleanSnippetText(topic.Text),
            url: topic.FirstURL || ''
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Fetch top 3-5 web search result snippets, clean the text, and format into an injected context block.
 *
 * @param {string} query - Search query string
 * @param {object} options - { maxResults: 5, locationHint: '' }
 * @returns {Promise<{ results: Array<{title: string, snippet: string, url: string}>, formattedContext: string }>}
 */
async function retrieveWebContext(query, options = {}) {
  const maxResults = options.maxResults || 5;
  const locationHint = options.locationHint || '';

  if (!query || typeof query !== 'string' || !query.trim()) {
    return { results: [], formattedContext: 'No live web context required.' };
  }

  let effectiveQuery = query.trim();
  const lowerQ = effectiveQuery.toLowerCase();
  const isLocalIntent = [
    'near me', 'nearby', 'in my city', 'in my area', 'around here',
    'cheapest gas', 'gas price', 'grocery', 'groceries', 'ev deal', 'dealer'
  ].some(k => lowerQ.includes(k));

  if (isLocalIntent && locationHint && !lowerQ.includes(locationHint.toLowerCase())) {
    effectiveQuery = `${effectiveQuery} ${locationHint}`;
  }

  const cleanQuery = effectiveQuery
    .replace(/[^\w\s\$\%\.\,\-\+]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  if (!cleanQuery) {
    return { results: [], formattedContext: 'No live web context available.' };
  }

  // 1. Try duck-duck-scrape first
  let results = await scrapeWithDuckDuckScrape(cleanQuery, maxResults);

  // 2. Fallback to DDG HTML Lite zero-key scraper
  if (results.length === 0) {
    results = await scrapeWithDdgLite(cleanQuery, maxResults);
  }

  // 3. Fallback to DDG Instant Answer JSON API
  if (results.length === 0) {
    results = await scrapeWithDdgInstantApi(cleanQuery, maxResults);
  }

  const topResults = results.slice(0, maxResults);

  if (topResults.length === 0) {
    return {
      results: [],
      formattedContext: 'No external web results matched this query.'
    };
  }

  const formattedContext = topResults
    .map((r, idx) => {
      const titlePart = r.title ? `${r.title}: ` : '';
      const sourcePart = r.url ? ` (Source: ${r.url})` : '';
      return `[${idx + 1}] ${titlePart}${r.snippet}${sourcePart}`;
    })
    .join('\n\n');

  return {
    query: cleanQuery,
    results: topResults,
    formattedContext
  };
}

module.exports = {
  cleanSnippetText,
  shouldTriggerWebSearch,
  retrieveWebContext
};
