-- Create shopping lists and items tables with RLS and triggers

-- 1) Shopping Lists table
create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful uniqueness so a user cannot create two lists with the same name
create unique index if not exists shopping_lists_user_name_uidx on public.shopping_lists(user_id, name);
create index if not exists shopping_lists_user_idx on public.shopping_lists(user_id);

-- Enable RLS
alter table public.shopping_lists enable row level security;

-- Policies
create policy if not exists "Users can view their own shopping lists"
  on public.shopping_lists for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own shopping lists"
  on public.shopping_lists for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own shopping lists"
  on public.shopping_lists for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own shopping lists"
  on public.shopping_lists for delete
  using (auth.uid() = user_id);

-- Trigger to maintain updated_at
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

-- Enable RLS
alter table public.shopping_list_items enable row level security;

-- Policies: ensure user owns the list for SELECT/INSERT/UPDATE/DELETE
create policy if not exists "Users can view items in their lists"
  on public.shopping_list_items for select
  using (
    user_id = auth.uid() and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.user_id = auth.uid()
    )
  );

create policy if not exists "Users can insert items into their lists"
  on public.shopping_list_items for insert
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.user_id = auth.uid()
    )
  );

create policy if not exists "Users can update items in their lists"
  on public.shopping_list_items for update
  using (
    user_id = auth.uid() and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.user_id = auth.uid()
    )
  );

create policy if not exists "Users can delete items in their lists"
  on public.shopping_list_items for delete
  using (
    user_id = auth.uid() and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.user_id = auth.uid()
    )
  );

-- Trigger to maintain updated_at
create trigger if not exists update_shopping_list_items_updated_at
before update on public.shopping_list_items
for each row execute function public.update_updated_at_column();