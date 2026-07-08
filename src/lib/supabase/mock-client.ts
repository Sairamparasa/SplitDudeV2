// =====================================================================
// SPLITDUDE CLIENT-SIDE MOCK DATABASE & SUPABASE CLIENT FALLBACK
// =====================================================================



// Check if window is defined (browser environment)
const isBrowser = typeof window !== 'undefined'

// Seed Data Configuration
const seedProfiles = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    email: 'alex@splitdude.dev',
    full_name: 'Alex Morgan',
    avatar_url: 'https://i.pravatar.cc/150?img=11',
    unique_code: 'SPD7H4K2M',
    created_at: new Date().toISOString()
  },
  {
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    email: 'sarah@splitdude.dev',
    full_name: 'Sarah Connor',
    avatar_url: 'https://i.pravatar.cc/150?img=20',
    unique_code: 'SPD3L9J5P',
    created_at: new Date().toISOString()
  },
  {
    id: 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    email: 'james@splitdude.dev',
    full_name: 'James Bond',
    avatar_url: 'https://i.pravatar.cc/150?img=33',
    unique_code: 'SPD9R2M7K',
    created_at: new Date().toISOString()
  },
  {
    id: 'd4e5f6g7-h8i9-0j1k-2l3m-4n5o6p7q8r9s',
    email: 'john@splitdude.dev',
    full_name: 'John Doe',
    avatar_url: 'https://i.pravatar.cc/150?img=47',
    unique_code: 'SPDFRIEND',
    created_at: new Date().toISOString()
  }
]

const seedFriends = [
  { id: 'f1', user_id_1: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', user_id_2: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', created_at: new Date().toISOString() },
  { id: 'f2', user_id_1: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', user_id_2: 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f', created_at: new Date().toISOString() }
]

const seedGroups = [
  { id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', name: 'California Road Trip 🚗', description: 'California summer adventure splitting fuel & stays', icon: '🚗', created_by: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', created_at: new Date().toISOString() },
  { id: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', name: 'Roommates 4B 🏠', description: 'Shared utility rent splits', icon: '🏠', created_by: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', created_at: new Date().toISOString() }
]

const seedGroupMembers = [
  { id: 'm1', group_id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', created_at: new Date().toISOString() },
  { id: 'm2', group_id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', user_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', created_at: new Date().toISOString() },
  { id: 'm3', group_id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', user_id: 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f', created_at: new Date().toISOString() },
  { id: 'm4', group_id: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', created_at: new Date().toISOString() },
  { id: 'm5', group_id: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', user_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', created_at: new Date().toISOString() }
]

const seedExpenses = [
  { id: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', group_id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', title: 'Gas Refueling', amount: 90.00, paid_by: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', split_mode: 'equal', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', group_id: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', title: 'Dinner Takeaway', amount: 40.00, paid_by: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', split_mode: 'equal', created_at: new Date(Date.now() - 3600000 * 12).toISOString() }
]

const seedSplits = [
  { id: 's1', expense_id: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', amount: 30.00 },
  { id: 's2', expense_id: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', user_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f', amount: 30.00 },
  { id: 's3', expense_id: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', user_id: 'c3d4e5f5-a7b8-9c0d-1e2f-3a4b5c6d7e8f', amount: 30.00 },
  { id: 's4', expense_id: 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', amount: 20.00 },
  { id: 's5', expense_id: 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', user_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', amount: 20.00 }
]

const seedNotifications = [
  { id: 'n1', user_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', title: 'Welcome to SplitDude! 💸', message: 'You can now share expenses, track balances and settle bills easily.', type: 'social', is_read: false, created_at: new Date().toISOString() }
]

// Database Loader Helper
export class LocalStore {
  static get(key: string, defaultVal: any) {
    if (!isBrowser) return defaultVal
    const stored = localStorage.getItem(`splitdude_${key}`)
    if (!stored) {
      this.set(key, defaultVal)
      return defaultVal
    }
    return JSON.parse(stored)
  }

  static set(key: string, val: any) {
    if (isBrowser) {
      localStorage.setItem(`splitdude_${key}`, JSON.stringify(val))
    }
  }

  static initialize() {
    if (!isBrowser) return
    const list = this.get('profiles', seedProfiles)
    
    // Ensure all seed profiles exist in the saved list (self-healing seed db)
    let updated = false
    const newList = [...list]
    for (const seed of seedProfiles) {
      if (!newList.some((p: any) => p.id === seed.id)) {
        newList.push(seed)
        updated = true
      }
    }
    if (updated) {
      this.set('profiles', newList)
    }

    this.get('friends', seedFriends)
    this.get('friend_requests', [])
    this.get('groups', seedGroups)
    this.get('group_members', seedGroupMembers)
    this.get('expenses', seedExpenses)
    this.get('expense_splits', seedSplits)
    this.get('settlements', [])
    this.get('notifications', seedNotifications)
    this.get('activity_logs', [])
  }
}

// Ensure mock tables are ready in localStorage on import
if (isBrowser) {
  LocalStore.initialize()
}

// Fluent mock query engine builder
class MockQueryBuilder {
  private tableName: string
  private filters: Array<(item: any) => boolean> = []
  private sortCol: string | null = null
  private sortAsc = true

  private updateData: any = null
  private isUpdate = false
  private isDelete = false

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select() {
    return this
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value)
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push((item) => values.includes(item[column]))
    return this
  }

  or(queryStr: string) {
    this.filters.push((item) => {
      // Split the main parts by comma (unless inside parentheses)
      // E.g. and(a.eq.1,b.eq.2),and(c.eq.3,d.eq.4)
      const outerClauses = queryStr.split(/,(?=and\(|[a-zA-Z0-9_]+\.eq\.)/)
      
      return outerClauses.some((clause) => {
        // Parse a single clause: either "and(x.eq.y,z.eq.w)" or "x.eq.y"
        if (clause.startsWith('and(') && clause.endsWith(')')) {
          const innerContent = clause.substring(4, clause.length - 1)
          const conditions = innerContent.split(',')
          return conditions.every((cond) => {
            const match = cond.match(/([a-zA-Z0-9_]+)\.eq\.([a-zA-Z0-9\-]+)/)
            return match ? String(item[match[1]]) === String(match[2]) : false
          })
        } else {
          // Simple condition x.eq.y
          const match = clause.match(/([a-zA-Z0-9_]+)\.eq\.([a-zA-Z0-9\-]+)/)
          return match ? String(item[match[1]]) === String(match[2]) : false
        }
      })
    })
    return this
  }

  order(column: string, { ascending = true } = {}) {
    this.sortCol = column
    this.sortAsc = ascending
    return this
  }

  // Terminal methods
  async insert(data: any) {
    const list = LocalStore.get(this.tableName, [])
    const items = Array.isArray(data) ? data : [data]
    const inserted: any[] = []

    for (const raw of items) {
      const item = {
        id: raw.id || Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
        ...raw
      }
      list.push(item)
      inserted.push(item)

      // Add trigger-like effects
      if (this.tableName === 'expenses') {
        // Add log
        const logs = LocalStore.get('activity_logs', [])
        logs.push({
          id: Math.random().toString(36).substring(2, 10),
          group_id: item.group_id,
          user_id: item.paid_by,
          action_type: 'expense_created',
          details: { title: item.title, amount: item.amount },
          created_at: new Date().toISOString()
        })
        LocalStore.set('activity_logs', logs)
      }
    }

    LocalStore.set(this.tableName, list)
    return { data: Array.isArray(data) ? inserted : inserted[0], error: null }
  }

  update(data: any) {
    this.updateData = data
    this.isUpdate = true
    return this
  }

  delete() {
    this.isDelete = true
    return this
  }

  private executeQuery(): any[] {
    const list = LocalStore.get(this.tableName, [])
    
    // Simulate Row Level Security (RLS)
    let currentUserId: string | null = null
    if (isBrowser) {
      const activeUserJson = localStorage.getItem('splitdude_mock_user')
      if (activeUserJson) {
        currentUserId = JSON.parse(activeUserJson).id
      }
    }
    
    let rlsResult = list
    if (currentUserId) {
      if (this.tableName === 'groups') {
        const members = LocalStore.get('group_members', [])
        rlsResult = list.filter((g: any) => 
          members.some((gm: any) => gm.group_id === g.id && gm.user_id === currentUserId)
        )
      } else if (this.tableName === 'group_members') {
        const members = LocalStore.get('group_members', [])
        const myGroups = members.filter((gm: any) => gm.user_id === currentUserId).map((gm: any) => gm.group_id)
        rlsResult = list.filter((gm: any) => myGroups.includes(gm.group_id))
      } else if (this.tableName === 'expenses') {
        const members = LocalStore.get('group_members', [])
        const myGroups = members.filter((gm: any) => gm.user_id === currentUserId).map((gm: any) => gm.group_id)
        rlsResult = list.filter((exp: any) => myGroups.includes(exp.group_id))
      } else if (this.tableName === 'expense_splits') {
        const members = LocalStore.get('group_members', [])
        const myGroups = members.filter((gm: any) => gm.user_id === currentUserId).map((gm: any) => gm.group_id)
        const expenses = LocalStore.get('expenses', [])
        const myExpenses = expenses.filter((exp: any) => myGroups.includes(exp.group_id)).map((exp: any) => exp.id)
        rlsResult = list.filter((split: any) => myExpenses.includes(split.expense_id))
      } else if (this.tableName === 'settlements') {
        const members = LocalStore.get('group_members', [])
        const myGroups = members.filter((gm: any) => gm.user_id === currentUserId).map((gm: any) => gm.group_id)
        rlsResult = list.filter((s: any) => myGroups.includes(s.group_id))
      } else if (this.tableName === 'friends') {
        rlsResult = list.filter((f: any) => f.user_id_1 === currentUserId || f.user_id_2 === currentUserId)
      } else if (this.tableName === 'friend_requests') {
        rlsResult = list.filter((r: any) => r.sender_id === currentUserId || r.receiver_id === currentUserId)
      } else if (this.tableName === 'notifications') {
        rlsResult = list.filter((n: any) => n.user_id === currentUserId)
      } else if (this.tableName === 'activity_logs') {
        const members = LocalStore.get('group_members', [])
        const myGroups = members.filter((gm: any) => gm.user_id === currentUserId).map((gm: any) => gm.group_id)
        rlsResult = list.filter((log: any) => myGroups.includes(log.group_id))
      }
    }

    let result = rlsResult.filter((item: any) => this.filters.every((fn) => fn(item)))

    // Expand joins
    if (this.tableName === 'groups') {
      const members = LocalStore.get('group_members', [])
      const profiles = LocalStore.get('profiles', [])
      result = result.map((group: any) => {
        const gMembers = members
          .filter((gm: any) => gm.group_id === group.id)
          .map((gm: any) => {
            const profile = profiles.find((p: any) => p.id === gm.user_id)
            return { ...gm, profiles: profile }
          })
        return { ...group, group_members: gMembers }
      })
    } else if (this.tableName === 'expenses') {
      const groups = LocalStore.get('groups', [])
      const profiles = LocalStore.get('profiles', [])
      result = result.map((exp: any) => {
        return {
          ...exp,
          group: groups.find((g: any) => g.id === exp.group_id),
          payer: profiles.find((p: any) => p.id === exp.paid_by)
        }
      })
    } else if (this.tableName === 'expense_splits') {
      const profiles = LocalStore.get('profiles', [])
      result = result.map((split: any) => {
        return {
          ...split,
          profile: profiles.find((p: any) => p.id === split.user_id)
        }
      })
    } else if (this.tableName === 'settlements') {
      const profiles = LocalStore.get('profiles', [])
      result = result.map((s: any) => {
        return {
          ...s,
          payer: profiles.find((p: any) => p.id === s.payer_id),
          payee: profiles.find((p: any) => p.id === s.payee_id)
        }
      })
    }

    if (this.sortCol) {
      result.sort((a: any, b: any) => {
        const valA = a[this.sortCol!]
        const valB = b[this.sortCol!]
        if (valA < valB) return this.sortAsc ? -1 : 1
        if (valA > valB) return this.sortAsc ? 1 : -1
        return 0
      })
    }

    return result
  }

  private executeWrite() {
    if (this.isUpdate) {
      const list = LocalStore.get(this.tableName, [])
      const updatedList = list.map((item: any) => {
        const match = this.filters.every((fn) => fn(item))
        if (match) {
          return { ...item, ...this.updateData, updated_at: new Date().toISOString() }
        }
        return item
      })
      LocalStore.set(this.tableName, updatedList)
      return updatedList.filter((item: any) => this.filters.every((fn) => fn(item)))
    }
    
    if (this.isDelete) {
      const list = LocalStore.get(this.tableName, [])
      const filteredList = list.filter((item: any) => !this.filters.every((fn) => fn(item)))
      LocalStore.set(this.tableName, filteredList)
      return null
    }

    return this.executeQuery()
  }

  // Thenable compliance
  then(onfulfilled: (value: any) => void) {
    onfulfilled({ data: this.executeWrite(), error: null })
  }

  async single() {
    const res = this.executeWrite()
    const data = Array.isArray(res) ? res[0] : res
    if (!data) return { data: null, error: { message: 'Row not found' } }
    return { data, error: null }
  }

  async maybeSingle() {
    const res = this.executeWrite()
    const data = Array.isArray(res) ? res[0] : res
    return { data: data || null, error: null }
  }
}

// Mock Supabase Auth engine
class MockAuth {
  async getUser() {
    if (!isBrowser) {
      try {
        const { cookies } = require('next/headers')
        const cookieStore = await cookies()
        const mockUserCookie = cookieStore.get('splitdude_session_user')
        if (mockUserCookie) {
          const profiles = LocalStore.get('profiles', seedProfiles)
          const found = profiles.find((p: any) => p.id === mockUserCookie.value)
          return {
            data: {
              user: found
                ? { id: found.id, email: found.email }
                : { id: mockUserCookie.value, email: 'mock@splitdude.dev' }
            },
            error: null
          }
        }
      } catch (err) {
        console.error('Error reading mock session user cookie on server:', err)
      }
      return { data: { user: null }, error: null }
    }

    const activeUserJson = localStorage.getItem('splitdude_mock_user')
    if (!activeUserJson) {
      // Default auto-login to Alex Morgan in Sandbox mode
      const alex = seedProfiles[0]
      localStorage.setItem('splitdude_mock_user', JSON.stringify({ id: alex.id, email: alex.email }))
      
      // Write Cookie for Middleware matching
      document.cookie = `splitdude_session_user=${alex.id}; path=/; max-age=86400`
      
      return { data: { user: { id: alex.id, email: alex.email } }, error: null }
    }
    return { data: { user: JSON.parse(activeUserJson) }, error: null }
  }

  async signUp({ email, options }: any) {
    const profiles = LocalStore.get('profiles', seedProfiles)
    
    // Check if email already exists
    if (profiles.some((p: any) => p.email === email)) {
      return { data: { session: null, user: null }, error: { message: 'User already exists.' } }
    }

    const userId = Math.random().toString(36).substring(2, 15)
    const newProfile = {
      id: userId,
      email,
      full_name: options?.data?.full_name || email.split('@')[0],
      avatar_url: options?.data?.avatar_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`,
      unique_code: `SPD${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      created_at: new Date().toISOString()
    }

    profiles.push(newProfile)
    LocalStore.set('profiles', profiles)

    // Automatically sign in
    const userSession = { id: userId, email }
    localStorage.setItem('splitdude_mock_user', JSON.stringify(userSession))
    document.cookie = `splitdude_session_user=${userId}; path=/; max-age=86400`

    return { data: { session: { access_token: 'mock-jwt-token' }, user: userSession }, error: null }
  }

  async signInWithPassword({ email }: any) {
    const profiles = LocalStore.get('profiles', seedProfiles)
    const foundProfile = profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase())
    
    if (!foundProfile) {
      return { data: { session: null, user: null }, error: { message: 'Invalid login credentials' } }
    }

    const userSession = { id: foundProfile.id, email: foundProfile.email }
    localStorage.setItem('splitdude_mock_user', JSON.stringify(userSession))
    document.cookie = `splitdude_session_user=${foundProfile.id}; path=/; max-age=86400`

    return { data: { session: { access_token: 'mock-jwt-token' }, user: userSession }, error: null }
  }

  async signOut() {
    localStorage.removeItem('splitdude_mock_user')
    document.cookie = 'splitdude_session_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
    return { error: null }
  }

  async signInWithOAuth({ provider, options }: any) {
    if (isBrowser) {
      // Simulate Google Login by logging in as Sarah Connor in sandbox mode
      const sarah = seedProfiles[1]
      localStorage.setItem('splitdude_mock_user', JSON.stringify({ id: sarah.id, email: sarah.email }))
      document.cookie = `splitdude_session_user=${sarah.id}; path=/; max-age=86400`
      window.location.href = options?.redirectTo || '/home'
    }
    return { data: { provider, url: '/home' }, error: null }
  }

  onAuthStateChange() {
    // No-op for mock
    return { data: { subscription: { unsubscribe: () => {} } } }
  }
}

// Client Factory wrapper returning fluent structure
export class MockSupabaseClient {
  auth = new MockAuth()

  from(tableName: string) {
    return new MockQueryBuilder(tableName)
  }
}

// Helper to determine if we should fall back to mock
export function shouldMockSupabase(): boolean {
  // If NEXT_PUBLIC_MOCK_SUPABASE is set to true, OR if Supabase configuration is missing/invalid
  if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true') return true
  if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'false') return false
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url')) return true
  
  // Default to mock database if it's the sandbox url
  if (process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://qwvrmenofmocqllklsaj.supabase.co') return true
  
  return false
}
