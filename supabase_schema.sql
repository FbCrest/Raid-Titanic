-- ============================================================
-- RAID TITANIC — Supabase Schema
-- Chạy toàn bộ file này trong SQL Editor
-- Có thể chạy nhiều lần mà không bị lỗi (idempotent)
-- ============================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  role text not null default 'pending' check (role in ('pending', 'member', 'admin')),
  main_class text default '',
  sub_class text default '',
  discord text default '',
  facebook text default '',
  zalo text default '',
  created_at timestamptz default now()
);
-- Thêm cột mới nếu chưa có (migration an toàn)
alter table public.profiles add column if not exists main_class  text default '';
alter table public.profiles add column if not exists sub_class   text default '';
alter table public.profiles add column if not exists discord     text default '';
alter table public.profiles add column if not exists facebook    text default '';
alter table public.profiles add column if not exists zalo        text default '';
alter table public.profiles add column if not exists avatar_url  text default '';
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select"       on public.profiles for select using (true);
create policy "profiles_insert"       on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_self"  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_update_admin" on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── 2. RAIDS ─────────────────────────────────────────────────
create table if not exists public.raids (
  id          uuid      primary key default gen_random_uuid(),
  title       text      not null,
  raid_date   date      not null,
  raid_time   text      not null default '21:00',
  status      text      not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  is_recurring boolean  default false,
  created_by  uuid      references public.profiles(id),
  created_at  timestamptz default now()
);
alter table public.raids enable row level security;

drop policy if exists "raids_select"       on public.raids;
drop policy if exists "raids_insert_admin" on public.raids;
drop policy if exists "raids_update_admin" on public.raids;
drop policy if exists "raids_delete_admin" on public.raids;

create policy "raids_select"       on public.raids for select using (true);
create policy "raids_insert_admin" on public.raids for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "raids_update_admin" on public.raids for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "raids_delete_admin" on public.raids for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 3. RAID SLOTS ────────────────────────────────────────────
create table if not exists public.raid_slots (
  id            uuid    primary key default gen_random_uuid(),
  raid_id       uuid    not null references public.raids(id) on delete cascade,
  slot_order    integer not null,
  team_group    integer not null check (team_group in (1, 2)),
  member_name   text    default '',
  class_id      text    default '',
  registered_by uuid    references public.profiles(id) on delete set null,
  updated_at    timestamptz default now()
);
alter table public.raid_slots enable row level security;

drop policy if exists "slots_select"        on public.raid_slots;
drop policy if exists "slots_update_member" on public.raid_slots;
drop policy if exists "slots_insert_admin"  on public.raid_slots;
drop policy if exists "slots_delete_admin"  on public.raid_slots;

create policy "slots_select" on public.raid_slots for select using (true);

create policy "slots_update_member" on public.raid_slots for update using (
  -- admin toàn quyền
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  -- slot của mình
  or registered_by = auth.uid()
  -- slot trống + raid đang mở → thành viên đăng ký
  or (registered_by is null and auth.uid() is not null
      and exists (select 1 from public.raids where id = raid_id and status = 'open'))
);

create policy "slots_insert_admin" on public.raid_slots for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "slots_delete_admin" on public.raid_slots for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 4. TRIGGER updated_at ────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists slots_updated_at on public.raid_slots;
create trigger slots_updated_at before update on public.raid_slots
  for each row execute function update_updated_at();

-- ── 5. AVAILABILITY (báo bận) ───────────────────────────────
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  raid_id uuid not null references public.raids(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'available' check (status in ('available', 'busy')),
  note text default '',
  updated_at timestamptz default now(),
  unique(raid_id, user_id)
);
alter table public.availability enable row level security;

drop policy if exists "avail_select" on public.availability;
drop policy if exists "avail_upsert" on public.availability;
drop policy if exists "avail_update" on public.availability;
drop policy if exists "avail_delete" on public.availability;

create policy "avail_select" on public.availability for select using (true);

-- Thành viên tự insert trạng thái của mình
create policy "avail_upsert" on public.availability for insert
  with check (auth.uid() = user_id);

-- Thành viên update trạng thái của mình, admin update bất kỳ
create policy "avail_update" on public.availability for update
  using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Thành viên xóa của mình, admin xóa bất kỳ
create policy "avail_delete" on public.availability for delete
  using (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop trigger if exists avail_updated_at on public.availability;
create trigger avail_updated_at before update on public.availability
  for each row execute function update_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'availability'
  ) then
    alter publication supabase_realtime add table public.availability;
  end if;
end $$;

-- ── 6. REALTIME ──────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'raids'
  ) then
    alter publication supabase_realtime add table public.raids;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'raid_slots'
  ) then
    alter publication supabase_realtime add table public.raid_slots;
  end if;
end $$;

-- ── 6. ADMIN ─────────────────────────────────────────────────
-- Chạy SAU KHI đã đăng ký tài khoản 0rion24k trên web
-- Nếu chưa đăng ký, dòng này sẽ không làm gì cả (không lỗi)
update public.profiles set role = 'admin' where username = '0rion24k';
