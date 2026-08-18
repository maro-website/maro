-- S4: Storage access model — private user assets, explicit public prefix.
-- The generations bucket remains the single store; public=false with path-scoped policies.

update storage.buckets
set public = false
where id = 'generations';

drop policy if exists "generations_public_read" on storage.objects;

-- Owners may read their private objects: first path segment must equal auth.uid().
drop policy if exists "generations_owner_read" on storage.objects;
create policy "generations_owner_read" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'generations'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Explicit public prefixes for published explore assets and admin UI assets.
drop policy if exists "generations_public_prefix_read" on storage.objects;
create policy "generations_public_prefix_read" on storage.objects
  for select
  using (
    bucket_id = 'generations'
    and (
      (storage.foldername(name))[1] = 'public'
      or (storage.foldername(name))[1] = 'admin-icons'
      or (storage.foldername(name))[1] = 'admin-ads'
    )
  );

-- No client INSERT/UPDATE/DELETE on storage.objects (service role uploads only).

notify pgrst, 'reload schema';
