'use client'

import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Search, Command, Users, User, Receipt, Bell, Settings, ChevronRight, CornerDownLeft, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Command palette data lists
  const [groups, setGroups] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch search index data once when page loads
  useEffect(() => {
    async function loadIndexData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch Groups
      const { data: groupData } = await supabase
        .from('groups')
        .select('id, name, icon')
      if (groupData) setGroups(groupData)

      // Fetch Friends
      const { data: friendData } = await supabase
        .from('friends')
        .select('id, user_id_1, user_id_2')
      if (friendData) {
        // Resolve profile names
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, unique_code')
        if (profiles) {
          const resolved = friendData.map((f: any) => {
            const friendId = f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
            const p = profiles.find((prof: any) => prof.id === friendId)
            return p ? { id: friendId, name: p.full_name, code: p.unique_code } : null
          }).filter(Boolean)
          setFriends(resolved)
        }
      }

      // Fetch Expenses
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('id, title, amount')
        .limit(10)
      if (expenseData) setExpenses(expenseData)
    }

    if (paletteOpen) {
      loadIndexData()
    }
  }, [paletteOpen, supabase])

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
        setSearchQuery('')
        setSelectedIndex(0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Static command items
  const staticCommands = [
    { name: 'Go to Home', action: () => router.push('/home'), icon: Home, category: 'Navigation' },
    { name: 'Go to Dashboard', action: () => router.push('/dashboard'), icon: Command, category: 'Navigation' },
    { name: 'Go to Groups', action: () => router.push('/groups'), icon: Users, category: 'Navigation' },
    { name: 'Go to Expenses', action: () => router.push('/expenses'), icon: Receipt, category: 'Navigation' },
    { name: 'Go to Friends', action: () => router.push('/friends'), icon: User, category: 'Navigation' },
    { name: 'Go to Notifications', action: () => router.push('/notifications'), icon: Bell, category: 'Navigation' },
    { name: 'Go to Settings', action: () => router.push('/settings'), icon: Settings, category: 'Navigation' },
  ]

  // Filtered results combination
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    const result: any[] = []

    // 1. Match Navigation Commands
    staticCommands.forEach((cmd) => {
      if (cmd.name.toLowerCase().includes(query)) {
        result.push({ ...cmd, type: 'command' })
      }
    })

    // 2. Match Groups
    groups.forEach((g) => {
      if (g.name.toLowerCase().includes(query)) {
        result.push({
          name: `${g.icon || '📁'} ${g.name}`,
          category: 'Groups',
          action: () => router.push(`/groups/${g.id}`),
          icon: Users,
          type: 'group'
        })
      }
    })

    // 3. Match Friends
    friends.forEach((f) => {
      if (f.name.toLowerCase().includes(query)) {
        result.push({
          name: f.name,
          category: 'Friends',
          action: () => {
            navigator.clipboard.writeText(f.code)
            alert(`Copied ${f.name}'s ID: ${f.code}`)
          },
          icon: User,
          type: 'friend'
        })
      }
    })

    // 4. Match Expenses
    expenses.forEach((e) => {
      if (e.title.toLowerCase().includes(query)) {
        result.push({
          name: `${e.title} ($${Number(e.amount).toFixed(2)})`,
          category: 'Expenses',
          action: () => router.push(`/expenses/${e.id}`),
          icon: Receipt,
          type: 'expense'
        })
      }
    })

    return result
  }, [searchQuery, groups, friends, expenses])

  // Handle arrow key navigation inside search palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!paletteOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action()
          setPaletteOpen(false)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [paletteOpen, filteredItems, selectedIndex])

  // Auto focus input when palette opens
  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [paletteOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg text-white">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 h-full p-6 shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative flex-1 flex flex-col max-w-xs w-full p-4 h-full"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
            </motion.div>
            {/* Backdrop Click to Close */}
            <div className="flex-1" onClick={() => setSidebarOpen(false)}></div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-6 md:pl-0">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        <div className="flex-1 w-full max-w-7xl mx-auto pb-10">
          {children}
        </div>
      </main>

      {/* Ctrl+K Command Palette Modal */}
      <AnimatePresence>
        {paletteOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl glass-card overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.8)] border border-white/10"
            >
              {/* Header Search Field */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/3">
                <Search className="w-5 h-5 text-white/40" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a command or search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSelectedIndex(0)
                  }}
                  className="w-full bg-transparent border-none outline-none text-white placeholder-white/35 text-base py-1"
                />
                <button
                  onClick={() => setPaletteOpen(false)}
                  className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
                {filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-sm text-white/45">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  filteredItems.map((item, index) => {
                    const isSelected = index === selectedIndex
                    const IconComponent = item.icon
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          item.action()
                          setPaletteOpen(false)
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-brand-accent/20 text-white border border-brand-accent/35 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                            : 'text-white/70 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className={`w-4 h-4 ${isSelected ? 'text-brand-accent' : 'text-white/40'}`} />
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-[10px] text-white/30 font-mono tracking-wider px-1.5 py-0.5 bg-white/5 rounded border border-white/5 uppercase">
                            {item.category}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1 text-[10px] text-white/45 font-mono">
                            <span>Select</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer shortcuts */}
              <div className="flex justify-between items-center px-4 py-2.5 bg-white/2 border-t border-white/5 text-[10px] text-white/40 font-medium">
                <div className="flex items-center gap-2">
                  <span>Use arrows <kbd className="bg-white/5 px-1 py-0.5 rounded border border-white/5">↑</kbd><kbd className="bg-white/5 px-1 py-0.5 rounded border border-white/5">↓</kbd> to navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="bg-white/5 px-1 py-0.5 rounded border border-white/5 font-mono">ESC</kbd>
                  <span>to close</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
