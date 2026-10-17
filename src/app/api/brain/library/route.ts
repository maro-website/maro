import { handleStudioLibrary } from "@/lib/brain-studio/libraryServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => handleStudioLibrary(req);
export const POST = (req: Request) => handleStudioLibrary(req);
