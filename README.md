# RankMyIncome

Static, browser-only income percentile calculator prototype.

## Current state

- Searchable country picker
- Country and worldwide percentile cards
- RankMyIncome tiers from Iron to Challenger
- Original CSS tier emblems (no game artwork/assets)
- Share / copy result without including the entered income amount
- Auto-generated country landing pages for SEO/discovery
- Methodology, Privacy, robots.txt, and sitemap.xml
- Statistical data separated into `data/income-data.json`
- Preview safety gate: non-production data always displays PREVIEW

## Local preview

```bash
python -m http.server 8765
```

Then open `http://localhost:8765/`.

## Validate data

```bash
python scripts/validate_income_data.py data/income-data.json
```

## Regenerate country pages and sitemap

Whenever countries are added or renamed in `data/income-data.json`:

```bash
python scripts/generate_country_pages.py
```

This rebuilds `countries/` and `sitemap.xml` from the active data file.

## Production data gate

Do not change `meta.status` to `production` until the active statistical dataset has been verified, the percentile/PPP transformations have been tested, and its license permits the intended site use (including advertising if monetized).

See `DATA_POLICY.md`.

## Build from official WID bulk data

From the project root on a machine with internet access:

```bash
python scripts/fetch_wid_bulk.py --core
python scripts/import_wid_bulk.py wid-source -o data/income-data.json
python scripts/validate_income_data.py data/income-data.json
python scripts/generate_country_pages.py
```

Keep the dataset in Preview until the source/licensing/quality review is complete. Only pass
`--production` to `import_wid_bulk.py` once that review is complete.
