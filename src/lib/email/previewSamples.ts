import type { EmailTemplateKey } from "./types";

/** Safe preview/test variable values — never real auth tokens. */
export function getPreviewSampleVariables(templateKey: string): Record<string, string> {
  switch (templateKey as EmailTemplateKey) {
    case "auth.confirm_signup":
      return {
        user_email: "demo@maro.al",
        confirmation_url: "https://maro.al/auth/callback?preview=1&type=signup",
      };
    case "auth.reset_password":
      return {
        user_email: "demo@maro.al",
        recovery_url: "https://maro.al/auth/callback?preview=1&type=recovery&next=%2Freset-password",
      };
    case "auth.email_change":
      return {
        user_email: "demo@maro.al",
        recipient_email: "demo@maro.al",
        confirmation_url: "https://maro.al/auth/callback?preview=1&type=email_change",
        change_recipient_role: "new",
      };
    case "auth.magic_link":
      return {
        user_email: "demo@maro.al",
        magic_link_url: "https://maro.al/auth/callback?preview=1&type=magiclink",
      };
    default:
      return { user_email: "demo@maro.al" };
  }
}

export const TEST_EMAIL_SUBJECT_PREFIX = "[Test maro] ";
