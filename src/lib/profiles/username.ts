const reserved = new Set(["admin", "administrator", "support", "maro", "maroal", "api", "account", "explore", "settings", "nice", "niceal"]);
export function normalizeUsername(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const username = input.trim().toLowerCase().replace(/^@/, "");
  return /^[a-z0-9][a-z0-9_-]{2,29}$/.test(username) && !reserved.has(username) ? username : null;
}
