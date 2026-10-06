const TIERS = [
  {name:'Challenger', max:0.1, color:'#59d9ff', mark:'C'},
  {name:'Grandmaster', max:1, color:'#ff5b67', mark:'G'},
  {name:'Master', max:5, color:'#b88cff', mark:'M'},
  {name:'Diamond', max:10, color:'#7fe8ff', mark:'D'},
  {name:'Emerald', max:15, color:'#52e6a8', mark:'E'},
  {name:'Platinum', max:25, color:'#6fd9c7', mark:'P'},
  {name:'Gold', max:40, color:'#ffd166', mark:'G'},
  {name:'Silver', max:60, color:'#c7d5e2', mark:'S'},
  {name:'Bronze', max:80, color:'#c68c62', mark:'B'},
  {name:'Iron', max:100, color:'#86909a', mark:'I'}
];

let DATA = null;
let LAST_RESULT = null;
const $ = (s) => document.querySelector(s);

function parseMoney(v){return Number(String(v).replace(/[^0-9.]/g,''))}
function getTier(top){return TIERS.find(t => top <= t.max) || TIERS.at(-1)}
function tierSlug(name){return name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function percentileFromThresholds(value, thresholds){
  if(!Number.isFinite(value) || value <= 0) return 0;
  const sorted=[...thresholds].sort((a,b)=>a[0]-b[0]);
  if(value <= sorted[0][1]) return Math.max(0,sorted[0][0]);
  for(let i=1;i<sorted.length;i++){
    const [p2,v2]=sorted[i], [p1,v1]=sorted[i-1];
    if(value <= v2){
      const a=Math.log(Math.max(v1,1)), b=Math.log(Math.max(v2,1)), x=Math.log(Math.max(value,1));
      const ratio=b===a?0:(x-a)/(b-a);
      return Math.max(p1,Math.min(p2,p1+(p2-p1)*ratio));
    }
  }
  if(sorted.length < 2) return sorted[0]?.[0] || 0;
  const [p1,v1]=sorted.at(-2),[p2,v2]=sorted.at(-1);
  const denom=Math.log(Math.max(v2,1))-Math.log(Math.max(v1,1));
  if(!denom) return p2;
  const slope=(p2-p1)/denom;
  const estimate=p2+slope*(Math.log(Math.max(value,1))-Math.log(Math.max(v2,1)));
  return Math.min(99.99,Math.max(p2,estimate));
}
function topPercent(value,thresholds){return Math.max(0.01,100-percentileFromThresholds(value,thresholds))}
function nicePercent(n){if(n<0.1)return n.toFixed(2);if(n<1)return n.toFixed(2);return n.toFixed(1)}
function tierRange(tier){
  const idx=TIERS.findIndex(t=>t.name===tier.name);
  const better=idx===0?0:TIERS[idx-1].max;
  return {better, worse:tier.max};
}
function progressWithinTier(top,tier){
  const {better,worse}=tierRange(tier);
  if(worse===better) return 100;
  return Math.max(0,Math.min(100,((worse-top)/(worse-better))*100));
}
function nextTier(tier){const idx=TIERS.findIndex(t=>t.name===tier.name); return idx<=0?null:TIERS[idx-1]}
function dataBadge(year){
  if(DATA.meta.status !== 'production') return 'PREVIEW';
  const y=year ?? DATA.meta.referenceYear ?? '';
  return `${DATA.meta.source}${y ? ` ${y}` : ''}`;
}

function renderCard(prefix,top,label,dataYear){
  const tier=getTier(top), next=nextTier(tier), pct=progressWithinTier(top,tier), better=Math.max(0,100-top);
  const card=$(`#${prefix}-card`); card.style.setProperty('--tier',tier.color); card.dataset.tier=tierSlug(tier.name);
  $(`#${prefix}-label`).textContent=label;
  $(`#${prefix}-mark`).textContent=tier.mark;
  $(`#${prefix}-tier`).textContent=tier.name;
  $(`#${prefix}-top`).textContent=`TOP ${nicePercent(top)}%`;
  $(`#${prefix}-better`).textContent=`Higher income than about ${nicePercent(better)}% of adults`;
  $(`#${prefix}-progress`).style.width=`${pct}%`;
  $(`#${prefix}-year`).textContent=dataBadge(dataYear);
  $(`#${prefix}-next`).textContent=next?`Next: ${next.name} · reach the top ${next.max}%`:'Highest tier achieved';
  return {top,tier,best:better};
}
function defaultPlaceholder(code,c){
  if(code==='KR') return '50,000,000';
  if(code==='MY') return '60,000';
  if(c.currency==='JPY') return '6,000,000';
  if(c.currency==='USD') return '75,000';
  return '50,000';
}
function setCountry(code,{close=true}={}){
  const c=DATA.countries[code];
  if(!c) return;
  $('#country').value=code;
  $('#country-trigger-label').textContent=c.name;
  $('#currency').textContent=c.symbol || c.currency;
  $('#income').placeholder=defaultPlaceholder(code,c);
  document.querySelectorAll('.country-option').forEach(el=>el.setAttribute('aria-selected',String(el.dataset.code===code)));
  if(close) closeCountryMenu();
}
function openCountryMenu(){
  const menu=$('#country-menu'), trigger=$('#country-trigger');
  menu.hidden=false; trigger.setAttribute('aria-expanded','true');
  $('#country-search').value='';
  filterCountries('');
  requestAnimationFrame(()=>$('#country-search').focus());
}
function closeCountryMenu(){
  const menu=$('#country-menu'), trigger=$('#country-trigger');
  menu.hidden=true; trigger.setAttribute('aria-expanded','false');
}
function filterCountries(query){
  const q=query.trim().toLowerCase();
  let shown=0;
  document.querySelectorAll('.country-option').forEach(el=>{
    const haystack=`${el.dataset.name} ${el.dataset.code} ${el.dataset.currency}`.toLowerCase();
    const match=!q || haystack.includes(q);
    el.hidden=!match;
    if(match) shown++;
  });
  $('#country-empty').hidden=shown>0;
}
function buildCountryPicker(){
  const host=$('#country-options'); host.innerHTML='';
  Object.entries(DATA.countries)
    .sort((a,b)=>a[1].name.localeCompare(b[1].name))
    .forEach(([code,c])=>{
      const button=document.createElement('button');
      button.type='button'; button.className='country-option'; button.dataset.code=code; button.dataset.name=c.name; button.dataset.currency=c.currency;
      button.setAttribute('role','option'); button.setAttribute('aria-selected','false');
      button.innerHTML=`<span><strong>${c.name}</strong><small>${code} · ${c.currency}</small></span><span class="country-check" aria-hidden="true">✓</span>`;
      button.addEventListener('click',()=>setCountry(code));
      host.appendChild(button);
    });
  $('#country-trigger').addEventListener('click',()=>$('#country-menu').hidden?openCountryMenu():closeCountryMenu());
  $('#country-search').addEventListener('input',e=>filterCountries(e.target.value));
  $('#country-search').addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeCountryMenu();$('#country-trigger').focus();return}
    if(e.key==='Enter'){
      const first=[...document.querySelectorAll('.country-option')].find(el=>!el.hidden);
      if(first) first.click();
    }
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.country-picker')) closeCountryMenu()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && !$('#country-menu').hidden) closeCountryMenu()});
}
function calculate(){
  const code=$('#country').value,c=DATA.countries[code],income=parseMoney($('#income').value),error=$('#error');
  if(!income || income<=0){error.textContent='Enter an annual income greater than 0.';error.classList.add('show');return}
  if(!c || !Array.isArray(c.thresholds) || c.thresholds.length<2){error.textContent='This country does not have enough verified data yet.';error.classList.add('show');return}
  error.classList.remove('show');
  const countryTop=topPercent(income,c.thresholds);
  const worldEquivalent=income/c.pppPerWorldUnit;
  const worldTop=topPercent(worldEquivalent,DATA.world.thresholds);
  const countryResult=renderCard('country',countryTop,c.name,c.dataYear);
  const worldResult=renderCard('world',worldTop,'Worldwide',DATA.world.year ?? DATA.meta.referenceYear);
  LAST_RESULT={country:c.name,countryResult,worldResult};
  $('#results').classList.add('show');
  $('#share-status').textContent='';
  $('#results').scrollIntoView({behavior:'smooth',block:'start'});
}
function shareText(){
  if(!LAST_RESULT) return '';
  return `RankMyIncome result\n${LAST_RESULT.country}: ${LAST_RESULT.countryResult.tier.name} — Top ${nicePercent(LAST_RESULT.countryResult.top)}%\nWorldwide: ${LAST_RESULT.worldResult.tier.name} — Top ${nicePercent(LAST_RESULT.worldResult.top)}%\nhttps://rankmyincome.com/`;
}
async function copyResult(){
  if(!LAST_RESULT) return;
  const text=shareText();
  try{
    await navigator.clipboard.writeText(text);
    $('#share-status').textContent='Result copied — your income amount was not included.';
  }catch{
    const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    $('#share-status').textContent='Result copied — your income amount was not included.';
  }
}
async function shareResult(){
  if(!LAST_RESULT) return;
  const text=shareText();
  if(navigator.share){
    try{await navigator.share({title:'My RankMyIncome result',text});$('#share-status').textContent='Shared.';return}catch(err){if(err?.name==='AbortError')return}
  }
  await copyResult();
}
function buildTierList(){
  const host=$('#tier-list'); host.innerHTML='';
  [...TIERS].reverse().forEach((tier)=>{
    const label=tier.name==='Challenger'?'Top 0.1%':`Top ${tier.max}%`;
    const div=document.createElement('div'); div.className='tier-chip'; div.style.setProperty('--tier',tier.color); div.dataset.tier=tierSlug(tier.name);
    div.innerHTML=`<div class="mini-emblem"><span>${tier.mark}</span></div><strong>${tier.name}</strong><span>${label}</span>`; host.appendChild(div);
  });
}
async function loadData(){
  const res=await fetch('data/income-data.json',{cache:'no-store'});
  if(!res.ok) throw new Error(`Data load failed (${res.status})`);
  const data=await res.json();
  if(!data?.meta || !data?.world?.thresholds || !data?.countries) throw new Error('Invalid data file');
  return data;
}
async function init(){
  buildTierList();
  try{
    DATA=await loadData();
    buildCountryPicker();
    const requested=new URLSearchParams(location.search).get('country')?.toUpperCase();
    const initial=requested && DATA.countries[requested] ? requested : (DATA.countries.KR?'KR':Object.keys(DATA.countries)[0]);
    setCountry(initial,{close:false});
    $('#calculate').addEventListener('click',calculate);
    $('#income').addEventListener('keydown',e=>{if(e.key==='Enter')calculate()});
    $('#share-result').addEventListener('click',shareResult);
    $('#copy-result').addEventListener('click',copyResult);
    if(DATA.meta.status !== 'production') $('#preview-banner').classList.add('show');
  }catch(err){
    $('#preview-banner').textContent='Data could not be loaded. The calculator is temporarily unavailable.';
    $('#preview-banner').classList.add('show');
    $('#calculate').disabled=true;
    console.error(err);
  }
}
document.addEventListener('DOMContentLoaded',init);
