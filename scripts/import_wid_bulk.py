#!/usr/bin/env python3
"""Build RankMyIncome's income-data.json from WID.world bulk country CSV files.

Expected WID files are named like WID_data_KR.csv, WID_data_US.csv, WID_data_WO.csv
and contain the standard columns: country, variable, percentile, year, value.

Methodology used by RankMyIncome:
- country distribution: tptinc992j (pre-tax national income threshold,
  adults aged 20+, equal-split adults)
- PPP conversion: xlcusp999i / xlcuspi999 (local-currency units per USD PPP)
- world distribution: tptinc992j / tptincj992 for WO-PPP, expressed in USD PPP.

The script deliberately emits Preview status unless --production is passed.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import defaultdict
from pathlib import Path

COUNTRY_META_PATH = Path(__file__).resolve().parents[1] / "data" / "country-meta.json"

INCOME_VARS = {"tptinc992j", "tptincj992"}
PPP_VARS = {"xlcusp999i", "xlcuspi999"}
WORLD_CODES = {"WO", "WO-PPP", "WO-MER"}

SYMBOL_OVERRIDES = {
    "KRW": "₩", "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥",
    "CNY": "¥", "MYR": "RM", "SGD": "S$", "AUD": "A$", "CAD": "C$",
    "INR": "₹", "THB": "฿", "PHP": "₱", "IDR": "Rp", "VND": "₫",
    "HKD": "HK$", "TWD": "NT$", "NZD": "NZ$", "CHF": "CHF",
}

P_RE = re.compile(r"^p(-?\d+(?:\.\d+)?)p(-?\d+(?:\.\d+)?)$")


def sniff_delimiter(path: Path) -> str:
    sample = path.read_text(encoding="utf-8-sig", errors="replace")[:8192]
    try:
        return csv.Sniffer().sniff(sample, delimiters=";,\t,").delimiter
    except csv.Error:
        return ";" if sample.count(";") >= sample.count(",") else ","


def read_rows(path: Path):
    delim = sniff_delimiter(path)
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh, delimiter=delim)
        required = {"country", "variable", "percentile", "year", "value"}
        fields = {str(x).strip().lower() for x in (reader.fieldnames or [])}
        if not required.issubset(fields):
            raise ValueError(f"{path.name}: expected columns {sorted(required)}, got {reader.fieldnames}")
        for raw in reader:
            row = {str(k).strip().lower(): v for k, v in raw.items()}
            yield row


def as_float(value):
    try:
        x = float(str(value).strip().replace(",", "."))
        return x if math.isfinite(x) else None
    except Exception:
        return None


def as_year(value):
    try:
        return int(float(str(value).strip()))
    except Exception:
        return None


def percentile_lower(p):
    m = P_RE.match(str(p).strip())
    if not m:
        return None
    lo, hi = map(float, m.groups())
    if not (0 <= lo < hi <= 100):
        return None
    return lo


def collect_file(path: Path, income_by_area, ppp_by_area, ptinc_seen):
    for r in read_rows(path):
        area = str(r.get("country", "")).strip().upper()
        var = str(r.get("variable", "")).strip().lower()
        year = as_year(r.get("year"))
        value = as_float(r.get("value"))
        if not area or year is None or value is None:
            continue
        if "ptinc" in var:
            ptinc_seen[area][var] += 1
        if var in INCOME_VARS:
            p = percentile_lower(r.get("percentile"))
            if p is None:
                continue
            income_by_area[area][year][p].append(value)
        elif var in PPP_VARS:
            ppp_by_area[area][year].append(value)


def collapse_thresholds(raw):
    """Deduplicate and return positive monotone threshold points."""
    points = []
    last_value = -math.inf
    for p in sorted(raw):
        vals = sorted(v for v in raw[p] if math.isfinite(v))
        if not vals:
            continue
        value = vals[len(vals) // 2]
        # Browser interpolation is logarithmic, so non-positive values cannot be used.
        if value <= 0:
            continue
        # A few noisy series can be fractionally non-monotone; skip such points rather
        # than silently changing the published threshold.
        if value < last_value:
            continue
        points.append([round(p, 6), value])
        last_value = value
    return points


def choose_world(income_by_area, requested_year=None, min_points=10):
    candidates = []
    # WID world/region bulk files have changed naming conventions over time.
    # Accept any world aggregate code beginning with WO, but prefer PPP variants.
    world_codes = sorted(
        [code for code in income_by_area if code == "WO" or code.startswith("WO-")],
        key=lambda code: (0 if "PPP" in code else 1, code),
    )
    for code in world_codes:
        for year, raw in income_by_area.get(code, {}).items():
            pts = collapse_thresholds(raw)
            if len(pts) >= min_points:
                candidates.append((year, code, pts))
    if not candidates:
        available = {
            code: {year: len(collapse_thresholds(raw)) for year, raw in years.items()}
            for code, years in income_by_area.items()
            if code == "WO" or code.startswith("WO-")
        }
        raise RuntimeError(
            "No usable WID world pre-tax-income threshold distribution found. "
            f"Detected world threshold points by year: {available or 'none'}"
        )
    if requested_year is not None:
        exact = [x for x in candidates if x[0] == requested_year]
        if exact:
            return max(exact, key=lambda x: len(x[2]))
        older = [x for x in candidates if x[0] <= requested_year]
        if older:
            return max(older, key=lambda x: (x[0], len(x[2])))
        return min(candidates, key=lambda x: abs(x[0] - requested_year))
    return max(candidates, key=lambda x: (x[0], len(x[2])))


def best_year_for_country(year_map, target_year, min_points=10):
    usable = []
    for year, raw in year_map.items():
        pts = collapse_thresholds(raw)
        if len(pts) >= min_points:
            usable.append((year, pts))
    if not usable:
        return None
    exact = [x for x in usable if x[0] == target_year]
    if exact:
        return max(exact, key=lambda x: len(x[1]))
    older = [x for x in usable if x[0] <= target_year]
    if older:
        return max(older, key=lambda x: (x[0], len(x[1])))
    return min(usable, key=lambda x: abs(x[0] - target_year))


def closest_ppp(ppp_years, target_year):
    candidates = []
    for year, vals in ppp_years.items():
        good = [v for v in vals if math.isfinite(v) and v > 0]
        if good:
            good.sort()
            candidates.append((year, good[len(good)//2]))
    if not candidates:
        return None
    exact = [x for x in candidates if x[0] == target_year]
    if exact:
        return exact[0]
    older = [x for x in candidates if x[0] <= target_year]
    if older:
        return max(older, key=lambda x: x[0])
    return min(candidates, key=lambda x: abs(x[0]-target_year))


def load_country_meta():
    if not COUNTRY_META_PATH.exists():
        # Minimum safe fallback so the core KR/MY/US workflow still works even
        # if someone copies only this script and forgets the metadata file.
        return {
            "KR": {"name": "South Korea", "currency": "KRW", "symbol": "₩"},
            "MY": {"name": "Malaysia", "currency": "MYR", "symbol": "RM"},
            "US": {"name": "United States", "currency": "USD", "symbol": "$"},
        }
    try:
        data = json.loads(COUNTRY_META_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Could not read {COUNTRY_META_PATH}: {exc}") from exc
    if not isinstance(data, dict):
        raise RuntimeError(f"{COUNTRY_META_PATH} must contain a JSON object keyed by ISO alpha-2 country code")
    return data


def country_meta(code, metadata):
    item = metadata.get(code, {})
    name = str(item.get("name") or code)
    currency = str(item.get("currency") or "")
    symbol = str(item.get("symbol") or currency)
    return name, currency, symbol


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_dir", type=Path, help="Directory containing WID_data_*.csv files")
    ap.add_argument("-o", "--output", type=Path, default=Path("data/income-data.json"))
    ap.add_argument("--year", type=int, default=None, help="Preferred distribution reference year")
    ap.add_argument("--production", action="store_true", help="Mark dataset production-ready after independent license/quality review")
    ap.add_argument("--min-country-points", type=int, default=10)
    args = ap.parse_args()

    country_metadata = load_country_meta()

    files = sorted(args.input_dir.glob("WID_data_*.csv"))
    if not files:
        raise SystemExit(f"No WID_data_*.csv files found in {args.input_dir}")

    income_by_area = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    ppp_by_area = defaultdict(lambda: defaultdict(list))
    ptinc_seen = defaultdict(lambda: defaultdict(int))
    for path in files:
        print(f"Reading {path.name}")
        collect_file(path, income_by_area, ppp_by_area, ptinc_seen)

    try:
        world_year, world_code, world_points = choose_world(income_by_area, args.year)
    except RuntimeError as exc:
        print(str(exc))
        world_ptinc = {
            area: dict(sorted(vars_.items(), key=lambda x: (-x[1], x[0])))
            for area, vars_ in ptinc_seen.items()
            if area == "WO" or area.startswith("WO-")
        }
        print("Detected ptinc-related variables in world rows:")
        print(json.dumps(world_ptinc, indent=2, ensure_ascii=False) if world_ptinc else "  none")
        raise
    countries = {}
    skipped = []

    for code, year_map in sorted(income_by_area.items()):
        if code in WORLD_CODES or len(code) != 2:
            continue
        if code not in country_metadata:
            continue  # Skip WID regional/aggregate area codes.
        selected = best_year_for_country(year_map, world_year, args.min_country_points)
        if not selected:
            skipped.append((code, "no distribution"))
            continue
        data_year, points = selected
        ppp = closest_ppp(ppp_by_area.get(code, {}), world_year)
        if not ppp:
            skipped.append((code, "no USD-PPP conversion"))
            continue
        ppp_year, ppp_value = ppp
        name, currency, symbol = country_meta(code, country_metadata)
        if not currency:
            skipped.append((code, "no current currency mapping"))
            continue
        countries[code] = {
            "name": name,
            "currency": currency,
            "symbol": symbol or currency,
            "pppPerWorldUnit": ppp_value,
            "dataYear": data_year,
            "pppYear": ppp_year,
            "thresholds": points,
        }

    status = "production" if args.production else "preview"
    out = {
        "meta": {
            "status": status,
            "source": "WID.world",
            "referenceYear": world_year,
            "worldArea": world_code,
            "incomeVariablesAccepted": sorted(INCOME_VARS),
            "pppVariablesAccepted": sorted(PPP_VARS),
            "commonUnit": "USD PPP",
            "license": "WID.world open data; verify current reuse/attribution terms before monetized launch",
            "notes": "Country/world thresholds accept WID tptinc992j or tptincj992 aliases; PPP accepts xlcusp999i or xlcuspi999. Country data years may differ and are stored per country."
        },
        "world": {"unit": "USD PPP", "year": world_year, "thresholds": world_points},
        "countries": countries,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}: {len(countries)} countries; world year={world_year}; status={status}")
    if skipped:
        print(f"Skipped {len(skipped)} country candidates")
        for code, reason in skipped[:30]:
            print(f"  {code}: {reason}")
        if len(skipped) > 30:
            print(f"  ... and {len(skipped)-30} more")


if __name__ == "__main__":
    main()
