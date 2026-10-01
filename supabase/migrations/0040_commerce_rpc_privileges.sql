-- MARO — Lock down fulfill_commerce_order RPC (service_role only)

REVOKE ALL ON FUNCTION public.fulfill_commerce_order(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_commerce_order(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.fulfill_commerce_order(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_commerce_order(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.membership_effective_status(timestamptz, integer, text, boolean, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.membership_effective_status(timestamptz, integer, text, boolean, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.membership_effective_status(timestamptz, integer, text, boolean, timestamptz) TO authenticated;
