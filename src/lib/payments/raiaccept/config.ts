import "server-only";
import { RaiAcceptError } from "./errors";

export type RaiAcceptEnvironment = "sandbox" | "production";
export interface RaiAcceptConfig {
  environment: RaiAcceptEnvironment;
  merchantAccountId: string;
  username: string;
  password: string;
  appOrigin: string;
}
type EnvironmentValues = Readonly<Record<string, string | undefined>>;

// Sandbox must never fulfill into the verified production project, including
// when NODE_ENV=production (Next.js staging builds also use production mode).
export const MARO_PRODUCTION_DATABASE_PROJECT = "pbhzobqpavkuttdipjaq";

export function validatedAppOrigin(value: string, environment: RaiAcceptEnvironment): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new RaiAcceptError("raiaccept_invalid_app_origin"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      url.pathname !== "/" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      (environment === "production" && url.origin !== "https://maro.al") ||
      (environment === "sandbox" && ["maro.al", "www.maro.al"].includes(url.hostname))) {
    throw new RaiAcceptError("raiaccept_invalid_app_origin");
  }
  return url.origin;
}

export function readRaiAcceptConfig(env: EnvironmentValues = process.env): RaiAcceptConfig {
  if (env.RAIACCEPT_ENABLED !== "true") throw new RaiAcceptError("raiaccept_disabled");
  const environment = env.RAIACCEPT_ENVIRONMENT;
  if (environment !== "sandbox" && environment !== "production") {
    throw new RaiAcceptError("raiaccept_environment_required");
  }
  const merchantAccountId = env.RAIACCEPT_MERCHANT_ACCOUNT_ID ?? "";
  const username = env.RAIACCEPT_API_USERNAME ?? "";
  const password = env.RAIACCEPT_API_PASSWORD ?? "";
  if (!/^[A-Za-z0-9_-]{1,150}$/.test(merchantAccountId) || !username || !password ||
      /[\r\n\0]/.test(username + password)) throw new RaiAcceptError("raiaccept_credentials_required");
  let database: URL;
  try { database = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? ""); }
  catch { throw new RaiAcceptError("raiaccept_database_required"); }
  const project = env.RAIACCEPT_DATABASE_PROJECT_REF ?? "";
  if (!/^[a-z0-9]{20}$/.test(project) || database.protocol !== "https:" ||
      database.hostname !== `${project}.supabase.co` || database.username || database.password ||
      (environment === "sandbox" && project === MARO_PRODUCTION_DATABASE_PROJECT) ||
      (environment === "production" && project !== MARO_PRODUCTION_DATABASE_PROJECT)) {
    throw new RaiAcceptError("raiaccept_database_environment_mismatch");
  }
  return { environment, merchantAccountId, username, password,
    appOrigin: validatedAppOrigin(env.APP_ORIGIN ?? "", environment) };
}

/** Turning off new checkouts must not disable verification of pending orders. */
export function raiAcceptCheckoutEnabled(userId?: string, env: EnvironmentValues = process.env): boolean {
  if (env.RAIACCEPT_ENABLED !== "true" || env.RAIACCEPT_CHECKOUT_ENABLED !== "true" ||
      env.RAIACCEPT_RECOVERY_ENABLED !== "true" || !env.CRON_SECRET?.trim()) return false;
  if (env.RAIACCEPT_PUBLIC_RELEASE === "true") return true;
  const allowed = (env.RAIACCEPT_CHECKOUT_USER_IDS ?? "").split(",").map(value => value.trim()).filter(Boolean);
  return !!userId && allowed.includes(userId);
}
