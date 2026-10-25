create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Evim' check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.home_members (
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (home_id, user_id)
);
create index home_members_user_idx on public.home_members(user_id);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  parent_id uuid,
  created_at timestamptz not null default now(),
  unique (id, home_id),
  foreign key (parent_id, home_id) references public.locations(id, home_id) on delete set null (parent_id)
);
create index locations_home_idx on public.locations(home_id);
create index locations_parent_idx on public.locations(parent_id, home_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  category text not null check (category in ('food','medicine','item')),
  name text not null check (char_length(name) between 1 and 200),
  quantity integer not null default 1 check (quantity >= 0),
  location_id uuid,
  location_note text check (char_length(location_note) <= 500),
  location_photo_path text,
  photo_path text,
  receipt_photo_path text,
  barcode text,
  notes text check (char_length(notes) <= 2000),
  expiry_date date,
  opened_on date,
  warranty_until date,
  estimated_value numeric(12,2) check (estimated_value >= 0),
  ai_suggestion jsonb,
  ai_confirmed boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (location_id, home_id) references public.locations(id, home_id) on delete set null (location_id)
);
create index items_home_idx on public.items(home_id);
create index items_home_expiry_idx on public.items(home_id, expiry_date) where expiry_date is not null;
create index items_location_idx on public.items(location_id, home_id);
create index items_created_by_idx on public.items(created_by);

create table public.scan_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, day)
);

create function private.is_home_member(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.home_members
    where home_id = h and user_id = (select auth.uid())
  );
$$;

create function private.can_access_photo(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return private.is_home_member(split_part(object_name, '/', 1)::uuid);
exception when others then
  return false;
end;
$$;

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.add_owner_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.home_members (home_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.homes (owner_id) values (new.id);
  return new;
end;
$$;

revoke all on function private.is_home_member(uuid) from public;
revoke all on function private.can_access_photo(text) from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.add_owner_membership() from public;
revoke all on function private.handle_new_user() from public;
grant execute on function private.is_home_member(uuid) to authenticated;
grant execute on function private.can_access_photo(text) to authenticated;

create trigger items_set_updated_at before update on public.items
  for each row execute function private.set_updated_at();
create trigger homes_add_owner after insert on public.homes
  for each row execute function private.add_owner_membership();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.scan_usage enable row level security;

create policy homes_select on public.homes for select to authenticated
  using (private.is_home_member(id));
create policy homes_insert on public.homes for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy homes_update on public.homes for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy homes_delete on public.homes for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy members_select on public.home_members for select to authenticated
  using (private.is_home_member(home_id));
create policy members_leave on public.home_members for delete to authenticated
  using (user_id = (select auth.uid()));

create policy locations_all on public.locations for all to authenticated
  using (private.is_home_member(home_id)) with check (private.is_home_member(home_id));
create policy items_all on public.items for all to authenticated
  using (private.is_home_member(home_id)) with check (private.is_home_member(home_id));

create policy scan_usage_select_own on public.scan_usage for select to authenticated
  using (user_id = (select auth.uid()));
