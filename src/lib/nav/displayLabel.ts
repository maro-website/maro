/** Presentation only. Canonical product names, icons, destinations and access stay intact. */
export function navigationDisplayLabel(label: string): string {
  return label.replace(/^maro(?=[A-Z])/, "");
}
