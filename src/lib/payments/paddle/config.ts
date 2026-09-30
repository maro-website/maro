import "server-only";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { resolvePaddleEnvironment } from "./environment";

export function paddleEnabled(): boolean {
  return process.env.PADDLE_ENABLED === "true";
}

export function getPaddle(): Paddle {
  if (!paddleEnabled()) throw new Error("paddle_disabled");
  const environment = paddleEnvironment();
  const key = environment === "sandbox" ? process.env.PADDLE_SANDBOX_API_KEY : process.env.PADDLE_LIVE_API_KEY;
  if (!key?.startsWith(environment === "sandbox" ? "pdl_sdbx_" : "pdl_live_")) throw new Error("paddle_key_environment_mismatch");
  return new Paddle(key, { environment: environment === "sandbox" ? Environment.sandbox : Environment.production });
}

export function paddleEnvironment() {
  const environment = resolvePaddleEnvironment(process.env.PADDLE_ENVIRONMENT);
  if (resolvePaddleEnvironment(process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT) !== environment) {
    throw new Error("paddle_environment_mismatch");
  }
  return environment;
}

export function paddlePriceId(itemId: string): string {
  const names: Record<string, string> = {
    standard: "PADDLE_PRICE_STANDARD", pro: "PADDLE_PRICE_PRO",
    "topup-100": "PADDLE_PRICE_TOPUP_100", "topup-200": "PADDLE_PRICE_TOPUP_200",
    "topup-500": "PADDLE_PRICE_TOPUP_500", "topup-1000": "PADDLE_PRICE_TOPUP_1000",
  };
  const id = names[itemId] ? process.env[names[itemId]] : undefined;
  if (!id || !/^pri_[a-z0-9]{26}$/.test(id)) throw new Error("paddle_price_not_configured");
  return id;
}

export function paddleCheckoutUrl(): string {
  const environment = paddleEnvironment();
  const url = new URL(process.env.PADDLE_CHECKOUT_URL || (environment === "sandbox" ? "https://localhost:3006/pay/paddle" : ""));
  if (url.protocol !== "https:" || url.username || url.password ||
      (environment === "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("invalid_paddle_checkout_url");
  }
  return url.toString();
}
