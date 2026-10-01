import { redirect } from "next/navigation";
import { CommandCenterDashboard } from "@/components/admin/CommandCenterDashboard";
import { resolveLegacyAdminTabRedirect } from "@/lib/admin/routes";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const dest = resolveLegacyAdminTabRedirect(tab);
  if (dest) redirect(dest);
  return <CommandCenterDashboard />;
}
