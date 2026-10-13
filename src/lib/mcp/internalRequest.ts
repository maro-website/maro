import "server-only";
/** In-process identity, never a caller-controlled HTTP header. */
const verifiedImageRequests = new WeakSet<Request>();
export function markVerifiedMcpImageRequest(request: Request) { verifiedImageRequests.add(request); }
export function isVerifiedMcpImageRequest(request: Request) { return verifiedImageRequests.has(request); }
