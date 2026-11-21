// Builds lib/generated/gutenberg-en.json: every English text in Project Gutenberg's catalogue,
// stored as id ranges, so /free-books sitemaps can list each free book without calling Gutendex.
// Runs before `next build`. If the download fails the existing file is kept and the build goes on.
import { gunzipSync } from 'node:zlib';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../lib/generated/gutenberg-en.json', import.meta.url));
const SOURCES = [
  'https://gutenberg.pglaf.org/cache/epub/feeds/pg_catalog.csv.gz',
  'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz',
];

/** Yields the first `want` fields of each CSV record (handles quotes and newlines inside quotes). */
function* records(text, want) {
  let i = 0;
  const n = text.length;
  while (i < n) {
    const fields = [];
    let field = '';
    let quoted = false;
    for (; i < n; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
        } else if (fields.length < want) field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { fields.push(field); field = ''; }
      else if (c === '\n') { i++; break; }
      else if (c !== '\r') field += c;
    }
    fields.push(field);
    yield fields;
  }
}

async function download() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) { console.warn(`[gutenberg-index] ${url} -> ${res.status}`); continue; }
      return gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8');
    } catch (e) { console.warn(`[gutenberg-index] ${url} failed: ${e.message}`); }
  }
  return null;
}

const csv = await download();
if (!csv) {
  let kept = 0;
  try { kept = JSON.parse(readFileSync(OUT, 'utf8')).count ?? 0; } catch {}
  console.warn(`[gutenberg-index] catalogue unavailable; keeping existing index (${kept} books).`);
  process.exit(0);
}

const ids = [];
let header = true;
for (const [id, type, , , language] of records(csv, 5)) {
  if (header) { header = false; continue; }
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0 || type !== 'Text') continue;
  if (!(language || '').split(';').map(s => s.trim()).includes('en')) continue;
  ids.push(n);
}
ids.sort((a, b) => a - b);
const ranges = [];
for (const n of ids) {
  const last = ranges[ranges.length - 1];
  if (last && n === last[1] + 1) last[1] = n;
  else if (!last || n > last[1]) ranges.push([n, n]);
}
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: ids.length, ranges: ranges.map(([a, b]) => (a === b ? a : [a, b])) }));
console.log(`[gutenberg-index] ${ids.length} English books in ${ranges.length} ranges.`);
