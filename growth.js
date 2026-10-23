'use strict';
(()=>{
 const $=s=>document.querySelector(s),config=JSON.parse($('#tool-config').textContent),{d,g,kind}=config;
 const M=globalThis.RankMath,T=globalThis.IncomeTools,lang=document.documentElement.lang,home=document.body.dataset.locale==='en'?'/':`/${document.body.dataset.locale}/`;
 const nf=new Intl.NumberFormat(lang,{maximumFractionDigits:2}),names=new Intl.DisplayNames([lang],{type:'region'}),n=v=>nf.format(v);
 const txt=(k,vars={})=>(d[k]||g[k]).replace(/\{(\w+)\}/g,(_,key)=>vars[key]??`{${key}}`);
 const top=v=>txt('top',{n:new Intl.NumberFormat(lang,{maximumFractionDigits:v<.001?5:v<.01?4:v<.1?3:v<1?2:1}).format(v)});
 const money=(v,c)=>new Intl.NumberFormat(lang,{style:'currency',currency:c.currency,currencyDisplay:'code',maximumFractionDigits:2}).format(v);
 const node=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;};
 if(kind==='ranking'){
  const body=$('#ranking-table tbody'),rows=[...body.rows];
  function filter(){const q=$('#ranking-search').value.normalize('NFKC').toLocaleLowerCase(lang).trim(),sort=$('#ranking-sort').value;rows.sort((a,b)=>sort==='name'?a.dataset.country.localeCompare(b.dataset.country,lang):(Number(a.dataset.value)-Number(b.dataset.value))*(sort==='asc'?1:-1));let count=0;for(const r of rows){r.hidden=!r.dataset.country.normalize('NFKC').toLocaleLowerCase(lang).includes(q);if(!r.hidden)count++;body.append(r);}$('#ranking-status').textContent=count?`${n(count)} / ${n(rows.length)}`:g.noResults;}
  $('#ranking-search').addEventListener('input',filter);$('#ranking-sort').addEventListener('change',filter);
  $('#ranking-download').addEventListener('click',()=>{const csv=[...$('#ranking-table').rows].filter(r=>!r.hidden).map(r=>[...r.cells].map(c=>'"'+c.textContent.replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n');const u=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=node('a');a.href=u;a.download='rankmyincome-thresholds.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});filter();return;
 }
 let catalog,revision=0;const cache=new Map(),output=$('#tool-result'),form=$('#tool-form');
 async function fetchJSON(file){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch(document.body.dataset.source+file,{signal:controller.signal});if(!r.ok)throw Error('Data unavailable');return await r.json();}finally{clearTimeout(timer);}}
 async function country(code){if(!catalog?.countries[code])throw Error('Unknown country');if(!cache.has(code))cache.set(code,fetchJSON(code+'.json').catch(e=>{cache.delete(code);throw e;}));return cache.get(code);}
 function error(text){$('#tool-error').textContent=text;$('#tool-error').classList.toggle('show',!!text);}
 function stats(entries){const grid=node('div',undefined,'goal-grid');for(const [label,value] of entries){const card=node('article',undefined,'goal-card');card.append(node('h3',label),node('strong',value,'goal-value'));grid.append(card);}output.append(grid);}
 function table(headers,rows,caption){const wrap=node('div',undefined,'threshold-table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',caption);const tab=node('table',undefined,'threshold-table');tab.append(node('caption',caption));const thead=node('thead'),hr=node('tr');for(const label of headers){const th=node('th',label);th.scope='col';hr.append(th);}thead.append(hr);tab.append(thead);const body=node('tbody');for(const row of rows){const tr=node('tr');row.forEach((text,i)=>{const td=node(i?'td':'th',String(text));if(!i)td.scope='row';tr.append(td);});body.append(tr);}tab.append(body);wrap.append(tab);output.append(wrap);}
 function bars(items){const list=node('div',undefined,'distribution-bars'),max=Math.max(...items.map(x=>x[1]));list.setAttribute('role','img');list.setAttribute('aria-label',items.map(([label,v])=>`${label}: ${n(v)}`).join('; '));for(const [label,v] of items){const row=node('div',undefined,'distribution-row');row.append(node('span',label));const track=node('div',undefined,'distribution-track'),bar=node('span');bar.style.width=`${max?Math.max(0,v/max*100):0}%`;track.append(bar);row.append(track,node('strong',n(v)));list.append(row);}output.append(list,node('p',g.distributionNote,'hint'));}
 const targetInfo=(target,c)=>{const exact=c.thresholds.find(([p])=>Math.abs(p-(100-target))<1e-9);const value=exact?exact[1]:M.incomeForTop(target,c.thresholds);return{value,label:exact?g.published:M.outsideRange(value,c.thresholds)?g.estimate:g.interpolated};};
 function rank(amount,c,code,label){const ct=M.topPercent(amount,c.thresholds),wt=M.topPercent(amount/c.pppPerWorldUnit,catalog.world.thresholds);stats([[label+' · '+names.of(code),top(ct)+' · '+M.getTier(ct).name],[label+' · '+d.world,top(wt)+' · '+M.getTier(wt).name]]);if(M.outsideRange(amount,c.thresholds)||M.outsideRange(amount/c.pppPerWorldUnit,catalog.world.thresholds))output.append(node('p',d.extrapolated,'range-note'));}
 function currency(){const c=catalog?.countries[$('#tool-country').value];if(c)$('#tool-currency').textContent=`${c.currency} · ${d.currencyNote}`;}
 function links(code){const area=node('div',undefined,'growth-links');for(const [path,label] of [[`${home}?country=${code}`,g.rankLink],[`${home}countries/${catalog.countries[code].slug}/`,d.browse],[`${home}tools/income-goal/?country=${code}`,g.incomeGoal],[`${home}tools/income-distribution/?country=${code}`,g.distribution]]){const a=node('a',label+' →');a.href=path;area.append(a);}output.append(node('p',g.handoffNote,'hint'),area);}
 let formState;
 function state(){return JSON.stringify([...form.elements].filter(el=>el.name).map(el=>[el.name,el.value]));}
 function invalidate(){const next=state();if(next===formState)return;formState=next;revision++;output.replaceChildren();error('');currency();$('#tool-submit').disabled=!catalog;$('#tool-submit').textContent=d.calculate;}
 async function calculate(event){event?.preventDefault();if(!catalog)return;formState=state();const seq=++revision;output.replaceChildren();error('');const code=$('#tool-country').value,amount=$('#tool-income')?M.parseMoney($('#tool-income').value,lang):0;
  if($('#tool-income')&&(!Number.isFinite(amount)||amount<0||(['raise-calculator','income-goal'].includes(kind)&&amount===0))){error(g.invalid);$('#tool-income').focus();return;}
  for(const input of form.querySelectorAll('input[type=number]')){if(!input.value||!input.checkValidity()){error(g.invalid);input.focus();return;}}
  $('#tool-submit').disabled=true;$('#tool-submit').textContent=d.loading;
  try{
   const c=await country(code);if(seq!==revision)return;
   output.append(node('h2',g.result),node('p',`${names.of(code)} · ${c.currency} · ${txt('dataNote',{year:c.dataYear,ppp:c.pppYear,world:catalog.world.year})}`,'hint'));
   if(kind==='top-income'||kind==='income-goal'){
    const target=Number($('#tool-target').value),info=targetInfo(target,c),required=M.incomeForTop(target,c.thresholds);
    stats([[top(target),money(info.value,c)],[d.monthly,money(info.value/12,c)],[d.source,info.label]]);
    if(kind==='income-goal'){const gap=Math.max(0,required-amount);stats([[d.gap,money(gap,c)],[g.increase,n(gap/amount*100)+'%'],[d.tiers,M.getTier(M.topPercent(amount,c.thresholds)).name+' → '+M.getTier(target).name]]);if(!gap)output.append(node('p',d.reached));rank(amount,c,code,g.before);}
    table([d.rank,d.annual,d.source],[50,25,10,5,1,.1].map(x=>{const a=targetInfo(x,c);return[top(x),money(a.value,c),a.label];}),g.summary);
   }else if(kind==='salary-converter'){
    const hours=Number($('#tool-hours').value),days=Number($('#tool-days').value),weeks=Number($('#tool-weeks').value),annual=T.annualize(amount,$('#tool-period').value,hours,days,weeks);if(!Number.isFinite(annual))throw new RangeError();
    stats(Object.entries(T.payPeriods(annual,hours,days,weeks)).map(([k,v])=>[d[k]||g[k],money(v,c)]));output.append(node('p',g.grossNote));
   }else if(kind==='raise-calculator'){
    const result=T.raise(amount,Number($('#tool-rate').value),Number($('#tool-inflation').value));if(!result)throw new RangeError();
    stats([[g.newIncome,money(result.next,c)],[g.annualIncrease,money(result.annual,c)],[g.monthlyIncrease,money(result.monthly,c)],[g.realRaise,n(result.real)+'%']]);rank(amount,c,code,g.before);rank(result.next,c,code,g.after);output.append(node('p',g.rankNote));
   }else if(kind==='global-income'){
    rank(amount,c,code,g.current);const pp=amount/c.pppPerWorldUnit;stats([['USD PPP',n(pp)]]);table([d.rank,'USD PPP',c.currency,d.source],[50,25,10,5,1,.1].map(x=>{const a=targetInfo(x,catalog.world);return[top(x),n(a.value),money(a.value*c.pppPerWorldUnit,c),a.label];}),d.world+' · '+catalog.world.year);
   }else if(kind==='income-distribution'){
    const pts=[10,25,50,75,90,95,99,99.9].map(p=>[p,c.thresholds.find(([x])=>x===p)?.[1]]).filter(([,v])=>v!==undefined);bars(pts.map(([p,v])=>['p'+p,v]));table([d.rank,c.currency,d.source],pts.map(([p,v])=>['p'+p+' · '+top(100-p),money(v,c),g.published]),g.distribution+' · '+c.dataYear);
   }else if(kind==='compare'||kind==='ppp-comparison'){
    const otherCode=$('#tool-other').value,other=await country(otherCode);if(seq!==revision)return;
    const converted=T.ppp(amount,c.pppPerWorldUnit,other.pppPerWorldUnit);if(!Number.isFinite(converted)||converted>Number.MAX_SAFE_INTEGER)throw new RangeError();
    stats([[names.of(code),money(amount,c)],[names.of(otherCode)+' · '+g.samePPP,money(converted,other)]]);output.append(node('p',`${names.of(otherCode)} · ${txt('dataNote',{year:other.dataYear,ppp:other.pppYear,world:catalog.world.year})}`,'hint'),node('p',g.pppNote));rank(amount,c,code,g.before);rank(converted,other,otherCode,g.after);
    table([d.rank,`${names.of(code)} (${c.currency})`,`${names.of(otherCode)} (${other.currency})`,'USD PPP · '+names.of(code),'USD PPP · '+names.of(otherCode)],[50,25,10,5,1].map(x=>{const a=targetInfo(x,c).value,b=targetInfo(x,other).value;return[top(x),money(a,c),money(b,other),n(a/c.pppPerWorldUnit),n(b/other.pppPerWorldUnit)];}),g.published+' · '+g.summary);
    bars([[names.of(code)+' · USD PPP',targetInfo(50,c).value/c.pppPerWorldUnit],[names.of(otherCode)+' · USD PPP',targetInfo(50,other).value/other.pppPerWorldUnit]]);
   }
   if(seq===revision)links(code);
  }catch(e){if(seq===revision){output.replaceChildren();error(e instanceof RangeError?g.invalid:d.loadError);$('#tool-retry').hidden=e instanceof RangeError;}}
  finally{if(seq===revision){$('#tool-submit').disabled=false;$('#tool-submit').textContent=d.calculate;}}
 }
 async function load(){error('');$('#tool-retry').hidden=true;try{catalog=await fetchJSON('index.json');const entries=Object.keys(catalog.countries).sort((a,b)=>names.of(a).localeCompare(names.of(b),lang)),params=new URLSearchParams(location.search);for(const id of ['#tool-country','#tool-other']){const s=$(id);if(!s)continue;s.replaceChildren(...entries.map(code=>{const o=node('option',names.of(code)+' · '+catalog.countries[code].currency);o.value=code;return o;}));const requested=params.get(id==='#tool-country'?'country':'other')?.toUpperCase();s.value=catalog.countries[requested]?requested:id==='#tool-country'?config.defaultCountry:'JP';}currency();$('#tool-submit').disabled=false;$('#tool-submit').textContent=d.calculate;
 const target=$('#tool-target');if(target&&[...target.options].some(o=>o.value===params.get('target')))target.value=params.get('target');
 // Country context is safe to carry across languages; income amounts never enter URLs.
 for(const a of document.querySelectorAll('[data-language-link]')){const u=new URL(a.href);u.searchParams.set('country',$('#tool-country').value);if($('#tool-other'))u.searchParams.set('other',$('#tool-other').value);a.href=u.href;}
 if(['top-income','income-distribution'].includes(kind))await calculate();
 }catch{catalog=null;error(d.loadError);$('#tool-retry').hidden=false;}}
 form.addEventListener('submit',calculate);form.addEventListener('input',invalidate);form.addEventListener('change',()=>{invalidate();for(const a of document.querySelectorAll('[data-language-link]')){const u=new URL(a.href);u.searchParams.set('country',$('#tool-country').value);if($('#tool-other'))u.searchParams.set('other',$('#tool-other').value);a.href=u.href;}});$('#tool-retry').addEventListener('click',()=>catalog?calculate():load());load();
})();
