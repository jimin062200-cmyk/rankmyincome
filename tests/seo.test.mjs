import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const targets=JSON.parse(fs.readFileSync('content/seo-targets.json'));
const data=JSON.parse(fs.readFileSync('data/income-data.json'));
const slug=s=>s.replace(/[’'`´]/g,'-').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
test('exactly 20 existing country pages expose honest static data and matching Dataset markup',()=>{
 assert.equal(targets.length,20);assert.equal(new Set(targets).size,20);
 for(const route of targets){
  const html=fs.readFileSync('dist'+route+'index.html','utf8'),doc=new JSDOM(html).window.document;
  const c=Object.values(data.countries).find(c=>route.endsWith('/'+slug(c.name)+'/'));
  const graphs=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
  const ds=graphs.find(g=>g['@type']==='Dataset');assert.ok(ds,route);assert.equal(ds.temporalCoverage,String(c.dataYear));
  assert.equal(doc.querySelectorAll('h1').length,1);assert.ok(doc.querySelector('[data-seo-answer]'));assert.ok(doc.querySelector('#data-sources'));assert.ok(doc.querySelector('time[datetime="2026-10-24"]'));
  assert.ok(doc.title.includes(c.dataYear));assert.equal(doc.querySelector('link[rel="canonical"]').href,'https://rankmyincome.com'+route);
  for(const p of [50,90,95,99]){const value=c.thresholds.find(([n])=>n===p)[1];assert.equal(ds.variableMeasured.find(v=>v.name===`p${p} annual income threshold`).value,value);const formatted=new Intl.NumberFormat(doc.documentElement.lang,{style:'currency',currency:c.currency,currencyDisplay:'code',maximumFractionDigits:0}).format(value);assert.ok(doc.querySelector('main').textContent.includes(formatted),`${route}: ${p}`);}
  assert.ok(doc.querySelector('.lead').textContent.includes(new Intl.NumberFormat(doc.documentElement.lang,{style:'currency',currency:c.currency,currencyDisplay:'code',maximumFractionDigits:0}).format(c.thresholds.find(([n])=>n===50)[1])));
  assert.ok(!html.includes('FAQPage'));assert.ok(![...doc.scripts].some(s=>/app\.|growth\./.test(s.src)),route);
 }
});
test('every target receives descriptive links from all six localized hubs',()=>{
 for(const route of targets){const lang=route.split('/')[1]==='countries'?'':route.split('/')[1]+'/';for(const hub of ['tools/','rankings/','rankings/median-income/','rankings/top-10-income/','rankings/top-5-income/','rankings/top-1-income/']){const doc=new JSDOM(fs.readFileSync('dist/'+lang+hub+'index.html','utf8')).window.document;assert.ok(doc.querySelector(`[data-seo-priority-links] a[href="${route}"]`),`${lang}${hub} -> ${route}`);}}
});
