export type PaddleEnvironment = "sandbox" | "production";

export function resolvePaddleEnvironment(value: string | undefined): PaddleEnvironment {
  if (value !== "sandbox" && value !== "production") throw new Error("paddle_environment_required");
  return value;
}

export function validatePaddleClientToken(environment: PaddleEnvironment, token: string | undefined): string {
  if (!token?.startsWith(environment === "sandbox" ? "test_" : "live_")) {
    throw new Error("paddle_client_environment_mismatch");
  }
  return token;
}
