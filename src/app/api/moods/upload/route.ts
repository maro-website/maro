import { uploadStyleCover } from "@/lib/moods/uploads";
export const dynamic = "force-dynamic";
export const POST = (req: Request) => uploadStyleCover(req);
