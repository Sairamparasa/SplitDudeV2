-- =====================================================================
-- SPLITDUDE MOCK DATABASE SEED DATA
-- Paste this script into the Supabase SQL Editor to populate dummy profiles,
-- groups, memberships, and expenses for visual dashboard testing.
-- =====================================================================

-- Note: Ensure that you have already created at least one auth.users entry 
-- or you can create mock profiles directly. Since profiles reference auth.users,
-- the following mock inserts profiles without auth links for local DB testing.
-- If using Supabase auth, link these manually or use the handles.

-- Turn off trigger temporarily to prevent duplicate key errors during manual insert
alter table auth.users disable trigger all;

-- 1. Create mock users in auth.users
insert into auth.users (id, email)
values
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'alex@splitdude.dev'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'sarah@splitdude.dev'),
  ('c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'james@splitdude.dev')
on conflict (id) do nothing;

alter table auth.users enable trigger all;

-- 2. Create mock user profiles
insert into public.profiles (id, email, full_name, avatar_url, unique_code)
values
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'alex@splitdude.dev', 'Alex Morgan', 'https://i.pravatar.cc/150?img=11', 'SPD7H4K2M'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'sarah@splitdude.dev', 'Sarah Connor', 'https://i.pravatar.cc/150?img=20', 'SPD3L9J5P'),
  ('c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'james@splitdude.dev', 'James Bond', 'https://i.pravatar.cc/150?img=33', 'SPD9R2M7K')
on conflict (id) do nothing;

-- 3. Create mock friendships
insert into public.friends (user_id_1, user_id_2)
values
  -- Ensure user_id_1 < user_id_2 ordered checks are satisfied
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e'),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f')
on conflict do nothing;

-- 4. Create mock groups
insert into public.groups (id, name, description, icon, created_by)
values
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Road Trip 2026', 'Summer trip to California!', '🚗', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'Roommates 4B', 'Monthly shared rent and grocery logs', '🏠', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e')
on conflict (id) do nothing;

-- 5. Add members to groups
insert into public.group_members (group_id, user_id)
values
  -- Road Trip members (Alex, Sarah, James)
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f'),
  -- Roommates members (Alex, Sarah)
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e')
on conflict do nothing;

-- 6. Create mock expenses
insert into public.expenses (id, group_id, title, amount, paid_by, split_mode)
values
  -- Expense 1: Gas for trip paid by Alex ($90.00 split equally)
  ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Gas Fill-up', 90.00, 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'equal'),
  -- Expense 2: Grocery paid by Sarah ($60.00 split equally)
  ('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'Groceries', 60.00, 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'equal')
on conflict (id) do nothing;

-- 7. Add expense splits
insert into public.expense_splits (expense_id, user_id, amount)
values
  -- Gas Fill-up splits (Alex, Sarah, James get $30 each)
  ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 30.00),
  ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a-4b5c6d7e', 30.00),
  ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 30.00),
  -- Grocery splits (Alex, Sarah get $30 each)
  ('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 30.00),
  ('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a-4b5c6d7e', 30.00)
on conflict do nothing;

-- 8. Add notifications
insert into public.notifications (user_id, title, content, type)
values
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Welcome to SplitDude!', 'Get started splitting expenses in under 30 seconds.', 'general'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Welcome to SplitDude!', 'Get started splitting expenses in under 30 seconds.', 'general')
on conflict do nothing;
