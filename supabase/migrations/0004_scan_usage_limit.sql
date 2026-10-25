-- Günlük tarama sınırı. Yalnızca Edge Function (service_role) çağırabilir; kullanıcılar sayacı değiştiremez.
create or replace function public.bump_scan_usage(p_user uuid, p_limit integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  if p_limit is null or p_limit < 1 then return -1; end if;
  insert into public.scan_usage as s (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = s.count + 1 where s.count < p_limit
  returning s.count into v;
  return coalesce(v, -1);  -- -1: günlük sınıra ulaşıldı
end $$;

create or replace function public.refund_scan_usage(p_user uuid)
returns void
language sql security definer set search_path = '' as $$
  update public.scan_usage set count = greatest(count - 1, 0) where user_id = p_user and day = current_date;
$$;

revoke all on function public.bump_scan_usage(uuid, integer) from public, anon, authenticated;
revoke all on function public.refund_scan_usage(uuid) from public, anon, authenticated;
grant execute on function public.bump_scan_usage(uuid, integer) to service_role;
grant execute on function public.refund_scan_usage(uuid) to service_role;
