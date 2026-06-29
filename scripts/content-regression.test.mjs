import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage does not show track-record metric cards', () => {
  const removedPublicClaims = [
    'data-review-id="home.track-record"',
    'class="proof-card"',
    'class="proof-metric"',
    '35+',
    '22+',
    '$100M+',
    '$6.1M+',
    '200+',
    '50+',
    'Summary judgment on more than $100 million',
    'Fee award in Nilssen v. Osram',
    'Claims dismissed or resolved in June v. Union Carbide',
    'Nationwide consumer class actions resolved favorably'
  ];

  for (const claim of removedPublicClaims) {
    assert.equal(home.includes(claim), false, `Expected homepage not to include: ${claim}`);
  }
});
