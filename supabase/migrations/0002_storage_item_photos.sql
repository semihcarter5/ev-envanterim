insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 1048576, array['image/jpeg','image/webp','image/png'])
on conflict (id) do nothing;

create policy item_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'item-photos' and private.can_access_photo(name));
create policy item_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and private.can_access_photo(name));
create policy item_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'item-photos' and private.can_access_photo(name))
  with check (bucket_id = 'item-photos' and private.can_access_photo(name));
create policy item_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and private.can_access_photo(name));
