# RankMyIncome — Search growth and content expansion audit

Prepared 22 October 2026. Baseline: `4e29db2906bd0edb0048c5f49d7ad0fc0ed84910`. Working branch: `upgrade/search-growth`.

## Preservation and scope

The prior worktree was clean, on `main`, with the design refresh PR #3 at its head. `git status`, branches, diff, log, existing tests and UPGRADE_AUDIT.md were inspected before implementation. DATA_POLICY.md was also checked before release. Fetch confirmed the same remote main commit. All previous features, country URLs and eight language homes remain.

`calculator-core.js` and `data/income-data.json` are unchanged. The complete imported dataset is still version `e733fea92bd2a037`, covering 208 countries/territories, with 2024 income, PPP and world reference years. This release does not represent the data as 2026 observations. Country/world calculations, equal-split adults aged 20+, pre-tax national income, interpolation, tail policy and tier boundaries are preserved.

## Search research and prioritization

Public search-result research was performed before implementation on 22 October 2026. It covered income/salary percentile, top 1/5/10%, national medians, global rank, salary conversion, raises and purchasing power. Additional local-language queries included Korean salary rank, Japanese 年収 上位, German Einkommen Perzentil and French salaire percentile. Separate Canadian and Australian searches filled gaps in the initial broad query.

This is qualitative search-intent research, not a keyword-volume study. No search volumes, keyword difficulty scores or traffic forecasts were invented. Autocomplete endpoints and private Search Console data were not accessed. Observed results and competitor page structures support the priorities below; they do not quantify demand or guarantee ranking.

| Market / intent | Observed examples | Product response |
| --- | --- | --- |
| US income percentile, individual vs household | [DQYDJ](https://dqydj.com/income-percentile-calculator/) has distinct individual, household and salary views | Preserve the adult-income definition and explain scope explicitly |
| Korea: 연봉 상위 몇 %, top-income boundaries | [BUSTUDY](https://bustudy.kr/salary-rank), [두둑](https://dudook.kr/calc/salary-rank) display rank, median and top-group tables | Rich Korea page, target tools and threshold-vs-group-average explanation |
| Japan: 年収 上位10%, 年収順位 | [お金計算](https://www.okanekeisan.com/tools/nenshu-hensachi), [境界線](https://kyoukai.az-arte.com/b/income/) foreground salary groups and thresholds | Japanese UI, published threshold table, salary/adult-income distinction |
| UK salary/income comparison | [True Take-Home](https://truetakehome.co.uk/salary-percentile-calculator/), [Salary.gg](https://salary.gg/uk-salary) use different reference concepts | Explicit definitions; no claim that WID is an employee-only salary distribution |
| Canada individual vs household | [WealthNorth](https://wealthnorth.ca/income/income-percentiles/income-percentile-calculator/), [Metrestick](https://www.metrestick.ca/en/income-percentile) | CAD country data and Canada/US comparison in common PPP units |
| Australia taxpayer income / earnings | [Salary Insider](https://salaryinsider.com.au/income-percentile), [TakeHome](https://takehome.com.au/income-percentile) | AUD country context and explanation of population differences |
| Germany / France | [Finanzfluss](https://www.finanzfluss.de/ratgeber/einkommen-im-vergleich/), [Destatis](https://service.destatis.de/DE/gehaltsvergleich), [Observatoire des inégalités](https://www.inegalites.fr/ou-vous-situez-vous-sur-l-echelle-des-salaires) | German/French tools; disclose missing Germany distribution instead of fabricating one |
| Salary conversion / pay raise | [WorkCalcs](https://workcalcs.com/pay-raise-calculator/), [Calcs at Hand](https://calcsathand.com/calculator/salary-increment-calculator/) show period conversion and real-raise intent | Flexible gross-pay converter and raise scenarios including optional inflation |
| World rank / country data | [WealthPercentile](https://wealthpercentile.com/), existing WID country pages in search results | Global explorer, comparable tables, guides and internal navigation |

Competitor statistics were not imported or substituted into WID. Primary statistical context links are provided on the enhanced US, UK, Canada, Australia, Korea, Japan and France English pages. These seven markets received extra country-specific interpretation. All 208 countries receive computed benchmarks and contextual navigation.

## Delivered features and search entry points

| Feature / intent | Canonical English URL | Behavior |
| --- | --- | --- |
| Existing income percentile calculator | `/` | Still the main homepage action; now adds median multiple, top-25/10/5/1 targets/gaps and tool links in a disclosure |
| Tool directory | `/tools/` | Discover tools without crowding the hero |
| Top X% income | `/tools/top-income/` | Country + top 50/25/10/5/1/0.1%; published/interpolated/extrapolated status |
| Income needed to reach a target | `/tools/income-goal/` | Target, gap, percentage increase, tier transition, national/world context |
| Annual/monthly/weekly/daily/hourly salary | `/tools/salary-converter/` | Adjustable hours, workdays and paid/worked weeks; gross before tax |
| Pay raise / salary increase | `/tools/raise-calculator/` | New pay, annual/monthly change, before/after ranks and tiers |
| Global percentile / how rich am I | `/tools/global-income/` | WO-PPP thresholds, local equivalents and user position |
| Purchasing-power comparison | `/tools/ppp-comparison/` | Local A / factor A × factor B; separate national and world context |
| Income distribution | `/tools/income-distribution/` | Actual p10/25/50/75/90/95/99/99.9 values, labeled linear bars and readable table |
| Country comparison | `/compare/` | Two countries, median/top25/10/5/1, local/PPP values and equivalent-income positions |
| Rankings directory | `/rankings/` | Four meaningful statistical entry points |
| Median by country | `/rankings/median-income/` | Searchable, numerically sortable USD PPP table with local currency and years |
| Top 10% by country | `/rankings/top-10-income/` | Same comparison structure for p90 |
| Top 5% by country | `/rankings/top-5-income/` | Same comparison structure for p95 |
| Top 1% by country | `/rankings/top-1-income/` | Same comparison structure for p99 |
| Learning hub | `/guides/` | Ten original guides with definitions, arithmetic, examples, limitations and source links |

The 14 new tool/data routes have eight language versions: English plus `/ko/`, `/ja/`, `/zh/`, `/es/`, `/fr/`, `/de/`, `/pt/`. All core labels, outputs, errors, notes, sorting and currency formats are translated. The ten long-form guides are English only and are labeled as such from other languages. No fake translated editorial routes or alternate annotations were emitted.

New indexable pages: **112 localized tool/data pages + 11 English guide pages = 123**. Total: **1,807** versus 1,684 before. Existing 208 × 8 country pages remain. Country/target/pair state uses query parameters with a clean canonical, not a new sitemap entry for every combination.

Guide slugs: `what-is-an-income-percentile`, `what-does-top-10-percent-mean`, `top-1-percent-income`, `salary-vs-income`, `income-vs-salary-percentile`, `purchasing-power-parity`, `why-100000-differs-by-country`, `how-rankmyincome-calculates`, `global-income-percentiles`, `country-vs-global-rank`.

Additional product ideas implemented: **real raise after user-entered inflation**, using `(1+r)/(1+i)-1`, and **filtered ranking CSV downloads**. These extend an observed use case without introducing unsupported external forecasts. No mean-income statistic is invented from a few percentile points.

## Country pages and internal links

Every country retains its current URL and calculator link. Added median, the global position of that median, top-1%-to-median ratio, an eight-point distribution disclosure, data-backed FAQ and contextual links to goals, distribution, world rank, comparison and rankings. Existing top-25/10/5/1 tables and related countries remain.

The home, country pages, guides, tools and rankings form a connected navigation graph. Automated traversal follows actual `<a>` links from the homepage and verifies every indexable page is reachable. Guides link to relevant tools and data; calculated results link to follow-up tools with the selected country.

## SEO and advertising content quality

- Sitemap is generated from the canonical indexable page list. No query combinations, redirects or 404 pages are included.
- Unique canonical metadata and reciprocal eight-language alternates are verified; English-only guides omit fabricated alternates.
- Added permanent redirects for new `index.html` aliases and localized country aliases. Existing root redirects and real 404 behavior remain.
- New tools use WebApplication; articles use Article and BreadcrumbList; rankings use Dataset. Existing WebSite/WebPage/Breadcrumb references remain. No ratings or reviews are fabricated.
- Visible FAQs are provided without claiming FAQ rich-result eligibility or adding FAQ markup merely for promotion.
- Original explanatory articles, richer country data, attribution, methodology, About, Privacy and Contact improve the inspectable content offering. AdSense publisher settings, legal information, billing and consent configuration are not modified.
- Static ranking rows, country values, examples and editorial content are usable without JavaScript. Interactive results are rendered client-side with separate source definitions.

These improvements address discoverability, thin page content, navigation and conflicting URL signals. Google still decides whether to crawl/index each URL. Neither indexation, organic growth nor AdSense approval is guaranteed.

## Data and privacy details

Published table thresholds come directly from the existing imported series; custom targets reuse the existing inverse. Country and world distributions are never mixed. PPP equivalents preserve world position and do not claim to be market-rate conversions or city cost-of-living estimates. Salary figures are explicitly gross and their rank context is explicitly adult national income.

Germany and mainland China remain absent from the imported dataset; the tools say so. They are not silently replaced by another country. German UI defaults to supported Austria, whose name remains visible.

Entered income is never added to navigation URLs or new storage. Follow-up links preserve only the country, with a note that the user should enter the annual amount on the main calculator. Existing privacy-preserving text/PNG sharing and optional saved ranks remain. No new analytics collection or external submission of income is added.

## Validation and performance

`npm run check` passes the retained calculator, static-site, existing DOM, new tool DOM/arithmetic and production-checker fixture tests. It includes:

- **103,272 exact forward comparisons** against the original calculator, tiers, tails and all country/world distributions.
- Original inverse round-trips and worldwide conversion checks; source SHA-256 unchanged.
- New salary period formulas, positive/negative raise scenarios and exact real-increase arithmetic.
- PPP round-trips and invariant worldwide rank across all 208 countries against seven comparison markets.
- New eight-language tool flows, errors, recovery, filtering and sorting; no income in generated links.
- **115,921 local links/assets** across 1,808 HTML documents (including the non-indexable 404), canonical, alternates, JSON-LD, source assets and sitemap destinations.
- Reachability of every indexable page through the actual link graph, and complete localized string key sets.
- Existing storage, sharing, retry and stale-response behavior retained.

The Chromium suite covers 41 cases: new tools in every language at 320px, keyboard/labels, axe WCAG A/AA checks, country selectors, numeric tables, downloads, errors/races, no-JavaScript content and original flows. The initial run caught a German long-heading overflow; explicit word wrapping fixed it. Mobile WebKit is additionally required by CI; local installation of its system dependencies was unavailable. Screenshots of the home, goals and German layout were visually inspected.

No new runtime dependencies or chart frameworks were added. New tool JavaScript is excluded from the homepage. The existing catalog/world request remains approximately 32 KB uncompressed, with country distributions loaded on demand. The unchanged full source file is not fetched for ordinary calculation.

Measured gzip sizes: main `app.js` 6,295 bytes (baseline 5,911; +384), unchanged math core 1,775 bytes, new tool JS 4,325 bytes and its arithmetic helper 639 bytes, growth CSS 1,315 bytes. Local unthrottled Chromium checks at 375/1280px recorded FCP/LCP of 44–108 ms across home, goal, ranking and Korea data pages, with no overflow. These are local diagnostics with ads blocked, **not field Core Web Vitals, mobile-network performance or an advertising-loaded benchmark**. Reproducible details are in `search-growth-metrics.json` and `scripts/measure-growth.mjs`.

## Release gates and evidence

Authorized sequence: publish working branch → CI including Chromium/mobile WebKit → merge only if checks pass → existing Vercel Git integration → verify the exact commit from `https://rankmyincome.com/build-info.json` and public routes. The production verifier now includes new tools, comparison, rankings and guides across all languages, in addition to prior cache/robots/sitemap/404 checks.

Vercel API project inspection returned the pre-existing team-scope 403. No access controls or deployment protection were changed. The configured Git integration and public production verifier remain the release path.

This document is prepared with the implementation. Live CI and deployment evidence will be linked in the final delivery and can be inspected in the [repository Actions](https://github.com/jimin062200-cmyk/rankmyincome/actions) and the release PR. Do not interpret a successful local build as proof of a production deployment.

## Follow-up in Search Console

1. Resubmit/check `https://rankmyincome.com/sitemap.xml` and confirm successful parsing of 1,807 canonical entries.
2. Inspect `/tools/top-income/`, `/tools/salary-converter/`, `/rankings/top-1-income/`, `/guides/purchasing-power-parity/` and localized counterparts; compare declared and Google-selected canonical.
3. Inspect representative existing US/Korea/Japan/UK/Canada/Australia/France country pages and their crawl/render output.
4. Compare impressions, clicks and queries by page family and language using comparable periods after crawling. Look for new query coverage, not just total URLs.
5. Monitor Discovered/Crawled–currently not indexed, duplicates and redirect reports. A redirect report is expected for aliases, not canonical URLs.
6. Check field mobile Core Web Vitals and actual ad-loaded experience separately; do not extrapolate local timings to production users.

Remaining limitations: actual Search Console/AdSense account status was not accessed; no proven traffic increase yet; no field-performance claim; no newly imported WID year; no Germany/mainland China distributions; long guides are English only. Existing WID reuse/attribution review in DATA_POLICY.md remains applicable and was not changed into a claim of completed legal review.

## Primary references

- [WID data](https://wid.world/data/), [methodology](https://wid.world/methodology/), [codes](https://wid.world/codes-dictionary/)
- [Google canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
- [Google localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google URL structure](https://developers.google.com/search/docs/crawling-indexing/url-structure)
- [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [AdSense eligibility and original content](https://support.google.com/adsense/answer/9724?hl=en)
- [Vercel deployments](https://vercel.com/docs/deployments)
- [Project code and source history](https://github.com/jimin062200-cmyk/rankmyincome)


## CI installation timeout follow-up — 22 October 2026

[PR run 39793860063](https://github.com/jimin062200-cmyk/rankmyincome/actions/runs/39793860063) reached the 15-minute job limit while installing test browsers. The log identifies Ubuntu 24.04.5, not Ubuntu 26. Package installation ran from approximately 14:14:35 UTC to 14:29:11 UTC; browser downloads began only seconds before cancellation. No browser test executed in that run. Missing report files were a consequence, and the Node 20 action warning was separate.

CI now uses the official Playwright 1.56.1 Noble image, pinned by registry digest and matched to the existing npm version. It contains browser binaries and OS dependencies, removing the per-run apt/download step. Ubuntu 24.04 is explicitly selected; checkout/setup-node/upload-artifact use verified Node 24 action releases pinned by commit. Application Node remains 22. The 15-minute job limit, full check suite, Chromium/mobile WebKit suite and production verification gate remain. An explicit version assertion and two-browser launch check fail early on an image mismatch. Report uploads require actual report files.

The earlier WebKit issue was addressed in feeae357: unchanged delayed form change events no longer invalidate submissions, with a dedicated DOM regression, and long mobile screenshots use CSS pixel scale to avoid WebKit's 32767-pixel bitmap limit. All 21 growth Chromium tests and the full non-browser suite passed locally after that fix. Full CI and production release evidence must still be verified after the CI change.

References: [Playwright CI](https://playwright.dev/docs/ci), [Playwright Docker](https://playwright.dev/docs/docker), and the linked failed run.
