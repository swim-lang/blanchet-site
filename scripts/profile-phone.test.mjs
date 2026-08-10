import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profiles = new Map([
  ['bio-joel.html', '(716) 302-5702'],
  ['bio-andrew-devine.html', '(716) 302-5703'],
  ['bio-james-doody.html', '(716) 302-5704'],
  ['bio-joshua-wallace.html', '(716) 302-5705'],
  ['bio-myles-bartley.html', '(212) 763-4801'],
  ['bio-robert-reagan.html', '(212) 763-4804'],
  ['bio-stefan-engelhardt.html', '(212) 763-4808'],
  ['bio-jaran-moten.html', '(312) 473-8110'],
  ['bio-john-worth.html', '(312) 473-8115'],
  ['bio-frank-dylewski.html', '(312) 473-8116'],
  ['bio-caroline-creagan.html', '(312) 473-8118'],
  ['bio-hannah-amundsen.html', '(312) 473-8122'],
  ['bio-timothy-cronin.html', '(312) 473-8123'],
  ['bio-bridget-ruschak.html', '(312) 473-8129']
]);

for (const [file, phone] of profiles) {
  const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.equal((html.match(/data-bio-phone=/g) || []).length, 1, `${file} should have one phone number`);
  assert.match(html, new RegExp(`data-bio-phone="${phone.replace(/[()]/g, '\\$&')}"`));
}

const hiddenProfile = await readFile(new URL('../bio-craig-nolan.html', import.meta.url), 'utf8');
assert.doesNotMatch(hiddenProfile, /data-bio-phone=/);

const mainJs = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
assert.match(mainJs, /\.bio-offices\[data-bio-phone\]/);
assert.match(mainJs, /href="tel:\$\{telephoneNumber\}"/);
assert.match(mainJs, /navigator\.clipboard\.writeText/);
assert.match(styles, /\.bio-phone-call-mobile/);
assert.match(styles, /@media \(max-width: 900px\)/);

console.log(`Profile phone checks passed for ${profiles.size} public attorneys.`);
