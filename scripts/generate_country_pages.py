#!/usr/bin/env python3
"""Compatibility entrypoint: regenerate all localized pages and sitemap into dist/."""
import subprocess
from pathlib import Path

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    subprocess.run(['node', 'scripts/build-site.mjs'], cwd=root, check=True)
