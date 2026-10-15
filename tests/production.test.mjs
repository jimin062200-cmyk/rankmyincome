import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const reports=fs.mkdtempSync(path.join(os.tmpdir(),'rmi-checker-tests-'));

// Exercise the deployment checker against built pages without contacting production.
const fixture=`
 import fs from 'node:fs';
 globalThis.fetch=async(value,options={})=>{
  const url=new URL(value),pathname=url.pathname;
  if(pathname==='/index.html'&&options.redirect==='manual')return new Response('',{status:308,headers:{location:'/'}});
  let file='dist'+pathname;if(pathname.endsWith('/'))file+='index.html';
  if(!fs.existsSync(file))return new Response('Not found',{status:404});
  let body=fs.readFileSync(file,'utf8');
  if(pathname==='/build-info.json')body=JSON.stringify({...JSON.parse(body),commit:process.env.SIMULATE==='old-commit'?'b'.repeat(40):process.env.EXPECTED_COMMIT});
  const headers={'x-content-type-options':'nosniff','cache-control':'public, max-age=31536000, immutable'};
  if(process.env.SIMULATE==='noindex'&&pathname==='/ko/')headers['x-robots-tag']='noindex';
  if(process.env.SIMULATE==='uncached'&&pathname.includes('/assets/'))headers['cache-control']='no-store';
  return new Response(body,{status:200,headers});
 };
 await import('./scripts/verify-production.mjs');
`;
for(const [scenario,success] of [['healthy',true],['old-commit',false],['noindex',false],['uncached',false]]) {
 test(`deployment checker ${success?'accepts':'rejects'} ${scenario}`,()=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',fixture],{encoding:'utf8',timeout:30000,env:{...process.env,EXPECTED_COMMIT:'a'.repeat(40),DEPLOY_ATTEMPTS:'1',SIMULATE:scenario,VERIFICATION_REPORT:path.join(reports,scenario+'.json')}});
  assert.equal(result.error,undefined);
  assert.equal(result.status,success?0:1,result.stdout+result.stderr);
 });
}
