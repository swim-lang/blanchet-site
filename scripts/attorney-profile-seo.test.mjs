import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { profiles } from './attorney-schema-config.mjs';

const redirects = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8')).redirects;
const teamPage = await readFile(new URL('../team.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');

for (const profile of profiles) {
  const html = await readFile(new URL(`../${profile.file}`, import.meta.url), 'utf8');
  const legacyPath = `/${profile.legacyFile.replace(/\.html$/, '')}`;
  const publicPath = `/team/${profile.slug}`;
  const canonical = `https://blanchetllp.com${publicPath}`;
  const titleName = html.match(/<title>([^<]+) \| Blanchet LLP<\/title>/)?.[1];

  assert.match(html, new RegExp(`<link rel="canonical" href="${canonical}">`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${canonical}">`));
  assert.match(html, /<meta property="og:image" content="https:\/\/blanchetllp\.com\/assets\/headshots\/[^"]+\.jpg">/);
  assert.match(html, /<meta property="og:image:type" content="image\/jpeg">/);
  assert.match(html, /<meta property="og:image:width" content="900">/);
  assert.match(html, /<meta property="og:image:height" content="1125">/);
  assert.match(html, new RegExp(`<meta property="og:image:alt" content="${titleName} professional headshot">`));
  assert.doesNotMatch(html, /<div class="bio-section-title">/);
  assert.ok((html.match(/<h2 class="bio-section-title">/g) || []).length >= 3);
  assert.match(html, /<a class="bio-phone-number" href="tel:\+1\d{10}"/);
  assert.doesNotMatch(html, /data-bio-phone=/);
  assert.doesNotMatch(html, /(?:href|src)="(?:assets|css|js)\//);

  assert.match(teamPage, new RegExp(`href="${publicPath}"`));
  assert.match(sitemap, new RegExp(`<loc>${canonical}<\/loc>`));
  assert.deepEqual(
    redirects.find((redirect) => redirect.source === legacyPath),
    { source: legacyPath, destination: publicPath, statusCode: 301 }
  );

  await assert.rejects(access(new URL(`../${profile.legacyFile}`, import.meta.url)));
}

console.log(`Attorney profile SEO checks passed for ${profiles.length} public profiles.`);
