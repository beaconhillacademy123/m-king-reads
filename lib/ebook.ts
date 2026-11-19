import { splitGutenbergHtml, type GutenbergChapter } from './gutenberg';

export function extractBody(html: string) {
  const lower = html.toLowerCase();
  const bodyStart = lower.indexOf('<body');
  const bodyOpenEnd = bodyStart >= 0 ? html.indexOf('>', bodyStart) + 1 : 0;
  const bodyEnd = lower.indexOf('</body>', bodyOpenEnd);
  return bodyStart >= 0 && bodyEnd >= 0 ? html.slice(bodyOpenEnd, bodyEnd) : html;
}

/** Removes active content and the Project Gutenberg licence header/footer, and absolutises image URLs. */
export function cleanEbookHtml(html: string, baseUrl?: string) {
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');

  // Gutenberg wraps the text in boilerplate sections.
  cleaned = cleaned.replace(/<section[^>]+id="pg-header"[\s\S]*?<\/section>/i, '');
  cleaned = cleaned.replace(/<section[^>]+id="pg-footer"[\s\S]*$/i, '');
  const start = cleaned.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG[^*]*\*\*\*/i);
  if (start >= 0) {
    const after = cleaned.indexOf('***', start + 5);
    const close = after >= 0 ? cleaned.indexOf('>', after) : -1;
    if (close > 0) cleaned = cleaned.slice(close + 1);
  }
  const end = cleaned.search(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i);
  if (end > 0) cleaned = cleaned.slice(0, cleaned.lastIndexOf('<', end));

  if (baseUrl) {
    cleaned = cleaned.replace(/src="([^"]+)"/gi, (match, src) => {
      try { return `src="${new URL(src, baseUrl).toString()}" loading="lazy"`; } catch { return match; }
    });
  }
  return cleaned;
}

export async function fetchWithTimeout(url: string, ms: number, revalidate = 86400) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, next: { revalidate } });
  } finally {
    clearTimeout(timer);
  }
}

/** Loads a Gutenberg HTML edition and splits it into chapters. Returns null when unavailable. */
export async function loadGutenbergChapters(gutenbergId: string | number): Promise<GutenbergChapter[] | null> {
  const id = String(gutenbergId).replace(/\D/g, '');
  if (!id) return null;
  const candidates = [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`,
    `https://www.gutenberg.org/ebooks/${id}.html.images`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url, 20000);
      if (!res.ok) continue;
      const html = await res.text();
      return splitGutenbergHtml(cleanEbookHtml(extractBody(html), url));
    } catch { /* try next */ }
  }
  return null;
}

export function clampChapter(value: string | string[] | undefined, total: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(total, Math.max(1, Math.floor(n))) : 1;
}
