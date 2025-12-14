-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create a table for public profiles linked to auth.users
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for users
alter table public.users enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.users for select
  using ( true );

create policy "Users can insert their own profile."
  on public.users for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.users for update
  using ( auth.uid() = id );

-- Create a table for meetings
create table public.meetings (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.users(id) not null,
  title text not null,
  scheduled_at timestamp with time zone,
  status text check (status in ('scheduled', 'active', 'ended')) default 'scheduled',
  passcode text,
  config jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for meetings
alter table public.meetings enable row level security;

create policy "Meetings are viewable by everyone."
  on public.meetings for select
  using ( true );

create policy "Host can update their own meetings."
  on public.meetings for update
  using ( auth.uid() = host_id );

create policy "Host can insert meetings."
  on public.meetings for insert
  with check ( auth.uid() = host_id );

-- Create a table for participants
create table public.participants (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id uuid references public.users(id), -- Nullable for guests
  name text not null,
  role text check (role in ('host', 'guest', 'ai')) default 'guest',
  status text check (status in ('waiting', 'approved', 'active', 'left')) default 'waiting',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for participants
alter table public.participants enable row level security;

create policy "Participants are viewable by everyone in the meeting."
  on public.participants for select
  using ( true );

create policy "Participants can insert themselves."
  on public.participants for insert
  with check ( true ); -- Allow anyone to join

create policy "Participants can update themselves."
  on public.participants for update
  using ( true );

-- Create a table for messages
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  sender_id uuid references public.participants(id),
  content text,
  type text check (type in ('text', 'system', 'ai')) default 'text',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for messages
alter table public.messages enable row level security;

create policy "Messages are viewable by everyone in the meeting."
  on public.messages for select
  using ( true );

create policy "Participants can insert messages."
  on public.messages for insert
  with check ( true );

-- Create a table for AI generations
create table public.ai_generations (
  id uuid default uuid_generate_v4() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  tool_type text not null,
  input_prompt text,
  output_content jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for ai_generations
alter table public.ai_generations enable row level security;

create policy "AI generations are viewable by everyone in the meeting."
  on public.ai_generations for select
  using ( true );

create policy "Participants can insert AI generations."
  on public.ai_generations for insert
  with check ( true );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
