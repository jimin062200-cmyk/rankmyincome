/* Browser-only UI. Calculation definitions live in calculator-core.js. */
'use strict';
(() => {
const M=globalThis.RankMath, $=s=>document.querySelector(s);
const TXT=JSON.parse($('#ui-strings').textContent), LANG=document.documentElement.lang;
const ACTIVE=document.body.dataset.locale, HOME=ACTIVE==='en'?'/':`/${ACTIVE}/`;
const t=(key,vars={})=>TXT[key].replace(/\{(\w+)\}/g,(_,k)=>vars[k]??`{${k}}`);
const number=(n,digits=1)=>new Intl.NumberFormat(LANG,{maximumFractionDigits:digits}).format(n);
const percent=n=>{const digits=n<.001?5:n<.01?4:n<.1?3:n<1?2:1;return new Intl.NumberFormat(LANG,{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n);};
const top=n=>t('top',{n:percent(n)});
const money=(n,c)=>new Intl.NumberFormat(LANG,{style:'currency',currency:c.currency,currencyDisplay:'code',maximumFractionDigits:0}).format(n);
let regionNames;try{regionNames=new Intl.DisplayNames([LANG],{type:'region'});}catch{}
let DATA=null,LAST_RESULT=null,selectedRevision=0,calculationRevision=0,comparisonRevision=0;
const countriesCache=new Map(), STORE='rankmyincome.saved.v1';
const countryName=code=>regionNames?.of(code)||DATA.countries[code].name;
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function resultVisible(visible){$('#results').hidden=!visible;$('#results').classList.toggle('show',visible);}
function invalidateResult(){calculationRevision++;comparisonRevision++;LAST_RESULT=null;resultVisible(false);$('#share-status').textContent='';$('#saved-change').textContent='';}
function displayError(key){$('#error').textContent=t(key);$('#error').classList.add('show');}
function clearError(){$('#error').classList.remove('show');$('#error').textContent='';$('#income').removeAttribute('aria-invalid');}
async function fetchJSON(file){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(document.body.dataset.source+file,{signal:controller.signal});if(!r.ok)throw Error(`Data HTTP ${r.status}`);return await r.json();}finally{clearTimeout(timer);}}
async function countryData(code){
 if(!DATA?.countries[code])throw Error('Unknown country');
 if(!countriesCache.has(code))countriesCache.set(code,fetchJSON(`${code}.json`).then(c=>{
  if(!Array.isArray(c.thresholds)||c.thresholds.length<2||!Number.isFinite(c.pppPerWorldUnit)||c.pppPerWorldUnit<=0)throw Error('Invalid country data');return c;
 }).catch(e=>{countriesCache.delete(code);throw e;}));
 return countriesCache.get(code);
}
function closeCountryMenu(focus=false){$('#country-menu').hidden=true;$('#country-trigger').setAttribute('aria-expanded','false');if(focus)$('#country-trigger').focus();}
function openCountryMenu(){
 $('#country-menu').hidden=false;$('#country-trigger').setAttribute('aria-expanded','true');$('#country-search').value='';filterCountries('');$('#country-search').focus();
}
function filterCountries(query){
 const normalize=s=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase(LANG);
 query=normalize(query.trim());let count=0;
 for(const b of document.querySelectorAll('.country-option')){b.hidden=!normalize(b.dataset.search).includes(query);if(!b.hidden)count++;}
 $('#country-empty').hidden=count>0;
}
function setCountry(code,{focus=false}={}){
 if(!DATA.countries[code])return;
 selectedRevision++;invalidateResult();clearError();
 $('#country').value=code;$('#country-trigger-label').textContent=countryName(code);$('#currency').textContent=DATA.countries[code].currency;
 const defaults={KR:50000000,MY:60000,JP:6000000,US:75000};
 $('#income').placeholder=number(defaults[code]||50000,0);
 for(const b of document.querySelectorAll('.country-option'))b.setAttribute('aria-pressed',String(b.dataset.code===code));
 for(const a of document.querySelectorAll('[data-language-link]')){const u=new URL(a.href);u.search='';u.searchParams.set('country',code);a.href=u.href;}
 closeCountryMenu(focus);
}
function buildCountryPicker(){
 const frag=document.createDocumentFragment();
 const entries=Object.keys(DATA.countries).sort((a,b)=>countryName(a).localeCompare(countryName(b),LANG));
 for(const code of entries){
  const c=DATA.countries[code],button=node('button',undefined,'country-option');button.type='button';button.dataset.code=code;button.dataset.search=`${countryName(code)} ${c.name} ${code} ${c.currency}`;button.setAttribute('aria-pressed','false');
  const info=node('span');info.append(node('strong',countryName(code)),node('small',`${code} · ${c.currency}`));button.append(info);button.addEventListener('click',()=>setCountry(code,{focus:true}));frag.append(button);
 }
 $('#country-options').replaceChildren(frag);
 const select=$('#compare-country');select.replaceChildren(...entries.map(code=>{const o=node('option',countryName(code));o.value=code;return o;}));
 $('#country-trigger').disabled=false;
}
function renderCard(prefix,rank,label,year,income,thresholds,c,factor=1){
 const tier=M.getTier(rank),next=M.nextTier(tier),progress=M.progressWithinTier(rank,tier);
 const card=$(`#${prefix}-card`);card.style.setProperty('--tier',tier.color);card.dataset.tier=tier.name.toLowerCase();
 $(`#${prefix}-label`).textContent=label;$(`#${prefix}-mark`).textContent=tier.mark;$(`#${prefix}-tier`).textContent=tier.name;
 $(`#${prefix}-top`).textContent=top(rank);$(`#${prefix}-better`).textContent=t('better',{n:percent(Math.max(0,100-rank))});
 $(`#${prefix}-year`).textContent=DATA.meta.status==='production'?`WID.world ${year}`:'PREVIEW';
 $(`#${prefix}-progress`).style.width=`${progress}%`;$(`#${prefix}-progressbar`).setAttribute('aria-valuenow',String(Math.round(progress)));
 $(`#${prefix}-next`).textContent=next?`${t('next',{name:next.name,n:number(next.max)})}\n${t('gap')}: ${money(Math.ceil(Math.max(0,M.incomeForTop(next.max,thresholds)-income)*factor),c)}`:t('highest');
 $(`#${prefix}-range-note`).hidden=!M.outsideRange(income,thresholds);
 return {top:rank,tier:tier.name};
}
async function calculate(event){
 event?.preventDefault();if(!DATA)return;
 const code=$('#country').value,revision=++calculationRevision,selection=selectedRevision;
 const income=M.parseMoney($('#income').value,LANG);clearError();
 if(!Number.isFinite(income)||income<=0){invalidateResult();displayError('invalid');$('#income').setAttribute('aria-invalid','true');$('#income').focus();return;}
 $('#calculate').disabled=true;$('#calculate').textContent=t('loading');
 try{
  const c=await countryData(code);if(revision!==calculationRevision||selection!==selectedRevision)return;
  const ct=M.topPercent(income,c.thresholds),wt=M.topPercent(income/c.pppPerWorldUnit,DATA.world.thresholds);
  const cr=renderCard('country',ct,countryName(code),c.dataYear,income,c.thresholds,c);
  const wr=renderCard('world',wt,t('world'),DATA.world.year,income/c.pppPerWorldUnit,DATA.world.thresholds,c,c.pppPerWorldUnit);
  LAST_RESULT={code,income,c,countryResult:cr,worldResult:wr};
  $('#result-data').textContent=t('dataNote',{year:c.dataYear,ppp:c.pppYear,world:DATA.world.year});
  $('#result-country-link').href=HOME+`countries/${DATA.countries[code].slug}/`;
  const next=M.nextTier(M.getTier(ct));
  const targets=[50,25,10,5,1,.1];if(next&&!targets.includes(next.max))targets.push(next.max);targets.sort((a,b)=>b-a);
  $('#goal-target').replaceChildren(...targets.map(n=>{const o=node('option',top(n));o.value=n;return o;}));
  $('#goal-target').value=next?.max||.1;
  $('#compare-country').value=code==='US'?'KR':'US';
  $('#share-status').textContent='';resultVisible(true);renderGoals();renderBenchmarks();renderSaved();
  if($('#comparison-panel').open)await renderComparison();
  if(revision!==calculationRevision)return;
  $('#results').focus({preventScroll:true});$('#results').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 }catch(e){if(revision===calculationRevision){resultVisible(false);displayError('loadError');}}
 finally{if(DATA){$('#calculate').disabled=false;$('#calculate').textContent=t('calculate');}}
}
function renderGoals(){
 if(!LAST_RESULT)return;const {income,c}=LAST_RESULT,target=Number($('#goal-target').value);
 const output=$('#goal-output');output.replaceChildren();
 for(const [label,thresholds,factor] of [[countryName(LAST_RESULT.code),c.thresholds,1],[t('world'),DATA.world.thresholds,c.pppPerWorldUnit]]){
  const value=M.incomeForTop(target,thresholds)*factor,block=node('article',undefined,'goal-card');
  block.append(node('h3',label),node('p',t('annual'),'hint'),node('strong',money(Math.ceil(value),c),'goal-value'),node('p',`${t('monthly')}: ${money(value/12,c)}`));
  const gap=Math.max(0,value-income);block.append(node('p',`${TXT.growth.increase}: ${number(gap/income*100,2)}%`));block.append(node('p',gap>0?`${t('gap')}: ${money(Math.ceil(gap),c)}`:t('reached'),'goal-gap'));
  if(M.outsideRange(value/factor,thresholds))block.append(node('p',t('extrapolated'),'range-note'));
  output.append(block);
 }
}
function renderBenchmarks(){
 if(!LAST_RESULT)return;const {income,c,code}=LAST_RESULT,g=TXT.growth;
 const output=$('#result-benchmarks');output.replaceChildren();
 const median=c.thresholds.find(([p])=>p===50)[1];
 output.append(node('p',`${g.median}: ${money(median,c)} · ${g.medianRatio}: ${number(income/median,2)}×`));
 const table=node('table',undefined,'threshold-table'),head=node('thead'),hr=node('tr');
 for(const label of [t('rank'),t('annual'),t('gap')]){const th=node('th',label);th.scope='col';hr.append(th);}head.append(hr);table.append(head);const body=node('tbody');
 for(const target of [25,10,5,1]){const value=M.incomeForTop(target,c.thresholds),row=node('tr'),th=node('th',top(target));th.scope='row';row.append(th,node('td',money(value,c)),node('td',money(Math.max(0,value-income),c)));body.append(row);}table.append(body);
 const wrap=node('div',undefined,'threshold-table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',g.summary);wrap.append(table);output.append(wrap);
 const links=$('#result-tool-links');links.replaceChildren();for(const [route,label] of [['tools/income-goal/',g.incomeGoal],['tools/income-distribution/',g.distribution],['compare/',g.compare],['tools/global-income/',g.globalIncome]]){const a=node('a',label+' →');a.href=HOME+route+'?country='+code;links.append(a);}
}
async function renderComparison(){
 if(!LAST_RESULT||!$('#comparison-panel').open)return;
 const result=LAST_RESULT,code=$('#compare-country').value,revision=++comparisonRevision;
 $('#comparison-status').textContent=t('loading');$('#comparison-output').replaceChildren();
 try{
  const other=await countryData(code);if(revision!==comparisonRevision||result!==LAST_RESULT)return;
  const table=node('table',undefined,'threshold-table'),head=node('thead'),row=node('tr');
  row.append(node('th',t('rank')),node('th',`${countryName(result.code)} · ${result.c.currency} · ${result.c.dataYear}`),node('th',`${countryName(code)} · ${other.currency} · ${other.dataYear}`));
  for(const th of row.children)th.scope='col';head.append(row);table.append(head);
  const body=node('tbody');let extrapolated=false;
  for(const [i,target] of [result.countryResult.top,50,10,1].entries()){
   const tr=node('tr'),th=node('th',i===0?`${t('sameRank')} · ${top(target)}`:top(target));th.scope='row';tr.append(th);
   for(const c of [result.c,other]){const amount=M.incomeForTop(target,c.thresholds);tr.append(node('td',Number.isFinite(amount)?money(amount,c):'—'));if(Number.isFinite(amount)&&M.outsideRange(amount,c.thresholds))extrapolated=true;}
   body.append(tr);
  }
  table.append(body);const caption=node('caption',t('compareTitle'));table.prepend(caption);
  const wrap=node('div',undefined,'threshold-table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',t('compareTitle'));wrap.append(table);
  const link=node('a',`${countryName(code)} →`,'back');link.href=HOME+`countries/${DATA.countries[code].slug}/`;
  $('#comparison-output').append(wrap,link);if(extrapolated)$('#comparison-output').append(node('p',t('extrapolated'),'range-note'));$('#comparison-status').textContent='';
 }catch(e){if(revision===comparisonRevision)$('#comparison-status').textContent=t('loadError');}
}
function readSaved(){try{
 const x=JSON.parse(localStorage.getItem(STORE)||'null');
 if(x?.version!==1||!DATA?.countries[x.code]||!Number.isFinite(x.country)||!Number.isFinite(x.world)||x.country<.00001||x.country>100||x.world<.00001||x.world>100||typeof x.dataset!=='string'||!Number.isFinite(Date.parse(x.date)))return null;
 return x;
}catch{return null;}}
function renderSaved(){
 const saved=readSaved();$('#saved-section').hidden=!saved;if(!saved)return;
 $('#saved-result').textContent=`${countryName(saved.code)}: ${top(saved.country)} · ${t('world')}: ${top(saved.world)} · ${t('savedOn',{date:new Intl.DateTimeFormat(LANG).format(new Date(saved.date))})}`;
 const change=$('#saved-change');change.textContent='';
 if(saved.dataset!==DATA.meta.version)change.textContent=t('dataChanged');
 else if(LAST_RESULT?.code===saved.code)change.textContent=t('savedChange',{n:number(saved.country-LAST_RESULT.countryResult.top,2)});
}
function saveResult(){if(!LAST_RESULT)return;try{
 localStorage.setItem(STORE,JSON.stringify({version:1,code:LAST_RESULT.code,country:LAST_RESULT.countryResult.top,world:LAST_RESULT.worldResult.top,dataset:DATA.meta.version,date:new Date().toISOString()}));renderSaved();$('#share-status').textContent=t('savedTitle');
}catch{$('#share-status').textContent=t('storageError');}}
function shareText(){
 if(!LAST_RESULT)return '';const r=LAST_RESULT;
 return `${t('result')}\n${countryName(r.code)}: ${r.countryResult.tier} — ${top(r.countryResult.top)}\n${t('world')}: ${r.worldResult.tier} — ${top(r.worldResult.top)}\nWID.world · ${r.c.dataYear} / ${DATA.world.year}\nhttps://rankmyincome.com${HOME}?country=${r.code}`;
}
async function copyResult(){if(!LAST_RESULT)return;const text=shareText();let ok=false;
 try{await navigator.clipboard.writeText(text);ok=true;}catch{
  const box=node('textarea');box.value=text;box.className='clipboard-fallback';document.body.append(box);box.select();
  try{ok=document.execCommand('copy');}catch{}finally{box.remove();}
 }
 $('#share-status').textContent=t(ok?'copied':'copyFailed');
}
async function shareResult(){if(!LAST_RESULT)return;
 if(navigator.share){try{await navigator.share({title:t('result'),text:shareText()});return;}catch(e){if(e?.name==='AbortError')return;}}
 await copyResult();
}
async function downloadCard(){
 if(!LAST_RESULT)return;const r=LAST_RESULT;
 try{
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#07111f';ctx.fillRect(0,0,1200,630);ctx.fillStyle='#6ee7ff';ctx.font='bold 36px system-ui';ctx.fillText('RankMyIncome',60,72);
  ctx.fillStyle='#dce9f4';ctx.font='24px system-ui';ctx.fillText(t('result'),60,117,1080);
  [[countryName(r.code),r.countryResult,60],[t('world'),r.worldResult,630]].forEach(([label,rank,x])=>{
   const tier=M.getTier(rank.top);ctx.fillStyle='#102238';ctx.fillRect(x,160,510,320);ctx.strokeStyle=tier.color;ctx.strokeRect(x,160,510,320);
   ctx.fillStyle='#dce9f4';ctx.font='26px system-ui';ctx.fillText(label,x+28,209,454);
   ctx.fillStyle=tier.color;ctx.font='bold 39px system-ui';ctx.fillText(tier.name,x+28,293,454);ctx.font='bold 48px system-ui';ctx.fillText(top(rank.top),x+28,366,454);
   ctx.fillStyle='#acbfd2';ctx.font='20px system-ui';ctx.fillText(t('better',{n:percent(100-rank.top)}),x+28,425,454);
  });
  ctx.fillStyle='#acbfd2';ctx.font='21px system-ui';ctx.fillText(`WID.world · ${r.c.dataYear} / ${DATA.world.year} · rankmyincome.com`,60,539,1080);
  ctx.font='17px system-ui';ctx.fillText(DATA.meta.status==='production'?t('footer'):t('preview'),60,581,1080);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Image encoding failed');
  const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='RankMyIncome-result.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('#share-status').textContent=t('downloaded');
 }catch{$('#share-status').textContent=t('downloadFailed');}
}
async function loadData(){
 $('#retry-data').hidden=true;$('#calculate').disabled=true;$('#calculate').textContent=t('loading');clearError();
 try{
  const d=await fetchJSON('index.json');if(!d?.meta?.version||!Array.isArray(d.world?.thresholds)||!d.countries)throw Error('Invalid index');
  DATA=d;buildCountryPicker();
  const requested=new URLSearchParams(location.search).get('country')?.toUpperCase();
  const defaults={en:'US',ko:'KR',ja:'JP',zh:'HK',es:'ES',fr:'FR',de:'AT',pt:'BR'};
  const initial=DATA.countries[requested]?requested:readSaved()?.code||defaults[ACTIVE]||'US';
  setCountry(DATA.countries[initial]?initial:'KR');renderSaved();
  $('#calculate').disabled=false;$('#calculate').textContent=t('calculate');
  $('#preview-banner').textContent=DATA.meta.status==='production'?'':t('preview');$('#preview-banner').classList.toggle('show',DATA.meta.status!=='production');
 }catch{displayError('loadError');$('#retry-data').hidden=false;$('#calculate').textContent=t('calculate');}
}
$('#number-hint').textContent=t('numberHint',{example:number(12345.67,2)});
$('#income-form').addEventListener('submit',calculate);
$('#income').addEventListener('input',()=>{invalidateResult();clearError();});
$('#country-trigger').addEventListener('click',()=>$('#country-menu').hidden?openCountryMenu():closeCountryMenu());
$('#country-search').addEventListener('input',e=>filterCountries(e.target.value));
$('#country-menu').addEventListener('keydown',e=>{
 const visible=[...document.querySelectorAll('.country-option')].filter(x=>!x.hidden),index=visible.indexOf(document.activeElement);
 if(e.key==='Escape'){e.preventDefault();closeCountryMenu(true);}
 else if(e.key==='ArrowDown'){e.preventDefault();visible[Math.min(index+1,visible.length-1)]?.focus();}
 else if(e.key==='ArrowUp'){e.preventDefault();if(index<=0)$('#country-search').focus();else visible[index-1]?.focus();}
 else if(e.key==='Home'&&index>=0){e.preventDefault();visible[0]?.focus();}
 else if(e.key==='End'&&index>=0){e.preventDefault();visible.at(-1)?.focus();}
 else if(e.key==='Enter'&&e.target.id==='country-search'){e.preventDefault();visible[0]?.click();}
});
document.addEventListener('click',e=>{if(!e.target.closest('.country-picker'))closeCountryMenu();});
$('.country-picker').addEventListener('focusout',()=>{setTimeout(()=>{if(!$('.country-picker').contains(document.activeElement))closeCountryMenu();},0);});
$('#goal-target').addEventListener('change',renderGoals);
$('#comparison-panel').addEventListener('toggle',renderComparison);
$('#compare-country').addEventListener('change',renderComparison);
$('#share-result').addEventListener('click',shareResult);$('#copy-result').addEventListener('click',copyResult);$('#download-card').addEventListener('click',downloadCard);$('#save-result').addEventListener('click',saveResult);
$('#forget-result').addEventListener('click',()=>{try{localStorage.removeItem(STORE);renderSaved();$('#share-status').textContent=t('savedEmpty');$('#income').focus();}catch{$('#saved-change').textContent=t('storageError');}});
$('#retry-data').addEventListener('click',loadData);
loadData();
})();
