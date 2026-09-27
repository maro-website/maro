-- Batch S3 — remove anonymous direct insert on promo_events.
-- Attribution writes go through POST /api/promo/track (service role).

drop policy if exists "promo events insert" on public.promo_events;
