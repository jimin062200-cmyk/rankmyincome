#!/usr/bin/env python3
import html, json, re, unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; DATA_PATH=ROOT/'data'/'income-data.json'; COUNTRIES_DIR=ROOT/'countries'; BASE_URL='https://rankmyincome.com'; SHOW=[50,75,90,95,99]
LOCALIZED=[('/ko/','0.8'),('/ja/','0.8'),('/zh/','0.8'),('/es/','0.8'),('/fr/','0.8'),('/de/','0.8'),('/pt/','0.8')]
ADSENSE='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2948191504774582" crossorigin="anonymous"></script>'

def slugify(name):
    name=re.sub(r"[’'`´]",'-',name); text=unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode('ascii').lower(); return re.sub(r'[^a-z0-9]+','-',text).strip('-') or 'country'
def esc(v): return html.escape(str(v),quote=True)
def flag(code): return ''.join(chr(127397+ord(c)) for c in str(code).upper()) if len(str(code))==2 and str(code).isalpha() else ''
def fmt(v,symbol,currency):
    v=float(v); n=f'{v/1e9:.2f}B' if v>=1e9 else f'{v/1e6:.2f}M' if v>=1e6 else f'{v/1e3:.1f}K' if v>=1e3 else f'{v:,.0f}'; pre=symbol if symbol and len(symbol)<=4 else ''; return f'{pre}{n} {currency}'.strip()
def source_label(meta,c=None):
    if meta.get('status')!='production': return 'Preview data — statistical results are not yet for public use'
    return f"{meta.get('source','Production data')} · income {c.get('dataYear','—')} · PPP {c.get('pppYear','—')}" if c else f"{meta.get('source','Production data')} · world reference {meta.get('referenceYear','')}"
def points(c): return {round(float(p),6):float(v) for p,v in c.get('thresholds',[])}
def threshold(c,p): return points(c).get(p)

def shell(title,desc,canonical,body,depth):
    p='../'*depth
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{canonical}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{BASE_URL}/social-card.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(desc)}"><meta name="twitter:image" content="{BASE_URL}/social-card.png"><meta name="theme-color" content="#07111f"><link rel="stylesheet" href="{p}styles.css"><link rel="stylesheet" href="{p}enhancements.css">{ADSENSE}</head><body><header class="site-header"><div class="container nav"><a class="brand" href="{p}" aria-label="RankMyIncome home">RankMy<span>Income</span></a><nav class="nav-links"><a href="{p}#tiers">Tiers</a><a href="{p}countries/">Countries</a><a href="{p}about.html">About</a><a href="{p}methodology.html">Methodology</a><a href="{p}privacy.html">Privacy</a></nav></div></header>{body}<footer class="footer"><div class="container footer-row"><span>© 2026 RankMyIncome · Estimates for informational use</span><div class="footer-links"><a href="{p}about.html">About</a><a href="{p}methodology.html">Methodology</a><a href="{p}privacy.html">Privacy</a></div></div></footer></body></html>'''

def table(c):
    pts=points(c); cur=c.get('currency',''); sym=c.get('symbol') or cur; rows=[]
    for p in SHOW:
        if p in pts: rows.append(f'<tr><th scope="row">Top {100-p:g}%</th><td>{esc(fmt(pts[p],sym,cur))}</td></tr>')
    if not rows:return ''
    return f'''<section class="country-data-section"><h2>{esc(c['name'])} income thresholds</h2><p>These selected WID threshold points show the approximate annual pre-tax national income needed to reach several positions in the {esc(c['name'])} distribution.</p><div class="threshold-table-wrap"><table class="threshold-table"><thead><tr><th>Approximate rank</th><th>Annual threshold</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div><p class="country-data-note">Income distribution year: {esc(c.get('dataYear','—'))}. PPP conversion year used for the worldwide comparison: {esc(c.get('pppYear','—'))}.</p></section>'''

def country_page(code,c,meta,neighbors):
    name=c['name']; cur=c.get('currency',''); sym=c.get('symbol') or cur; fl=flag(code); canonical=f'{BASE_URL}/countries/{slugify(name)}/'; title=f'{name} Income Percentile & Top 1% Calculator — RankMyIncome'; desc=f"See {name} income thresholds for the top 50%, 25%, 10%, 5% and 1%, then estimate how your annual pre-tax income ranks locally and worldwide using WID data."
    pts=points(c); p50=pts.get(50); p90=pts.get(90); p95=pts.get(95); p99=pts.get(99)
    facts=[]
    if p50 is not None:facts.append(f'In this dataset, the 50th-percentile threshold is approximately <strong>{esc(fmt(p50,sym,cur))}</strong> per year.')
    if p90 is not None:facts.append(f'The top 10% threshold is approximately <strong>{esc(fmt(p90,sym,cur))}</strong>.')
    if p95 is not None:facts.append(f'The top 5% threshold is approximately <strong>{esc(fmt(p95,sym,cur))}</strong>.')
    if p99 is not None:facts.append(f'The top 1% threshold is approximately <strong>{esc(fmt(p99,sym,cur))}</strong>.')
    summary=' '.join(facts)
    related=''.join(f'<a class="country-link" href="../{slugify(n[1]["name"])}/"><strong>{esc(flag(n[0]))} {esc(n[1]["name"])}</strong><small>{esc(n[0])} · {esc(n[1].get("currency",""))}</small></a>' for n in neighbors)
    schema=json.dumps({'@context':'https://schema.org','@type':'WebPage','name':f'{name} Income Percentile Calculator','url':canonical,'description':desc,'dateModified':'2026-10-12','isPartOf':{'@type':'WebSite','name':'RankMyIncome','url':BASE_URL+'/'},'about':{'@type':'Country','name':name}},ensure_ascii=False)
    body=f'''<main class="container country-landing"><nav class="country-breadcrumb" aria-label="Breadcrumb"><a href="../../">Home</a> › <a href="../">Countries</a> › <span>{esc(name)}</span></nav><div class="eyebrow">{esc(fl)} {esc(code)} · {esc(c.get('dataYear',''))} income data</div><h1>{esc(name)} income percentile calculator</h1><p class="lead">Find out roughly where an annual pre-tax income sits in {esc(name)}. The calculator compares your value with WID income-distribution thresholds and also estimates a worldwide rank using purchasing-power adjustment.</p><a class="country-cta" href="../../?country={esc(code)}">Calculate my {esc(name)} income percentile →</a><div class="country-facts"><div class="country-fact"><span>Country</span><strong>{esc(fl)} {esc(name)}</strong></div><div class="country-fact"><span>Input currency</span><strong>{esc(sym)} · {esc(cur)}</strong></div><div class="country-fact"><span>Dataset</span><strong>{esc(source_label(meta,c))}</strong></div></div>{table(c)}<div class="country-copy"><h2>What income is considered high in {esc(name)}?</h2><p>{summary or 'Use the threshold table above to compare annual pre-tax income with the available percentile points in this dataset.'} These figures describe the statistical income concept used by WID and should not be read as take-home salary or a legal definition of income class.</p><h2>How the {esc(name)} percentile estimate works</h2><p>RankMyIncome compares the amount you enter with published WID pre-tax national-income thresholds for equal-split adults. When your income falls between two available threshold points, the calculator estimates the percentile with logarithmic interpolation. Values beyond the published range require extrapolation and are therefore more uncertain.</p><h2>Local rank vs worldwide rank</h2><p>The {esc(name)} result uses the local distribution directly. For the worldwide result, the entered {esc(cur)} amount is converted to a common USD-PPP basis using WID's purchasing-power factor for the listed year, then compared with the WID worldwide distribution. This is different from converting money with a market exchange rate.</p><h2>What do RankMyIncome tiers mean?</h2><p>The tier names are a visual ranking system created by RankMyIncome, not official WID categories. Diamond begins at the top 10%, Master at the top 5%, Grandmaster at the top 1%, and Challenger at the top 0.1%.</p><h2>Data notes</h2><p>The active {esc(name)} income distribution is from {esc(c.get('dataYear','the listed year'))}, while the purchasing-power conversion uses the {esc(c.get('pppYear','listed'))} factor. Income distributions and PPP factors can be revised, so the calculator should be treated as an estimate rather than an exact statement about an individual.</p><p><a class="back" href="../../methodology.html">Read the full methodology →</a></p><h2>Explore other country calculators</h2><div class="country-directory country-related">{related}</div><p><a class="back" href="../">Browse all supported countries →</a></p></div><script type="application/ld+json">{schema}</script></main>'''
    return shell(title,desc,canonical,body,2)

def directory(countries,meta):
    items=''.join(f'<a class="country-link" href="{slugify(c["name"])}/"><strong>{esc(flag(code))} {esc(c["name"])}</strong><small>{esc(code)} · {esc(c.get("currency",""))} · {esc(c.get("dataYear",""))}</small></a>' for code,c in sorted(countries.items(),key=lambda kv:kv[1]['name']))
    desc='Browse 200+ country income percentile calculators with WID income thresholds and worldwide comparisons.'; body=f'<main class="container country-landing"><div class="eyebrow">Country calculators</div><h1>Income percentile calculators by country</h1><p class="lead">Browse supported countries to see selected WID income thresholds, data years and currencies, then calculate an estimated local and worldwide income percentile.</p><div class="country-directory">{items}</div><div class="country-copy"><h2>How to use these country pages</h2><p>Each page shows country-specific threshold values from the active dataset and links directly to the calculator with that country selected. Thresholds are annual pre-tax national-income figures for the WID income concept used by RankMyIncome.</p><h2>Current data status</h2><p>{esc(source_label(meta))}.</p></div></main>'; return shell('Income Percentile Calculators by Country — RankMyIncome',desc,f'{BASE_URL}/countries/',body,1)

def sitemap(countries):
    urls=[('/','1.0')]+LOCALIZED+[('/countries/','0.8'),('/about.html','0.5'),('/methodology.html','0.6'),('/privacy.html','0.4')]+[(f'/countries/{slugify(c["name"])}/','0.7') for _,c in sorted(countries.items(),key=lambda kv:kv[1]['name'])]
    rows='\n'.join(f'  <url><loc>{BASE_URL}{p}</loc><priority>{pr}</priority></url>' for p,pr in urls); return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}\n</urlset>\n'

def main():
    data=json.loads(DATA_PATH.read_text(encoding='utf-8')); countries=data['countries']; meta=data['meta']; COUNTRIES_DIR.mkdir(parents=True,exist_ok=True); expected={slugify(c['name']) for c in countries.values()}; ordered=sorted(countries.items(),key=lambda kv:kv[1]['name'])
    for path in COUNTRIES_DIR.iterdir():
        if path.is_dir() and path.name not in expected and (path/'index.html').exists():
            try:(path/'index.html').unlink(); path.rmdir()
            except OSError:pass
    (COUNTRIES_DIR/'index.html').write_text(directory(countries,meta),encoding='utf-8')
    total=len(ordered)
    for i,(code,c) in enumerate(ordered):
        offsets=[-2,-1,1,2]; neighbors=[]
        for off in offsets:
            j=(i+off)%total
            if ordered[j][0]!=code and ordered[j] not in neighbors:neighbors.append(ordered[j])
        d=COUNTRIES_DIR/slugify(c['name']); d.mkdir(parents=True,exist_ok=True); (d/'index.html').write_text(country_page(code,c,meta,neighbors),encoding='utf-8')
    (ROOT/'sitemap.xml').write_text(sitemap(countries),encoding='utf-8'); print(f'Generated {len(countries)} country pages + directory + sitemap')

if __name__=='__main__': main()
