const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const M=require('../calculator-core.js'),data=JSON.parse(fs.readFileSync('data/income-data.json','utf8'));
const legacy=vm.createContext({document:{documentElement:{lang:'en'},addEventListener(){}}});
vm.runInContext(fs.readFileSync('tests/fixtures/legacy-calculator.js','utf8'),legacy);
const distributions=[['world',data.world],...Object.entries(data.countries)];
test('forward results and tiers agree exactly with the pre-upgrade calculator for every country and world distribution',()=>{
 let count=0;
 for(const [code,c] of distributions){
  const p=c.thresholds,values=[0,1,p[0][1]/2,p.at(-1)[1]*2,p.at(-1)[1]*1e6];
  for(let i=0;i<p.length;i++){values.push(p[i][1]*(1-1e-9),p[i][1],p[i][1]*(1+1e-9));if(i)values.push(Math.sqrt(p[i-1][1]*p[i][1]));}
  for(const v of values){const actual=M.topPercent(v,p),expected=legacy.topPercent(v,p);assert.equal(actual,expected,`${code}: ${v}`);assert.equal(M.getTier(actual).name,legacy.getTier(expected).name);count++;}
 }
 console.log(`Compared ${count} forward calculations with commit c884246.`);
});
test('known logarithmic midpoint, lower tail and tier boundary examples',()=>{
 assert.equal(M.topPercent(Math.sqrt(100*10000),[[50,100],[90,10000]]),30);
 assert.equal(M.topPercent(50,[[50,100],[90,10000]]),75);
 for(const [v,tier] of [[.1,'Challenger'],[1,'Grandmaster'],[5,'Master'],[10,'Diamond'],[15,'Emerald'],[25,'Platinum'],[40,'Gold'],[60,'Silver'],[80,'Bronze'],[100,'Iron']])assert.equal(M.getTier(v).name,tier);
});
test('targets round-trip through original forward definitions for all distributions and every tier',()=>{
 for(const [code,c] of distributions)for(const target of [80,60,50,40,25,15,10,5,1,.1,.01,.00001]){
  const income=M.incomeForTop(target,c.thresholds);assert.ok(Number.isFinite(income)&&income>0,code);
  assert.ok(Math.abs(M.topPercent(income,c.thresholds)-target)<1e-7,`${code}: ${target}`);
 }
 assert.ok(Number.isNaN(M.incomeForTop(0,data.world.thresholds)));
});
test('worldwide PPP targets reach identical results in every local currency',()=>{
 for(const [code,c] of Object.entries(data.countries))for(const target of [50,10,1,.1]){
  const amount=M.incomeForTop(target,data.world.thresholds)*c.pppPerWorldUnit;
  assert.ok(Math.abs(M.topPercent(amount/c.pppPerWorldUnit,data.world.thresholds)-target)<1e-8,code);
 }
});
test('locale numbers are read exactly and invalid or negative inputs never become positive incomes',()=>{
 for(const [l,s,n] of [['en','50,000,000',50000000],['ko','12,345.67',12345.67],['ja','５０,０００',50000],['zh-CN','12,345.67',12345.67],['de','12.345,67',12345.67],['es','12.345,67',12345.67],['pt-BR','12.345,67',12345.67],['fr','12\u202f345,67',12345.67],['fr','12 345,67',12345.67]])assert.equal(M.parseMoney(s,l),n,`${l} ${s}`);
 for(const s of ['-50','abc500','1e6','12,34','Infinity','12.2.3','','9'.repeat(40),'123 USD','12 345'])assert.ok(Number.isNaN(M.parseMoney(s,'en')),s);
 assert.equal(M.parseMoney('0'),0);
});
test('production dataset is byte-identical to the audit baseline',()=>{
 const expected=fs.readFileSync('tests/fixtures/dataset.sha256','utf8').trim();
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data/income-data.json')).digest('hex'),expected);
});
