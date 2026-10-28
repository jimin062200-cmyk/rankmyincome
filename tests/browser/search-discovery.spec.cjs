const {test,expect}=require('@playwright/test');
test('updated country and ranking content remains readable on a narrow screen without JavaScript',async({browser})=>{
 const {searchCountries}=await import('../../content/search-discovery.mjs');
 const data=require('../../data/income-data.json');
 const slug=s=>s.replace(/[’'`´]/g,'-').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const routes=Object.keys(searchCountries).map(key=>{const [l,c]=key.split(':');return `${l==='en'?'/':`/${l}/`}countries/${slug(data.countries[c].name)}/`;});
 for(const l of ['','ko/','ja/','zh/','es/','fr/','de/','pt/'])for(const r of ['','median-income/','top-1-income/'])routes.push('/'+l+'rankings/'+r);
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:800}});
 await context.route('**/pagead2.googlesyndication.com/**',r=>r.abort());
 const page=await context.newPage();
 for(const route of routes){
  expect((await page.goto('http://127.0.0.1:8765'+route)).status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();await expect(page.locator('.lead')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBeTruthy();
  if(route.includes('/countries/')){await expect(page.locator('[data-search-comparison]')).toBeVisible();await expect(page.locator('[data-search-comparison] tbody tr')).toHaveCount(4);}
  else if(!route.endsWith('/rankings/'))await expect(page.locator('[data-ranking-links] a')).toHaveCount(3);
  expect(await page.locator('script[src*="adsbygoogle.js"]').count()).toBe(1);
 }
 await context.close();
});
