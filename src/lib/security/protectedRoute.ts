import "server-only";

import { NextResponse } from "next/server";
import { denyProtectedOperationWithoutSupabase } from "@/lib/config/serverEnv";
import { supabaseServerConfigured } from "@/lib/supabase/server";

/** Deny cost-bearing / authenticated routes in production when Supabase server config is missing. */
export function denyIfProductionWithoutSupabase(): NextResponse | null {
  const deny = denyProtectedOperationWithoutSupabase(supabaseServerConfigured());
  return deny.denied ? deny.response : null;
}
