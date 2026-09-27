const PREVIEW_RUNTIME_CSP =
  "default-src 'none'; " +
  "script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; " +
  "style-src 'unsafe-inline' https:; " +
  "font-src https: data:; img-src https: data: blob:; " +
  "connect-src https:; media-src https: data: blob:; " +
  "frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";

const RUNTIME_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body>
<script>
(function(){
  var channel = new URLSearchParams(location.search).get('channel') || '';
  function ready(){
    parent.postMessage({source:'maro-preview-runtime',channel:channel,type:'ready'}, '*');
  }
  addEventListener('message', function(event){
    var message = event.data;
    if(event.source !== parent || !message || message.source !== 'maro-preview-host' || message.channel !== channel || message.type !== 'render' || typeof message.html !== 'string') return;
    document.open();
    document.write(message.html);
    document.close();
  });
  ready();
  setTimeout(ready, 50);
  setTimeout(ready, 250);
})();
</script>
</body>
</html>`;

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(RUNTIME_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": PREVIEW_RUNTIME_CSP,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
