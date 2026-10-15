// Read-only checks against the public deployment. No credentials or ad requests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';

const origin='https://rankmyincome.com';
const expected=process.env.EXPECTED_COMMIT || process.env.GITHUB_SHA;
assert.match(expected || '', /^[a-f0-9]{40}$/, 'Set EXPECTED_COMMIT to the full reviewed Git commit');
const attempts=Number(process.env.DEPLOY_ATTEMPTS || 20);
assert.ok(Number.isInteger(attempts)&&attempts>=1&&attempts<=40, 'Invalid DEPLOY_ATTEMPTS');
const report={origin,expectedCommit:expected,checks:[],checkedAt:new Date().toISOString()};
async function request(path,options={}) {
 const response=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(20000),...options});
 return {response,text:await response.text()};
}
async function check(path,fn) {
 const value=await request(path);await fn(value);report.checks.push({path,status:value.response.status});return value;
}
try {
 // Vercel and GitHub Actions build independently; wait only for the exact commit.
 let deployed=false;
 for(let i=0;i<attempts;i++) {
  try {
   const {response,text}=await request('/build-info.json',{headers:{'Cache-Control':'no-cache'}});
   const info=JSON.parse(text);
   if(response.ok&&info.commit===expected){report.build=info;deployed=true;break;}
  } catch(error){console.log(`Deployment not ready: ${error.message}`);}
  if(i+1<attempts)await new Promise(resolve=>setTimeout(resolve,15000));
 }
 assert.ok(deployed, `Production did not serve expected commit ${expected}`);
 const languages={en:'en',ko:'ko',ja:'ja',zh:'zh-CN',es:'es',fr:'fr',de:'de',pt:'pt-BR'};
 let homepage;
 const localeChecks=await Promise.allSettled(Object.entries(languages).map(async([locale,lang])=>{
  const home=locale==='en'?'/':`/${locale}/`;
  for(const route of [home,`${home}countries/`,`${home}countries/south-korea/`]) {
   const value=await check(route,({response,text})=>{
    assert.equal(response.status,200,route);
    assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag')||''), `${route}: HTTP noindex`);
    assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    const document=new JSDOM(text).window.document;
    assert.equal(document.documentElement.lang,lang,`${route}: language`);
    assert.equal(document.querySelector('link[rel="canonical"]')?.href,origin+route,`${route}: canonical`);
    assert.ok(!/noindex/i.test(document.querySelector('meta[name="robots"]')?.content||''), `${route}: meta noindex`);
    const alternates=[...document.querySelectorAll('link[rel="alternate"][hreflang]')];
    assert.deepEqual(alternates.map(a=>a.hreflang).sort(),[...Object.values(languages),'x-default'].sort(),`${route}: alternates`);
    assert.ok(alternates.every(a=>a.href.startsWith(origin+'/')),`${route}: alternate origin`);
    if(route!==`${home}countries/`)assert.ok(document.querySelector('script[type="application/ld+json"]'),`${route}: structured data`);
    document.defaultView.close();
   });
   if(route==='/')homepage=value.text;
  }
 }));
 const failures=localeChecks.filter(result=>result.status==='rejected');
 assert.equal(failures.length,0,failures.map(result=>result.reason.message).join('; '));
 await check('/robots.txt',({response,text})=>{assert.equal(response.status,200);assert.match(text,/Sitemap: https:\/\/rankmyincome\.com\/sitemap\.xml/);assert.ok(!/^Disallow:\s*\/\s*$/m.test(text));});
 await check('/sitemap.xml',({response,text})=>{assert.equal(response.status,200);assert.equal((text.match(/<loc>/g)||[]).length,report.build.pages);});
 await check('/ads.txt',({response,text})=>{assert.equal(response.status,200);assert.match(text,/google\.com,\s*pub-2948191504774582,\s*DIRECT,\s*f08c47fec0942fa0/);});
 await check('/__rankmyincome_missing_route__/',({response})=>assert.equal(response.status,404));
 const redirect=await request('/index.html',{redirect:'manual'});
 assert.ok([301,308].includes(redirect.response.status),'index.html must permanently redirect');
 assert.equal(new URL(redirect.response.headers.get('location'),origin).href,origin+'/');
 report.checks.push({path:'/index.html',status:redirect.response.status});
 const document=new JSDOM(homepage).window.document;
 const assets=[...document.querySelectorAll('script[src^="/assets/"],link[href^="/assets/"]')].map(x=>x.getAttribute('src')||x.getAttribute('href'));
 assets.push(document.body.dataset.source+'index.json',document.body.dataset.source+'KR.json');
 document.defaultView.close();
 for(const asset of assets)await check(asset,({response})=>{assert.equal(response.status,200);assert.match(response.headers.get('cache-control')||'',/immutable/);});
 report.success=true;
 console.log(`Production verified: ${report.checks.length} checks, commit ${expected}`);
} catch(error) {
 report.success=false;report.error=error.message;process.exitCode=1;console.error(error.message);
} finally {
 const reportPath=process.env.VERIFICATION_REPORT || 'test-results/production-verification.json';
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
}
