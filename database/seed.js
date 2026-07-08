// =====================================================================
// SPLITDUDE MOCK DATABASE SEED SCRIPT (Node.js)
// Run with: node --env-file=.env.local database/seed.js
// =====================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function seed() {
  console.log('Seeding SplitDude database...');

  try {
    // 1. Mock Users
    const mockUsers = [
      { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', email: 'alex@splitdude.dev' },
      { id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', email: 'sarah@splitdude.dev' },
      { id: 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f', email: 'james@splitdude.dev' },
    ];

    for (const user of mockUsers) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.email.split('@')[0].toUpperCase(),
          avatar_url: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`,
          unique_code: `SPD${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        });
      if (profileError) {
        console.warn(`Profile upsert error for ${user.email}:`, profileError.message);
      }
    }
    console.log('✔ Mock profiles initialized.');

    // 2. Friendships
    const { error: friendsError } = await supabase
      .from('friends')
      .upsert([
        {
          user_id_1: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          user_id_2: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
        },
        {
          user_id_1: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          user_id_2: 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
        },
      ]);
    if (friendsError) console.warn('Friends insertion warning:', friendsError.message);
    else console.log('✔ Friend relationships created.');

    // 3. Groups
    const group1Id = 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a';
    const group2Id = 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b';

    const { error: groupsError } = await supabase
      .from('groups')
      .upsert([
        {
          id: group1Id,
          name: 'Road Trip 2026',
          description: 'California summer adventure!',
          icon: '🚗',
          created_by: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        },
        {
          id: group2Id,
          name: 'Roommates 4B',
          description: 'Shared rent & living utility splits',
          icon: '🏠',
          created_by: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
        },
      ]);
    if (groupsError) console.warn('Groups upsert error:', groupsError.message);
    else console.log('✔ Target groups initialized.');

    // 4. Group Members
    const { error: membersError } = await supabase
      .from('group_members')
      .upsert([
        { group_id: group1Id, user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
        { group_id: group1Id, user_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' },
        { group_id: group1Id, user_id: 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f' },
        { group_id: group2Id, user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
        { group_id: group2Id, user_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' },
      ]);
    if (membersError) console.warn('Members insert error:', membersError.message);
    else console.log('✔ Group memberships bound.');

    // 5. Expenses & Splits
    const expense1Id = 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c';
    const expense2Id = 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d';

    const { error: expError } = await supabase
      .from('expenses')
      .upsert([
        {
          id: expense1Id,
          group_id: group1Id,
          title: 'Gas Refueling',
          amount: 90.00,
          paid_by: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          split_mode: 'equal',
        },
        {
          id: expense2Id,
          group_id: group2Id,
          title: 'Dinner Takeaway',
          amount: 40.00,
          paid_by: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
          split_mode: 'equal',
        },
      ]);
    if (expError) console.warn('Expenses insert error:', expError.message);
    else console.log('✔ Seed expenses created.');

    const { error: splitsError } = await supabase
      .from('expense_splits')
      .upsert([
        { expense_id: expense1Id, user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', amount: 30.00 },
        { expense_id: expense1Id, user_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', amount: 30.00 },
        { expense_id: expense1Id, user_id: 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f', amount: 30.00 },
        { expense_id: expense2Id, user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', amount: 20.00 },
        { expense_id: expense2Id, user_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', amount: 20.00 },
      ]);
    if (splitsError) console.warn('Expense splits error:', splitsError.message);
    else console.log('✔ Expense splits computed and seeded.');

    console.log('Seeding process completed successfully!');
  } catch (error) {
    console.error('Fatal seeding error:', error.message || error);
  }
}

seed();
