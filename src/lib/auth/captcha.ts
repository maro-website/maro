/** Roll out native Auth CAPTCHA only after its matching Supabase setting is ready. */
export function nativeAuthCaptchaEnabled(): boolean {
  return process.env.SUPABASE_AUTH_CAPTCHA_ENABLED === "true";
}

export function authCaptchaToken(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 2048 ? value.trim() : undefined;
}
