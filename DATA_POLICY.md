# Data policy for RankMyIncome

## Production dataset
RankMyIncome uses WID.world distributional income data for its annual pre-tax-income comparison.

The production pipeline accepts these WID source aliases:
- `tptinc992j` and `tptincj992`: pre-tax national-income thresholds for adults aged 20+ using equal-split adults.
- `xlcusp999i` and `xlcuspi999`: purchasing-power conversion in local-currency units per USD PPP.
- `WO-PPP`: worldwide pre-tax-income threshold distribution in the common USD-PPP unit used by RankMyIncome.

The browser calculator compares a local-currency income directly with the country's threshold series. For the worldwide result, it divides the local-currency amount by the country's WID USD-PPP conversion factor and compares the result with `WO-PPP`.

## Production status and verification
`data/income-data.json` is the active production dataset. The importer, validator, and source-match verifier are kept in `scripts/` so the generated JSON can be checked against downloaded WID bulk files before future production refreshes.

Country distributions and PPP factors can use different latest usable years. Generated pages must therefore display the country-specific `dataYear` and `pppYear` rather than assuming every country uses the worldwide reference year.

## Interpolation and tails
Between WID threshold points, RankMyIncome estimates the percentile with logarithmic interpolation. Values below the first available threshold are estimated toward percentile zero. Values above the highest available WID threshold are extrapolated from the last two threshold points in log space.

A very small displayed top percentage is not automatically extrapolated: if WID publishes a threshold covering that range, the calculator interpolates within the published points. Only values beyond the highest available threshold use upper-tail extrapolation.

## Reuse / monetization
WID.world is credited as the statistical data source. Before enabling advertising or another monetized use, re-check the then-current WID reuse, attribution, and licensing terms and preserve any attribution they require.

## World Bank PIP fallback
World Bank PIP measures household-survey welfare per person (income or consumption), which is not the same concept as the equal-split pre-tax national-income measure used here. Do not silently substitute PIP while keeping the current RankMyIncome input wording and methodology.

## Safety gate
`data/income-data.json` includes `meta.status`. The site displays a PREVIEW banner whenever that value is not exactly `production`.
