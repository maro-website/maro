import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShellClient } from "./AdminShellClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/sign-in?next=/admin");
  }

  const h = await headers();
  const adminPath = h.get("x-maro-admin-path") ?? "";
  const onMfaPage = adminPath === "/admin/mfa" || adminPath.startsWith("/admin/mfa/");

  if (!session.mfaOk && !onMfaPage) {
    const reason = session.mfaReason ?? "mfa_challenge_required";
    const next = adminPath && adminPath !== "/admin" ? `&next=${encodeURIComponent(adminPath)}` : "";
    redirect(`/admin/mfa?reason=${reason}${next}`);
  }

  if (session.mfaOk && onMfaPage) {
    redirect("/admin");
  }

  return (
    <AdminShellClient role={session.role} email={session.email}>
      {children}
    </AdminShellClient>
  );
}
