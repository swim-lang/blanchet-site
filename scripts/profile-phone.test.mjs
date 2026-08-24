import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { profiles } from './attorney-schema-config.mjs';

const phoneBySlug = new Map([
  ['joel-blanchet', '(716) 302-5702'],
  ['andrew-devine', '(716) 302-5703'],
  ['james-doody', '(716) 302-5704'],
  ['joshua-wallace', '(716) 302-5705'],
  ['myles-bartley', '(212) 763-4801'],
  ['robert-reagan', '(212) 763-4804'],
  ['stefan-engelhardt', '(212) 763-4808'],
  ['jaran-moten', '(312) 473-8110'],
  ['john-worth', '(312) 473-8115'],
  ['frank-dylewski', '(312) 473-8116'],
  ['caroline-creagan', '(312) 473-8118'],
  ['hannah-amundsen', '(312) 473-8122'],
  ['timothy-cronin', '(312) 473-8123'],
  ['bridget-ruschak', '(312) 473-8129']
]);

for (const profile of profiles) {
  const phone = phoneBySlug.get(profile.slug);
  const html = await readFile(new URL(`../${profile.file}`, import.meta.url), 'utf8');
  if (profile.contactDetailsPending) {
    assert.equal(phone, undefined);
    assert.doesNotMatch(html, /class="bio-phone-number"|href="mailto:/);
    continue;
  }
  const telephone = `+1${phone.replace(/\D/g, '')}`;
  assert.equal((html.match(/class="bio-phone-number"/g) || []).length, 1, `${profile.file} should have one visible phone link`);
  assert.match(html, new RegExp(`href="tel:\\${telephone}"`));
  assert.match(html, new RegExp(`>${phone.replace(/[()]/g, '\\$&')}<`));
  assert.doesNotMatch(html, /data-bio-phone=/);
}

const hiddenProfile = await readFile(new URL('../bio-craig-nolan.html', import.meta.url), 'utf8');
assert.doesNotMatch(hiddenProfile, /bio-phone-number/);

const mainJs = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
assert.doesNotMatch(mainJs, /\.bio-offices\[data-bio-phone\]/);
assert.match(styles, /\.bio-phone-number/);

console.log(`Profile phone checks passed for ${profiles.length} public attorneys.`);
