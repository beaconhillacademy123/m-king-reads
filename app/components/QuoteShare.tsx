'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Check, Download, Link2, Loader2, MessageCircle, Quote, Share2, X } from 'lucide-react';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mkingreads.promisevisuals.com';
const DOMAIN = SITE.replace(/^https?:\/\//, '').replace(/\/$/, '');
const MIN = 12;
const MAX = 420;

type Format = 'post' | 'story';
const SIZES: Record<Format, { w: number; h: number; label: string }> = {
  post: { w: 1080, h: 1350, label: 'Post' },
  story: { w: 1080, h: 1920, label: 'Status / Story' },
};

function clean(text: string) {
  return text.replace(/\s+/g, ' ').replace(/^["“”'‘’\s]+|["“”'‘’\s]+$/g, '').trim();
}

function fontStack(variable: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the quote card. Pure canvas, no remote images, so it can always be exported. */
export async function drawQuoteCard(quote: string, title: string, author: string, format: Format) {
  const { w, h } = SIZES[format];
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Images are not supported in this browser.');
  const serif = fontStack('--font-display', "Georgia, 'Times New Roman', serif");
  const sans = fontStack('--font-sans', 'Arial, Helvetica, sans-serif');
  try { await Promise.all([document.fonts.load(`600 64px ${serif}`), document.fonts.load(`600 30px ${sans}`)]); } catch {}

  // Background: deep library night with a warm glow.
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#171926'); bg.addColorStop(1, '#0b0c12');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.85, h * 0.1, 10, w * 0.85, h * 0.1, w * 0.9);
  glow.addColorStop(0, 'rgba(226,182,92,0.28)'); glow.addColorStop(1, 'rgba(226,182,92,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  const gold = ctx.createLinearGradient(0, 0, w, 0);
  gold.addColorStop(0, '#f6d58b'); gold.addColorStop(0.5, '#e2b65c'); gold.addColorStop(1, '#c8912f');

  const pad = 96;
  ctx.strokeStyle = 'rgba(226,182,92,0.35)'; ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, w - 80, h - 80);

  // Big opening quote mark.
  ctx.fillStyle = gold; ctx.font = `700 260px ${serif}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText('“', pad - 14, format === 'story' ? 520 : 360);

  // Quote text, sized to fit.
  const maxW = w - pad * 2;
  const top = format === 'story' ? 560 : 400;
  const bottom = h - (format === 'story' ? 520 : 400);
  let size = 72; let lines: string[] = []; let lh = 0;
  for (; size >= 34; size -= 2) {
    ctx.font = `600 ${size}px ${serif}`;
    lines = wrap(ctx, quote, maxW);
    lh = size * 1.32;
    if (lines.length * lh <= bottom - top) break;
  }
  ctx.fillStyle = '#f3ecdf'; ctx.textBaseline = 'top';
  const start = top + Math.max(0, (bottom - top - lines.length * lh) / 2);
  lines.forEach((l, i) => ctx.fillText(l, pad, start + i * lh));

  // Book line.
  const bookY = bottom + 50;
  ctx.fillStyle = gold; ctx.fillRect(pad, bookY, 90, 5);
  ctx.fillStyle = '#f3ecdf'; ctx.font = `600 44px ${serif}`;
  const titleLines = wrap(ctx, title, maxW).slice(0, 2);
  titleLines.forEach((l, i) => ctx.fillText(l, pad, bookY + 34 + i * 54));
  ctx.fillStyle = '#b9b2a4'; ctx.font = `500 34px ${sans}`;
  ctx.fillText(author, pad, bookY + 34 + titleLines.length * 54 + 10);

  // Brand footer with the app link.
  const footY = h - 170;
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(pad, footY - 34, maxW, 2);
  ctx.fillStyle = gold; ctx.font = `700 40px ${serif}`;
  ctx.fillText('M King Reads', pad, footY);
  ctx.fillStyle = '#f3ecdf'; ctx.font = `600 32px ${sans}`;
  ctx.fillText(`Read it free → ${DOMAIN}`, pad, footY + 56);

  return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not make the image.'))), 'image/png'));
}

/**
 * Watches for a highlighted line inside the reader and offers to share it as an
 * image with the app link — made for WhatsApp Status and Instagram.
 */
export default function QuoteShare({ containerRef, title, author, sharePath }: {
  containerRef: RefObject<HTMLElement | null>; title: string; author: string; sharePath: string;
}) {
  const [selected, setSelected] = useState('');
  const [quote, setQuote] = useState('');
  const [format, setFormat] = useState<Format>('post');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const hideTimer = useRef<number | null>(null);
  const link = `${SITE}${sharePath}`;

  useEffect(() => {
    function onChange() {
      const sel = window.getSelection();
      const root = containerRef.current;
      const text = sel && !sel.isCollapsed ? clean(sel.toString()) : '';
      const inside = !!(root && sel && sel.rangeCount && root.contains(sel.getRangeAt(0).commonAncestorContainer));
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (inside && text.length >= MIN) { setSelected(text); return; }
      // Keep the button a moment so a tap on it still lands after the selection clears.
      hideTimer.current = window.setTimeout(() => setSelected(''), 400);
    }
    document.addEventListener('selectionchange', onChange);
    return () => { document.removeEventListener('selectionchange', onChange); if (hideTimer.current) window.clearTimeout(hideTimer.current); };
  }, [containerRef]);

  const shown = quote.length > MAX ? `${quote.slice(0, MAX).replace(/\s+\S*$/, '')}…` : quote;

  const render = useCallback(async () => {
    if (!shown) return;
    const canvas = await drawQuoteCard(shown, title, author, format);
    setPreview(canvas.toDataURL('image/png'));
    return canvas;
  }, [shown, title, author, format]);

  useEffect(() => { if (quote) void render(); }, [quote, render]);

  function open() {
    if (!selected) return;
    setQuote(selected); setNote(''); setPreview('');
    window.getSelection()?.removeAllRanges();
    setSelected('');
  }

  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'quote'}-quote.png`;
  const shareText = `“${shown}” — ${title}, ${author}\n\nRead it free on M King Reads: ${link}`;

  async function shareImage() {
    setBusy('share');
    try {
      const canvas = await render();
      if (!canvas) return;
      const file = new File([await canvasBlob(canvas)], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${title} — M King Reads`, text: shareText });
        setNote('Shared ✔');
      } else {
        download(canvas);
        setNote('Image saved. Post it on WhatsApp Status or Instagram, then paste the link.');
        try { await navigator.clipboard.writeText(link); } catch {}
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setNote('Sharing isn’t available here. Use Download instead.');
    } finally { setBusy(''); }
  }

  function download(canvas?: HTMLCanvasElement) {
    const href = canvas ? canvas.toDataURL('image/png') : preview;
    if (!href) return;
    const a = document.createElement('a');
    a.href = href; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(shareText); setNote('Quote and link copied.'); } catch { setNote(link); }
  }

  return (
    <>
      {selected && !quote && (
        <button type="button" className="quoteFab" onPointerDown={e => { e.preventDefault(); open(); }} onClick={open}>
          <Quote size={17} /> Share this quote
        </button>
      )}
      {quote && (
        <div className="modalBack" onClick={() => setQuote('')}>
          <div className="modal modalWide quoteModal" role="dialog" aria-modal="true" aria-label="Share this quote" onClick={e => e.stopPropagation()}>
            <button className="modalClose" onClick={() => setQuote('')} aria-label="Close"><X size={18} /></button>
            <h3><Quote size={20} className="gold" /> Share this quote</h3>
            <div className="quoteFormats" role="radiogroup" aria-label="Image shape">
              {(Object.keys(SIZES) as Format[]).map(f => (
                <button key={f} type="button" role="radio" aria-checked={format === f} className={format === f ? 'on' : ''} onClick={() => setFormat(f)}>{SIZES[f].label}</button>
              ))}
            </div>
            <div className={`quotePreview quotePreview-${format}`}>
              {preview ? <img src={preview} alt={`Quote card: ${shown}`} /> : <Loader2 size={22} className="spin" />}
            </div>
            <button className="btn btnGold btnBlock" onClick={shareImage} disabled={!!busy}>
              {busy === 'share' ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />} Share image
            </button>
            <div className="quoteActions">
              <a className="btn btnGhost" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp text</a>
              <button className="btn btnGhost" onClick={() => download()} disabled={!preview}><Download size={16} /> Download</button>
              <button className="btn btnGhost" onClick={copyLink}>{note.startsWith('Quote and') ? <Check size={16} /> : <Link2 size={16} />} Copy</button>
            </div>
            {note && <p className="small dim" role="status">{note}</p>}
            <p className="fine">Tip: on Instagram, add the link with a link sticker so friends can open the book.</p>
          </div>
        </div>
      )}
    </>
  );
}
