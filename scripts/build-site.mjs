import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {TIERS,incomeForTop} = require('../calculator-core.js');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'dist');
const BASE='https://rankmyincome.com';
const langs={en:['en','English'],ko:['ko','한국어'],ja:['ja','日本語'],zh:['zh-CN','简体中文'],es:['es','Español'],fr:['fr','Français'],de:['de','Deutsch'],pt:['pt-BR','Português']};
const source=fs.readFileSync(path.join(ROOT,'data/income-data.json'),'utf8');
const data=JSON.parse(source), version=createHash('sha256').update(source).digest('hex').slice(0,16);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const home=l=>l==='en'?'/':`/${l}/`;
const slug=s=>s.replace(/[’'`´]/g,'-').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'country';
const t=(d,k,vars={})=>d[k].replace(/\{(\w+)\}/g,(_,n)=>vars[n]??`{${n}}`);
const dicts=Object.fromEntries(Object.keys(langs).map(l=>[l,JSON.parse(fs.readFileSync(path.join(ROOT,`locales/${l}.json`),'utf8'))]));
function validate(){
 for(const [label,c] of [['world',data.world],...Object.entries(data.countries)]){
  if(!Array.isArray(c.thresholds)||c.thresholds.length<2)throw Error(`Missing thresholds: ${label}`);
  let p=-1,v=-Infinity;
  for(const row of c.thresholds){if(row.length!==2||!row.every(Number.isFinite)||row[0]<=p||row[0]<0||row[0]>=100||row[1]<v||row[1]<=0)throw Error(`Invalid threshold: ${label} ${row}`);[p,v]=row;}
  if(label!=='world'&&(!Number.isFinite(c.pppPerWorldUnit)||c.pppPerWorldUnit<=0||!Number.isInteger(c.dataYear)||!Number.isInteger(c.pppYear)||!c.name||!c.currency))throw Error(`Invalid metadata: ${label}`);
 }
 const names=Object.values(data.countries).map(c=>slug(c.name));if(new Set(names).size!==names.length)throw Error('Duplicate country slug');
 for(const [l,d] of Object.entries(dicts))if(Object.keys(d).sort().join()!==Object.keys(dicts.en).sort().join()||Object.values(d).some(v=>!v))throw Error(`Incomplete locale: ${l}`);
}
validate();fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const urls=[];
function write(p,content){const f=path.join(OUT,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,content);}
const assets={};
for(const name of ['styles.css','enhancements.css','design.css','app.js','site.js','calculator-core.js']){
 const content=fs.readFileSync(path.join(ROOT,name));const hash=createHash('sha256').update(content).digest('hex').slice(0,12);const ext=path.extname(name);const dest=`assets/${path.basename(name,ext)}.${hash}${ext}`;write(dest,content);assets[name]='/'+dest;
}
for(const name of ['logo.svg','favicon.svg','social-card.png','ads.txt','robots.txt'])write(name,fs.readFileSync(path.join(ROOT,name)));
function regionName(l,code){return new Intl.DisplayNames([langs[l][0]],{type:'region'}).of(code)||data.countries[code].name;}
function money(l,value,currency){return new Intl.NumberFormat(langs[l][0],{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:0}).format(value);}
function nav(l,suffix=''){
 const d=dicts[l],h=home(l);
 const links=`<a href="${h}#tiers">${esc(d.nav[0])}</a><a href="${h}countries/">${esc(d.nav[1])}</a><a href="/about.html" lang="en">${esc(d.nav[2])}${l==='en'?'':` (${esc(d.english)})`}</a><a href="/methodology.html" lang="en">${esc(d.nav[3])}${l==='en'?'':` (${esc(d.english)})`}</a><a href="/privacy.html" lang="en">${esc(d.nav[4])}${l==='en'?'':` (${esc(d.english)})`}</a>`;
 return `<a class="skip-link" href="#main">${esc(d.skip)}</a><header class="site-header"><div class="container nav"><a class="brand" href="${h}" aria-label="RankMyIncome">RankMy<span>Income</span></a><nav class="desktop-nav" aria-label="${esc(d.menu)}">${links}</nav><details class="mobile-nav"><summary>${esc(d.menu)}</summary><nav class="nav-links" aria-label="${esc(d.menu)}">${links}</nav></details><details class="language-picker"><summary class="language-button"><span aria-hidden="true">◎</span> ${esc(langs[l][1])}</summary><nav class="language-menu" aria-label="Language">${Object.entries(langs).map(([k,[tag,name]])=>`<a data-language-link class="language-option" href="${home(k)+suffix}" lang="${tag}" hreflang="${tag}"${k===l?' aria-current="page"':''}>${name}</a>`).join('')}</nav></details></div></header>`;
}
function footer(l){const d=dicts[l];return `<footer class="footer"><div class="container footer-row"><span>${esc(d.footer)}</span><div class="footer-links"><a href="${home(l)}countries/">${esc(d.nav[1])}</a><a href="/about.html" lang="en">${esc(d.nav[2])}</a><a href="/methodology.html" lang="en">${esc(d.nav[3])}</a><a href="/privacy.html" lang="en">${esc(d.nav[4])}</a><a href="/contact.html" lang="en">Contact (EN)</a></div></div></footer>`;}
function shell(l,title,description,suffix,body,{calculator=false,schema=null,alternates=true,noindex=false}={}){
 const canonical=BASE+home(l)+suffix;
 if(!noindex)urls.push(canonical);
 return `<!doctype html><html lang="${langs[l][0]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${noindex?'noindex,follow':'index,follow,max-image-preview:large'}"><link rel="canonical" href="${canonical}">${alternates?Object.entries(langs).map(([k,[tag]])=>`<link rel="alternate" hreflang="${tag}" href="${BASE+home(k)+suffix}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${BASE+'/'+suffix}">`:''}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#07111f"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:locale" content="${langs[l][0].replace('-','_')}"><meta property="og:image" content="${BASE}/social-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="RankMyIncome"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${BASE}/social-card.png"><link rel="stylesheet" href="${assets['styles.css']}"><link rel="stylesheet" href="${assets['enhancements.css']}"><link rel="stylesheet" href="${assets['design.css']}"><meta name="google-adsense-account" content="ca-pub-2948191504774582"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2948191504774582" crossorigin="anonymous"></script>${schema?`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`:''}</head><body data-locale="${l}"${calculator?` data-source="/data/${version}/"`:''}>${nav(l,alternates?suffix:'')}${body}${footer(l)}<script src="${assets['site.js']}" defer></script>${calculator?`<script id="ui-strings" type="application/json">${JSON.stringify(dicts[l]).replace(/</g,'\\u003c')}</script><script src="${assets['calculator-core.js']}" defer></script><script src="${assets['app.js']}" defer></script>`:''}</body></html>\n`;
}
function countryLink(l,code){const c=data.countries[code];return `<a class="country-link" href="${home(l)}countries/${slug(c.name)}/" data-search="${esc(`${regionName(l,code)} ${c.name} ${code} ${c.currency}`)}"><strong>${esc(regionName(l,code))}</strong><small>${code} · ${c.currency} · ${c.dataYear}</small></a>`;}
const popular=['US','KR','MY','JP','GB','SG'];
const template=fs.readFileSync(path.join(ROOT,'templates/home.html'),'utf8');
for(const [l,d] of Object.entries(dicts)){
 const vars={...Object.fromEntries(Object.entries(d).filter(([,v])=>typeof v==='string').map(([k,v])=>[k,esc(v)])),hero:d.hero,home:home(l),countryCount:Object.keys(data.countries).length,languageCount:Object.keys(langs).length,methodLink:esc(d.nav[3]+(l==='en'?'':` (${d.english})`)),privacyLink:esc(d.nav[4]+(l==='en'?'':` (${d.english})`))};
 vars.cards=['country','world'].map(p=>`<article id="${p}-card" class="rank-card"><div class="card-label"><span id="${p}-label">${esc(d[p==='world'?'world':'country'])}</span><span id="${p}-year" class="data-year"></span></div><div class="emblem" aria-hidden="true"><span id="${p}-mark" class="emblem-mark"></span></div><div id="${p}-tier" class="tier-name"></div><div id="${p}-top" class="top-percent"></div><div id="${p}-better" class="better"></div><div class="progress-block"><div class="progress-meta">${esc(d.progress)}</div><div id="${p}-progressbar" class="progress" role="progressbar" aria-label="${esc(d.progress)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="${p}-progress"></span></div><div id="${p}-next" class="next-tier"></div><p id="${p}-range-note" class="range-note" hidden>${esc(d.extrapolated)}</p></div></article>`).join('');
 vars.targetOptions=[50,25,10,5,1,.1].map(n=>`<option value="${n}">${esc(t(d,'top',{n:new Intl.NumberFormat(langs[l][0]).format(n)}))}</option>`).join('');
 vars.tierList=[...TIERS].reverse().map(x=>`<div class="tier-chip" style="--tier:${x.color}"><div class="mini-emblem" aria-hidden="true"><span>${x.mark}</span></div><strong>${x.name}</strong><span>${esc(t(d,'top',{n:x.max}))}</span></div>`).join('');
 vars.popular=popular.map(c=>countryLink(l,c)).join('');
 const body=template.replace(/\{\{(\w+)\}\}/g,(_,k)=>{if(!(k in vars))throw Error(`Missing template: ${k}`);return vars[k]});
 write(home(l).slice(1)+'index.html',shell(l,d.title,d.description,'',body,{calculator:true,schema:{'@context':'https://schema.org','@type':'WebApplication',name:'RankMyIncome',url:BASE+home(l),inLanguage:langs[l][0],applicationCategory:'FinanceApplication',operatingSystem:'Web',description:d.description,isAccessibleForFree:true}}));
 const ordered=Object.entries(data.countries).sort((a,b)=>regionName(l,a[0]).localeCompare(regionName(l,b[0]),langs[l][0]));
 const directory=`<main id="main" class="container country-landing"><h1>${esc(d.directoryTitle)}</h1><p class="lead">${esc(d.directoryIntro)}</p><label for="directory-search">${esc(d.searchDirectory)}</label><input id="directory-search" class="directory-search" type="search" placeholder="${esc(d.search)}"><p id="directory-empty" role="status" hidden>${esc(d.empty)}</p><div class="country-directory">${ordered.map(([c])=>countryLink(l,c)).join('')}</div><h2>${esc(d.methodTitle)}</h2><p>${esc(d.methodText)}</p><p>${esc(d.source)}: <a href="https://wid.world/">WID.world</a> · ${data.meta.referenceYear}</p></main>`;
 write(home(l).slice(1)+'countries/index.html',shell(l,d.directoryTitle+' — RankMyIncome',d.directoryIntro,'countries/',directory));
 for(const [code,c] of Object.entries(data.countries)){
  const name=regionName(l,code), suffix=`countries/${slug(c.name)}/`, canonical=BASE+home(l)+suffix;
  const p=c.thresholds, exact=x=>p.find(([n])=>n===x)?.[1];
  const title=t(d,'countryTitle',{name}), intro=t(d,'countryIntro',{name,top10:money(l,exact(90),c.currency),top1:money(l,exact(99),c.currency)});
  // Related pages use similar median purchasing power, a meaningful comparison,
  // rather than adjacency in an English alphabet.
  const median=exact(50)/c.pppPerWorldUnit;
  const related=Object.entries(data.countries).filter(([k])=>k!==code).map(([k,v])=>[k,Math.abs(Math.log((v.thresholds.find(([n])=>n===50)[1]/v.pppPerWorldUnit)/median))]).sort((a,b)=>a[1]-b[1]).slice(0,4).map(([k])=>countryLink(l,k)).join('');
  const rows=[50,75,90,95,99,99.9].filter(x=>exact(x)!==undefined).map(x=>`<tr><th scope="row">${esc(t(d,'top',{n:new Intl.NumberFormat(langs[l][0],{maximumFractionDigits:1}).format(100-x)}))}</th><td>${esc(money(l,exact(x),c.currency))}</td><td>${esc(money(l,exact(x)/12,c.currency))}</td></tr>`).join('');
  const status=data.meta.status==='production'?`WID.world · ${c.dataYear}`:d.preview;
  const body=`<main id="main" class="container country-landing"><nav class="country-breadcrumb" aria-label="Breadcrumb"><a href="${home(l)}">RankMyIncome</a> › <a href="${home(l)}countries/">${esc(d.nav[1])}</a> › <span aria-current="page">${esc(name)}</span></nav><div class="eyebrow">${code} · ${c.currency} · ${c.dataYear}</div><h1>${esc(title)}</h1><p class="lead">${esc(intro)}</p><a class="country-cta" href="${home(l)}?country=${code}">${esc(d.calculate)} →</a><div class="country-facts"><div class="country-fact"><span>${esc(d.country)}</span><strong>${esc(name)}</strong></div><div class="country-fact"><span>${esc(d.income)}</span><strong>${esc(c.currency)}</strong></div><div class="country-fact"><span>${esc(d.source)}</span><strong>${esc(status)}</strong></div></div><section class="country-data-section"><h2>${esc(t(d,'thresholdTitle',{name}))}</h2><p>${esc(d.thresholdIntro)}</p><div class="threshold-table-wrap" role="region" aria-label="${esc(d.thresholdTitle.replace('{name}',name))}" tabindex="0"><table class="threshold-table"><caption class="sr-only">${esc(t(d,'thresholdTitle',{name}))}</caption><thead><tr><th scope="col">${esc(d.rank)}</th><th scope="col">${esc(d.annual)} (${esc(c.currency)})</th><th scope="col">${esc(d.monthly)}</th></tr></thead><tbody>${rows}</tbody></table></div><p class="country-data-note">${esc(t(d,'dataNote',{year:c.dataYear,ppp:c.pppYear,world:data.world.year}))}</p></section><section class="country-copy"><h2>${esc(d.methodTitle)}</h2><p>${esc(d.methodText)}</p><p>${esc(d.extrapolated)}</p><p>${esc(d.compareNote)}</p><h2>${esc(d.tiers)}</h2><p>${esc(d.tierNote)}</p><p>Diamond: ${esc(t(d,'top',{n:10}))} · Master: ${esc(t(d,'top',{n:5}))} · Grandmaster: ${esc(t(d,'top',{n:1}))} · Challenger: ${esc(t(d,'top',{n:.1}))}</p><p>${esc(d.source)}: <a href="https://wid.world/">WID.world</a> · <a href="/methodology.html" lang="en">${esc(d.nav[3])} (${esc(d.english)})</a></p><h2>${esc(d.related)}</h2><div class="country-directory">${related}</div><a class="back" href="${home(l)}countries/">${esc(d.directoryTitle)} →</a></section></main>`;
  const schema={'@context':'https://schema.org','@graph':[{'@type':'WebPage',name:title,url:canonical,description:intro,inLanguage:langs[l][0],isPartOf:{'@type':'WebSite',name:'RankMyIncome',url:BASE+'/'},about:{'@type':'Country',name}}, {'@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'RankMyIncome',item:BASE+home(l)},{'@type':'ListItem',position:2,name:d.nav[1],item:BASE+home(l)+'countries/'},{'@type':'ListItem',position:3,name,item:canonical}]}]};
  write(home(l).slice(1)+suffix+'index.html',shell(l,title+' — RankMyIncome',intro,suffix,body,{schema}));
 }
}
// Retain all existing editorial content and public .html URLs.
for(const name of ['about','methodology','privacy','contact']){
 const src=fs.readFileSync(path.join(ROOT,`${name}.html`),'utf8');
 const title=src.match(/<title>([\s\S]*?)<\/title>/)[1];
 const description=src.match(/<meta name="description" content="([^"]+)"/)[1];
 let main=src.match(/<main\b[^>]*>[\s\S]*?<\/main>/)[0].replace('<main ','<main id="main" ').replace(/href="index.html/g,'href="/').replace(/href="(about|privacy|methodology|contact).html/g,'href="/$1.html');
 write(`${name}.html`,shell('en',title,description,`${name}.html`,main,{alternates:false}));
}
write('404.html',shell('en','Page not found — RankMyIncome','Return to the income percentile calculator.','404.html','<main id="main" class="container legal-page"><h1>Page not found</h1><p>This page may have moved.</p><a class="country-cta" href="/">Back to calculator</a> <a class="back" href="/countries/">Browse countries</a></main>',{noindex:true,alternates:false}));
const summary={meta:{...data.meta,version},world:data.world,countries:Object.fromEntries(Object.entries(data.countries).map(([k,c])=>[k,{...c,thresholds:undefined,slug:slug(c.name)}]))};
write(`data/${version}/index.json`,JSON.stringify(summary));
for(const [code,c] of Object.entries(data.countries))write(`data/${version}/${code}.json`,JSON.stringify(c));
// Keep the existing public dataset URL available for transparency and reuse.
write('data/income-data.json',JSON.stringify(data));
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>`<url><loc>${esc(u)}</loc></url>`).join('\n')+'\n</urlset>\n');
write('build-info.json',JSON.stringify({version,pages:urls.length,countries:Object.keys(data.countries).length,languages:Object.keys(langs),commit:process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA||'local'}));
console.log(`Built ${urls.length} indexable pages, ${Object.keys(data.countries).length} countries, ${Object.keys(langs).length} languages. Dataset ${version} (unchanged).`);
