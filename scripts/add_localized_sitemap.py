#!/usr/bin/env python3
"""Compatibility entrypoint: localization and sitemap now share one build source."""
import subprocess
from pathlib import Path

if __name__ == '__main__':
    subprocess.run(['node', 'scripts/build-site.mjs'], cwd=Path(__file__).resolve().parents[1], check=True)
