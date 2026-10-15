import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { hasPermission } from "@/lib/admin/permissions";
import { validGenerationJobId } from "@/lib/admin/generationReview";
import { GenerationOriginalReview } from "@/components/admin/v1/GenerationImageReview";
import { metadataForPage } from "@/lib/siteMetadata";

export const dynamic = "force-dynamic";
export const metadata = { ...metadataForPage("/admin/engine/generations/result/image"), robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await getAdminSession();
  if (!session?.mfaOk || !hasPermission(session.role, "generations.review") || !validGenerationJobId(jobId)) notFound();
  return <GenerationOriginalReview jobId={jobId} />;
}
