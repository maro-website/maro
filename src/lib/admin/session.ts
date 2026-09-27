import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resolveAccessRole, hasPermission, ADMIN_ENTRY_PERMISSION } from "@/lib/admin/permissions";
import type { AccessRole } from "@/lib/admin/permissions";
import { assertAdminMfa } from "@/lib/admin/mfa";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createSupabaseServerClient() {
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* ignore — called from Server Component where cookies may be read-only */
        }
      },
    },
  });
}

export interface AdminSession {
  userId: string;
  email: string;
  role: AccessRole;
  mfaOk: boolean;
  mfaReason?: "mfa_enrollment_required" | "mfa_challenge_required";
}

/** Server-side session check for /admin route protection. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  const { data: authData } = await client.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const { data: sessionData } = await client.auth.getSession();
  const accessToken = sessionData.session?.access_token ?? null;

  const { data: profile } = await client
    .from("profiles")
    .select("email, is_admin, access_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const role = resolveAccessRole(profile);
  if (!role || !hasPermission(role, ADMIN_ENTRY_PERMISSION)) return null;

  const mfa = await assertAdminMfa({ userId: user.id, role, accessToken });

  return {
    userId: user.id,
    email: (profile.email as string) ?? user.email ?? "",
    role,
    mfaOk: mfa.ok,
    mfaReason: mfa.ok ? undefined : mfa.reason,
  };
}
