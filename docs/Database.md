# Supabase Database Schema & Policies

SplitDude utilizes **Supabase (PostgreSQL)** as its primary database. Row-Level Security (RLS) is enabled across all tables to enforce strict data isolation between users.

---

## Database Schema (DDL)

```
        ┌──────────────┐
        │   profiles   │◄──────────────┐
        └──────┬───────┘               │
               │ (1:many)              │
               ▼                       │ (1:many)
        ┌──────────────┐               │
        │    groups    │               │
        └──────┬───────┘               │
               │ (1:many)              │
               ▼                       │
     ┌──────────────────┐              │
     │  group_members   │              │
     └──────────────────┘              │
               │                       │
               ▼                       │
     ┌──────────────────┐              │
     │     expenses     │◄─────────────┤
     └─────────┬────────┘              │
               │ (1:many)              │
               ▼                       │
     ┌──────────────────┐              │
     │  expense_splits  │◄─────────────┘
     └──────────────────┘
```

### 1. `profiles` Table
Stores user profile information synced from Supabase Auth.

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  avatar_url text,
  unique_code varchar(9) unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 2. `friends` Table
Stores relationships between users.

```sql
create table public.friends (
  id uuid default gen_random_uuid() primary key,
  user_id_1 uuid references public.profiles(id) on delete cascade not null,
  user_id_2 uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id_1, user_id_2)
);
```

### 3. `groups` Table
Stores expense splitting groups.

```sql
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  icon varchar(10) default '✈️',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 4. `group_members` Table
Associates profiles with groups.

```sql
create table public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (group_id, user_id)
);
```

### 5. `expenses` Table
Stores recorded expenses.

```sql
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  paid_by uuid references public.profiles(id) on delete cascade not null,
  split_mode varchar(20) default 'equal' not null, -- 'equal', 'exact', 'percentage'
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 6. `expense_splits` Table
Stores how much each member owes for a specific expense.

```sql
create table public.expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12, 2) not null,
  share_value numeric(12, 2), -- represents percentage or exact share weight
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### 7. `settlements` Table
Tracks settlement payments between group members.

```sql
create table public.settlements (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  payer_id uuid references public.profiles(id) on delete cascade not null,
  payee_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

---

## Row-Level Security (RLS) Policies

To protect user privacy, RLS is enabled on all tables:

### Profiles
* **Select**: Allow read to anyone authenticated (to search friends by unique Split ID).
* **Insert/Update**: Only allow users to mutate their own profile (`auth.uid() = id`).

### Groups
* **All Operations**: Only allow access if the authenticated user's ID is registered in the `group_members` table for the corresponding group.

```sql
create policy "Allow group members to view group"
  on public.groups
  for select
  using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
      and group_members.user_id = auth.uid()
    )
  );
```

### Expenses, Splits, & Settlements
* **All Operations**: Enforces that the logged-in user is a member of the corresponding group.

---

## Database Triggers & Functions

### Profile Sync on Auth Signup
Whenever a user completes sign-up via Supabase Auth, a trigger automatically creates a row in the public `profiles` table and generates a random unique Split ID (format: `SPDXXXXXX`).

```sql
-- Function to generate a random uppercase alphanumeric Split ID
create or replace function public.generate_unique_code()
returns varchar(9) as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result varchar(9) := 'SPD';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- Trigger function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, unique_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'avatar_url',
    public.generate_unique_code()
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```
