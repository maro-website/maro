// Actual locally built app; no login, provider calls or production configuration writes.

import fs from 'node:fs';

import assert from 'node:assert/strict';

import puppeteer from 'puppeteer-core';

const origin='http://127.0.0.1:3007';

const output='scripts/phase7-data';fs.mkdirSync(output,{recursive:true});

const checks=[];

for(const route of ['generate','edit','edit-html','audio','chat']){

  const response=await fetch(`${origin}/api/ai/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});

  assert.equal(response.status,403,route);assert.equal((await response.json()).error,'module_unavailable');checks.push(`${route}: blocked before generation`);

}

for(const [tool,expected] of [['reklama',2],['logo',1]]){

  const response=await fetch(`${origin}/api/ai/image/models?toolId=${tool}`);assert.equal(response.status,200);const {models}=await response.json();assert.equal(models.length,expected);assert.ok(models.every(m=>m.customerCredits===5));assert.equal(models.find(m=>m.isDefault).key,'flare');assert.ok(models.every(m=>!('providerModelId' in m)));checks.push(`${tool}: actual model projection, five credits`);

}

const denied=await fetch(`${origin}/api/ai/image`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({toolId:'reklama',prompt:'Local authentication rejection check'})});assert.equal(denied.status,401);checks.push('image: unauthenticated request denied');

for(const route of ['configuration','operations','logo-content']){const response=await fetch(`${origin}/api/admin/v1/${route}`);assert.equal(response.status,403);checks.push(`admin ${route}: unauthenticated request denied`);}

const cron=await fetch(`${origin}/api/cron/reconcile-stale-jobs`);assert.ok([401,503].includes(cron.status));checks.push('cron: missing secret or authorization fails closed; no reconciliation');

const browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-extensions','--no-first-run']});

try{

 const page=await browser.newPage();await page.setViewport({width:1440,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));

 await page.setRequestInterception(true);page.on('request',r=>r.method()==='POST'&&r.url().includes('/api/ai/')?r.abort():r.continue());

 const click=async text=>{const found=await page.evaluate(text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);if(!b)return false;b.click();return true;},text);assert.ok(found,text);};

 for(const [route,expected] of [['/','Cka po marojna sot'],['/imazh','Ktheje idenë'],['/web','Së shpejti'],['/filma','Së shpejti'],['/audio','Së shpejti'],['/marketing','Së shpejti'],['/prompts','maroPresets'],['/brain','maroBrain'],['/krijimet','krijim']]){

  const response=await page.goto(origin+route,{waitUntil:'networkidle2'});assert.equal(response.status(),200,route);await page.waitForFunction(text=>document.body.innerText.includes(text),{timeout:15000},expected).catch(async error=>{fs.writeFileSync(`${output}/page-failure.txt`,await page.$eval('body',b=>b.innerText));throw error;});const body=await page.$eval('body',b=>b.innerText);assert.ok(body.includes(expected),route);assert.ok(!body.includes('maroFort'),route);await page.screenshot({path:`${output}/${route==='/'?'hub':route.slice(1)}.png`});checks.push(`${route}: actual page renders, no Fort controls`);

 }

 await page.goto(origin+'/marologo',{waitUntil:'networkidle2'});if(await page.$('button'))await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='E kuptova')?.click());

 await click('Nise brief-in');await page.type('input[placeholder="p.sh. Luma"]','Phase 7 local check');await page.type('textarea','A synthetic creative studio for the local interface audit.');await click('Vazhdo te drejtimi kreativ');await page.waitForFunction(()=>document.body.innerText.includes('Jepi një ndjesi'));await click('Minimal');await click('Zgjedh prezantimin');await page.waitForFunction(()=>document.body.innerText.includes('Maroje logon'));

 const logo=await page.$eval('body',b=>b.innerText);assert.match(logo,/Maroje logon\s*5/);assert.ok(!logo.includes('Sunburst'));assert.ok(!logo.includes('maroBrain'));await page.screenshot({path:`${output}/logo.png`});checks.push('Logo: structured Wizard through presentation, five credits, no Brain/model selector; no generation');

 assert.deepEqual(errors,[]);checks.push('actual pages: no JavaScript runtime errors');

 fs.writeFileSync(`${output}/browser-results.json`,JSON.stringify({checks,passed:checks.length,providerCalls:0,scope:'actual local production build, logged out; Supabase read-only config'},null,2));console.log(JSON.stringify({passed:checks.length,checks}));

}finally{await browser.close();}

