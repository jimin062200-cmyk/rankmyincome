import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {searchCountries} from '../content/search-discovery.mjs';
import {verifiedLastmod} from '../scripts/search-freshness.mjs';
const data=JSON.parse(fs.readFileSync('data/income-data.json'));
const updates=JSON.parse(fs.readFileSync('content/search-updates.json'));
const slug=s=>s.replace(/[’'`´]/g,'-').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const home=l=>l==='en'?'/':`/${l}/`;
const read=route=>fs.readFileSync('dist'+route+'index.html','utf8');
test('17 existing country answers and peer tables match unchanged WID source values',()=>{
 assert.equal(Object.keys(searchCountries).length,17);
 for(const [key,spec] of Object.entries(searchCountries)){
  const [l,code]=key.split(':'),c=data.countries[code],route=home(l)+`countries/${slug(c.name)}/`;
  const dom=new JSDOM(read(route)),doc=dom.window.document;
  assert.ok(doc.querySelector('[data-search-answer]'),route);
  const ds=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'].find(x=>x['@type']==='Dataset');
  assert.equal(ds.temporalCoverage,String(c.dataYear));assert.equal(ds.url,'https://rankmyincome.com'+route+'#search-sources');
  for(const p of [50,90,95,99])assert.equal(ds.variableMeasured.find(v=>v.name===`p${p} annual income threshold`).value,c.thresholds.find(([n])=>n===p)[1]);
  assert.ok(doc.querySelector('.lead').textContent.includes(new Intl.NumberFormat(doc.documentElement.lang,{style:'currency',currency:c.currency,currencyDisplay:'code',maximumFractionDigits:0}).format(c.thresholds.find(([p])=>p===50)[1])));
  const rows=[...doc.querySelectorAll('[data-search-comparison] tbody tr')];assert.equal(rows.length,4);
  [code,...spec.peers].forEach((peer,i)=>{const v=data.countries[peer];assert.equal(rows[i].querySelector('a').getAttribute('href'),home(l)+`countries/${slug(v.name)}/`);assert.equal(rows[i].cells[1].textContent,new Intl.NumberFormat(l,{maximumFractionDigits:2}).format(v.thresholds.find(([p])=>p===50)[1]/v.pppPerWorldUnit));assert.equal(rows[i].cells[2].textContent,`${v.dataYear} / ${v.pppYear}`);});
  for(const hub of ['countries/','tools/','rankings/'])assert.ok(read(home(l)+hub).includes(`href="${route}"`));
  assert.equal(doc.querySelectorAll('script[src*="adsbygoogle.js"]').length,1);assert.ok(!/FAQPage/.test(read(route)));dom.window.close();
 }
});
test('40 ranking entry points have distinct descriptions and 32 tables link to sibling thresholds',()=>{
 const descriptions=new Set();
 for(const l of ['en','ko','ja','zh','es','fr','de','pt'])for(const r of ['','median-income/','top-10-income/','top-5-income/','top-1-income/']){
  const route=home(l)+'rankings/'+r,dom=new JSDOM(read(route)),doc=dom.window.document;
  const description=doc.querySelector('meta[name="description"]').content;assert.ok(!descriptions.has(description),route);descriptions.add(description);
  assert.equal(doc.querySelector('.lead').textContent,description);assert.ok(description.includes('208'));assert.ok(!description.includes('undefined'));
  assert.equal(doc.querySelector('.country-breadcrumb a:last-child').getAttribute('href'),home(l)+'rankings/');
  if(r){assert.equal(doc.querySelectorAll('[data-ranking-links] a').length,3);assert.equal(doc.querySelectorAll('#ranking-table tbody tr').length,208);assert.ok(doc.querySelector('[data-ranking-definition]'));}
  dom.window.close();
 }
});
test('sitemap dates are scoped to reviewed content and cannot be refreshed by a rebuild',()=>{
 const xml=fs.readFileSync('dist/sitemap.xml','utf8');assert.equal(Object.keys(updates).length,67);assert.equal((xml.match(/<lastmod>/g)||[]).length,67);
 for(const [route,entry] of Object.entries(updates)){
  const html=read(route);assert.equal(verifiedLastmod(html,entry),entry.lastmod,route);
  assert.ok(xml.includes(`<loc>https://rankmyincome.com${route}</loc><lastmod>${entry.lastmod}</lastmod>`));
  assert.equal(verifiedLastmod(html.replace('<h1>','<h1>Changed '),entry),null);
 }
 assert.ok(!/<loc>https:\/\/rankmyincome.com\/<\/loc><lastmod>/.test(xml));
});
