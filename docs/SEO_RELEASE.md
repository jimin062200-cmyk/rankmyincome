# Targeted SEO release evidence

Target: existing jimin062200-cmyk/rankmyincome repository, main production integration, https://rankmyincome.com. Baseline commit f43af08. Working branch upgrade/gsc-targeted-seo.

## Scope

20 existing country pages plus 24 localized ranking/tool hubs and two existing English guides. No new URLs. 1,807 indexable pages, 1,808 HTML documents including 404. WID data, calculator-core.js, growth-core.js, all browser JS/CSS and multilingual route structure unchanged.

## Checks

- Baseline npm run check: passed before editing.
- Updated calculator regression: 103,272 exact forward comparisons, inverse/PPP checks and original dataset hash passed.
- Static-site checks: canonical/hreflang reciprocity, JSON-LD, sitemap and local links/assets passed (final count recorded by CI).
- DOM and growth-tool regression: passed.
- SEO tests: all 20 pages expose exact thresholds and median in static HTML; all six localized hubs link to each target; passed.
- Browser and release checks: pending CI at initial commit. Final PR/Actions and production build-info.json provide the authoritative release state.
- Local Node 24 differs from the required Node 22 runtime; CI uses Node 22; Vercel project default reports Node 24, while package engines requests Node 22. Initial browser attempt lacked installed binaries. Chromium installed; WebKit requires Linux libraries available in the existing pinned CI container.

Search Console raw data and derived private reports are excluded from Git and provided separately to the user.

## Files

- content/seo-country.mjs: scoped localized content, structured data, regional and hub links.
- content/seo-targets.json: fixed cohort of 20 URLs.
- scripts/build-site.mjs: apply scoped enhancements during static generation.
- tests/seo.test.mjs and tests/browser/seo.spec.cjs: static and mobile no-JavaScript coverage.
- package.json: include SEO checks in the existing release gate.
- .gitignore: prevent private Search Console reports and raw data from entering Git.
- docs/seo-build-scope.json and docs/SEO_RELEASE.md: generated scope and release record, without analytics.

No claim of improved Google ranking is made at deployment. Measure finalized Search Console results after 7, 14 and 28 days.
