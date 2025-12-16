-- Create table for storing translation feedback
create table if not exists translation_feedback (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  segment_id uuid references caption_segments(id),
  score text check (score in ('up', 'down')), -- 'up' or 'down'
  details jsonb default '{}'::jsonb
);

-- RLS Policies
alter table translation_feedback enable row level security;

create policy "Enable insert for authenticated users" on translation_feedback
  for insert with check (auth.role() = 'authenticated');

create policy "Enable read for everyone" on translation_feedback
  for select using (true);
