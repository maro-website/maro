import "server-only";
import type { RaiAcceptConfig } from "./config";
import { readRaiAcceptConfig } from "./config";
import { RaiAcceptError } from "./errors";
import { asRecord, assertOrderMatchesPayload, parseRaiAcceptCheckout, parseRaiAcceptOrder, providerId } from "./contract";
import type { RaiAcceptPayload } from "./contract";
import { parseRaiAcceptTransaction } from "./verification";

const AUTH = "https://auth.raiaccept.com/auth/api";
const API = "https://trapi.raiaccept.com";
const MAX_RESPONSE_BYTES = 262_144;
const CONTEXT = { type: "CODE", data: { name: "maro.al", version: "1.0.0", vendor: "NICE Creative Agency" } };
type TokenState = { accessToken: string; accessExpiresAt: number; refreshToken: string; refreshExpiresAt: number };

export class RaiAcceptClient {
  #tokens: TokenState | null = null;
  #authenticating: Promise<string> | null = null;
  #config: RaiAcceptConfig;
  #fetch: typeof fetch;
  #now: () => number;
  #timeoutMs: number;

  constructor(config: RaiAcceptConfig, options: { fetch?: typeof fetch; now?: () => number; timeoutMs?: number } = {}) {
    this.#config = { ...config };
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? Date.now;
    this.#timeoutMs = options.timeoutMs ?? 20_000;
  }

  async #request(method: "GET" | "POST", url: string, body?: unknown, token?: string, mutation = false): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#fetch(url, {
        method, redirect: "error", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new RaiAcceptError("raiaccept_http_error", response.status,
          mutation && (response.status >= 500 || response.status === 408));
      }
      const reader = response.body?.getReader();
      if (!reader) throw new RaiAcceptError("raiaccept_empty_response", response.status, mutation);
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new RaiAcceptError("raiaccept_response_too_large", response.status, mutation);
        }
        chunks.push(next.value);
      }
      const text = Buffer.concat(chunks).toString("utf8");
      try { return JSON.parse(text); }
      catch { throw new RaiAcceptError("raiaccept_invalid_json", response.status, mutation); }
    } catch (error) {
      if (error instanceof RaiAcceptError) throw error;
      // No raw provider errors, URLs with session tokens, bodies or credentials.
      throw new RaiAcceptError(controller.signal.aborted ? "raiaccept_timeout" : "raiaccept_network_error", undefined, mutation);
    } finally { clearTimeout(timeout); }
  }

  #acceptTokens(value: unknown, refreshing: boolean): string {
    const raw = asRecord(value);
    const lifetime = raw.accessTokenExpiresIn;
    if (typeof raw.accessToken !== "string" || !raw.accessToken || typeof lifetime !== "number" ||
        !Number.isInteger(lifetime) || lifetime <= 15 || lifetime > 86_400) throw new RaiAcceptError("raiaccept_invalid_auth_response");
    const now = this.#now();
    if (refreshing && this.#tokens) {
      // The verified refresh response contains no new refresh token.
      this.#tokens = { ...this.#tokens, accessToken: raw.accessToken, accessExpiresAt: now + lifetime * 1000 };
    } else {
      const refreshLifetime = raw.refreshTokenExpiresIn;
      if (typeof raw.refreshToken !== "string" || !raw.refreshToken || typeof refreshLifetime !== "number" ||
          !Number.isInteger(refreshLifetime) || refreshLifetime <= 0 || refreshLifetime > 31_536_000) {
        throw new RaiAcceptError("raiaccept_invalid_auth_response");
      }
      this.#tokens = { accessToken: raw.accessToken, accessExpiresAt: now + lifetime * 1000,
        refreshToken: raw.refreshToken, refreshExpiresAt: now + refreshLifetime * 1000 };
    }
    return this.#tokens.accessToken;
  }

  async #authenticate(): Promise<string> {
    if (this.#tokens && this.#tokens.refreshExpiresAt > this.#now() + 15_000) {
      try {
        const refreshed = await this.#request("POST", `${AUTH}/refresh`, { refreshToken: this.#tokens.refreshToken, integrationContext: CONTEXT });
        return this.#acceptTokens(refreshed, true);
      } catch (error) {
        if (!(error instanceof RaiAcceptError) || ![401, 403].includes(error.httpStatus ?? 0)) throw error;
        this.#tokens = null;
      }
    }
    const loggedIn = await this.#request("POST", `${AUTH}/login`, {
      username: this.#config.username, password: this.#config.password, integrationContext: CONTEXT,
    });
    return this.#acceptTokens(loggedIn, false);
  }

  async #accessToken(): Promise<string> {
    if (this.#tokens && this.#tokens.accessExpiresAt > this.#now() + 15_000) return this.#tokens.accessToken;
    if (!this.#authenticating) {
      this.#authenticating = this.#authenticate();
      void this.#authenticating.finally(() => { this.#authenticating = null; }).catch(() => {});
    }
    return this.#authenticating;
  }

  async #api(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    const token = await this.#accessToken();
    try { return await this.#request(method, `${API}${path}`, body, token, method === "POST"); }
    catch (error) {
      if (error instanceof RaiAcceptError && error.httpStatus === 401) {
        this.#tokens = this.#tokens ? { ...this.#tokens, accessExpiresAt: 0 } : null;
        // Only reads may be repeated; never repeat an order/session POST.
        if (method === "GET") return this.#request("GET", `${API}${path}`, undefined, await this.#accessToken());
      }
      throw error;
    }
  }

  async getOrder(id: string) {
    const order = parseRaiAcceptOrder(await this.#api("GET", `/orders/${providerId(id)}`), this.#config);
    if (order.id !== id) throw new RaiAcceptError("raiaccept_order_id_mismatch");
    return order;
  }

  async listTransactions(id: string): Promise<Record<string, unknown>[]> {
    const transactions = await this.#api("GET", `/orders/${providerId(id)}/transactions`);
    if (!Array.isArray(transactions) || transactions.length > 100) throw new RaiAcceptError("raiaccept_invalid_transactions");
    return transactions.map(value => {
      const raw = asRecord(value);
      providerId(raw.transactionId);
      if (raw.isProduction !== (this.#config.environment === "production")) throw new RaiAcceptError("raiaccept_environment_mismatch");
      // A list item is discovery only; the verifier must fetch transaction details.
      return { transactionId: raw.transactionId, transactionType: raw.transactionType, status: raw.status };
    });
  }

  async createOrder(payload: RaiAcceptPayload) {
    const raw = await this.#api("POST", "/orders", payload);
    try {
      const order = parseRaiAcceptOrder(raw, this.#config);
      assertOrderMatchesPayload(order, payload);
      return order;
    } catch { throw new RaiAcceptError("raiaccept_created_order_requires_review", undefined, true); }
  }

  async getTransaction(orderId: string, transactionId: string) {
    const raw = await this.#api("GET", `/orders/${providerId(orderId)}/transactions/${providerId(transactionId)}`);
    return parseRaiAcceptTransaction(raw,orderId,transactionId,this.#config);
  }

  async createCheckout(id: string, payload: RaiAcceptPayload) {
    const order = await this.getOrder(id);
    assertOrderMatchesPayload(order, payload);
    if (order.status !== "DRAFT") throw new RaiAcceptError("raiaccept_checkout_already_started");
    const raw = await this.#api("POST", `/orders/${providerId(id)}/checkout`, payload);
    try { return parseRaiAcceptCheckout(raw); }
    catch { throw new RaiAcceptError("raiaccept_created_session_requires_review", undefined, true); }
  }
}

let current: { config: RaiAcceptConfig; client: RaiAcceptClient } | null = null;
export function getRaiAcceptClient(): RaiAcceptClient {
  const config = readRaiAcceptConfig();
  if (!current || Object.keys(config).some(key => config[key as keyof RaiAcceptConfig] !== current!.config[key as keyof RaiAcceptConfig])) {
    current = { config, client: new RaiAcceptClient(config) };
  }
  return current.client;
}
