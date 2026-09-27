import "server-only";

import { NextResponse } from "next/server";
import { EmailTemplateServiceError } from "@/lib/email/templates";
import { EmailVariableError } from "@/lib/email/variables";

export function emailAdminErrorResponse(err: unknown): NextResponse {
  if (err instanceof EmailTemplateServiceError || err instanceof EmailVariableError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof Error) {
    if (err.message === "from_email_must_be_maro_domain" || err.message === "reply_to_must_be_maro_domain") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }
  console.error("[admin/emails]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
