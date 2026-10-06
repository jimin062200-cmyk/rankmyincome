#!/usr/bin/env python3
"""Verify RankMyIncome JSON against the downloaded WID bulk CSV source files.

This independently rebuilds the threshold/PPP values from WID_data_*.csv using
RankMyIncome's documented accepted aliases, then checks that income-data.json
matches the source-derived values exactly (within tiny floating tolerance).
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

INCOME_VARS = {"tptinc992j", "tptincj992"}
PPP_VARS = {"xlcusp999i", "xlcuspi999"}
P_RE = re.compile(r"^p(-?\d+(?:\.\d+)?)p(-?\d+(?:\.\d+)?)$")
REPRESENTATIVE = [10, 25, 50, 75, 90, 95, 99, 99.9]


def sniff_delimiter(path: Path) -> str:
    sample = path.read_text(encoding="utf-8-sig", errors="replace")[:8192]
    try:
        return csv.Sniffer().sniff(sample, delimiters=";,\t,").delimiter
    except csv.Error:
        return ";" if sample.count(";") >= sample.count(",") else ","


def as_float(v):
    try:
        x = float(str(v).strip().replace(",", "."))
        return x if math.isfinite(x) else None
    except Exception:
        return None


def as_year(v):
    try:
        return int(float(str(v).strip()))
    except Exception:
        return None


def percentile_lower(v):
    m = P_RE.match(str(v).strip())
    if not m:
        return None
    lo, hi = map(float, m.groups())
    if not (0 <= lo < hi <= 100):
        return None
    return lo


def read_source(source_dir: Path):
    income = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    ppp = defaultdict(lambda: defaultdict(list))
    files = sorted(source_dir.glob("WID_data_*.csv"))
    if not files:
        raise SystemExit(f"No WID_data_*.csv files found in {source_dir}")

    for path in files:
        delim = sniff_delimiter(path)
        with path.open("r", encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh, delimiter=delim)
            for raw in reader:
                row = {str(k).strip().lower(): v for k, v in raw.items()}
                area = str(row.get("country", "")).strip().upper()
                var = str(row.get("variable", "")).strip().lower()
                year = as_year(row.get("year"))
                value = as_float(row.get("value"))
                if not area or year is None or value is None:
                    continue
                if var in INCOME_VARS:
                    p = percentile_lower(row.get("percentile"))
                    if p is not None:
                        income[area][year][p].append(value)
                elif var in PPP_VARS:
                    ppp[area][year].append(value)
    return income, ppp


def collapse_thresholds(raw):
    points = []
    last = -math.inf
    for p in sorted(raw):
        vals = sorted(v for v in raw[p] if math.isfinite(v))
        if not vals:
            continue
        value = vals[len(vals) // 2]
        if value <= 0:
            continue
        if value < last:
            continue
        points.append([round(float(p), 6), float(value)])
        last = value
    return points


def median_positive(vals):
    good = sorted(v for v in vals if math.isfinite(v) and v > 0)
    return good[len(good)//2] if good else None


def close(a, b, rel=1e-10, abs_=1e-8):
    return math.isclose(float(a), float(b), rel_tol=rel, abs_tol=abs_)


def point_map(points):
    return {round(float(p), 6): float(v) for p, v in points}


def fmt(v):
    v = float(v)
    av = abs(v)
    if av >= 1_000_000_000:
        return f"{v/1_000_000_000:.3g}B"
    if av >= 1_000_000:
        return f"{v/1_000_000:.3g}M"
    if av >= 1_000:
        return f"{v/1_000:.3g}k"
    return f"{v:.6g}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source_dir", type=Path, nargs="?", default=Path("wid-source"))
    ap.add_argument("json_file", type=Path, nargs="?", default=Path("data/income-data.json"))
    args = ap.parse_args()

    data = json.loads(args.json_file.read_text(encoding="utf-8"))
    income, ppp = read_source(args.source_dir)

    failures = []
    checks = 0

    meta = data.get("meta", {})
    world = data.get("world", {})
    world_area = str(meta.get("worldArea") or "WO-PPP").upper()
    world_year = int(world.get("year") or meta.get("referenceYear"))

    expected_world = collapse_thresholds(income.get(world_area, {}).get(world_year, {}))
    actual_world = world.get("thresholds") or []
    ew, aw = point_map(expected_world), point_map(actual_world)

    if ew.keys() != aw.keys():
        failures.append(
            f"WORLD percentile set mismatch: source={len(ew)} points JSON={len(aw)} points"
        )
    for p in sorted(ew.keys() & aw.keys()):
        checks += 1
        if not close(ew[p], aw[p]):
            failures.append(f"WORLD p{p:g}: source={ew[p]} JSON={aw[p]}")

    print("=== Exact source ↔ JSON verification ===")
    print(f"world: {world_area}, year={world_year}, source points={len(ew)}, JSON points={len(aw)}")
    for p in REPRESENTATIVE:
        if p in ew and p in aw:
            print(f"  WORLD p{p:g}: {fmt(aw[p])}  MATCH")

    countries = data.get("countries", {})
    for code in sorted(countries):
        item = countries[code]
        data_year = int(item["dataYear"])
        ppp_year = int(item["pppYear"])
        expected_points = collapse_thresholds(income.get(code, {}).get(data_year, {}))
        actual_points = item.get("thresholds") or []
        ep, apoints = point_map(expected_points), point_map(actual_points)

        if ep.keys() != apoints.keys():
            failures.append(
                f"{code} percentile set mismatch: source={len(ep)} points JSON={len(apoints)} points"
            )
        for p in sorted(ep.keys() & apoints.keys()):
            checks += 1
            if not close(ep[p], apoints[p]):
                failures.append(f"{code} p{p:g}: source={ep[p]} JSON={apoints[p]}")

        expected_ppp = median_positive(ppp.get(code, {}).get(ppp_year, []))
        actual_ppp = item.get("pppPerWorldUnit")
        checks += 1
        if expected_ppp is None:
            failures.append(f"{code}: no source PPP value for {ppp_year}")
        elif actual_ppp is None or not close(expected_ppp, actual_ppp):
            failures.append(f"{code} PPP: source={expected_ppp} JSON={actual_ppp}")

        print(
            f"{code}: incomeYear={data_year}, PPPYear={ppp_year}, "
            f"source points={len(ep)}, JSON points={len(apoints)}, "
            f"PPP={fmt(actual_ppp)}"
        )
        for p in REPRESENTATIVE:
            if p in ep and p in apoints:
                print(f"  p{p:g}: {fmt(apoints[p])}  MATCH")

    print("\n=== Result ===")
    if failures:
        print(f"FAIL: {len(failures)} mismatch(es) across {checks} numeric checks")
        for failure in failures[:50]:
            print(" -", failure)
        if len(failures) > 50:
            print(f" - ... {len(failures)-50} more")
        sys.exit(1)

    print(f"PASS: JSON exactly matches downloaded WID source across {checks} numeric checks.")
    print("Safe next step: run the importer with --production, then re-run the normal validator.")


if __name__ == "__main__":
    main()
