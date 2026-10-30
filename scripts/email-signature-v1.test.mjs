import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../email-signatures.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../js/email-signatures.js', import.meta.url), 'utf8');

assert.match(html, /email-signatures\.js\?v=20261030-email-domain/);
assert.match(html, /data-signature-field="email"[^>]+@blanchet\.com/);
assert.match(html, /data-signature-field="website"[^>]+value="blanchet\.com"/);
assert.match(js, /const PUBLIC_BASE_URL = 'https:\/\/blanchet\.com\/';/);
assert.match(js, /PUBLIC_BASE_URL \+ 'assets\/logos\/Logo-Color\.png'/);
assert.match(js, /We have a new domain\. Our website and email addresses now use <strong>blanchet\.com<\/strong>\. Please update your bookmarks and contacts\./);
assert.doesNotMatch(js, /Our website has moved/);

console.log('Email signature V1 domain checks passed.');
