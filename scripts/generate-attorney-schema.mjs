import { readFile, readdir, writeFile } from 'node:fs/promises';
import { hiddenProfiles, offices, organization, profiles } from './attorney-schema-config.mjs';

const siteRoot = new URL('../', import.meta.url);
const markerPattern = /<!-- Attorney profile structured data:start -->[\s\S]*?<!-- Attorney profile structured data:end -->\n?/;

async function assertCompleteProfileManifest() {
  const bioFiles = (await readdir(siteRoot))
    .filter((file) => /^bio-.*\.html$/.test(file))
    .sort();
  const configuredFiles = profiles.map((profile) => profile.file).sort();
  const expectedPublicFiles = bioFiles.filter((file) => !hiddenProfiles.includes(file));

  const missingProfiles = expectedPublicFiles.filter((file) => !configuredFiles.includes(file));
  const missingFiles = configuredFiles.filter((file) => !bioFiles.includes(file));

  if (missingProfiles.length) {
    throw new Error(`Public attorney profiles missing schema configuration: ${missingProfiles.join(', ')}`);
  }
  if (missingFiles.length) {
    throw new Error(`Schema configuration references missing profiles: ${missingFiles.join(', ')}`);
  }
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014');
}

function textContent(value) {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function matchOne(html, pattern, label, file) {
  const match = html.match(pattern);
  if (!match) throw new Error(`${file}: missing ${label}`);
  return match[1];
}

function listItems(fragment) {
  return [...fragment.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => textContent(match[1]));
}

function spanItems(fragment) {
  return [...fragment.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map((match) => textContent(match[1]));
}

function institutionName(education) {
  return education.split(/,\s*(?=(?:J\.D\.|LL\.M\.|Ph\.D\.|M\.[A-Z]\.|B\.[A-Z]\.))/)[0].trim();
}

function profileData(html, profile) {
  const canonical = matchOne(html, /<link rel="canonical" href="([^"]+)"/, 'canonical URL', profile.file);
  const name = textContent(matchOne(html, /<title>([^<]+) \| Blanchet LLP<\/title>/, 'profile title', profile.file));
  const description = decodeHtml(matchOne(html, /<meta name="description" content="([^"]+)"/, 'meta description', profile.file));
  const jobTitle = textContent(matchOne(html, /<div class="bio-label">([\s\S]*?)<\/div>/, 'job title', profile.file))
    .replace(/^\[\s*|\s*\]$/g, '')
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
  const phone = matchOne(html, /data-bio-phone="([^"]+)"/, 'telephone', profile.file);
  const email = matchOne(html, /href="mailto:([^"]+)"/, 'email', profile.file);
  const imagePath = matchOne(html, /<figure class="bio-headshot-card">\s*<img src="([^"]+)"/, 'headshot', profile.file);
  const image = new URL(imagePath, organization.url).href;
  const officeFragment = matchOne(html, /<div class="bio-offices"[^>]*>([\s\S]*?)<\/div>/, 'office affiliations', profile.file).split(/<br\s*\/?>\s*<a/i)[0];
  const profileOffices = textContent(officeFragment).split('|').map((office) => office.trim()).filter(Boolean);
  const educationFragment = matchOne(html, /<div class="bio-section-title">EDUCATION<\/div>\s*<ul class="bio-list">([\s\S]*?)<\/ul>/, 'education', profile.file);
  const focusFragment = matchOne(html, /<div class="bio-section-title">AREAS OF FOCUS<\/div>\s*<div class="bio-tags"[^>]*>([\s\S]*?)<\/div>/, 'areas of focus', profile.file);

  for (const office of profileOffices) {
    if (!offices[office]) throw new Error(`${profile.file}: unknown office "${office}"`);
  }

  return {
    ...profile,
    canonical,
    name,
    description,
    jobTitle,
    phone,
    email,
    image,
    profileOffices,
    education: listItems(educationFragment).map(institutionName),
    knowsAbout: spanItems(focusFragment)
  };
}

function officeEntity(office) {
  const data = offices[office];
  return {
    '@type': 'Place',
    '@id': `${organization.url}#office-${data.slug}`,
    name: data.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: data.streetAddress,
      addressLocality: data.addressLocality,
      addressRegion: data.addressRegion,
      postalCode: data.postalCode,
      addressCountry: 'US'
    }
  };
}

function schemaGraph(data) {
  const pageId = `${data.canonical}#profile-page`;
  const personId = `${data.canonical}#person`;
  const person = {
    '@type': 'Person',
    '@id': personId,
    name: data.name,
    givenName: data.givenName,
    familyName: data.familyName,
    jobTitle: data.jobTitle,
    url: data.canonical,
    mainEntityOfPage: { '@id': pageId },
    image: data.image,
    description: data.description,
    email: data.email,
    telephone: data.phone,
    worksFor: { '@id': organization.id },
    alumniOf: data.education.map((name) => ({ '@type': 'EducationalOrganization', name })),
    knowsAbout: data.knowsAbout,
    workLocation: data.profileOffices.map((office) => ({ '@id': `${organization.url}#office-${offices[office].slug}` }))
  };

  if (data.additionalName) person.additionalName = data.additionalName;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': pageId,
        url: data.canonical,
        name: `${data.name} | Blanchet LLP`,
        mainEntity: { '@id': personId }
      },
      person,
      {
        '@type': 'LegalService',
        '@id': organization.id,
        name: organization.name,
        url: organization.url,
        logo: organization.logo,
        sameAs: organization.sameAs,
        location: Object.keys(offices).map((office) => ({ '@id': `${organization.url}#office-${offices[office].slug}` }))
      },
      ...Object.keys(offices).map(officeEntity)
    ]
  };
}

await assertCompleteProfileManifest();

for (const profile of profiles) {
  const fileUrl = new URL(profile.file, siteRoot);
  const html = await readFile(fileUrl, 'utf8');
  const data = profileData(html, profile);
  const json = JSON.stringify(schemaGraph(data));
  const block = `<!-- Attorney profile structured data:start -->\n<script type="application/ld+json">\n${json}\n</script>\n<!-- Attorney profile structured data:end -->\n`;
  const withoutExistingBlock = html.replace(markerPattern, '');

  if (!withoutExistingBlock.includes('</head>')) throw new Error(`${profile.file}: missing </head>`);
  await writeFile(fileUrl, withoutExistingBlock.replace('</head>', `${block}</head>`));
}

console.log(`Generated ProfilePage structured data for ${profiles.length} public attorney profiles.`);
