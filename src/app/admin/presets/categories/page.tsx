import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/admin/routes";

export default function LegacyPresetCategoriesRedirect() {
  redirect(`${ADMIN_ROUTES.presets}?tab=categories`);
}
