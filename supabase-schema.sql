-- =====================================================================
-- SPLITDUDE COMPLETE DATABASE SCHEMA & SECURITY POLICIES
-- Paste this script into the Supabase SQL Editor to initialize.
-- =====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================================
-- 1. TABLES CREATION
-- =====================================================================

-- Profiles Table (linked to Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  unique_code text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Groups Table
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  icon text default '✈️',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Group Members (many-to-many relationship)
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, user_id)
);

-- Expenses Table
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  paid_by uuid references public.profiles(id) on delete restrict not null,
  split_mode text not null check (split_mode in ('equal', 'exact', 'percentage')),
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Expense Splits Table (how much each debtor owes)
create table public.expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12,2) not null check (amount >= 0),
  share_value numeric(12,4), -- percentage value or exact ratio input
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (expense_id, user_id)
);

-- Settlements Table (payments made between users to settle balances)
create table public.settlements (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  payer_id uuid references public.profiles(id) on delete cascade not null,
  payee_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================================
-- 2. PROFILE GENERATOR FUNCTIONS & TRIGGERS
-- =====================================================================

-- Helper: Generate a unique random alphanumeric user code (Format: SPDXXXXXX)
create or replace function public.generate_unique_spd_code()
returns text as $$
declare
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- Exclude confusing chars like 1, 0, I, O
  result text := 'SPD';
  i integer;
  is_unique boolean := false;
begin
  while not is_unique loop
    result := 'SPD';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    
    -- Check uniqueness
    select not exists(select 1 from public.profiles where unique_code = result) into is_unique;
  end loop;
  return result;
end;
$$ language plpgsql;

-- Trigger: Automatic profile creation when a user registers on Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, unique_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://i.pravatar.cc/150?img=' || floor(random() * 70 + 1)::text),
    public.generate_unique_spd_code()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger registration
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- Profiles Policies
create policy "Anyone can view user profiles (required for friend search)" on public.profiles
  for select using (true);
create policy "Users can update their own profile details" on public.profiles
  for update using (auth.uid() = id);

-- Helper: Non-recursive group membership check (Security Definer bypasses RLS)
create or replace function public.is_group_member(group_id uuid, user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.group_members gm
    where gm.group_id = is_group_member.group_id and gm.user_id = is_group_member.user_id
  );
end;
$$ language plpgsql security definer;

-- Group Members Policies
create policy "Users can view memberships of groups they belong to" on public.group_members
  for select using (
    public.is_group_member(group_id, auth.uid())
  );
create policy "Members can add others to their groups" on public.group_members
  for insert with check (auth.role() = 'authenticated');
create policy "Users can remove themselves from groups" on public.group_members
  for delete using (user_id = auth.uid());

-- Groups Policies
create policy "Users can view groups they are members of" on public.groups
  for select using (
    created_by = auth.uid()
    or
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );
create policy "Authenticated users can create a group" on public.groups
  for insert with check (
    auth.role() = 'authenticated'
    and
    (created_by = auth.uid() or created_by is null)
  );
create policy "Group creators can update their groups" on public.groups
  for update using (created_by = auth.uid());
create policy "Group creators can delete their groups" on public.groups
  for delete using (created_by = auth.uid());

-- Expenses Policies
create policy "Users can view expenses in their groups" on public.expenses
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id and gm.user_id = auth.uid()
    )
  );
create policy "Users can record expenses in their groups" on public.expenses
  for insert with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = expenses.group_id and gm.user_id = auth.uid()
    )
  );
create policy "Expense creators or payers can update group expenses" on public.expenses
  for update using (
    paid_by = auth.uid() or exists (
      select 1 from public.groups g
      where g.id = expenses.group_id and g.created_by = auth.uid()
    )
  );
create policy "Expense creators or payers can delete group expenses" on public.expenses
  for delete using (
    paid_by = auth.uid() or exists (
      select 1 from public.groups g
      where g.id = expenses.group_id and g.created_by = auth.uid()
    )
  );

-- Expense Splits Policies
create policy "Users can view expense splits in their groups" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on e.group_id = gm.group_id
      where e.id = expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );
create policy "Users can create splits in their groups" on public.expense_splits
  for insert with check (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on e.group_id = gm.group_id
      where e.id = expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );
create policy "Payers can update expense splits" on public.expense_splits
  for update using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id and e.paid_by = auth.uid()
    )
  );
create policy "Payers can delete expense splits" on public.expense_splits
  for delete using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id and e.paid_by = auth.uid()
    )
  );

-- Settlements Policies
create policy "Users can view settlements in their groups" on public.settlements
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = settlements.group_id and gm.user_id = auth.uid()
    )
  );
create policy "Users can record settlements if they are in the group" on public.settlements
  for insert with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = settlements.group_id and gm.user_id = auth.uid()
    ) and (payer_id = auth.uid() or payee_id = auth.uid())
  );
create policy "Payer can update their settlement logs" on public.settlements
  for update using (payer_id = auth.uid());
create policy "Payer can delete their settlement logs" on public.settlements
  for delete using (payer_id = auth.uid());

-- =====================================================================
-- 4. STORAGE CONFIGURATION FOR RECEIPTS (Supabase Storage)
-- =====================================================================
-- Note: Create a bucket named "receipts" in the Supabase Dashboard, 
-- and set it to public. Or use the following SQL script to configure policies:

-- Create bucket if not exists (Usually done in dashboard but included for completeness)
insert into storage.buckets (id, name, public) 
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload receipt files" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and auth.role() = 'authenticated'
  );

create policy "Anyone can read receipt files" on storage.objects
  for select using (
    bucket_id = 'receipts'
  );

-- =====================================================================
-- 5. EXTENDED SCHEMA FOR FRIENDS, NOTIFICATIONS & LOGS
-- =====================================================================

-- Friends Table
create table public.friends (
  id uuid default gen_random_uuid() primary key,
  user_id_1 uuid references public.profiles(id) on delete cascade not null,
  user_id_2 uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint friends_pair_unique unique (user_id_1, user_id_2),
  constraint friends_pair_ordered check (user_id_1 < user_id_2)
);

-- Friend Requests Table
create table public.friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint friend_requests_unique unique (sender_id, receiver_id),
  constraint friend_requests_not_self check (sender_id <> receiver_id)
);

-- Notifications Table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  type text not null, -- e.g., 'friend_request', 'expense', 'settlement'
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activity Logs Table
create table public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Indexes for performance
create index idx_friends_user_1 on public.friends(user_id_1);
create index idx_friends_user_2 on public.friends(user_id_2);
create index idx_friend_requests_sender on public.friend_requests(sender_id);
create index idx_friend_requests_receiver on public.friend_requests(receiver_id);
create index idx_notifications_user_read on public.notifications(user_id, is_read);
create index idx_activity_logs_group on public.activity_logs(group_id);

-- Enable RLS on the new tables
alter table public.friends enable row level security;
alter table public.friend_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- Friends RLS Policies
create policy "Users can view their own friendships" on public.friends
  for select using (auth.uid() = user_id_1 or auth.uid() = user_id_2);
create policy "Users can remove their own friendships" on public.friends
  for delete using (auth.uid() = user_id_1 or auth.uid() = user_id_2);
create policy "Users can add friendships" on public.friends
  for insert with check (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- Friend Requests RLS Policies
create policy "Users can view their sent or received friend requests" on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send friend requests" on public.friend_requests
  for insert with check (auth.uid() = sender_id);
create policy "Receivers can update friend request status" on public.friend_requests
  for update using (auth.uid() = receiver_id);
create policy "Users can delete their own friend requests" on public.friend_requests
  for delete using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Notifications RLS Policies
create policy "Users can view their own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Users can update their own notifications (mark as read)" on public.notifications
  for update using (auth.uid() = user_id);
create policy "Users can delete their own notifications" on public.notifications
  for delete using (auth.uid() = user_id);
create policy "Authenticated users can create notifications for others" on public.notifications
  for insert with check (auth.uid() is not null);

-- Activity Logs RLS Policies
create policy "Users can view activity logs of groups they belong to" on public.activity_logs
  for select using (
    user_id = auth.uid() or 
    (group_id is not null and exists (
      select 1 from public.group_members gm
      where gm.group_id = activity_logs.group_id and gm.user_id = auth.uid()
    ))
  );
create policy "Users can create activity logs" on public.activity_logs
  for insert with check (auth.uid() = user_id);
