-- Tüm kullanıcılar için günlük toplam tarama tavanı (ücretsiz Gemini kotasını sahte hesaplardan korur).
-- Yalnızca Edge Function (service_role) çağırabilir. Satır güvenliği açık, politika yok: kimse doğrudan okuyamaz veya yazamaz.
create table if not exists public.scan_usage_global (
  day date primary key,
  count integer not null default 0
);
alter table public.scan_usage_global enable row level security;

create or replace function public.bump_scan_global(p_limit integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  if p_limit is null or p_limit < 1 then return -1; end if;
  insert into public.scan_usage_global as g (day, count) values (current_date, 1)
  on conflict (day) do update set count = g.count + 1 where g.count < p_limit
  returning g.count into v;
  return coalesce(v, -1);  -- -1: günlük toplam tavana ulaşıldı
end $$;

create or replace function public.refund_scan_global()
returns void
language sql security definer set search_path = '' as $$
  update public.scan_usage_global set count = greatest(count - 1, 0) where day = current_date;
$$;

revoke all on function public.bump_scan_global(integer) from public, anon, authenticated;
revoke all on function public.refund_scan_global() from public, anon, authenticated;
grant execute on function public.bump_scan_global(integer) to service_role;
grant execute on function public.refund_scan_global() to service_role;
