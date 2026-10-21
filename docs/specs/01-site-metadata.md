# inkthread frontend: site metadata

What a browser tab, a search result, a home-screen install and a link preview see.

## 1. One config, parsed when it loads

`src/lib/site/config.ts` defines the site once: the brand name, the default title, the
description, the production origin, the accent, keywords, the share card's copy, and which
routes are public (listed in the sitemap) or private (disallowed in robots.txt). Everything
below is derived from it.

`defineSite` parses the config when the module loads and throws a `SiteConfigError` on:
- a `url` that is not a URL, is not `https:`, or is not a bare origin (a path or a trailing
  slash);
- a host on the never-use list (`knowledge/infrastructure/infra-never-use-hosts.md` in the
  workspace): strangers own those hosts, and a link preview must never point at one;
- a name longer than 12 characters (the manifest's `short_name`), a title longer than 70, or a
  description outside 50 to 160 characters (search results cut longer ones);
- an accent that is not `#rrggbb`;
- a highlight that does not occur in the headline;
- a route that does not start with `/`, or a sitemap route under a disallowed prefix.

A bad config fails the build. It never ships into every link preview.

## 2. The head

The root layout exports `metadata` and `viewport` built from the config:
- `metadataBase` is the production origin, so every image URL is absolute;
- the title has a default and the template `%s — inkthread`;
- description, application name, author, keywords, and `formatDetection` off (iOS must not
  turn numbers on a page into phone links);
- Open Graph: `type: website`, the site name and the locale. It has **no** title, description
  or url: Next fills `og:title` and `og:description` from each page's own, and a root `og:url`
  would claim that every page is the home page;
- `twitter:card` is `summary_large_image`. Next fills the Twitter title, description and
  image from Open Graph, so there is no separate `twitter-image`;
- no canonical at the root, for the same reason as `og:url`. The home page sets its own;
- viewport: `theme-color` `#0a0a0a` and `color-scheme: dark`.

## 3. Icons

The icon is the nav's brand tile: the Spline glyph in `--accent-thread` on the surface colour,
with a faint accent glow. `src/app/icon.svg` is the source. The rasters are rendered from it:
- `src/app/favicon.ico`: 16, 32 and 48 px (the 16 px frame enlarges the glyph);
- `src/app/apple-icon.png`: 180 px, full-bleed, because iOS rounds the corners itself;
- `public/icon-192.png` and `public/icon-512.png` for the manifest, plus
  `public/icon-maskable-512.png`, with the glyph inside the maskable safe zone.

## 4. Manifest, robots, sitemap

- `manifest.webmanifest`: name, short name, description, `start_url` and `scope` `/`,
  `display: standalone`, dark background and theme colours, the three PNG icons.
- `robots.txt`: allow `/`, disallow only machine endpoints (inkthread has none), point at
  the sitemap. Link-preview bots such as Twitterbot obey robots.txt, so disallowing a page
  would also break its link preview.
- A page that must stay out of search sets `robots: { index: false }` instead: `/d/` pages,
  because documents are uploads, kept for an hour. They still get a preview when shared.
- `sitemap.xml`: absolute URLs of the sitemap routes.

## 5. The share card

`opengraph-image` is a 1200×630 PNG rendered at build time with `next/og`: the brand tile, the
name, the `//` comment line, the headline with the highlight in the accent and underlined, and
the live host. It is set in Geist Mono, vendored as subset TTFs under `src/lib/site/fonts/`
with its OFL licence, because `next/og` cannot read the fonts `next/font` loads.

The headline is set at the largest size, from 96 px down to 48 px in steps of 8, at which it
wraps to at most two lines across the card's 1056 px. Every Geist Mono glyph is 0.6 em wide,
so the wrap is computed exactly, not measured.

## 6. Indexable pages and structured data (2026-10-21)

- `pageMetadata(site, route, { title, description })` (`src/lib/site/metadata.ts`) is how an
  indexable page other than the home page describes itself: it returns the title, the
  description and the route as canonical, and throws a `SiteConfigError` when the module loads
  on an empty title, a title the template (` — inkthread`) takes past 70 characters, or a
  description outside 50 to 160 characters. inkthread's only indexable page is `/`, which keeps
  the site's own title and description and its canonical `/`; the helper is shared, unchanged,
  with the five other frontends.
- `/` renders one `<script type="application/ld+json">` (`src/lib/site/structured-data.tsx`):
  a schema.org `@graph` of a `WebSite` (`<origin>/#website`: url, name, description,
  `inLanguage: "en"`, the author as publisher), a `WebApplication` (`<origin>/#app`: url, name,
  description, `applicationCategory: "DeveloperApplication"`, `operatingSystem: "Any"`,
  `isAccessibleForFree: true`, part of the website, by the author) and the author as a `Person`
  (`https://github.com/Abdul-Muizz1310#person`). All from the config. Search engines read the
  site name from the `WebSite` node, so a result says `inkthread`, not `vercel.app`. No rating,
  review or price is claimed. Every `<` in the JSON is escaped as `\u003c`, so no value can
  close the script tag.

## Test cases

- **T-FE-20** `defineSite` accepts the real config and derives its origin.
- **T-FE-21** `defineSite` rejects each case in §1, naming the reason.
- **T-FE-22** the root metadata: `metadataBase`, the title template, description, author,
  Open Graph with no title, description or url, the Twitter card, no `alternates`.
- **T-FE-23** the viewport colours.
- **T-FE-24** the manifest's fields, and every icon it lists exists in `public/` at its
  declared size.
- **T-FE-25** robots.txt allows the site and names the sitemap on the origin; the sitemap
  lists its routes as absolute URLs, once each.
- **T-FE-26** the icon files: `icon.svg` uses the accent, `favicon.ico` holds 16, 32 and 48,
  `apple-icon.png` is 180×180.
- **T-FE-27** the headline layout: highlight segments, the greedy wrap, the size chosen at each
  boundary, and the share card's alt text.
- **T-FE-28** (E2E, built app) the home page and a document page carry the title, description,
  `og:image` on the origin, the Twitter card, the theme colour, the icons and the manifest; a
  page's own title flows into `og:title`; a document page is `noindex` and the home page is
  not; every metadata route answers with its content type.
- **T-FE-29** `pageMetadata` returns the title, description and canonical; it accepts a title
  the template takes to exactly 70 characters and descriptions of exactly 50 and 160; it rejects
  an empty title, a title past 70 with the template, and a description under 50 or over 160,
  naming the page and the reason.
- **T-FE-30** the structured data: the graph in §6 derived from the config; its serialisation
  escapes `<` and parses back to the same value; it renders as one `application/ld+json` script.
- **T-FE-31** (E2E, built app) `/` carries exactly one structured-data script whose `WebSite`
  node names the site on the production origin; a document page carries none.
