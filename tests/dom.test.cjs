const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const data=require('../data/income-data.json'),M=require('../calculator-core.js');
const tick=()=>new Promise(r=>setImmediate(r));
async function ready(predicate){for(let i=0;i<30;i++){if(predicate())return;await tick();}throw Error('UI did not reach expected state');}
async function setup(lang='en',{failIndex=false,denyStorage=false}={}){
 const prefix=lang==='en'?'':lang+'/';
 const dom=new JSDOM(fs.readFileSync(`dist/${prefix}index.html`,'utf8'),{url:`https://rankmyincome.com/${prefix}?country=KR`,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,q=s=>w.document.querySelector(s),calls=[];
 w.Element.prototype.scrollIntoView=function(){};w.matchMedia=()=>({matches:true});
 let reject=failIndex;
 w.fetch=async url=>{calls.push(url);if(reject&&url.endsWith('/index.json')){reject=false;throw Error('Network');}return {ok:true,json:async()=>JSON.parse(fs.readFileSync('dist'+url,'utf8'))};};
 if(denyStorage){w.Storage.prototype.getItem=()=>{throw Error('Denied')};w.Storage.prototype.setItem=()=>{throw Error('Denied')};}
 for(const f of ['site.js','calculator-core.js','app.js'])w.eval(fs.readFileSync(f,'utf8'));
 await ready(()=>!q('#calculate').disabled||!q('#retry-data').hidden);
 return {w,q,calls,close:()=>w.close(),input:value=>{q('#income').value=value;q('#income').dispatchEvent(new w.Event('input',{bubbles:true}));},submit:async()=>{q('#income-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await ready(()=>!q('#calculate').disabled);}};
}
const inputs={en:'50,000,000',ko:'50,000,000',ja:'50,000,000',zh:'50,000,000',es:'50.000.000',fr:'50 000 000',de:'50.000.000',pt:'50.000.000'};
for(const [lang,input]of Object.entries(inputs))test(`${lang}: DOM flow calculates exact ranks, goals, comparison, saving and localization`,async()=>{
 const x=await setup(lang),{w,q}=x;try{
 assert.equal(q('#country').value,'KR');x.input(input);await x.submit();assert.equal(q('#results').hidden,false);
 assert.equal(q('#country-tier').textContent,M.getTier(M.topPercent(5e7,data.countries.KR.thresholds)).name);
 assert.equal(q('#world-tier').textContent,M.getTier(M.topPercent(5e7/data.countries.KR.pppPerWorldUnit,data.world.thresholds)).name);
 assert.match(q('#country-next').textContent,/KRW/);assert.match(q('#world-next').textContent,/KRW/);assert.equal(w.document.querySelectorAll('#goal-output article').length,2);assert.match(q('#goal-output').textContent,/KRW/);
 q('#goal-target').value='1';q('#goal-target').dispatchEvent(new w.Event('change'));assert.match(q('#goal-output').textContent,/247[,\.\s\u202f]605[,\.\s\u202f]837/);
 q('#comparison-panel').open=true;q('#compare-country').value='MY';q('#compare-country').dispatchEvent(new w.Event('change'));await ready(()=>w.document.querySelectorAll('#comparison-output tbody tr').length===4);assert.match(q('#comparison-output').textContent,/MYR/);
 q('#save-result').click();assert.equal(q('#saved-section').hidden,false);const saved=JSON.parse(w.localStorage.getItem('rankmyincome.saved.v1'));assert.deepEqual(Object.keys(saved).sort(),['version','code','country','world','dataset','date'].sort());assert.ok(!JSON.stringify(saved).includes('50000000'));
 q('#forget-result').click();assert.equal(q('#saved-section').hidden,true);assert.equal(w.localStorage.length,0);
 q('#country-trigger').click();q('#country-search').value='SG';q('#country-search').dispatchEvent(new w.Event('input'));const sg=q('.country-option[data-code="SG"]');assert.equal(sg.hidden,false);sg.click();assert.equal(q('#country').value,'SG');assert.equal(q('#results').hidden,true);assert.equal(w.document.activeElement,q('#country-trigger'));
 assert.ok([...w.document.querySelectorAll('[data-language-link]')].every(a=>new URL(a.href).search==='?country=SG'));
 assert.ok(x.calls.every(s=>!s.includes(input)&&!s.includes('income-data.json')));
 }finally{x.close();}
});
test('failed data loading retries; malformed and negative input cannot produce results; blocked storage is handled',async()=>{
 const x=await setup('en',{failIndex:true,denyStorage:true}),{q}=x;try{
 assert.equal(q('#error').classList.contains('show'),true);q('#retry-data').click();await ready(()=>!q('#calculate').disabled);
 for(const input of ['-50','not50','1e6','12,34','0','']){x.input(input);await x.submit();assert.equal(q('#results').hidden,true);assert.equal(q('#income').getAttribute('aria-invalid'),'true');}
 x.input('50000000');await x.submit();assert.equal(q('#results').hidden,false);q('#save-result').click();assert.match(q('#share-status').textContent,/does not allow/);
 }finally{x.close();}
});
test('share and clipboard fallback do not claim success on failure or include entered income',async()=>{
 const x=await setup(),{q,w}=x;try{
 x.input('50000123');await x.submit();let shared;w.navigator.share=async p=>{shared=p};q('#share-result').click();await tick();assert.ok(shared.text.includes('country=KR'));assert.ok(!/50,000,123|50000123|income=/.test(shared.text));
 w.document.execCommand=()=>false;q('#copy-result').click();await tick();assert.match(q('#share-status').textContent,/Copy failed/);
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{shared=text}},configurable:true});q('#copy-result').click();await tick();assert.match(q('#share-status').textContent,/Result copied/);assert.ok(!shared.includes('50000123'));
 }finally{x.close();}
});
test('late country responses never reveal a stale calculation after changing country',async()=>{
 const x=await setup(),{q,w}=x;try{
 const fetch=w.fetch;let resolve;w.fetch=url=>url.endsWith('/KR.json')?new Promise(r=>resolve=()=>r({ok:true,json:async()=>data.countries.KR})):fetch(url);
 x.input('50000000');q('#income-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));q('.country-option[data-code="MY"]').click();resolve();await tick();await tick();assert.equal(q('#results').hidden,true);assert.equal(q('#country').value,'MY');assert.equal(q('#calculate').disabled,false);
 }finally{x.close();}
});
