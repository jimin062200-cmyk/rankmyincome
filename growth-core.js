/* Derived tools reuse RankMath; the statistical engine and dataset are unchanged. */
(function(root){
'use strict';
function annualize(amount,period,hours=40,days=5,weeks=52){
 if(![amount,hours,days,weeks].every(Number.isFinite)||amount<0||hours<=0||hours>168||days<=0||days>7||weeks<=0||weeks>53)return NaN;
 const factors={annual:1,monthly:12,weekly:weeks,daily:days*weeks,hourly:hours*weeks};
 const value=amount*factors[period];return Number.isFinite(value)&&value<=Number.MAX_SAFE_INTEGER?value:NaN;
}
function payPeriods(annual,hours=40,days=5,weeks=52){return {annual,monthly:annual/12,weekly:annual/weeks,daily:annual/(weeks*days),hourly:annual/(weeks*hours)};}
function raise(current,rate,inflation=0){
 if(![current,rate,inflation].every(Number.isFinite)||current<=0||rate<=-100||inflation<=-100)return null;
 const next=current*(1+rate/100);if(!Number.isFinite(next)||next>Number.MAX_SAFE_INTEGER)return null;
 return {next,annual:next-current,monthly:(next-current)/12,real:((1+rate/100)/(1+inflation/100)-1)*100};
}
function ppp(amount,from,to){if(![amount,from,to].every(Number.isFinite)||amount<0||from<=0||to<=0)return NaN;return amount/from*to;}
const api={annualize,payPeriods,raise,ppp};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IncomeTools=api;
})(globalThis);
