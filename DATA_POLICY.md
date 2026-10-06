# Data policy for RankMyIncome

## Target production dataset
RankMyIncome is designed around WID.world's distributional income concepts because they match the intended "annual pre-tax income" experience better than household-consumption poverty datasets.

The current planned series are:
- `tptinc992j`: threshold of pre-tax national income for adults aged 20+ using equal-split adults.
- `xlceup999i`: PPP conversion factor in local-currency units per EUR PPP.
- world `tptinc992j`: common-unit distribution used for the worldwide comparison.

The official 2026 WID comparator code also imports `xlceup` and labels it as the EUR-PPP conversion used by the comparator.

## Reuse / monetization
Current WID/WIR legal material says that open data available on the website can be used without prior authorization. That is more permissive than the older report-level CC BY-NC-SA wording previously assumed in this project.

However, because the current WID data page does not state a complete commercial-reuse/attribution license in one unambiguous place, RankMyIncome should still confirm the current reuse and attribution terms before enabling ads on a public production build. Until then the site remains in Preview mode.

## World Bank PIP fallback
World Bank PIP is a possible fallback but measures household survey welfare per person (income or consumption), which is not the same concept as personal/equal-split pre-tax national income. Do not silently substitute it while keeping the current input wording.

## Safety guard
`data/income-data.json` includes `meta.status`. The site shows a PREVIEW banner unless status is exactly `production`.
