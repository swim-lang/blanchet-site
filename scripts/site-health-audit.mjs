import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const HTML_FILES = [
  'index.html',
  'firm.html',
  'practices.html',
  'litigation.html',
  'commercial-litigation.html',
  'environmental-disputes.html',
  'product-liability.html',
  'white-collar.html',
  'ip-trade-secrets.html',
  'team.html',
  'bio-hannah-amundsen.html',
  'bio-myles-bartley.html',
  'bio-joel.html',
  'bio-caroline-creagan.html',
  'bio-timothy-cronin.html',
  'bio-andrew-devine.html',
  'bio-frank-dylewski.html',
  'bio-stefan-engelhardt.html',
  'bio-jaran-moten.html',
  'bio-craig-nolan.html',
  'bio-robert-reagan.html',
  'bio-bridget-ruschak.html',
  'bio-john-worth.html',
  'insights.html',
  'insights-article.html',
  'contact.html',
  'email-signatures.html'
];

const issues = [];

function read(file) {
  return readFileSync(path.join(ROOT_DIR, file), 'utf8');
}

function attrs(tag) {
  const map = {};
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrPattern.exec(tag))) {
    map[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return map;
}

function textOnly(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function imageAltText(html) {
  return Array.from(html.matchAll(/<img\b[^>]*>/gi))
    .map(match => attrs(match[0]).alt || '')
    .join(' ')
    .trim();
}

function isWrappedByLabel(html, index) {
  const before = html.slice(0, index);
  return before.lastIndexOf('<label') > before.lastIndexOf('</label>');
}

function existsLocal(target) {
  const [withoutHash] = target.split('#');
  if (!withoutHash || withoutHash.startsWith('mailto:') || withoutHash.startsWith('tel:')) return true;
  if (/^(https?:)?\/\//.test(withoutHash) || withoutHash.startsWith('data:')) return true;
  return existsSync(path.join(ROOT_DIR, decodeURIComponent(withoutHash)));
}

for (const file of HTML_FILES) {
  const html = read(file);

  for (const match of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const tag = match[0];
    const attr = attrs(tag);
    const label = textOnly(match[1]) || imageAltText(match[1]) || attr['aria-label'] || attr.title || '';

    if (!attr.href) {
      issues.push({ file, type: 'a11y', detail: 'Anchor is missing href', snippet: tag.slice(0, 120) });
    } else if (attr.href === '#') {
      issues.push({ file, type: 'broken-link', detail: 'Placeholder href="#" link', snippet: tag.slice(0, 120) });
    } else if (!existsLocal(attr.href)) {
      issues.push({ file, type: 'broken-link', detail: `Missing local target: ${attr.href}`, snippet: tag.slice(0, 120) });
    }

    if (!label) {
      issues.push({ file, type: 'a11y', detail: 'Anchor has no accessible text', snippet: tag.slice(0, 120) });
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const attr = attrs(tag);
    if (!Object.hasOwn(attr, 'alt')) {
      issues.push({ file, type: 'a11y', detail: 'Image is missing alt text', snippet: tag.slice(0, 120) });
    }
  }

  const labelFors = new Set(Array.from(html.matchAll(/<label\b[^>]*for=["']([^"']+)["'][^>]*>/gi), m => m[1]));
  for (const match of html.matchAll(/<(input|textarea|select)\b[^>]*>/gi)) {
    const tag = match[0];
    const attr = attrs(tag);
    if ((attr.type || '').toLowerCase() === 'hidden') continue;
    const hasLabel = attr.id && labelFors.has(attr.id);
    const hasWrappingLabel = isWrappedByLabel(html, match.index);
    const hasAria = attr['aria-label'] || attr['aria-labelledby'];
    if (!hasLabel && !hasWrappingLabel && !hasAria) {
      issues.push({ file, type: 'a11y', detail: 'Form control has no explicit label', snippet: tag.slice(0, 120) });
    }
  }

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) {
    issues.push({ file, type: 'a11y', detail: `Expected exactly one h1, found ${h1Count}` });
  }

  if (!/<title>[^<]+<\/title>/i.test(html)) {
    issues.push({ file, type: 'seo', detail: 'Missing title tag' });
  }

  if (!/<meta\s+name=["']description["']/i.test(html)) {
    issues.push({ file, type: 'seo', detail: 'Missing meta description' });
  }
}

if (issues.length) {
  console.error(JSON.stringify({ issueCount: issues.length, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ issueCount: 0, pagesChecked: HTML_FILES.length }, null, 2));
