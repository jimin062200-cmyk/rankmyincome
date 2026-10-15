const {test,expect}=require('@playwright/test');
const {default:AxeBuilder}=require('@axe-core/playwright');
const M=require('../../calculator-core.js'),data=require('../../data/income-data.json');
const inputs={en:'50,000,000',ko:'50,000,000',ja:'50,000,000',zh:'50,000,000',es:'50.000.000',fr:'50 000 000',de:'50.000.000',pt:'50.000.000'};
const localizedPercent=(n,l)=>new Intl.NumberFormat({zh:'zh-CN',pt:'pt-BR'}[l]||l,{minimumFractionDigits:n<.001?5:n<.01?4:n<.1?3:n<1?2:1,maximumFractionDigits:n<.001?5:n<.01?4:n<.1?3:n<1?2:1}).format(n);
test.beforeEach(async({page})=>{await page.route('**/pagead2.googlesyndication.com/**',route=>route.abort());});
for(const lang of Object.keys(inputs))test(`${lang}: real calculation, targets, comparison, localization and keyboard navigation`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${lang==='en'?'/':`/${lang}/`}?country=KR`);
 await expect(page.locator('#calculate')).toBeEnabled();
 await page.locator('#income').fill(inputs[lang]);await page.locator('#income').press('Enter');
 await expect(page.locator('#results')).toBeVisible();
 await expect(page.locator('#country-top')).toContainText(localizedPercent(M.topPercent(5e7,data.countries.KR.thresholds),lang));
 await expect(page.locator('#world-top')).toContainText(localizedPercent(M.topPercent(5e7/data.countries.KR.pppPerWorldUnit,data.world.thresholds),lang));
 await expect(page.locator('#goal-output article')).toHaveCount(2);
 await page.locator('#goal-target').selectOption('1');await expect(page.locator('#goal-output')).toContainText('KRW');
 await page.locator('#comparison-panel summary').click();await page.locator('#compare-country').selectOption('MY');
 await expect(page.locator('#comparison-output tbody tr')).toHaveCount(4);await expect(page.locator('#comparison-output')).toContainText('MYR');
 await page.locator('#country-trigger').click();await page.locator('#country-search').fill('SG');await page.locator('#country-search').press('ArrowDown');await page.keyboard.press('Enter');
 await expect(page.locator('#country')).toHaveValue('SG');await expect(page.locator('#results')).toBeHidden();await expect(page.locator('#country-trigger')).toBeFocused();
 await page.locator('#country-trigger').click();await page.keyboard.press('Escape');await expect(page.locator('#country-trigger')).toBeFocused();
 await expect(page.locator('[data-language-link]')).toHaveCount(8);
 expect(await page.locator('[data-language-link]').evaluateAll(xs=>xs.every(a=>new URL(a.href).searchParams.get('country')==='SG'))).toBe(true);
 expect(errors).toEqual([]);
});
for(const width of [320,375,768,1280])test(`responsive ${width}px and accessible calculator`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:850});await page.goto('/ko/?country=KR');await expect(page.locator('#calculate')).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 if(width<1100){await expect(page.locator('.mobile-nav')).toBeVisible();await page.locator('.mobile-nav summary').click();await expect(page.locator('.mobile-nav .nav-links')).toBeVisible();await page.keyboard.press('Escape');}
 await page.locator('#income').fill('50000000');await page.locator('#calculate').click();await expect(page.locator('#results')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(a11y.violations).toEqual([]);
 if(width===375||width===1280){await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});});await page.screenshot({path:testInfo.outputPath(`ko-${width}.png`),fullPage:true});}
});
test('privacy: saving, reload and removal work without persisting the income amount',async({page})=>{
 await page.goto('/?country=KR');await expect(page.locator('#calculate')).toBeEnabled();await expect(page.locator('#saved-section')).toBeHidden();
 await page.locator('#income').fill('50000123');await page.locator('#calculate').click();await expect(page.locator('#results')).toBeVisible();
 await page.locator('#save-result').click();await expect(page.locator('#saved-section')).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('rankmyincome.saved.v1')));expect(Object.keys(saved).sort()).toEqual(['version','code','country','world','dataset','date'].sort());expect(JSON.stringify(saved)).not.toContain('50000123');
 await page.reload();await expect(page.locator('#saved-section')).toBeVisible();await expect(page.locator('#income')).toHaveValue('');
 await page.locator('#forget-result').click();await expect(page.locator('#saved-section')).toBeHidden();expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
test('share text and PNG omit entered income and include real results',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:async value=>{window.sharedResult=value;},configurable:true});});
 await page.goto('/?country=KR');await expect(page.locator('#calculate')).toBeEnabled();await page.locator('#income').fill('50000123');await page.locator('#calculate').click();await expect(page.locator('#results')).toBeVisible();
 await page.locator('#share-result').click();const shared=await page.evaluate(()=>window.sharedResult);expect(shared.text).not.toMatch(/50000123|50,000,123|income=/);expect(shared.text).toContain('country=KR');
 const download=page.waitForEvent('download');await page.locator('#download-card').click();expect((await download).suggestedFilename()).toBe('RankMyIncome-result.png');
});
test('invalid input, localStorage denied, data failure and retry recover accessibly',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Denied')};Storage.prototype.setItem=()=>{throw Error('Denied')};});
 let failures=1;await page.route('**/data/*/index.json',route=>failures-->0?route.abort():route.continue());
 await page.goto('/');await expect(page.locator('#error')).toBeVisible();await page.locator('#retry-data').click();await expect(page.locator('#calculate')).toBeEnabled();
 for(const value of ['-50000','not income','1e8','12,34']){await page.locator('#income').fill(value);await page.locator('#calculate').click();await expect(page.locator('#income')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#results')).toBeHidden();}
 await page.locator('#income').fill('60000');await page.locator('#calculate').click();await expect(page.locator('#results')).toBeVisible();await page.locator('#save-result').click();await expect(page.locator('#share-status')).toContainText('does not allow');
});
test('country directories filter and localized country links preserve the correct locale',async({page})=>{
 await page.goto('/ko/countries/');await page.locator('#directory-search').fill('대한민국');await expect(page.locator('.country-link:visible')).toHaveCount(1);await page.locator('.country-link:visible').click();
 await expect(page).toHaveURL(/\/ko\/countries\/south-korea\//);await expect(page.locator('h1')).toContainText('대한민국');await expect(page.locator('.threshold-table tbody tr')).toHaveCount(6);
 await page.locator('.country-cta').click();await expect(page.locator('#country')).toHaveValue('KR');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const missing=await page.goto('/this-page-does-not-exist');expect(missing.status()).toBe(404);await expect(page.locator('h1')).toContainText('not found');
});
test('no-JavaScript navigation and country thresholds remain useful',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.route('**/pagead2.googlesyndication.com/**',route=>route.abort());
 await page.goto('http://127.0.0.1:8765/ja/');await expect(page.locator('noscript')).toBeVisible();await page.goto('http://127.0.0.1:8765/ja/countries/japan/');await expect(page.locator('table tbody tr')).toHaveCount(6);await context.close();
});
