-- Future GPT reflection data model.
-- These tables are intentionally not used by the React app yet.
-- GPT calls should be made only from server-side code, such as Supabase Edge
-- Functions or Vercel Serverless Functions.

create table if not exists public.entry_reflections (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text,
  emotions jsonb,
  themes text[],
  gentle_questions text[],
  supportive_note text,
  risk_level text default 'none',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (entry_id)
);

create table if not exists public.user_mental_context (
  user_id uuid primary key references auth.users(id) on delete cascade,
  long_term_summary text default '',
  recurring_themes text[] default '{}',
  emotional_patterns jsonb default '{}',
  helpful_response_style text default '',
  last_updated_entry_date date,
  updated_at timestamp with time zone default now()
);

alter table public.entry_reflections enable row level security;
alter table public.user_mental_context enable row level security;

create policy "Users can read their own entry reflections"
on public.entry_reflections
for select
using (auth.uid() = user_id);

create policy "Users can insert their own entry reflections"
on public.entry_reflections
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journal_entries
    where journal_entries.id = entry_reflections.entry_id
      and journal_entries.user_id = auth.uid()
  )
);

create policy "Users can update their own entry reflections"
on public.entry_reflections
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.journal_entries
    where journal_entries.id = entry_reflections.entry_id
      and journal_entries.user_id = auth.uid()
  )
);

create policy "Users can delete their own entry reflections"
on public.entry_reflections
for delete
using (auth.uid() = user_id);

create policy "Users can read their own mental context"
on public.user_mental_context
for select
using (auth.uid() = user_id);

create policy "Users can insert their own mental context"
on public.user_mental_context
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own mental context"
on public.user_mental_context
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own mental context"
on public.user_mental_context
for delete
using (auth.uid() = user_id);
