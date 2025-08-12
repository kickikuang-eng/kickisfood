-- Create shopping lists and items tables with RLS and triggers (retry without IF NOT EXISTS on policies)

-- 1) Shopping Lists table
create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shopping_lists_user_name_uidx on public.shopping_lists(user_id, name);
create index if not exists shopping_lists_user_idx on public.shopping_lists(user_id);

alter table public.shopping_lists enable row level security;

-- Drop existing policies if rerun to avoid duplicates
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_lists' and policyname = 'Users can view their own shopping lists') then
    execute 'drop policy "Users can view their own shopping lists" on public.shopping_lists';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_lists' and policyname = 'Users can insert their own shopping lists') then
    execute 'drop policy "Users can insert their own shopping lists" on public.shopping_lists';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_lists' and policyname = 'Users can update their own shopping lists') then
    execute 'drop policy "Users can update their own shopping lists" on public.shopping_lists';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_lists' and policyname = 'Users can delete their own shopping lists') then
    execute 'drop policy "Users can delete their own shopping lists" on public.shopping_lists';
  end if;
end $$;

create policy "Users can view their own shopping lists"
  on public.shopping_lists for select
  using (auth.uid() = user_id);

create policy "Users can insert their own shopping lists"
  on public.shopping_lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own shopping lists"
  on public.shopping_lists for update
  using (auth.uid() = user_id);

create policy "Users can delete their own shopping lists"
  on public.shopping_lists for delete
  using (auth.uid() = user_id);

create trigger if not exists update_shopping_lists_updated_at
before update on public.shopping_lists
for each row execute function public.update_updated_at_column();


-- 2) Shopping List Items table
create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null,
  recipe_id uuid null references public.recipes(id) on delete set null,
  name text not null,
  quantity numeric null,
  unit text null,
  notes text null,
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_list_items_list_idx on public.shopping_list_items(list_id);
create index if not exists shopping_list_items_user_idx on public.shopping_list_items(user_id);

alter table public.shopping_list_items enable row level security;

-- Drop existing item policies if rerun
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_list_items' and policyname = 'Users can view items in their lists') then
    execute 'drop policy "Users can view items in their lists" on public.shopping_list_items';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_list_items' and policyname = 'Users can insert items into their lists') then
    execute 'drop policy "Users can insert items into their lists" on public.shopping_list_items';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_list_items' and policyname = 'Users can update items in their lists') then
    execute 'drop policy "Users can update items in their lists" on public.shopping_list_items';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shopping_list_items' and policyname = 'Users can delete items in their lists') then
    execute 'drop policy "Users can delete items in their lists" on public.shopping_list_items';
  end if;
end $$;

create policy "Users can view items in their lists"
  on public.shopping_list_items for select
  using (
    user_id = auth.uid() and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.user_id = auth.uid()
    )
  );

create policy "Users can insert items into their lists"
  on public.shopping_list_items for insert
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.user_id = auth.uid()
    )
  );

create policy "Users can update items in their lists"
  on public.shopping_list_items for update
  using (
    user_id = auth.uid() and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.user_id = auth.uid()
    )
  );

create policy "Users can delete items in their lists"
  on public.shopping_list_items for delete
  using (
    user_id = auth.uid() and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.user_id = auth.uid()
    )
  );

create trigger if not exists update_shopping_list_items_updated_at
before update on public.shopping_list_items
for each row execute function public.update_updated_at_column();