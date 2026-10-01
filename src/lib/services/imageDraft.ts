/** Clear only the submitted draft on explicit admission, never on HTTP headers or failure.
 * Functional updates preserve anything the user changed while preflight was pending.
 */
export function createImageDraftAcceptance<T extends { id: string }>(options: {
  prompt: string;
  attachments: readonly T[];
  setPrompt: (update: (current: string) => string) => void;
  setAttachments: (update: (current: T[]) => T[]) => void;
  onAccepted?: () => void;
}) {
  const sentIds = new Set(options.attachments.map((attachment) => attachment.id));
  let accepted = false;
  return () => {
    if (accepted) return;
    accepted = true;
    options.setPrompt((current) => current === options.prompt ? "" : current);
    options.setAttachments((current) => current.filter((attachment) => !sentIds.has(attachment.id)));
    options.onAccepted?.();
  };
}
