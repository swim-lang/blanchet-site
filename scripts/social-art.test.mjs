import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const html = read('social-art.html');
const css = read('css/social-art.css');
const script = read('js/social-art.js');
const vercel = JSON.parse(read('vercel.json'));
const bios = JSON.parse(read('bios.json')).bios;
const sitemap = read('sitemap.xml');

test('social art route is hidden from search and the public sitemap', () => {
  assert.match(html, /name="robots" content="noindex, nofollow, noarchive, nosnippet"/);
  assert.doesNotMatch(sitemap, /social-art/i);

  const protectedRoutes = vercel.headers
    .filter((entry) => ['/social-art', '/social-art.html'].includes(entry.source));
  assert.equal(protectedRoutes.length, 2);
  for (const route of protectedRoutes) {
    assert.ok(route.headers.some((header) => header.key === 'X-Robots-Tag' && /noindex/.test(header.value)));
  }
});

test('all requested templates, formats, themes, and logo treatments exist', () => {
  for (const template of ['announcement', 'attorney', 'perspective', 'cover']) {
    assert.match(html, new RegExp(`name="template" value="${template}"`));
  }
  for (const format of ['square', 'portrait']) {
    assert.match(html, new RegExp(`name="format" value="${format}"`));
  }
  for (const theme of ['ink', 'paper', 'slate']) {
    assert.match(html, new RegExp(`name="theme" value="${theme}"`));
  }
  for (const logo of ['lockup', 'symbol', 'none']) {
    assert.match(html, new RegExp(`name="logo" value="${logo}"`));
  }
});

test('canvas export dimensions and branded themes match the approved contract', () => {
  assert.match(script, /square:\s*\{ width: 1200, height: 1200/);
  assert.match(script, /portrait:\s*\{ width: 1080, height: 1350/);
  assert.match(script, /cover:\s*\{ width: 4200, height: 700/);
  assert.match(script, /ink:\s*\{ background: '#0c222c'/);
  assert.match(script, /paper:\s*\{ background: '#f4f6f7'/);
  assert.match(script, /slate:\s*\{ background: '#314956'/);
  assert.match(script, /toBlob/);
  assert.match(script, /image\/jpeg/);
  assert.match(script, /image\/png/);
});

test('uploads remain browser-local and support the approved image formats', () => {
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(script, /URL\.createObjectURL/);
  assert.match(script, /URL\.revokeObjectURL/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB|FormData|XMLHttpRequest/);
  assert.doesNotMatch(script, /fetch\([^)]*(upload|api|analytics)/i);
});

test('current local attorney photography resolves to real files', () => {
  const mappedPaths = [...script.matchAll(/'([a-z0-9-]+)': '(assets\/headshots\/[^']+)'/g)]
    .map((match) => match[2]);
  assert.equal(mappedPaths.length, 15);
  for (const photoPath of mappedPaths) {
    assert.ok(existsSync(path.join(root, photoPath)), `${photoPath} should exist`);
  }
  assert.equal(bios.length, 16);
  assert.ok(bios.some((bio) => bio.fullName === 'Peter A. Bellacosa'));
  assert.ok(bios.some((bio) => bio.name === 'Craig Nolan'));
});

test('the editor is responsive and respects hidden states and reduced motion', () => {
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /aria-label="Reset artwork"/);
});
