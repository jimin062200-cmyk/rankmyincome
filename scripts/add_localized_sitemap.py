#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'sitemap.xml'
text = path.read_text(encoding='utf-8')
needle = '  <url><loc>https://rankmyincome.com/</loc><priority>1.0</priority></url>\n'
localized = (
    '  <url><loc>https://rankmyincome.com/ko/</loc><priority>0.8</priority></url>\n'
    '  <url><loc>https://rankmyincome.com/ja/</loc><priority>0.8</priority></url>\n'
)
if 'https://rankmyincome.com/ko/' not in text:
    text = text.replace(needle, needle + localized)
path.write_text(text, encoding='utf-8')
