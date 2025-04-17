-- Set up Row Level Security (RLS)
-- alter table public.user
--   enable row level security;

-- create policy "Users can view their own data." on public.user
--   for select using ((select auth.uid()) = id);

-- create policy "Users can insert their own data." on public.user
--   for insert with check ((select auth.uid()) = id);

-- create policy "Users can update own data." on public.user
--   for update using ((select auth.uid()) = id);

-- This trigger automatically creates a user entry when a new user signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.user (id, display_name, profile_picture_url)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'display_name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
