const {test,expect}=require('@playwright/test');
const targets=require('../../content/seo-targets.json');
test('all 20 SEO targets work without JavaScript at 320px',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:800}});
 await context.route('**/pagead2.googlesyndication.com/**',r=>r.abort());
 const page=await context.newPage();
 for(const route of targets){await page.goto('http://127.0.0.1:8765'+route);await expect(page.locator('[data-seo-answer]')).toBeVisible();await expect(page.locator('.lead')).toContainText('2024');await expect(page.locator('table').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route).toBeTruthy();}
 await context.close();
});
