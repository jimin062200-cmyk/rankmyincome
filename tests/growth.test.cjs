const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const T=require('../growth-core.js'),M=require('../calculator-core.js'),data=require('../data/income-data.json');
test('salary periods and real raises implement independently verifiable arithmetic and reject invalid ranges',()=>{
 assert.equal(T.annualize(25,'hourly',40,5,52),52000);assert.equal(T.annualize(25,'hourly',40,5,48),48000);assert.equal(T.annualize(4000,'monthly'),48000);assert.equal(T.annualize(200,'daily',40,5,48),48000);
 assert.deepEqual(T.payPeriods(52000),{annual:52000,monthly:52000/12,weekly:1000,daily:200,hourly:25});
 assert.equal(T.raise(70000,10,0).annual,7000);assert.ok(Math.abs(T.raise(100,10,5).real-4.7619047619)<1e-8);assert.equal(T.raise(100,-10,0).next,90);
 for(const input of [[-1,'annual'],[5,'hourly',0],[5,'daily',40,8],[5,'weekly',40,5,0],[Infinity,'annual'],[Number.MAX_SAFE_INTEGER,'hourly']])assert.ok(Number.isNaN(T.annualize(...input)));
 for(const args of [[0,10],[-1,10],[100,-100],[100,10,-100],[100,Infinity]])assert.equal(T.raise(...args),null);
});
test('PPP equivalents preserve world position and round-trip across all supported countries',()=>{
 for(const a of Object.values(data.countries)){const amount=a.thresholds.find(([p])=>p===50)[1];for(const code of ['US','KR','JP','GB','CA','AU','FR']){const b=data.countries[code],equiv=T.ppp(amount,a.pppPerWorldUnit,b.pppPerWorldUnit);assert.ok(Math.abs(T.ppp(equiv,b.pppPerWorldUnit,a.pppPerWorldUnit)/amount-1)<1e-12);assert.ok(Math.abs(M.topPercent(amount/a.pppPerWorldUnit,data.world.thresholds)-M.topPercent(equiv/b.pppPerWorldUnit,data.world.thresholds))<1e-10);}}
});
const wait=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Timed out');};
async function page(route,opts={}){const html=fs.readFileSync('dist'+route+'index.html','utf8'),dom=new JSDOM(html,{url:'https://rankmyincome.com'+route,runScripts:'outside-only'}),w=dom.window;w.fetch=async url=>{if(opts.fail)throw Error('offline');return{ok:true,json:async()=>JSON.parse(fs.readFileSync('dist'+url,'utf8'))}};w.AbortController=globalThis.AbortController;for(const file of ['calculator-core.js','growth-core.js','growth.js'])w.eval(fs.readFileSync(file,'utf8'));if(!opts.fail&&w.document.querySelector('#tool-submit'))await wait(()=>!w.document.querySelector('#tool-submit').disabled);return dom;}
const formSubmit=async w=>{w.document.querySelector('#tool-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(()=>!w.document.querySelector('#tool-submit').disabled);};
for(const lang of ['en','ko','ja','zh','es','fr','de','pt'])test(`${lang}: goal, converter, raise, global, distribution and PPP DOM flows`,async()=>{
 const prefix=lang==='en'?'/':`/${lang}/`,tag={zh:'zh-CN',pt:'pt-BR'}[lang]||lang,nf=new Intl.NumberFormat(tag);
 for(const kind of ['top-income','income-goal','salary-converter','raise-calculator','global-income','ppp-comparison','income-distribution']){
  const dom=await page(prefix+'tools/'+kind+'/'),w=dom.window,doc=w.document;
  const country=doc.querySelector('#tool-country');country.value='US';country.dispatchEvent(new w.Event('change',{bubbles:true}));if(doc.querySelector('#tool-income'))doc.querySelector('#tool-income').value=nf.format(70000);
  await formSubmit(w);assert.equal(doc.querySelector('#tool-error').textContent,'',kind);assert.ok(doc.querySelector('#tool-result').textContent.length>80,kind);assert.ok(!/NaN|undefined|Infinity/.test(doc.querySelector('#tool-result').textContent),kind);
  if(kind==='top-income')assert.ok(doc.querySelector('#tool-result').textContent.includes(nf.format(174245)),kind);
  if(kind==='raise-calculator')assert.ok(doc.querySelector('#tool-result').textContent.includes(nf.format(77000)),kind);
  if(kind==='salary-converter'){doc.querySelector('#tool-income').value=nf.format(25);doc.querySelector('#tool-period').value='hourly';await formSubmit(w);assert.ok(doc.querySelector('#tool-result').textContent.includes(nf.format(52000)));}
  for(const a of doc.querySelectorAll('#tool-result a'))assert.ok(!a.href.includes('income='),'Income must not enter URLs');dom.window.close();
 }
});
test('new tools reject negative income and recover from a missing data response',async()=>{
 const dom=await page('/tools/income-goal/'),w=dom.window;w.document.querySelector('#tool-income').value='-50';await formSubmit(w);assert.ok(w.document.querySelector('#tool-error').textContent);assert.equal(w.document.querySelector('#tool-result').textContent,'');w.close();
 const opts={fail:true},failed=await page('/tools/top-income/',opts);await wait(()=>!failed.window.document.querySelector('#tool-retry').hidden);opts.fail=false;failed.window.document.querySelector('#tool-retry').click();await wait(()=>!failed.window.document.querySelector('#tool-submit').disabled);await wait(()=>failed.window.document.querySelector('#tool-result').textContent.includes('USD'));failed.window.close();
});
test('rankings retain all static rows, filter no matches and sort numerically',async()=>{
 const dom=await page('/rankings/top-1-income/'),w=dom.window,doc=w.document,search=doc.querySelector('#ranking-search');assert.equal(doc.querySelectorAll('tbody tr').length,208);search.value='South Korea';search.dispatchEvent(new w.Event('input'));assert.equal([...doc.querySelectorAll('tbody tr')].filter(r=>!r.hidden).length,1);search.value='xxxx-no-country';search.dispatchEvent(new w.Event('input'));assert.equal([...doc.querySelectorAll('tbody tr')].filter(r=>!r.hidden).length,0);search.value='';search.dispatchEvent(new w.Event('input'));const sort=doc.querySelector('#ranking-sort');sort.value='asc';sort.dispatchEvent(new w.Event('change'));const rows=[...doc.querySelectorAll('tbody tr')];assert.ok(Number(rows[0].dataset.value)<=Number(rows.at(-1).dataset.value));w.close();
});

test('a delayed unchanged change event cannot erase a submitted result',async()=>{
 const dom=await page('/tools/salary-converter/'),w=dom.window,doc=w.document;
 const input=doc.querySelector('#tool-income');input.value='25';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 doc.querySelector('#tool-period').value='hourly';
 doc.querySelector('#tool-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 input.dispatchEvent(new w.Event('change',{bubbles:true}));
 await wait(()=>doc.querySelector('#tool-result').textContent.includes('52,000'));
 input.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.ok(doc.querySelector('#tool-result').textContent.includes('52,000'));
 input.value='30';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(doc.querySelector('#tool-result').textContent,'');w.close();
});
