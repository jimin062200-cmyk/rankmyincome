# Existing-page search discovery update — 2026-10-28

Baseline: `4fd3aa02f2fe289aec69827a30581e10d5b3ac86`, production `https://rankmyincome.com/`.

## Problem and resulting behavior

The five ranking URLs in each language shared the same generic PPP meta description. The ranking breadcrumb also pointed to Tools. Each of the 40 existing ranking pages now describes its own table, with consistent title, H1, introductory copy and metadata. The 32 individual tables explain median versus top-group entry thresholds and provide links to the other three thresholds.

Seventeen existing country pages now answer median and top-income questions with exact values from the unchanged WID snapshot, explain the difference from employee wages and household income, and show a selected four-country PPP comparison. Country-specific interpretation, source links, income/PPP years and matching Dataset metadata accompany the numbers. Fifteen existing directory/tool/ranking hubs provide descriptive links to these pages; five overlap the ranking changes. No new URLs are created.

The resulting scope is **67 changed HTML pages plus sitemap.xml**. All 1,809 indexable URLs remain. No homepage, previous 20-page SEO cohort, trust page, error page, browser JS/CSS, dataset, ads.txt, robots.txt, canonical, hreflang or indexability directive changes. The AdSense account and loader markup are identical on every generated page, including existing exclusions.

## Substantive-update dates

`content/search-updates.json` records only the 67 reviewed routes. Dates are fixed to the review, never the build clock. `scripts/search-freshness.mjs` fingerprints title, description, main content and JSON-LD. A changed fingerprint suppresses the old sitemap lastmod; the validation suite requires a reviewer to refresh the entry for the reviewed HTML. To maintain it, build the edited content, inspect it, then record `searchFingerprint(html)` and the actual significant-update date. Do not relabel the data year as the current year.

## Evidence and validation

- Full `npm run check` passed locally (Node 24; the existing CI uses required Node 22).
- 103,272 forward calculations matched the legacy baseline; data hash, inverse and PPP checks passed.
- New static tests verify 17 country datasets and peer values, 40 distinct ranking descriptions, 32 sibling-link groups and 67 content-verified sitemap dates.
- A full generated-output comparison against the baseline confirmed the scope and byte-identical protected outputs above. Duplicate description groups decreased from eight groups of five pages to zero across the built site.
- The added browser regression covers all 17 country pages and ranking hub/median/top-1 pages in all eight languages at 320px without JavaScript. Existing browser regressions remain in the release gate. Consult the PR Actions checks for final browser and Node 22 results.
- Production release must use the exact reviewed commit and retain the existing Git-to-Vercel integration. The existing production checker verifies the public domain against that commit.

Search Console analytics and query rows are private and are intentionally not committed. Deployment is not evidence of increased impressions; compare finalized performance after Google recrawls. Preserve the previous cohort to avoid repeatedly rewriting pages changed only a few days ago.

## Research sources

- Google, [Link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable): crawlable anchors and descriptive contextual links.
- Google, [Control your snippets](https://developers.google.com/search/docs/appearance/snippet): useful, page-specific descriptions; Google can choose different snippet text.
- Google, [Title links](https://developers.google.com/search/docs/appearance/title-link): descriptive titles that match page content and language.
- Google, [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): accurate significant-update dates; sitemap submission is a hint, not an indexing guarantee.
- Google, [Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): useful original explanation; do not change dates merely to appear fresh.
- WID, [Methodology](https://wid.world/methodology/), [data](https://wid.world/data/), [codes dictionary](https://wid.world/codes-dictionary/): statistical definition and attribution. This release does not refresh the data or change calculation definitions.

No purchased links, keyword stuffing, fake reviews, FAQ rich-result promises, invented current-year statistics or programmatic new-page expansion are included.
