import { fetchWithTimeout } from './ebook';

export type GutenbergBook = {
  id: number; title: string; authors: { name: string; birth_year: number | null; death_year: number | null }[];
  summaries?: string[]; subjects: string[]; bookshelves: string[]; languages: string[]; copyright: boolean | null;
  formats: Record<string, string>; download_count: number;
};
export type GutendexPage = { count: number; next: string | null; previous: string | null; results: GutenbergBook[] };

export async function gutendex(path: string, timeout = 12000): Promise<GutendexPage | null> {
  try {
    const res = await fetchWithTimeout(`https://gutendex.com/books/${path}`, timeout, 3600);
    if (!res.ok) return null;
    return (await res.json()) as GutendexPage;
  } catch { return null; }
}

export async function gutendexBook(id: string): Promise<GutenbergBook | null> {
  const clean = id.replace(/\D/g, '');
  if (!clean) return null;
  try {
    const res = await fetchWithTimeout(`https://gutendex.com/books/${clean}`, 6000, 86400);
    if (res.ok) return (await res.json()) as GutenbergBook;
  } catch { /* fall back to the mirror's RDF record */ }
  return rdfBook(clean);
}

function decode(v: string) {
  return v.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#13;/g, ' ').replace(/\s*:?\s*\$b\s*/g, ': ').replace(/\s+/g, ' ').trim();
}

/** Reads the catalogue record (RDF/XML) from the Project Gutenberg mirror. */
async function rdfBook(id: string): Promise<GutenbergBook | null> {
  try {
    const res = await fetchWithTimeout(`https://gutenberg.pglaf.org/cache/epub/${id}/pg${id}.rdf`, 10000, 604800);
    if (!res.ok) return null;
    const xml = await res.text();
    const title = /<dcterms:title>([\s\S]*?)<\/dcterms:title>/.exec(xml)?.[1];
    if (!title) return null;
    const creator = /<dcterms:creator>([\s\S]*?)<\/dcterms:creator>/.exec(xml)?.[1] ?? '';
    const name = /<pgterms:name>([\s\S]*?)<\/pgterms:name>/.exec(creator)?.[1];
    const birth = /<pgterms:birthdate[^>]*>(\d+)</.exec(creator)?.[1];
    const death = /<pgterms:deathdate[^>]*>(\d+)</.exec(creator)?.[1];
    const subjects = Array.from(xml.matchAll(/<dcterms:subject>[\s\S]*?<rdf:value>([\s\S]*?)<\/rdf:value>/g)).map(m => decode(m[1]));
    const summary = /<pgterms:marc520>([\s\S]*?)<\/pgterms:marc520>/.exec(xml)?.[1];
    const lang = /<dcterms:language>[\s\S]*?<rdf:value[^>]*>([\s\S]*?)<\/rdf:value>/.exec(xml)?.[1];
    const downloads = Number(/<pgterms:downloads[^>]*>(\d+)</.exec(xml)?.[1] ?? 0);
    return {
      id: Number(id), title: decode(title).split(/[:;] /)[0],
      authors: name ? [{ name: decode(name), birth_year: birth ? Number(birth) : null, death_year: death ? Number(death) : null }] : [],
      summaries: summary ? [decode(summary)] : [], subjects, bookshelves: [], languages: lang ? [decode(lang)] : ['en'], copyright: null,
      formats: { 'image/jpeg': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg` }, download_count: downloads,
    };
  } catch { return null; }
}

/** Display name "Austen, Jane" → "Jane Austen". */
export function personName(name?: string) {
  if (!name) return 'Unknown author';
  const [last, first] = name.split(',').map(s => s.trim());
  return first ? `${first.replace(/\s*\(.*\)$/, '')} ${last}` : last;
}

export const coverFor = (b: GutenbergBook) => b.formats['image/jpeg'] || `https://www.gutenberg.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg`;
