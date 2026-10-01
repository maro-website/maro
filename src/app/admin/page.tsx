import { redirect } from "next/navigation";
import { V1Overview } from "@/components/admin/v1/V1Overview";
import { resolveLegacyAdminTabRedirect } from "@/lib/admin/routes";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const dest = resolveLegacyAdminTabRedirect(tab);
  if (dest) redirect(dest);
  return <V1Overview />;
}
