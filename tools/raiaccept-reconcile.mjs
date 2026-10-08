// Awaited, sequential polling in the web container. Financial ownership/leases live in PostgreSQL.
// The separate AI reconciliation service is unchanged.
const port=process.env.PORT||"3000";
const secret=process.env.CRON_SECRET?.trim();
if (process.env.RAIACCEPT_ENABLED!=="true"||process.env.RAIACCEPT_RECOVERY_ENABLED!=="true"||!secret) process.exit(0);
const target=`http://127.0.0.1:${port}/api/cron/raiaccept-reconcile`;
let stopped=false;let lastFailure="";
const stop=()=>{stopped=true;process.exit(0);};
process.on("SIGTERM",stop);process.on("SIGINT",stop);
const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
await pause(10_000);
while (!stopped) {
  try {
    const response=await fetch(target,{method:"POST",headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(120_000)});
    const failure=response.ok?"":`http_${response.status}`;
    if (failure&&failure!==lastFailure) console.error("raiaccept_scheduler_unavailable",failure);
    lastFailure=failure;
    await response.body?.cancel();
  } catch {
    if (lastFailure!=="request_failed") console.error("raiaccept_scheduler_unavailable","request_failed");
    lastFailure="request_failed";
  }
  // No overlapping requests. Leases also protect deployments and multiple replicas.
  await pause(120_000);
}
