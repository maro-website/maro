/** Bound workspace requests, including time spent waiting for the auth session. */
export async function workspaceRequest<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("workspace_timeout"));
          controller.abort();
        }, 30_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function workspaceErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (error.message === "WORKSPACE_LIMIT") return "Ke arritur kufirin e workspace-eve të planit tënd.";
    if (error.message === "workspace_timeout") return "Kërkesa zgjati shumë. Të dhënat e shkruara ruhen; provo përsëri.";
    if (error.message === "unauthorized") return "Sesioni ka skaduar. Hyr përsëri dhe provo ruajtjen.";
  }
  return fallback;
}
