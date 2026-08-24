export const profiles = [
  { file: 'team/andrew-devine.html', legacyFile: 'bio-andrew-devine.html', slug: 'andrew-devine', givenName: 'Andrew', additionalName: 'P.', familyName: 'Devine' },
  { file: 'team/bridget-ruschak.html', legacyFile: 'bio-bridget-ruschak.html', slug: 'bridget-ruschak', givenName: 'Bridget', familyName: 'Ruschak' },
  { file: 'team/caroline-creagan.html', legacyFile: 'bio-caroline-creagan.html', slug: 'caroline-creagan', givenName: 'Caroline', additionalName: 'E.', familyName: 'Creagan' },
  { file: 'team/frank-dylewski.html', legacyFile: 'bio-frank-dylewski.html', slug: 'frank-dylewski', givenName: 'Frank', additionalName: 'G.', familyName: 'Dylewski' },
  { file: 'team/hannah-amundsen.html', legacyFile: 'bio-hannah-amundsen.html', slug: 'hannah-amundsen', givenName: 'Hannah', additionalName: 'E.', familyName: 'Amundsen' },
  { file: 'team/james-doody.html', legacyFile: 'bio-james-doody.html', slug: 'james-doody', givenName: 'James', familyName: 'Doody' },
  { file: 'team/jaran-moten.html', legacyFile: 'bio-jaran-moten.html', slug: 'jaran-moten', givenName: 'Jaran', additionalName: 'R.', familyName: 'Moten' },
  { file: 'team/joel-blanchet.html', legacyFile: 'bio-joel.html', slug: 'joel-blanchet', givenName: 'Joel', additionalName: 'A.', familyName: 'Blanchet' },
  { file: 'team/john-worth.html', legacyFile: 'bio-john-worth.html', slug: 'john-worth', givenName: 'John', additionalName: 'R.', familyName: 'Worth' },
  { file: 'team/joshua-wallace.html', legacyFile: 'bio-joshua-wallace.html', slug: 'joshua-wallace', givenName: 'Joshua', additionalName: 'S.', familyName: 'Wallace' },
  { file: 'team/myles-bartley.html', legacyFile: 'bio-myles-bartley.html', slug: 'myles-bartley', givenName: 'Myles', additionalName: 'K.', familyName: 'Bartley' },
  { file: 'team/peter-bellacosa.html', slug: 'peter-bellacosa', givenName: 'Peter', additionalName: 'A.', familyName: 'Bellacosa', contactDetailsPending: true },
  { file: 'team/robert-reagan.html', legacyFile: 'bio-robert-reagan.html', slug: 'robert-reagan', givenName: 'Robert', familyName: 'Reagan' },
  { file: 'team/stefan-engelhardt.html', legacyFile: 'bio-stefan-engelhardt.html', slug: 'stefan-engelhardt', givenName: 'Stefan', additionalName: 'W.', familyName: 'Engelhardt' },
  { file: 'team/timothy-cronin.html', legacyFile: 'bio-timothy-cronin.html', slug: 'timothy-cronin', givenName: 'Timothy', familyName: 'Cronin' }
];

// Preserved profiles that are intentionally not part of the public team roster.
export const hiddenProfiles = ['bio-craig-nolan.html'];

export const offices = {
  Buffalo: {
    slug: 'buffalo',
    name: 'Blanchet LLP - Buffalo Office',
    streetAddress: '200 Delaware Ave., Suite 1170',
    addressLocality: 'Buffalo',
    addressRegion: 'NY',
    postalCode: '14202'
  },
  'New York City': {
    slug: 'new-york-city',
    name: 'Blanchet LLP - New York City Office',
    streetAddress: '142 W. 57th St.',
    addressLocality: 'New York',
    addressRegion: 'NY',
    postalCode: '10019'
  },
  Chicago: {
    slug: 'chicago',
    name: 'Blanchet LLP - Chicago Office',
    streetAddress: '155 North Wacker Drive, Suite 900',
    addressLocality: 'Chicago',
    addressRegion: 'IL',
    postalCode: '60606'
  }
};

export const organization = {
  id: 'https://blanchetllp.com/#organization',
  name: 'Blanchet LLP',
  url: 'https://blanchetllp.com/',
  logo: 'https://blanchetllp.com/assets/favicon/favicon-192.png',
  sameAs: ['https://www.linkedin.com/company/blanchet-llp']
};
