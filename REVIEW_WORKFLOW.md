# Blanchet Review Workflow

The review layer is intentionally static-site friendly for the first pass.

## Current workflow

1. Reviewer enters the site password.
2. Reviewer chooses `Review and leave comments`.
3. Reviewer switches between `Browse` and `Comment` in the bottom toolbar.
4. Reviewer exports comments with `Export`.
5. The exported JSON can be imported back into the site with `Import` for triage.

Comments are stored in `localStorage` under `blanchet-review-comments`.

## Comment shape

Each comment includes:

- `project`
- `page`
- `path`
- `reviewId`
- `selector`
- `textQuote`
- `comment`
- `status`
- `viewport`
- `createdAt`

The important field is `reviewId`. It maps to stable `data-review-id` attributes in
the HTML where available, with runtime fallback IDs for unannotated elements.

## Backend path

When a shared backend is needed, replace the local storage calls in
`js/review-tools.js` with an adapter that loads and saves comments remotely.

The simplest Supabase table would be:

```sql
create table review_comments (
  id text primary key,
  project text not null,
  page text not null,
  path text not null,
  review_id text not null,
  selector text not null,
  text_quote text,
  comment text not null,
  status text not null default 'open',
  viewport jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
```

For a public static site, do not expose a service-role key in browser JavaScript.
Use Supabase anonymous insert/read policies for this preview, or a small serverless
proxy if the comments need stricter access control.
