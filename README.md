# RankMyIncome

A static, browser-only WID income percentile calculator. The original dark design, tier system, forward percentile calculation and production dataset are preserved.

## Development and deployment

Use Node 22, then:

```sh
npm ci --ignore-scripts
npm run check
npm run serve
```

Open `http://127.0.0.1:8765`. **Serve `dist/`, not the repository root.** The root's previously generated HTML files remain as historical source references; they are not deployment inputs. Current pages are generated from `templates/home.html`, `locales/*.json`, the editorial `.html` pages and the unchanged WID dataset.

Vercel reads `vercel.json`, runs `npm run check`, and serves only `dist/`. No framework, server functions, database, credentials or paid service is needed. Existing `/`, language home URLs, `/countries/<slug>/` and editorial `.html` URLs are retained. Unknown paths return a real 404, without an SPA fallback.

GitHub Actions performs the same calculation/build/link checks plus Chromium and mobile WebKit tests. It uploads browser reports, screenshots and the tested static build. It never commits generated files or requires repository write permission. Vercel's existing Git integration handles previews and production deployments; Actions does not need a Vercel token.

## Features

- 208 countries/territories and 8 complete calculator languages; localized country pages and directories
- National and purchasing-power-adjusted world ranks, original Iron–Challenger tier cards
- Next-tier and target-percentile incomes, including monthly equivalents
- Same-percentile income comparison in each country's own currency (not a relocation or exchange-rate estimate)
- Share/copy result and locally rendered PNG card, excluding the entered income amount
- Optional saved rank on this browser, with deletion and same-dataset rank comparison; no income amount is saved
- Keyboard country picker, mobile navigation, reduced motion, live errors and country search
- Self-canonicals, reciprocal language links, structured data, sitemap, source attribution, contact/privacy/methodology pages
- Versioned and cached split data payloads; national thresholds load on demand

## Tests

```sh
npm test                  # 103,272 legacy comparisons plus inverse/PPP/input checks
npm run check             # calculation, build, page/link/data and 8-language DOM checks
npx playwright install --with-deps chromium webkit
npm run test:browser       # desktop/mobile flows, accessibility, errors, saving, sharing
npm run test:dom           # executable UI regression without a rendering engine
```

The forward-calculation fixture is the original `app.js` at commit `c8842468c78c6ba5bf176b1ebfe70ab70ec8f9f9`. `tests/fixtures/dataset.sha256` intentionally locks the current dataset. A future data refresh must review/update this baseline, source verification and the page-count expectations if coverage changes. Never silently bless an unverified dataset.

## Production verification

After a `main` push passes the browser suite, CI waits for that exact commit on the public domain and checks all eight language homes, directories and a country page, canonicals, language alternates, noindex directives, sitemap, ads.txt, permanent index redirect, real 404 and immutable assets/data. The read-only checker uses no Vercel secret and never changes protection or advertising settings. Its JSON evidence is retained as the `production-verification` Actions artifact. A failure reports a deployment problem; it does not automatically roll back.

To check an already deployed, reviewed commit manually:

```sh
EXPECTED_COMMIT=<full-40-character-commit> node scripts/verify-production.mjs
```

## WID data refresh

The existing Python import/source-match tools remain available:

```sh
python scripts/fetch_wid_bulk.py --core
python scripts/import_wid_bulk.py wid-source -o data/income-data.json
python scripts/validate_income_data.py data/income-data.json
python scripts/verify_wid_source_match.py --help
npm run check
```

Only enable production status after the documented source/licensing checks. See `DATA_POLICY.md` and `docs/UPGRADE_AUDIT.md`. The legacy country-generation entrypoint now delegates to the single current build; there is no second sitemap pipeline.
