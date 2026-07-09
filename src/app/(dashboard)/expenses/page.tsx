'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { FileText, Search, Plus, Calendar, ArrowRight, Filter, ArrowUpDown, Tag } from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ExpenseModal = dynamic(() => import('@/components/expense/expense-modal'), {
  loading: () => null,
  ssr: false,
})

export default function ExpensesPage() {
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  
  // Filtering & Sorting states
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  // Fetch groups user is member of (for modal & filter dropdown)
  const { data: groups } = useQuery({
    queryKey: ['groups', currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, group_members(user_id, profiles(id, full_name, avatar_url))')
      if (error) throw error
      return data
    },
  })

  // Fetch all expenses across all groups the user has access to
  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ['allExpenses', currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data: expensesData, error: expError } = await supabase
        .from('expenses')
        .select('id, title, paid_by, group_id, created_at, split_mode, amount, group:groups(id, name), payer:profiles!expenses_paid_by_fkey(id, full_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (expError) throw expError

      return (expensesData || []) as any[]
    },
  })

  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...(expenses || [])]
    const term = searchTerm.toLowerCase().trim()

    // 1. Search term filter
    if (term) {
      result = result.filter((e) => {
        return (
          e.title.toLowerCase().includes(term) ||
          (e.group?.name || '').toLowerCase().includes(term) ||
          (e.payer?.full_name || '').toLowerCase().includes(term)
        )
      })
    }

    // 2. Group Filter
    if (selectedGroupFilter) {
      result = result.filter((e) => e.group_id === selectedGroupFilter)
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'date-asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'amount-desc') {
        return Number(b.amount) - Number(a.amount)
      }
      if (sortBy === 'amount-asc') {
        return Number(a.amount) - Number(b.amount)
      }
      return 0
    })

    return result
  }, [expenses, searchTerm, selectedGroupFilter, sortBy])

  return (
    <div className="space-y-6 text-white">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight gradient-text">Ledger Expenses</h2>
          <p className="text-xs text-white/45 mt-1">Audit and manage all transactions recorded across your active groups.</p>
        </div>
        {groups && groups.length > 0 && (
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="bg-brand-accent hover:bg-brand-accent/90 py-3 px-5 rounded-2xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all shadow-[0_4px_20px_rgba(139,92,246,0.25)]"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        )}
      </div>

      {/* Interactive Toolbar: Search, Filter, Sort */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/3 border border-white/5 p-4 rounded-2xl">
        {/* Search */}
        <div className="md:col-span-2 flex items-center bg-white/2 border border-white/5 focus-within:border-brand-accent/50 rounded-xl px-4 py-2.5 transition-all">
          <Search className="w-4 h-4 text-white/35 mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search details, merchant, or groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full placeholder-white/30 text-white"
          />
        </div>

        {/* Group Filter */}
        <div className="flex items-center bg-white/2 border border-white/5 rounded-xl px-3 py-1">
          <Filter className="w-3.5 h-3.5 text-white/35 mr-2 shrink-0" />
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-white/70 bg-brand-bg select-none"
          >
            <option value="" className="bg-[#0A0B14] text-white">All Groups</option>
            {groups?.map((g: any) => (
              <option key={g.id} value={g.id} className="bg-[#0A0B14] text-white">{g.name}</option>
            ))}
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center bg-white/2 border border-white/5 rounded-xl px-3 py-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-white/35 mr-2 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent border-none outline-none text-xs w-full text-white/70 bg-brand-bg select-none"
          >
            <option value="date-desc" className="bg-[#0A0B14] text-white">Newest First</option>
            <option value="date-asc" className="bg-[#0A0B14] text-white">Oldest First</option>
            <option value="amount-desc" className="bg-[#0A0B14] text-white">Highest Amount</option>
            <option value="amount-asc" className="bg-[#0A0B14] text-white">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Main content grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 shimmer-bg rounded-2xl"></div>
          ))}
        </div>
      ) : filteredAndSortedExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 glass-card max-w-xl mx-auto mt-6 border border-dashed border-white/10 rounded-3xl">
          <div className="p-4 bg-white/3 border border-white/5 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-bold mb-2">No Expenses Logged</h3>
          <p className="text-xs text-white/40 mb-6 max-w-md">
            {searchTerm || selectedGroupFilter 
              ? 'No expenditures matched your filter constraints.' 
              : 'You do not have any logged expenses. Start by splitting a bill with your group members.'}
          </p>
          {!searchTerm && !selectedGroupFilter && groups && groups.length > 0 && (
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all text-xs cursor-pointer"
            >
              Add Your First Expense
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedExpenses.map((expense) => {
            const isPayer = expense.paid_by === currentUser?.id
            return (
              <Link href={`/expenses/${expense.id}`} key={expense.id} className="block group">
                <div className="glass-card hover:bg-white/[0.04] p-5 cursor-pointer flex justify-between items-center border border-white/5 hover:border-brand-accent/25 transition-all h-full">
                  <div className="space-y-2 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/5 border border-white/5 rounded-lg shrink-0">
                        <FileText className="w-4 h-4 text-brand-accent" />
                      </div>
                      <h3 className="font-bold text-sm text-white group-hover:text-brand-accent transition-colors line-clamp-1">
                        {expense.title}
                      </h3>
                    </div>

                    <p className="text-xs text-white/45">
                      Paid by{' '}
                      <span className="font-bold text-white/70">
                        {isPayer ? 'You' : expense.payer?.full_name || 'Someone'}
                      </span>{' '}
                      in{' '}
                      <span className="font-bold text-brand-accent">
                        {expense.group?.name}
                      </span>
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-white/30 font-semibold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-white/20" />
                        {new Date(expense.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-white/20" />
                        {expense.split_mode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="font-mono font-bold text-base text-white">₹{Number(expense.amount).toFixed(2)}</p>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wide block mt-0.5">
                        {isPayer ? 'You Paid' : 'You Split'}
                      </span>
                    </div>
                    <div className="p-1 bg-white/5 border border-white/5 rounded-lg group-hover:bg-brand-accent/15 group-hover:border-brand-accent/30 transition-all shrink-0">
                      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-brand-accent transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Expense Modal Wrapper */}
      {expenseModalOpen && groups && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false)
            refetch()
          }}
          groups={groups}
          currentUserId={currentUser?.id || ''}
        />
      )}
    </div>
  )
}
