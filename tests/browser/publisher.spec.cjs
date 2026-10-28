const {test,expect}=require('@playwright/test');
const routes=['/','/tools/top-income/','/rankings/median-income/','/guides/income-vs-salary-percentile/','/countries/france/','/countries/pakistan/','/de/countries/mauritius/','/de/countries/thailand/','/ja/countries/ecuador/','/about.html','/methodology.html','/data-sources.html','/privacy.html','/terms.html','/contact.html'];
test('publisher content and trust navigation remain readable without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});const page=await context.newPage();
 for(const route of routes){
  const response=await page.goto('http://127.0.0.1:8765'+route);expect(response.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();expect((await page.locator('main').innerText()).length).toBeGreaterThan(400);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBeTruthy();
  for(const path of ['about','methodology','data-sources','privacy','terms','contact'])await expect(page.locator(`footer a[href="/${path}.html"]`)).toBeVisible();
  expect(await page.locator('script[src*="googlesyndication"]').count()).toBe(route.endsWith('.html')?0:1);
  if(['/countries/france/','/countries/pakistan/','/de/countries/mauritius/','/de/countries/thailand/','/ja/countries/ecuador/'].includes(route)){await expect(page.locator('[data-country-reading] tbody tr')).toHaveCount(4);await expect(page.locator('[data-country-reading]')).toBeVisible();}
 }
 const missing=await page.goto('http://127.0.0.1:8765/__publisher_missing__/');expect(missing.status()).toBe(404);expect(await page.locator('script[src*="googlesyndication"]').count()).toBe(0);await context.close();
});
