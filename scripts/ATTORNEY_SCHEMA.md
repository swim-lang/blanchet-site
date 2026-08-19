# Attorney profile structured data

Every public `bio-*.html` page must be represented in
`attorney-schema-config.mjs`. The generator reads the attorney's visible title,
contact information, headshot, offices, education, and Areas of Focus from that
page so the structured data stays aligned with what visitors see.

When adding an attorney:

1. Add the public bio page using the existing profile template.
2. Add the attorney's file and parsed name fields to `profiles` in
   `attorney-schema-config.mjs`.
3. Run `node scripts/generate-attorney-schema.mjs`.
4. Run `node scripts/attorney-schema.test.mjs` and the existing content and
   profile-phone regression tests.

The generator and schema test scan for new public bio files and fail when a
profile has not been configured. Profiles intentionally retained outside the
public roster belong in `hiddenProfiles`.
