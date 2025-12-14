-- ============================================================================
-- LIVE CAPTIONS SYSTEM - Run this in Supabase SQL Editor
-- ============================================================================

-- caption_segments: Stores final STT captions for each meeting
create table if not exists public.caption_segments (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  speaker_peer_id text not null,
  speaker_name text not null,
  source_lang text not null default 'en',
  text_final text not null,
  stt_meta jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_caption_segments_meeting 
  on public.caption_segments(meeting_id, created_at desc);

create index if not exists idx_caption_segments_speaker
  on public.caption_segments(meeting_id, speaker_peer_id, created_at desc);

alter table public.caption_segments enable row level security;

create policy "Meeting participants can read captions"
  on public.caption_segments for select
  using (
    exists (
      select 1 from public.participants
      where participants.meeting_id = caption_segments.meeting_id
        and (participants.user_id = auth.uid() or participants.user_id is null)
    )
  );

create policy "Meeting participants can insert captions"
  on public.caption_segments for insert
  with check (
    exists (
      select 1 from public.participants
      where participants.meeting_id = caption_segments.meeting_id
        and (participants.user_id = auth.uid() or participants.user_id is null)
    )
  );

-- caption_translations: Translated versions of captions
create table if not exists public.caption_translations (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  segment_id uuid references public.caption_segments(id) on delete cascade not null,
  target_lang text not null,
  translated_text text not null,
  tts_style_prompt text,
  quality_score float,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(segment_id, target_lang)
);

create index if not exists idx_caption_translations_lookup 
  on public.caption_translations(meeting_id, target_lang, created_at desc);

create index if not exists idx_caption_translations_segment
  on public.caption_translations(segment_id);

alter table public.caption_translations enable row level security;

create policy "Meeting participants can read translations"
  on public.caption_translations for select
  using (
    exists (
      select 1 from public.participants
      where participants.meeting_id = caption_translations.meeting_id
        and (participants.user_id = auth.uid() or participants.user_id is null)
    )
  );

create policy "Anyone can insert translations"
  on public.caption_translations for insert
  with check ( true );

-- meeting_language_targets: Track active target languages per meeting/user
create table if not exists public.meeting_language_targets (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade,
  peer_id text,
  target_lang text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(meeting_id, user_id),
  unique(meeting_id, peer_id)
);

create index if not exists idx_meeting_language_targets 
  on public.meeting_language_targets(meeting_id);

alter table public.meeting_language_targets enable row level security;

create policy "Meeting participants can read language targets"
  on public.meeting_language_targets for select
  using (
    exists (
      select 1 from public.participants
      where participants.meeting_id = meeting_language_targets.meeting_id
        and (participants.user_id = auth.uid() or participants.user_id is null)
    )
  );

create policy "Users can manage their own language target"
  on public.meeting_language_targets for insert
  with check ( auth.uid() = user_id or user_id is null );

create policy "Users can update their own language target"
  on public.meeting_language_targets for update
  using ( auth.uid() = user_id or user_id is null );

create policy "Users can delete their own language target"
  on public.meeting_language_targets for delete
  using ( auth.uid() = user_id or user_id is null );
