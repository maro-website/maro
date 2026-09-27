import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/admin/routes";

export default function LegacySecurityRedirect() {
  redirect(ADMIN_ROUTES.operations.security);
}
