# Attorney profile structured data

Every public `team/*.html` profile page must be represented in
`attorney-schema-config.mjs`. The generator reads the attorney's visible title,
contact information, headshot, offices, education, and Areas of Focus from that
page so the structured data stays aligned with what visitors see.

When adding an attorney:

1. Add the public bio page at `team/firstname-lastname.html` using the existing
   profile template.
2. Add the attorney's file and parsed name fields to `profiles` in
   `attorney-schema-config.mjs`.
3. Run `node scripts/generate-attorney-schema.mjs`.
4. Add the former URL to `vercel.json` as an exact `301` redirect when replacing
   an existing profile route.
5. Run `node scripts/attorney-schema.test.mjs`,
   `node scripts/attorney-profile-seo.test.mjs`, and the existing content and
   profile-phone regression tests.

The generator and schema test scan for new public profile files and fail when a
profile has not been configured. Profiles intentionally retained outside the
public roster belong in `hiddenProfiles`.

The public template uses the attorney headshot for Open Graph and Twitter card
images, visible `tel:` contact links, and `h2.bio-section-title` elements for
profile sections. The SEO regression test keeps those requirements consistent.
