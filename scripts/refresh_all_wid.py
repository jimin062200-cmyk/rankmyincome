#!/usr/bin/env python3
"""Resume/refresh all available WID data and rebuild RankMyIncome.

Existing country CSVs are reused, so this command is safe after Ctrl+C.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYTHON = sys.executable


def run(*args: str) -> None:
    cmd = [PYTHON, *args]
    print("\n>", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--timeout", type=float, default=25.0)
    ap.add_argument("--retries", type=int, default=1)
    args = ap.parse_args()

    try:
        run(
            "scripts/fetch_wid_bulk.py", "--all",
            "--workers", str(args.workers),
            "--timeout", str(args.timeout),
            "--retries", str(args.retries),
        )
        run("scripts/import_wid_bulk.py", "wid-source", "-o", "data/income-data.json", "--production")
        run("scripts/validate_income_data.py", "data/income-data.json")
        run("scripts/generate_country_pages.py")
    except subprocess.CalledProcessError as exc:
        print(f"\nFAILED: stage exited with code {exc.returncode}.", file=sys.stderr)
        return exc.returncode or 1
    except KeyboardInterrupt:
        print("\nStopped by user. Already downloaded CSVs are preserved; run the same command again to resume.")
        return 130

    print("\nDONE: all available WID country files were refreshed and site pages regenerated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
