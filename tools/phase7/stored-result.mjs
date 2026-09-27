// Read existing, explicitly approved synthetic Phase 5 result. No provider call or data mutation.
import {createClient} from '@supabase/supabase-js';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const generationId='4de70086-3fee-4929-aeac-415b259ef42b';
const {data:row,error}=await db.from('generations').select('id,job_id,user_id,workspace_id,credits_spent,output_urls').eq('id',generationId).single();
assert.ok(!error,'existing generation read');assert.equal(row.credits_spent,5);assert.equal(row.job_id,'e010ed82-07a4-40b7-86a4-8b4048f33d6a');
const ref=row.output_urls[0];assert.ok(ref.startsWith(`storage:generations/${row.user_id}/`));
const signed=await db.storage.from('generations').createSignedUrl(ref.slice('storage:generations/'.length),120);assert.ok(!signed.error,'private result signing');
const browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-extensions','--no-first-run']});
try{
 const page=await browser.newPage();await page.setContent('<html><body style="background:white"><h1>Existing synthetic Phase 5 result</h1><img style="max-height:800px" /></body></html>');
 await page.$eval('img',(img,url)=>{img.src=url;},signed.data.signedUrl);
 await page.waitForFunction(()=>document.querySelector('img').naturalWidth>0,{timeout:20000});
 const size=await page.$eval('img',img=>({width:img.naturalWidth,height:img.naturalHeight}));
 await page.screenshot({path:'scripts/phase7-data/stored-result.png'});
 const report={generationId,jobId:row.job_id,credits:row.credits_spent,stableReference:true,privateSignedImageRenders:true,size,scope:'service-role read and signed image render; not an authenticated user-history browser test',providerCalls:0};
 fs.writeFileSync('scripts/phase7-data/stored-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
