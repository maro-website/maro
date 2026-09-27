import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/admin/routes";

export default function LegacyPromptsRedirect() {
  redirect(ADMIN_ROUTES.presets);
}
