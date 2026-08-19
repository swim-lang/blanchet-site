import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { hiddenProfiles, offices, organization, profiles } from './attorney-schema-config.mjs';

function decodeHtml(value) {
  return value.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

function textContent(value) {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

const siteRoot = new URL('../', import.meta.url);
const profileRoot = new URL('../team/', import.meta.url);
const bioFiles = (await readdir(profileRoot)).filter((file) => file.endsWith('.html')).map((file) => `team/${file}`).sort();
const configuredFiles = profiles.map((profile) => profile.file).sort();

assert.deepEqual(
  configuredFiles,
  bioFiles,
  'Every public bio page must be included in the attorney schema configuration'
);

for (const profile of profiles) {
  const html = await readFile(new URL(`../${profile.file}`, import.meta.url), 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, `${profile.file} should contain one JSON-LD block`);
  assert.doesNotMatch(blocks[0][1], /&amp;/, `${profile.file} should use literal ampersands in JSON`);

  const schema = JSON.parse(blocks[0][1]);
  assert.equal(schema['@context'], 'https://schema.org');
  const profilePage = schema['@graph'].find((entity) => entity['@type'] === 'ProfilePage');
  const person = schema['@graph'].find((entity) => entity['@type'] === 'Person');
  const firm = schema['@graph'].find((entity) => entity['@type'] === 'LegalService');
  const places = schema['@graph'].filter((entity) => entity['@type'] === 'Place');

  assert.ok(profilePage, `${profile.file} should define a ProfilePage`);
  assert.ok(person, `${profile.file} should define a Person`);
  assert.equal(profilePage.mainEntity['@id'], person['@id']);
  assert.equal(person.worksFor['@id'], organization.id);
  assert.equal(firm['@id'], organization.id);
  assert.equal(places.length, Object.keys(offices).length);
  assert.ok(person.name);
  assert.ok(person.givenName);
  assert.ok(person.familyName);
  assert.ok(person.jobTitle);
  assert.ok(person.description);
  assert.ok(person.image.startsWith('https://blanchetllp.com/'));
  assert.ok(person.email.includes('@blanchetllp.com'));
  assert.match(person.telephone, /^\(\d{3}\) \d{3}-\d{4}$/);
  assert.ok(person.alumniOf.length >= 1);
  assert.ok(person.knowsAbout.length >= 1);
  assert.ok(person.workLocation.length >= 1);
  assert.equal(Object.hasOwn(profilePage, 'dateCreated'), false);
  assert.equal(Object.hasOwn(profilePage, 'dateModified'), false);

  const visibleFocus = [...html.matchAll(/<div class="bio-tags"[^>]*>([\s\S]*?)<\/div>/g)][0];
  assert.ok(visibleFocus, `${profile.file} should expose visible focus areas`);
  const focusText = [...visibleFocus[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((match) => textContent(match[1]));
  assert.deepEqual(person.knowsAbout, focusText, `${profile.file} schema should match visible focus areas`);

  const canonical = `https://blanchetllp.com/team/${profile.slug}`;
  assert.equal(profilePage.url, canonical);
  assert.equal(person.url, canonical);
  assert.equal(person.image, html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]);
  assert.equal(html.match(/<meta property="og:image:width" content="([^"]+)"/)?.[1], '900');
  assert.equal(html.match(/<meta property="og:image:height" content="([^"]+)"/)?.[1], '1125');
  assert.equal((html.match(/<h2 class="bio-section-title">/g) || []).length > 0, true);
  assert.equal((html.match(/<div class="bio-section-title">/g) || []).length, 0);
}

for (const hiddenProfile of hiddenProfiles) {
  const html = await readFile(new URL(`../${hiddenProfile}`, import.meta.url), 'utf8');
  assert.doesNotMatch(html, /application\/ld\+json/, `${hiddenProfile} should remain excluded from public schema`);
}

console.log(`Attorney schema checks passed for ${profiles.length} public profiles.`);
