import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../email-signatures-v2.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../js/email-signatures-v2.js', import.meta.url), 'utf8');

assert.match(html, /noindex, nofollow, noarchive/);
assert.match(html, /Email Signature V2/);
assert.match(js, /https:\/\/blanchetllp\.com\/assets\/favicon\/favicon-192\.png/);
assert.doesNotMatch(js, /Logo-Color\.png/);
assert.doesNotMatch(js, /dark[^\n]*logo|logo[^\n]*dark/i);
assert.match(js, /<td width="58"/);
assert.match(js, /<td width="18"/);
assert.match(js, /<img[^>]+width="58"/);
assert.doesNotMatch(js, /<img[^>]+height="58"/);
assert.match(js, /width:100%;max-width:58px;height:auto/);
assert.match(html, /data-theme="dark"[^]*background: #0c222c/);
assert.equal((js.match(/const LOGO_URL/g) || []).length, 1);
assert.match(js, /data-download-html/);

console.log('Email signature V2 static checks passed.');
