import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('disabled scheduler exits without calling the application',async()=>{
  const child=spawn(process.execPath,['tools/raiaccept-reconcile.mjs'],{env:{...process.env,RAIACCEPT_ENABLED:'false'},stdio:'pipe'});
  const [code]=await once(child,'exit');assert.equal(code,0);
});
test('configured scheduler stays alive and sends an authenticated POST to the local app',{timeout:20_000},async()=>{
  let received;
  const request=new Promise(resolve=>{received=resolve;});
  const server=createServer((req,res)=>{
    received({method:req.method,path:req.url,authorization:req.headers.authorization});
    res.writeHead(200,{'content-type':'application/json'});res.end('{}');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const child=spawn(process.execPath,['tools/raiaccept-reconcile.mjs'],{env:{...process.env,PORT:String(server.address().port),
    RAIACCEPT_ENABLED:'true',RAIACCEPT_RECOVERY_ENABLED:'true',CRON_SECRET:'synthetic-cron-fixture'},stdio:'pipe'});
  const exited=once(child,'exit');
  try {
    const actual=await Promise.race([request,exited.then(()=>{throw new Error('scheduler_exited_before_poll');})]);
    assert.deepEqual(actual,{method:'POST',path:'/api/cron/raiaccept-reconcile',authorization:'Bearer synthetic-cron-fixture'});
  } finally {child.kill();await exited;server.close();}
});
