/** Pause background polling without refreshing application state on tab return. */
export function startVisiblePoll(
  page: Pick<Document, "hidden" | "addEventListener" | "removeEventListener">,
  timers: Pick<Window, "setInterval" | "clearInterval">,
  callback: () => void,
  intervalMs: number
): () => void {
  let interval: number | undefined;
  const update = () => {
    timers.clearInterval(interval);
    interval = undefined;
    if (!page.hidden) interval = timers.setInterval(callback, intervalMs);
  };
  if (!page.hidden) callback();
  update();
  page.addEventListener("visibilitychange", update);
  return () => {
    timers.clearInterval(interval);
    page.removeEventListener("visibilitychange", update);
  };
}
