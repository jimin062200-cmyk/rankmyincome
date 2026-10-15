/* Forward calculation preserved from c884246; see DATA_POLICY.md. */
(function(root){
const TIERS=[{name:'Challenger',max:.1,color:'#59d9ff',mark:'C'},{name:'Grandmaster',max:1,color:'#ff5b67',mark:'G'},{name:'Master',max:5,color:'#b88cff',mark:'M'},{name:'Diamond',max:10,color:'#7fe8ff',mark:'D'},{name:'Emerald',max:15,color:'#52e6a8',mark:'E'},{name:'Platinum',max:25,color:'#6fd9c7',mark:'P'},{name:'Gold',max:40,color:'#ffd166',mark:'G'},{name:'Silver',max:60,color:'#c7d5e2',mark:'S'},{name:'Bronze',max:80,color:'#c68c62',mark:'B'},{name:'Iron',max:100,color:'#86909a',mark:'I'}];
function percentileFromThresholds(v,t){if(!Number.isFinite(v)||v<=0)return 0;const s=[...t].sort((a,b)=>a[0]-b[0]);if(!s.length)return 0;const[f,x]=s[0];if(v<x){if(x<=0)return 0;const r=Math.max(0,Math.min(1,v/x));return Math.max(0,Math.min(f,f*r))}for(let i=1;i<s.length;i++){const[p2,v2]=s[i],[p1,v1]=s[i-1];if(v<=v2){const a=Math.log(Math.max(v1,1)),b=Math.log(Math.max(v2,1)),z=Math.log(Math.max(v,1)),r=b===a?0:(z-a)/(b-a);return Math.max(p1,Math.min(p2,p1+(p2-p1)*r))}}if(s.length<2)return s[0]?.[0]||0;const[p1,v1]=s.at(-2),[p2,v2]=s.at(-1),d=Math.log(Math.max(v2,1))-Math.log(Math.max(v1,1));if(!d)return p2;return Math.min(99.99999,Math.max(p2,p2+(p2-p1)/d*(Math.log(Math.max(v,1))-Math.log(Math.max(v2,1)))))}
function topPercent(v,t){return Math.min(100,Math.max(.00001,100-percentileFromThresholds(v,t)))}function nicePercent(n){if(!Number.isFinite(n))return'0';if(n<.001)return n.toFixed(5);if(n<.01)return n.toFixed(4);if(n<.1)return n.toFixed(3);if(n<1)return n.toFixed(2);return n.toFixed(1)}function tierRange(t){const i=TIERS.findIndex(e=>e.name===t.name);return{better:i===0?0:TIERS[i-1].max,worse:t.max}}function progressWithinTier(t,e){const{better:n,worse:r}=tierRange(e);return r===n?100:Math.max(0,Math.min(100,(r-t)/(r-n)*100))}function nextTier(t){const i=TIERS.findIndex(e=>e.name===t.name);return i<=0?null:TIERS[i-1]}
function parseMoney(value, locale='en') {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const decimal = parts.find(p => p.type === 'decimal').value;
  const group = parts.find(p => p.type === 'group')?.value.normalize('NFKC') || ',';
  const raw = String(value).normalize('NFKC').trim();
  if (!raw || /[^0-9., \u00a0\u202f]/.test(raw)) return NaN;
  const split = raw.split(decimal);
  if (split.length > 2 || (split.length === 2 && !/^\d+$/.test(split[1]))) return NaN;
  let whole = split[0];
  if (whole.includes(group)) {
    const chunks = whole.split(group);
    if (!/^\d{1,3}$/.test(chunks[0]) || chunks.slice(1).some(x => !/^\d{3}$/.test(x))) return NaN;
    whole = chunks.join('');
  }
  if (!/^\d+$/.test(whole)) return NaN;
  const n = Number(whole + (split.length === 2 ? '.' + split[1] : ''));
  return Number.isFinite(n) && n <= Number.MAX_SAFE_INTEGER ? n : NaN;
}
// Invert the existing forward function, including its clamping and flat segments.
// Return the lowest income reaching the requested top percentage.
function incomeForTop(target, thresholds) {
  if (!Number.isFinite(target) || target < .00001 || target >= 100 || !thresholds?.length) return NaN;
  // 100 - 99.99999 is slightly above 0.00001 in IEEE-754 arithmetic.
  // Honor the existing cap without changing the forward calculator.
  const effectiveTarget = Math.max(target, 100 - 99.99999);
  let low = 0, high = Math.max(1, thresholds.at(-1)[1]);
  while (topPercent(high, thresholds) > effectiveTarget) {
    high *= 2;
    if (!Number.isFinite(high)) return NaN;
  }
  for (let i = 0; i < 90; i++) {
    const mid = low + (high - low) / 2;
    if (topPercent(mid, thresholds) <= effectiveTarget) high = mid;
    else low = mid;
  }
  return high;
}
function outsideRange(income, thresholds) {
  return income < thresholds[0][1] || income > thresholds.at(-1)[1];
}
function getTier(t){return TIERS.find(e=>t<=e.max)||TIERS.at(-1)}
const api={TIERS,percentileFromThresholds,topPercent,nicePercent,tierRange,progressWithinTier,nextTier,getTier,parseMoney,incomeForTop,outsideRange};
if(typeof module !== 'undefined' && module.exports) module.exports=api;
else root.RankMath=api;
})(globalThis);
