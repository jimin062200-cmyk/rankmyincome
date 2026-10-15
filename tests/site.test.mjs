import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(path.join(d,f.name)):[path.join(d,f.name)]);
const files=walk(root),html=files.filter(f=>f.endsWith('.html'));
const pages=new Map(html.map(f=>[f,fs.readFileSync(f,'utf8')]));
const routes=new Map(html.map(f=>[('/'+path.relative(root,f)).replace(/index.html$/,''),f]));
const canonicals=new Set();
const locales=['en','ko','ja','zh-CN','es','fr','de','pt-BR'];
const data=JSON.parse(fs.readFileSync('data/income-data.json','utf8'));
const info=JSON.parse(fs.readFileSync(path.join(root,'build-info.json'),'utf8'));
function tags(s,name){return [...s.matchAll(new RegExp(`<${name}\\b[^>]*>`,'g'))].map(m=>m[0]);}
function attrs(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));}
test('every existing route plus all localized countries is built with unique metadata and valid structured data',()=>{
 assert.equal(info.pages,8*(208+2)+4);assert.equal(html.length,info.pages+1);
 for(const route of JSON.parse(fs.readFileSync('tests/fixtures/original-routes.json','utf8')))assert.ok(fs.existsSync(path.join(root,route)),`Original route removed: ${route}`);
 for(const [f,s] of pages){
  const loc=tags(s,'link').map(attrs).filter(a=>a.rel==='canonical');assert.equal(loc.length,1,f);assert.ok(!canonicals.has(loc[0].href),f);canonicals.add(loc[0].href);
  assert.equal(loc[0].href,'https://rankmyincome.com'+('/'+path.relative(root,f)).replace(/index.html$/,''),f);
  assert.equal(tags(s,'h1').length,1,f);assert.match(s,/<html lang="(en|ko|ja|zh-CN|es|fr|de|pt-BR)">/,f);assert.ok(!s.includes('<base '),f);
  assert.match(s,/<meta name="description" content="[^"]+">/,f);assert.match(s,/<meta property="og:url"/,f);assert.match(s,/<meta name="twitter:card"/,f);
  assert.ok(!s.includes('{{'),f);assert.ok(!/TOP 12\.0%|TOP 3\.0%/.test(s),f);
  for(const [,json]of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(json),f);
  const alternates=tags(s,'link').map(attrs).filter(a=>a.rel==='alternate');
  if(f.endsWith('index.html')){assert.equal(alternates.length,9,f);assert.deepEqual(alternates.map(a=>a.hreflang).sort(),[...locales,'x-default'].sort(),f);
   for(const a of alternates){const target=path.join(root,new URL(a.href).pathname,'index.html');assert.ok(fs.existsSync(target),a.href);const targetHTML=pages.get(target);assert.ok(targetHTML.includes(`href="${loc[0].href}"`),`No return link: ${a.href}`);}
  }
 }
});
test('all local links, fragment targets, scripts, styles and sitemap entries resolve',()=>{
 let links=0;
 for(const [f,s]of pages){
  const base='https://rankmyincome.com'+('/'+path.relative(root,f)).replace(/index.html$/,'');
  for(const [,value]of s.matchAll(/(?:href|src)="([^"]+)"/g)){
   if(/^(mailto:|data:|blob:)/.test(value))continue;
   const u=new URL(value.replace(/&amp;/g,'&'),base);if(u.origin!=='https://rankmyincome.com')continue;
   let target=path.join(root,decodeURIComponent(u.pathname));if(u.pathname.endsWith('/'))target=path.join(target,'index.html');
   assert.ok(fs.existsSync(target),`${path.relative(root,f)} -> ${value}`);
   if(u.hash&&target.endsWith('.html'))assert.ok(pages.get(target).includes(`id="${u.hash.slice(1)}"`),`${f} -> ${value}`);
   links++;
  }
 }
 const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 assert.equal(locs.length,info.pages);assert.equal(new Set(locs).size,info.pages);
 for(const u of locs){assert.ok(canonicals.has(u),u);assert.ok(!u.includes('?')&&!u.endsWith('404.html'));}
 console.log(`Validated ${links} local links/assets across ${pages.size} pages.`);
});
test('split payloads preserve the exact WID distributions and avoid the full 1.5 MB download',()=>{
 const indexPath=path.join(root,`data/${info.version}/index.json`),index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
 assert.deepEqual(index.world,data.world);assert.equal(Object.keys(index.countries).length,208);
 assert.ok(fs.statSync(indexPath).size<60000);
 for(const [code,c]of Object.entries(data.countries)){assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,`data/${info.version}/${code}.json`),'utf8')),c);assert.ok(!('thresholds'in index.countries[code]));}
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'data/income-data.json'),'utf8')),data);
});
test('generated locale controls are labeled, errors announced, navigation available and ads ID preserved',()=>{
 for(const l of ['','ko/','ja/','zh/','es/','fr/','de/','pt/']){
  const s=pages.get(path.join(root,l,'index.html'));
  for(const id of ['income','country-trigger','country-search','goal-target','compare-country'])assert.ok(s.includes(`for="${id}"`),l+id);
  assert.match(s,/id="error" class="error" role="alert"/);assert.match(s,/class="skip-link"/);assert.match(s,/<details class="mobile-nav">/);
  assert.match(s,/id="results"[^>]* hidden/);assert.match(s,/ca-pub-2948191504774582/);
 }
 assert.equal(fs.readFileSync('ads.txt','utf8'),fs.readFileSync(path.join(root,'ads.txt'),'utf8'));
 const cfg=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.equal(cfg.outputDirectory,'dist');assert.equal(cfg.buildCommand,'npm run check');assert.ok(!cfg.rewrites,'No blanket SPA rewrite turning missing pages into soft 404s');
 assert.ok(!files.some(f=>/\/tests\/|\/scripts\/|\/\.git\//.test(f)));
});
