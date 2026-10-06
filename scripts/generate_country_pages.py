#!/usr/bin/env python3
import html, json, re, unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; DATA_PATH=ROOT/'data'/'income-data.json'; COUNTRIES_DIR=ROOT/'countries'; BASE_URL='https://rankmyincome.com'; SHOW=[50,75,90,95,99]

def slugify(name):
    name=re.sub(r"[’'`´]",'-',name); text=unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode('ascii').lower(); return re.sub(r'[^a-z0-9]+','-',text).strip('-') or 'country'
def esc(v): return html.escape(str(v),quote=True)
def flag(code): return ''.join(chr(127397+ord(c)) for c in str(code).upper()) if len(str(code))==2 and str(code).isalpha() else ''
def fmt(v,symbol,currency):
    v=float(v); n=f'{v/1e9:.2f}B' if v>=1e9 else f'{v/1e6:.2f}M' if v>=1e6 else f'{v/1e3:.1f}K' if v>=1e3 else f'{v:,.0f}'; pre=symbol if symbol and len(symbol)<=4 else ''; return f'{pre}{n} {currency}'.strip()
def source_label(meta,c=None):
    if meta.get('status')!='production': return 'Preview data — statistical results are not yet for public use'
    return f"{meta.get('source','Production data')} · income {c.get('dataYear','—')} · PPP {c.get('pppYear','—')}" if c else f"{meta.get('source','Production data')} · world reference {meta.get('referenceYear','')}"

def shell(title,desc,canonical,body,depth):
    p='../'*depth
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(desc)}"><meta name="robots" content="index,follow"><link rel="canonical" href="{canonical}"><meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{BASE_URL}/social-card.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(desc)}"><meta name="twitter:image" content="{BASE_URL}/social-card.png"><meta name="theme-color" content="#07111f"><link rel="stylesheet" href="{p}styles.css"><link rel="stylesheet" href="{p}enhancements.css"></head><body><header class="site-header"><div class="container nav"><a class="brand" href="{p}">RankMy<span>Income</span></a><nav class="nav-links"><a href="{p}#tiers">Tiers</a><a href="{p}countries/">Countries</a><a href="{p}about.html">About</a><a href="{p}methodology.html">Methodology</a><a href="{p}privacy.html">Privacy</a></nav></div></header>{body}<footer class="footer"><div class="container footer-row"><span>© 2026 RankMyIncome · Estimates for informational use</span><div class="footer-links"><a href="{p}about.html">About</a><a href="{p}methodology.html">Methodology</a><a href="{p}privacy.html">Privacy</a></div></div></footer></body></html>'''

def table(c):
    pts={round(float(p),6):float(v) for p,v in c.get('thresholds',[])}; cur=c.get('currency',''); sym=c.get('symbol') or cur; rows=[]
    for p in SHOW:
        if p in pts: rows.append(f'<tr><th scope="row">Top {100-p:g}%</th><td>{esc(fmt(pts[p],sym,cur))}</td></tr>')
    if not rows: return ''
    return f'''<section class="country-data-section"><h2>Income thresholds in this dataset</h2><p>Selected WID threshold points used by the calculator for this country. These are statistical pre-tax national-income thresholds, not salary cutoffs.</p><div class="threshold-table-wrap"><table class="threshold-table"><thead><tr><th>Approximate rank</th><th>Annual threshold</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div><p class="country-data-note">Income distribution year: {esc(c.get('dataYear','—'))}. PPP conversion year used for the worldwide comparison: {esc(c.get('pppYear','—'))}.</p></section>'''

def country_page(code,c,meta):
    name=c['name']; cur=c.get('currency',''); sym=c.get('symbol') or cur; fl=flag(code); canonical=f'{BASE_URL}/countries/{slugify(name)}/'; title=f'{name} Income Percentile Calculator — RankMyIncome'; desc=f"Estimate how annual pre-tax income ranks in {name} and worldwide, with selected {c.get('dataYear','')} WID income thresholds."
    schema=json.dumps({'@context':'https://schema.org','@type':'WebPage','name':f'{name} Income Percentile Calculator','url':canonical,'description':desc,'isPartOf':{'@type':'WebSite','name':'RankMyIncome','url':BASE_URL+'/'}},ensure_ascii=False)
    body=f'''<main class="container country-landing"><div class="eyebrow">{esc(fl)} {esc(code)} · Income percentile</div><h1>{esc(name)} income percentile calculator</h1><p class="lead">Enter an annual pre-tax income to estimate its percentile within {esc(name)} and compare it with the worldwide distribution.</p><a class="country-cta" href="../../?country={esc(code)}">Check my {esc(name)} income rank →</a><div class="country-facts"><div class="country-fact"><span>Country</span><strong>{esc(fl)} {esc(name)}</strong></div><div class="country-fact"><span>Input currency</span><strong>{esc(sym)} · {esc(cur)}</strong></div><div class="country-fact"><span>Data status</span><strong>{esc(source_label(meta,c))}</strong></div></div>{table(c)}<div class="country-copy"><h2>What does the calculator compare?</h2><p>The country result compares the entered income with WID percentile thresholds for {esc(name)} from {esc(c.get('dataYear','the listed year'))}. The worldwide result converts the value to USD PPP using the country's {esc(c.get('pppYear','listed'))} WID purchasing-power factor before comparing it with the worldwide distribution.</p><h2>What do the tiers mean?</h2><p>RankMyIncome tiers are presentation labels, not official classifications. Master starts at the top 5%, Grandmaster at the top 1%, and Challenger at the top 0.1%.</p><h2>How exact is the result?</h2><p>Published threshold points come from the active WID dataset. The calculator uses logarithmic interpolation between available points and extrapolation only outside the available threshold range. Results remain approximate.</p><p><a class="back" href="../../methodology.html">Read the full methodology →</a></p></div><script type="application/ld+json">{schema}</script></main>'''
    return shell(title,desc,canonical,body,2)

def directory(countries,meta):
    items=''.join(f'<a class="country-link" href="{slugify(c["name"])}/"><strong>{esc(flag(code))} {esc(c["name"])}</strong><small>{esc(code)} · {esc(c.get("currency",""))} · {esc(c.get("dataYear",""))}</small></a>' for code,c in sorted(countries.items(),key=lambda kv:kv[1]['name']))
    desc='Browse countries supported by the RankMyIncome income percentile calculator.'; body=f'<main class="container country-landing"><div class="eyebrow">Country calculators</div><h1>Income percentile calculators by country</h1><p class="lead">Choose a country to view its WID income data year, selected percentile thresholds, and open the calculator with that country preselected.</p><div class="country-directory">{items}</div><div class="country-copy"><h2>Current data status</h2><p>{esc(source_label(meta))}.</p></div></main>'; return shell('Country Income Percentile Calculators — RankMyIncome',desc,f'{BASE_URL}/countries/',body,1)

def sitemap(countries):
    urls=[('/','1.0'),('/countries/','0.7'),('/about.html','0.5'),('/methodology.html','0.5'),('/privacy.html','0.4')]+[(f'/countries/{slugify(c["name"])}/','0.6') for _,c in sorted(countries.items(),key=lambda kv:kv[1]['name'])]; rows='\n'.join(f'  <url><loc>{BASE_URL}{p}</loc><priority>{pr}</priority></url>' for p,pr in urls); return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}\n</urlset>\n'

def main():
    data=json.loads(DATA_PATH.read_text(encoding='utf-8')); countries=data['countries']; meta=data['meta']; COUNTRIES_DIR.mkdir(parents=True,exist_ok=True); expected={slugify(c['name']) for c in countries.values()}
    for path in COUNTRIES_DIR.iterdir():
        if path.is_dir() and path.name not in expected and (path/'index.html').exists():
            try:(path/'index.html').unlink(); path.rmdir()
            except OSError:pass
    (COUNTRIES_DIR/'index.html').write_text(directory(countries,meta),encoding='utf-8')
    for code,c in countries.items():
        d=COUNTRIES_DIR/slugify(c['name']); d.mkdir(parents=True,exist_ok=True); (d/'index.html').write_text(country_page(code,c,meta),encoding='utf-8')
    (ROOT/'sitemap.xml').write_text(sitemap(countries),encoding='utf-8'); print(f'Generated {len(countries)} country pages + directory + sitemap')

if __name__=='__main__': main()
