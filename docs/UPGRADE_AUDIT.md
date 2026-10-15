# RankMyIncome upgrade audit

Prepared 2026-10-12. Baseline: `c8842468c78c6ba5bf176b1ebfe70ab70ec8f9f9` in the existing public `jimin062200-cmyk/rankmyincome` repository.

## Current delivery status

Implementation and local calculation, build, static-link, locale and DOM interaction checks are complete. The work is on local branch `upgrade/service-quality`.

**Not published:** automatic approval review rejected pushing the branch, including a narrowed attempt after verifying the repository and checking the changes for credentials. Its stated reason was that explicit permission to publish to this specific GitHub repository was missing. No alternate upload or deployment route was used to bypass that decision. The existing production deployment has not been updated by this work.

The Chromium / mobile WebKit suite and GitHub Actions workflow are implemented, but have **not run**. No local browser-control capability compatible with this environment was available, and remote CI requires the blocked push. No claim is made that actual mobile rendering, axe browser results, Core Web Vitals or a new Vercel deployment has passed. These remain the final release gate after permission to publish the branch.

## What was preserved

- WID source data in `data/income-data.json` is byte-for-byte unchanged. SHA-256 is recorded in `tests/fixtures/dataset.sha256`.
- The exact forward percentile function, logarithmic interpolation, lower/upper-tail behavior, PPP conversion, tier boundaries and small-percent display precision are retained.
- The existing dark palette, logo, gradient heading, tier emblems and two result cards remain the visual foundation.
- All existing homepage, localized homepage, English country and editorial URLs still resolve in the generated build.
- Existing AdSense publisher ID, script, `ads.txt`, public aggregate dataset and source verification/import tools remain available.

## Findings and changes

| Area | Baseline issue | Implemented change |
| --- | --- | --- |
| Input correctness | `-50` became `50`; arbitrary letters were stripped; comma-decimal locales were misread | Strict locale-aware parsing, positive/finite validation and an explicit format example |
| Mobile navigation | The entire navigation, including the language picker, was hidden below 800px | Accessible native disclosure menus, available without JavaScript, with touch-sized links |
| Multilingual SEO | Uneven metadata and conflicting partial HTML versus broader HTTP language annotations | One generator for self-canonical URLs, 8 reciprocal language alternates, Open Graph and Twitter metadata |
| Localized content | Some language homes lacked help sections; country navigation left the current language | Shared complete UI, localized country directory and 208 country/territory pages in all 8 languages |
| Country pages | Abbreviated thresholds and alphabetical related links | Exact locally formatted annual values, monthly equivalents, explicit years and related countries with similar PPP-adjusted median thresholds |
| Accessibility | Missing labels/ARIA in several languages; inconsistent focus and keyboard handling | Skip links, headings, labeled controls, announced errors, semantic progress bars, picker arrows/Escape, restored focus, reduced motion |
| Loading | Full 1,508,937-byte file fetched on every load with `no-store` | Content-versioned 32,360-byte catalog/world payload and on-demand country files (South Korea: 2,238 bytes); immutable hashed assets |
| Recovery | Data errors disabled the calculator with no recovery; copy fallback could report false success | Translated retry, denied-storage handling, accurate clipboard status and stale-response invalidation |
| Build/deployment | GitHub Actions rewrote and pushed generated pages; localized sitemap logic was duplicated | A deterministic Node build, read-only CI, concurrency cancellation, validated `dist/` output and a single sitemap source |
| Advertising readiness | Existing ad loader plus an unverified affirmative consent statement | Preserved existing integration; added account metadata, public contact route, precise local-storage/share disclosures and documented account-side verification |

The initial calculator data transfer for South Korea is about 34.6 KB before transport compression, compared with the old 1.51 MB full file: about 97.7% fewer uncompressed data bytes. This is a payload comparison, not a measured LCP score or field-performance claim.

The active data covers 208 countries/territories, not every country. It does not include mainland China or Germany. This upgrade does not manufacture missing distributions. Language defaults use supported countries, and all country choices come from the unchanged data.

## Selected product additions

1. **Next-tier and target income:** both rank cards show the additional local-currency income needed for their respective next tier. The result's milestone panel calculates target national/world ranks and monthly equivalents by inverting the existing forward calculator.
2. **Country benchmark comparison:** compare the amount required for the same national percentile, plus the top 50%, 10% and 1%. Each country retains its own currency and data year. This explicitly avoids representing the result as an exchange-rate or cost-of-living forecast.
3. **Share image:** an on-demand PNG card is rendered inside the browser with the actual ranks and source years. Text sharing and the image exclude the entered income amount.
4. **Optional saved rank:** save a single country/rank/date/dataset record locally, delete it, and compare a later result from the same country and dataset. No income amount, account, backend or automatic storage is added.

The main calculator still asks only for country and annual pre-tax income. All extra tools sit below the calculated result.

## Verification performed

`npm run check` covers:

- 103,272 exact comparisons against the original forward calculator across all national and world distributions: thresholds, logarithmic midpoints, near-boundary inputs and tails.
- Inverse-target round trips at all tier boundaries and selected extreme percentiles; worldwide targets through every PPP factor.
- 8-language number formats and rejection of negatives, malformed groups, non-numeric strings, scientific notation and unsafe values.
- Dataset SHA-256, all emitted split files, production validation and payload budget.
- 1,684 indexable pages plus a real 404 document; 82,424 internal links/assets and all fragment/sitemap destinations.
- Canonical uniqueness, reciprocal 8-language alternates, valid structured data, social metadata and absence of static fake result numbers.
- Eleven executable DOM test cases: all 8 languages, results/targets/comparison, local save/delete, invalid input, retry, blocked storage, sharing/clipboard errors and a late-response race.

The browser suite separately defines Chromium and mobile WebKit flows, 320/375/768/1280px overflow checks, axe accessibility checks, PNG download, local save/reload/delete, no-JavaScript country pages and 404 routing. These are prepared but unexecuted; DOM tests do not establish visual correctness.

## AdSense and indexing status

Repository checks confirm publisher `ca-pub-2948191504774582`, matching existing `ads.txt`, reachable content in the generated output, privacy/methodology/about/contact pages and visible WID attribution. No new auto-ad settings or live ad placements were enabled.

The AdSense account's review status, regional consent/CMP configuration, identity/payment state and actual ad-serving behavior cannot be established from source code. They require account-side verification. A custom consent banner was not substituted for Google's certified-CMP requirements. WID's current commercial reuse/attribution terms were not conclusively verified; the existing `DATA_POLICY.md` review requirement is retained. No advertising approval or monetization guarantee is claimed.

Technical indexability is checked, but indexing decisions and Search Console coverage cannot be inferred from generated markup. After release, submit the existing `https://rankmyincome.com/sitemap.xml` location in Search Console and inspect representative canonical and localized URLs.

## Release and rollback

After explicit approval for this repository:

1. Push `upgrade/service-quality` and open a reviewable PR to `main`.
2. Run the configured GitHub Actions suite and Vercel preview. Resolve browser/test/deployment failures before merging.
3. Confirm the mobile screenshots, share-card download, language transitions, missing-route status and production-style headers.
4. Merge the tested change when authorized; verify the resulting Vercel production deployment and `build-info.json` commit/version.
5. If a production regression is found, revert the release commit or use the prior Vercel deployment. Statistical source data did not change.

## Primary sources consulted

- [Current project repository](https://github.com/jimin062200-cmyk/rankmyincome) — implementation and baseline evidence.
- [WID data](https://wid.world/data/), [WID methodology](https://wid.world/methodology/) and [Codes dictionary](https://wid.world/codes-dictionary/) — underlying statistical source and definitions. The existing imported dataset was preserved; a fresh bulk-source verification was not performed.
- [Google: localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions) — reciprocal annotations and language-specific URLs.
- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) — consistent canonical signals.
- [Vercel project configuration](https://vercel.com/docs/project-configuration) — explicit build, output directory, static headers and routing configuration.
- [Google AdSense: ads.txt](https://support.google.com/adsense/answer/12171612?hl=en), [site review](https://support.google.com/adsense/answer/12176698?hl=en) and [consent requirements](https://support.google.com/adsense/answer/13554116?hl=en) — technical readiness versus account-side approval/consent.
- [jsdom documentation](https://github.com/jsdom/jsdom) — DOM emulation; it does not perform real layout/rendering.
