/**
 * Client disconnect scope for image SSE routes.
 * Aborts in-flight provider work only until the single provider attempt has started.
 */
export interface ImageClientAbortScope {
  /** Signal linked to client disconnect before provider attempt starts. */
  abortSignal: AbortSignal;
  /** True once the provider attempt stamp fires — provider runs to completion. */
  markProviderAttemptStarted(): void;
  /** Whether the incoming request signal has aborted. */
  clientDisconnected: boolean;
}

export function createImageClientAbortScope(clientRequest: Request): ImageClientAbortScope {
  const ac = new AbortController();
  let providerAttemptStarted = false;

  const onClientAbort = () => {
    if (!providerAttemptStarted) ac.abort();
  };

  if (clientRequest.signal.aborted) onClientAbort();
  else clientRequest.signal.addEventListener("abort", onClientAbort, { once: true });

  return {
    abortSignal: ac.signal,
    markProviderAttemptStarted() {
      providerAttemptStarted = true;
    },
    get clientDisconnected() {
      return clientRequest.signal.aborted;
    },
  };
}
