const {test,expect}=require('@playwright/test');
const {default:AxeBuilder}=require('@axe-core/playwright');
const langs=['en','ko','ja','zh','es','fr','de','pt'];
const routes=['top-income','income-goal','salary-converter','raise-calculator','global-income','ppp-comparison','income-distribution'];
test.beforeEach(async({page})=>{await page.route('**/pagead2.googlesyndication.com/**',r=>r.abort());});
for(const lang of langs)test(`${lang}: every new tool calculates in the selected language at 320px`,async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:320,height:850});const errors=[];page.on('pageerror',e=>errors.push(e.message));const root=lang==='en'?'/':`/${lang}/`;
 for(const route of [...routes.map(r=>'tools/'+r+'/'),'compare/']){
  await page.goto(root+route+'?country=US');await expect(page.locator('#tool-submit')).toBeEnabled();await expect(page.locator('#tool-country')).toHaveValue('US');
  if(await page.locator('#tool-income').count())await page.locator('#tool-income').fill('70000');
  await page.locator('#tool-submit').click();await expect(page.locator('#tool-result h2')).toBeVisible();await expect(page.locator('#tool-error')).toHaveText('');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBe(true);
  expect(await page.locator('#tool-result').innerText()).not.toMatch(/NaN|undefined|Infinity/);
  if(lang!=='en')expect(await page.locator('h1').innerText()).not.toMatch(/calculator|converter|explorer|Compare countries/i);
 }
 expect(errors).toEqual([]);
});
for(const route of [...routes.map(r=>'tools/'+r+'/'),'compare/','rankings/top-1-income/'])test(`accessible and readable: ${route}`,async({page},testInfo)=>{
 await page.goto('/'+route);if(await page.locator('#tool-submit').count()){await expect(page.locator('#tool-submit')).toBeEnabled();await page.locator('#tool-submit').click();await expect(page.locator('#tool-result h2')).toBeVisible();}
 const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('growth.png'),fullPage:true,scale:'css'});
});
test('converter produces 52000 from 25 hourly and rank links contain no income',async({page})=>{
 await page.goto('/tools/salary-converter/?country=US');await expect(page.locator('#tool-submit')).toBeEnabled();await page.locator('#tool-income').fill('25');await page.locator('#tool-period').selectOption('hourly');await page.locator('#tool-submit').click();await expect(page.locator('#tool-result')).toContainText('52,000');
 for(const href of await page.locator('#tool-result a').evaluateAll(as=>as.map(a=>a.href)))expect(href).not.toMatch(/income=|52000|52,000/);
 await page.locator('#tool-hours').fill('0');await page.locator('#tool-submit').click();await expect(page.locator('#tool-error')).not.toBeEmpty();await expect(page.locator('#tool-result')).toBeEmpty();
});
test('rankings support search, numeric sort, CSV and empty state',async({page})=>{
 await page.goto('/rankings/median-income/');await expect(page.locator('#ranking-table tbody tr')).toHaveCount(208);await page.locator('#ranking-search').fill('South Korea');await expect(page.locator('#ranking-table tbody tr:visible')).toHaveCount(1);
 const downloadPromise=page.waitForEvent('download');await page.locator('#ranking-download').click();expect((await downloadPromise).suggestedFilename()).toBe('rankmyincome-thresholds.csv');
 await page.locator('#ranking-search').fill('zzzzxxx');await expect(page.locator('#ranking-status')).toHaveText('No matching countries.');await page.locator('#ranking-search').fill('');await page.locator('#ranking-sort').selectOption('asc');
 const values=await page.locator('#ranking-table tbody tr').evaluateAll(rs=>rs.map(r=>Number(r.dataset.value)));expect(values).toEqual([...values].sort((a,b)=>a-b));
});
test('tool data errors recover and selection changes discard pending results',async({page})=>{
 await page.route('**/data/**/index.json',r=>r.abort());await page.goto('/tools/income-goal/');await expect(page.locator('#tool-retry')).toBeVisible();await page.unroute('**/data/**/index.json');await page.locator('#tool-retry').click();await expect(page.locator('#tool-submit')).toBeEnabled();
 await page.route('**/data/**/US.json',async r=>{await new Promise(resolve=>setTimeout(resolve,300));await r.continue();});
 await page.locator('#tool-submit').click();await page.locator('#tool-country').selectOption('KR');await expect(page.locator('#tool-result')).toBeEmpty();await page.locator('#tool-submit').click();await expect(page.locator('#tool-result')).toContainText('KRW');await expect(page.locator('#tool-error')).toBeEmpty();
});
test('guides and ranking data remain visible without JavaScript',async({browser})=>{
 const ctx=await browser.newContext({javaScriptEnabled:false}),page=await ctx.newPage();await page.route('**/pagead2.googlesyndication.com/**',r=>r.abort());await page.goto('http://127.0.0.1:8765/guides/purchasing-power-parity/');await expect(page.locator('article h2')).toHaveCount(5);await page.goto('http://127.0.0.1:8765/rankings/top-1-income/');await expect(page.locator('tbody tr')).toHaveCount(208);await ctx.close();
});
