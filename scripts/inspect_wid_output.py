#!/usr/bin/env python3
"""Inspect a RankMyIncome WID-derived income-data.json before production promotion.

This is a read-only sanity checker. It never changes the dataset.
Checks:
- WID source/status/schema
- world/country threshold count, ordering, percentile coverage
- positive PPP factors and reasonable data-year alignment
- prints representative thresholds for manual comparison with WID
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

TARGET_PS = [10, 25, 50, 75, 90, 95, 99, 99.9]
CORE = ["KR", "US", "MY"]


def fmt_num(x: float) -> str:
    ax = abs(x)
    if ax >= 1_000_000_000:
        return f"{x/1_000_000_000:.3g}B"
    if ax >= 1_000_000:
        return f"{x/1_000_000:.3g}M"
    if ax >= 1_000:
        return f"{x/1_000:.3g}k"
    if ax >= 10:
        return f"{x:.2f}".rstrip("0").rstrip(".")
    return f"{x:.4g}"


def normalize_points(raw):
    pts=[]
    for item in raw or []:
        if not isinstance(item, (list, tuple)) or len(item) != 2:
            continue
        try:
            p=float(item[0]); v=float(item[1])
        except Exception:
            continue
        if math.isfinite(p) and math.isfinite(v):
            pts.append((p,v))
    pts.sort()
    return pts


def nearest(pts, target):
    return min(pts, key=lambda x: abs(x[0]-target)) if pts else None


def check_distribution(label, raw, issues, min_points=10):
    pts=normalize_points(raw)
    if len(pts) < min_points:
        issues.append(f"{label}: only {len(pts)} usable threshold points")
        return pts
    ps=[p for p,_ in pts]
    vals=[v for _,v in pts]
    if any(not (0 <= p < 100) for p in ps):
        issues.append(f"{label}: percentile outside [0,100)")
    if any(ps[i] >= ps[i+1] for i in range(len(ps)-1)):
        issues.append(f"{label}: percentiles not strictly increasing")
    if any(v <= 0 for v in vals):
        issues.append(f"{label}: non-positive threshold")
    if any(vals[i] > vals[i+1] for i in range(len(vals)-1)):
        issues.append(f"{label}: thresholds decrease")
    if max(ps) < 99:
        issues.append(f"{label}: top-tail coverage stops below p99 (max={max(ps):g})")
    if min(ps) > 10:
        issues.append(f"{label}: lower-tail coverage starts above p10 (min={min(ps):g})")
    return pts


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", type=Path, default=Path("data/income-data.json"))
    args=ap.parse_args()
    d=json.loads(args.path.read_text(encoding="utf-8"))
    meta=d.get("meta", {})
    countries=d.get("countries", {})
    world=d.get("world", {})
    issues=[]

    print("=== RankMyIncome WID sanity report ===")
    print(f"source: {meta.get('source')}")
    print(f"status: {meta.get('status')}")
    print(f"world area: {meta.get('worldArea')}")
    print(f"common unit: {meta.get('commonUnit')}")
    print(f"world year: {world.get('year', meta.get('referenceYear'))}")
    print(f"country count: {len(countries)}")

    if meta.get("source") != "WID.world":
        issues.append("meta.source is not WID.world")
    if meta.get("status") not in {"preview", "production"}:
        issues.append("unexpected meta.status")
    if "PPP" not in str(meta.get("worldArea", "")):
        issues.append("worldArea is not a PPP world aggregate")
    if str(meta.get("commonUnit", "")).upper() != "USD PPP":
        issues.append("commonUnit is not USD PPP")

    wpts=check_distribution("WORLD", world.get("thresholds"), issues)
    if wpts:
        print("\nWORLD representative thresholds (USD PPP):")
        for p in TARGET_PS:
            got=nearest(wpts,p)
            if got:
                print(f"  p{p:g}: {fmt_num(got[1])}  [actual point p{got[0]:g}]")

    wyear=world.get("year", meta.get("referenceYear"))
    try: wyear=int(wyear)
    except Exception: wyear=None

    for code in CORE:
        c=countries.get(code)
        if not c:
            issues.append(f"{code}: missing core country")
            continue
        pts=check_distribution(code, c.get("thresholds"), issues)
        ppp=c.get("pppPerWorldUnit")
        try: ppp=float(ppp)
        except Exception: ppp=float("nan")
        if not math.isfinite(ppp) or ppp <= 0:
            issues.append(f"{code}: invalid pppPerWorldUnit={c.get('pppPerWorldUnit')}")
        dy=c.get("dataYear")
        py=c.get("pppYear")
        try: dy=int(dy)
        except Exception: dy=None
        try: py=int(py)
        except Exception: py=None
        if wyear and dy and abs(dy-wyear) > 8:
            issues.append(f"{code}: dataYear {dy} is >8 years from world year {wyear}")
        if wyear and py and abs(py-wyear) > 8:
            issues.append(f"{code}: pppYear {py} is >8 years from world year {wyear}")

        print(f"\n{code} — {c.get('name')} ({c.get('currency')} {c.get('symbol','')})")
        print(f"  dataYear={c.get('dataYear')}  pppYear={c.get('pppYear')}  LCU/USD-PPP={fmt_num(ppp) if math.isfinite(ppp) else ppp}")
        for p in TARGET_PS:
            got=nearest(pts,p)
            if got:
                usdppp=got[1]/ppp if math.isfinite(ppp) and ppp>0 else float('nan')
                print(f"  p{p:g}: {fmt_num(got[1])} {c.get('currency')}  ≈ {fmt_num(usdppp)} USD-PPP  [actual point p{got[0]:g}]")

    print("\n=== Result ===")
    if issues:
        print(f"FAIL / REVIEW: {len(issues)} issue(s)")
        for x in issues:
            print(f"  - {x}")
        raise SystemExit(1)
    print("PASS: structural and numerical sanity checks passed.")
    print("Manual source-value comparison is still required before changing status to production.")

if __name__ == "__main__":
    main()
