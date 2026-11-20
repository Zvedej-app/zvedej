import type { FeedItem } from './types';

/**
 * Jednoduchý parser RSS feedů webu vzpirani.cz (kalendar?action=atom, aktuality?action=atom).
 * Funguje bez DOMParseru, takže běží v React Native, na webu i v Deno edge funkci.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(s: string) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function tag(xml: string, name: string) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = xml.match(re);
  if (!m) return null;
  let v = m[1].trim();
  const cdata = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) v = cdata[1];
  else v = decodeEntities(v);
  return v;
}

export function stripHtml(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** "28. 11. 2026" -> "2026-11-28" */
function czDate(s: string | null) {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function rfcDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function cleanLink(link: string) {
  return link.replace(/\?utm_[^#]*$/, '');
}

function parseCategory(cat: string | null) {
  const out: Record<string, string> = {};
  if (!cat) return out;
  // "Místo= TJ Holešov, Rok=2026, TS=Ostatní soutěže" – místo může obsahovat čárky,
  // proto dělíme podle klíčů.
  const re = /(Místo|Rok|TS)\s*=\s*([\s\S]*?)(?=,\s*(?:Místo|Rok|TS)\s*=|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cat))) out[m[1]] = m[2].trim();
  return out;
}

function attachments(html: string | null) {
  if (!html) return [];
  const out: { title: string; url: string }[] = [];
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = decodeEntities(m[1]);
    if (url.includes('file.php') || /\.(pdf|docx?|xlsx?)$/i.test(url)) {
      out.push({ title: stripHtml(m[2]) || 'Soubor', url });
    }
  }
  return out;
}

function firstImage(html: string | null) {
  if (!html) return null;
  const m = html.match(/<img\s[^>]*src="([^"]+)"/i);
  if (!m) return null;
  const src = decodeEntities(m[1]);
  return src.startsWith('http') ? src : `https://www.vzpirani.cz${src.startsWith('/') ? '' : '/'}${src}`;
}

function items(xml: string) {
  return xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
}

export function parseCalendar(xml: string): FeedItem[] {
  return items(xml).map((it) => {
    const content = tag(it, 'content:encoded') ?? tag(it, 'description');
    const cat = parseCategory(tag(it, 'category'));
    const link = cleanLink(tag(it, 'link') ?? '');
    return {
      id: tag(it, 'guid') ?? link,
      title: stripHtml(tag(it, 'title') ?? ''),
      link,
      date: czDate(tag(it, 'dueDate')),
      endDate: czDate(tag(it, 'endDate')),
      place: cat['Místo'] ?? null,
      kind: cat['TS'] ?? null,
      excerpt: null,
      image: null,
      attachments: attachments(content),
    };
  });
}

export function parseNews(xml: string): FeedItem[] {
  return items(xml).map((it) => {
    const content = tag(it, 'content:encoded');
    const desc = tag(it, 'description');
    const link = cleanLink(tag(it, 'link') ?? '');
    const text = stripHtml(content ?? desc ?? '');
    return {
      id: tag(it, 'guid') ?? link,
      title: stripHtml(tag(it, 'title') ?? ''),
      link,
      date: rfcDate(tag(it, 'pubDate')),
      excerpt: text.length > 260 ? text.slice(0, 257).trimEnd() + '…' : text,
      image: firstImage(content),
      attachments: attachments(content),
    };
  });
}
