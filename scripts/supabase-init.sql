-- 与培养助手共用账号，方案存放在独立表。于 Supabase SQL Editor 执行一次。
create table if not exists public.panel_simulator_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  name text not null,
  config_data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  primary key (user_id, id)
);
alter table public.panel_simulator_plans enable row level security;
create policy "own panel plans" on public.panel_simulator_plans for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.panel_simulator_plans to authenticated;
