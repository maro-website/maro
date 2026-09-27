import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GenerationReportsPanel } from "@/components/admin/support/GenerationReportsPanel";
import Link from "next/link";

export default function SupportReportsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Generation reports"
        description="User-submitted generation reports — shared with legacy admin tab"
        actions={
          <Link href="/admin/support" className="text-[13px] font-semibold text-brand hover:underline">
            ← Support tickets
          </Link>
        }
      />
      <GenerationReportsPanel />
    </div>
  );
}
