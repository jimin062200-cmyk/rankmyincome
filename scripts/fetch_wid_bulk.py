#!/usr/bin/env python3
"""Download official WID.world bulk CSV files for RankMyIncome.

Examples:
  py scripts\\fetch_wid_bulk.py --core
  py scripts\\fetch_wid_bulk.py --all
  py scripts\\fetch_wid_bulk.py --all --workers 3 --timeout 25
  py scripts\\fetch_wid_bulk.py KR US MY JP GB DE FR WO-PPP

Behavior:
- Existing valid CSV files are reused by default, so interrupted --all runs resume.
- Downloads are first written to *.part and atomically renamed on success.
- In --all mode unavailable/timed-out countries are skipped instead of aborting.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import socket
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://wid.world/bulk_download/WID_data_{code}.csv"
CORE = ["KR", "US", "MY", "WO-PPP"]
MIN_VALID_BYTES = 100


def country_meta_path() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "country-meta.json"


def all_country_codes() -> list[str]:
    path = country_meta_path()
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    codes = [str(code).upper() for code in data if len(str(code)) == 2 and str(code).isalpha()]
    return sorted(set(codes))


def is_valid_existing(path: Path) -> bool:
    try:
        return path.is_file() and path.stat().st_size >= MIN_VALID_BYTES
    except OSError:
        return False


def download_once(code: str, dest: Path, timeout: float, force: bool) -> tuple[str, str, int, str]:
    code = code.upper().strip()
    if not code or any(ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZ-" for ch in code):
        raise ValueError(f"Invalid WID area code: {code!r}")

    out = dest / f"WID_data_{code}.csv"
    if not force and is_valid_existing(out):
        return code, str(out), out.stat().st_size, "cached"

    url = BASE.format(code=code)
    part = out.with_suffix(out.suffix + ".part")
    part.unlink(missing_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "RankMyIncome-data-builder/1.1"})

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response, part.open("wb") as fh:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                fh.write(chunk)
        size = part.stat().st_size
        if size < MIN_VALID_BYTES:
            raise RuntimeError(f"downloaded file is unexpectedly small ({size} bytes)")
        part.replace(out)
        return code, str(out), size, "downloaded"
    except Exception:
        part.unlink(missing_ok=True)
        raise


def download(code: str, dest: Path, timeout: float, force: bool, retries: int) -> tuple[str, str, int, str]:
    attempts = max(1, retries + 1)
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return download_once(code, dest, timeout, force)
        except urllib.error.HTTPError as exc:
            # 404/403-like responses are not transient for a missing WID country file.
            if exc.code < 500 and exc.code != 429:
                raise
            last_exc = exc
        except (urllib.error.URLError, TimeoutError, socket.timeout, RuntimeError) as exc:
            last_exc = exc

        if attempt < attempts:
            time.sleep(min(2.0 * attempt, 4.0))

    assert last_exc is not None
    raise last_exc


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("codes", nargs="*", help="WID area codes, e.g. KR US MY JP GB WO-PPP")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--core", action="store_true", help="Download KR, US, MY and WO-PPP")
    mode.add_argument("--all", action="store_true", help="Download all available ISO-2 countries plus WO-PPP")
    ap.add_argument("-d", "--dest", type=Path, default=Path("wid-source"))
    ap.add_argument("--workers", type=int, default=3, help="Parallel downloads for --all (default: 3)")
    ap.add_argument("--timeout", type=float, default=25.0, help="Per-request socket timeout in seconds (default: 25)")
    ap.add_argument("--retries", type=int, default=1, help="Retries for transient errors (default: 1)")
    ap.add_argument("--force", action="store_true", help="Redownload even when a valid local CSV already exists")
    args = ap.parse_args()

    if args.timeout <= 0:
        ap.error("--timeout must be > 0")
    if args.retries < 0:
        ap.error("--retries must be >= 0")

    if args.core:
        codes = CORE
    elif args.all:
        codes = all_country_codes() + ["WO-PPP"]
    else:
        codes = [c.upper() for c in args.codes]

    if not codes:
        ap.error("provide area codes, --core, or --all")

    args.dest.mkdir(parents=True, exist_ok=True)
    codes = list(dict.fromkeys(codes))

    successes: list[tuple[str, str, int, str]] = []
    failures: list[tuple[str, str]] = []

    def run_one(code: str):
        try:
            return True, download(code, args.dest, args.timeout, args.force, args.retries)
        except urllib.error.HTTPError as exc:
            return False, (code, f"HTTP {exc.code}")
        except (urllib.error.URLError, TimeoutError, socket.timeout, RuntimeError, ValueError) as exc:
            reason = str(exc) or exc.__class__.__name__
            return False, (code, reason)
        except Exception as exc:
            return False, (code, f"{exc.__class__.__name__}: {exc}")

    total = len(codes)
    if args.all:
        workers = max(1, min(args.workers, 8))
        cached_before = sum(is_valid_existing(args.dest / f"WID_data_{code}.csv") for code in codes)
        print(
            f"Trying {total - 1} country codes + WO-PPP with {workers} workers "
            f"(timeout={args.timeout:g}s, retries={args.retries}, cached={cached_before})..."
        )
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(run_one, code): code for code in codes}
            completed = 0
            for future in concurrent.futures.as_completed(futures):
                completed += 1
                ok, result = future.result()
                if ok:
                    code, path, size, state = result
                    successes.append(result)
                    label = "HAVE" if state == "cached" else "OK  "
                    print(f"[{completed:>3}/{total}] {label} {code:7} {size:>12,} bytes", flush=True)
                else:
                    code, err = result
                    failures.append(result)
                    print(f"[{completed:>3}/{total}] SKIP {code:7} {err}", flush=True)
    else:
        for index, code in enumerate(codes, start=1):
            print(f"[{index}/{total}] {code}: {BASE.format(code=code)}")
            ok, result = run_one(code)
            if ok:
                successes.append(result)
                c, path, size, state = result
                verb = "using existing" if state == "cached" else "saved"
                print(f"  {verb} {path} ({size:,} bytes)")
            else:
                failures.append(result)
                c, err = result
                print(f"  ERROR {c}: {err}", file=sys.stderr)

    # Count every valid country CSV currently on disk, not just new downloads.
    available_country_files = [
        p for p in args.dest.glob("WID_data_*.csv")
        if p.name not in {"WID_data_WO-PPP.csv", "WID_data_WO.csv"} and is_valid_existing(p)
    ]
    world_ok = is_valid_existing(args.dest / "WID_data_WO-PPP.csv")
    newly_downloaded = sum(1 for x in successes if x[3] == "downloaded")
    reused = sum(1 for x in successes if x[3] == "cached")

    print("\n=== Download summary ===")
    print(f"Downloaded this run: {newly_downloaded}")
    print(f"Reused existing: {reused}")
    print(f"Available country CSVs on disk: {len(available_country_files)}")
    print(f"Skipped/failed this run: {len(failures)}")
    print(f"WO-PPP available: {'yes' if world_ok else 'NO'}")
    print(f"Source directory: {args.dest.resolve()}")

    if not world_ok:
        print("ERROR: WO-PPP is required for the world ranking.", file=sys.stderr)
        return 1
    if args.all and not available_country_files:
        print("ERROR: no usable country files are available.", file=sys.stderr)
        return 1
    if not args.all and failures:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
