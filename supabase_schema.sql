-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  username text,
  avatar_url text,
  credits integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. MEETINGS
create table public.meetings (
  id uuid default uuid_generate_v4() primary key,
  host_id uuid references public.profiles(id) not null,
  topic text not null default 'Untitled Meeting',
  start_time timestamp with time zone default timezone('utc'::text, now()),
  end_time timestamp with time zone,
  is_active boolean default true,
  passcode text,
  recording_url text, -- For storing recording links
  transcript_url text, -- For storing transcript links
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.meetings enable row level security;

create policy "Meetings are viewable by everyone."
  on meetings for select
  using ( true );

create policy "Hosts can create meetings."
  on meetings for insert
  with check ( auth.uid() = host_id );

create policy "Hosts can update their meetings."
  on meetings for update
  using ( auth.uid() = host_id );

-- 3. PAYMENTS
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  amount integer not null, -- amount in cents
  currency text default 'usd',
  status text default 'pending', -- pending, succeeded, failed
  stripe_payment_id text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payments enable row level security;

create policy "Users can view their own payments."
  on payments for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own payments."
  on payments for insert
  with check ( auth.uid() = user_id );

-- 4. AUTOMATION TRIGGERS
-- Function to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

-- Trigger to call the function on new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
