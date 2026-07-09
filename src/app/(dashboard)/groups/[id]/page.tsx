'use client'

import { use, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calculateNetBalances, simplifyDebts, Member, Expense, ExpenseSplit, Settlement } from '@/lib/utils/debt-simplifier'
import { Users, Trash2, Edit, X, AlertCircle, ArrowLeft, Loader2, FileText, Sparkles, CheckCircle, ChevronRight, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

const ExpenseModal = dynamic(() => import('@/components/expense/expense-modal'), {
  loading: () => null,
  ssr: false,
})

interface PageProps {
  params: Promise<{ id: string }>
}

export default function GroupDetailPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { id: groupId } = use(params)

  const emojis = ['✈️', '🏠', '🍔', '🚗', '🎓', '💼', '🍿', '🎮', '🏋️', '🛒', '🐾', '🎸']

  // Modal States
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/groups/join?groupId=${groupId}`
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Edit Group states
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editIcon, setEditIcon] = useState('✈️')
  const [savingGroup, setSavingGroup] = useState(false)

  // Add Member states
  const [searchCode, setSearchCode] = useState('')
  const [searchResult, setSearchResult] = useState<any | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [addingMember, setAddingMember] = useState(false)

  // Record Settlement States
  const [settlePayer, setSettlePayer] = useState<{ id: string; name: string } | null>(null)
  const [settlePayee, setSettlePayee] = useState<{ id: string; name: string } | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [recordingSettlement, setRecordingSettlement] = useState(false)
  const [settleError, setSettleError] = useState<string | null>(null)

  // Tab View
  const [activeTab, setActiveTab] = useState<'expenses' | 'settlements'>('expenses')

  // Fetch active user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  // Fetch full group details
  const { data: groupData, isLoading, refetch } = useQuery({
    queryKey: ['groupDetail', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      // 1. Fetch group metadata & members
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          icon,
          created_by,
          created_at,
          group_members (
            user_id,
            profiles (
              id,
              full_name,
              avatar_url,
              unique_code
            )
          )
        `)
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError

      const members = (group.group_members || []).map((gm: any) => gm.profiles) as Member[]

      // 2. Fetch expenses inside the group
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, group_id, title, amount, description, paid_by, split_mode, receipt_url, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (expensesError) throw expensesError

      const expenseIds = (expenses || []).map((e: any) => e.id)

      // 3. Fetch splits inside the group
      let splits: ExpenseSplit[] = []
      if (expenseIds.length > 0) {
        const { data: splitsData, error: splitsError } = await supabase
          .from('expense_splits')
          .select('id, expense_id, user_id, amount, share_value')
          .in('expense_id', expenseIds)
        if (splitsError) throw splitsError
        splits = splitsData as any
      }

      // 4. Fetch settlements inside the group
      const { data: settlements, error: settlementsError } = await supabase
        .from('settlements')
        .select('id, group_id, payer_id, payee_id, amount, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (settlementsError) throw settlementsError

      return {
        group,
        members,
        expenses: expenses as Expense[],
        splits,
        settlements: settlements as Settlement[],
      }
    },
  })

  // Calculations
  const netBalances = useMemo(() => {
    if (!groupData) return {}
    const { members, expenses, splits, settlements } = groupData
    return calculateNetBalances(members, expenses, splits || [], settlements || [])
  }, [groupData])

  const suggestedSettlements = useMemo(() => {
    if (!groupData) return []
    const { members } = groupData
    return simplifyDebts(netBalances, members)
  }, [netBalances, groupData])

  const myBalance = useMemo(() => {
    return netBalances[currentUser?.id || ''] || 0
  }, [netBalances, currentUser?.id])

  const groupsProp = useMemo(() => {
    if (!groupData) return []
    return [groupData.group]
  }, [groupData])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 shimmer-bg rounded-xl"></div>
        <div className="h-28 shimmer-bg rounded-2xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 shimmer-bg rounded-2xl"></div>
          <div className="lg:col-span-2 h-64 shimmer-bg rounded-2xl"></div>
        </div>
      </div>
    )
  }

  if (!groupData) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-brand-danger mx-auto mb-4" />
        <h3 className="text-xl font-bold">Group Not Found</h3>
        <p className="text-sm text-white/50 mt-2">The group does not exist or you do not have permission to view it.</p>
        <Link href="/groups" className="mt-4 inline-flex items-center gap-2 text-brand-accent hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Groups
        </Link>
      </div>
    )
  }

  const { group, members, expenses, splits, settlements } = groupData
  const isCreator = currentUser?.id === group.created_by

  // Open edit modal and initialize state
  const openEditModal = () => {
    setEditName(group.name)
    setEditDesc(group.description || '')
    setEditIcon(group.icon || '✈️')
    setEditModalOpen(true)
  }

  // Handle Edit Group
  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingGroup(true)
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editName,
          description: editDesc,
          icon: editIcon,
        })
        .eq('id', groupId)

      if (error) throw error
      setEditModalOpen(false)
      refetch()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingGroup(false)
    }
  }

  // Handle Delete Group
  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? All expenses and settlements will be permanently deleted.')) return
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
      router.push('/groups')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Handle Search Friend
  const handleSearchFriend = async () => {
    setSearchError(null)
    setSearchResult(null)
    const formattedCode = searchCode.trim().toUpperCase()

    if (!formattedCode.startsWith('SPD') || formattedCode.length !== 9) {
      setSearchError('Invalid code. Example: SPD7H4K2M')
      return
    }

    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('unique_code', formattedCode)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setSearchError('User not found.')
        return
      }

      if (members.some((m) => m.id === data.id)) {
        setSearchError('User is already a member of this group.')
        return
      }

      setSearchResult(data)
    } catch (err: any) {
      setSearchError(err.message)
    } finally {
      setSearching(false)
    }
  }

  // Handle Add Member
  const handleAddMember = async () => {
    if (!searchResult) return
    setAddingMember(true)
    try {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))

      if (mockActive) {
        const { error } = await supabase
          .from('group_members')
          .insert({
            group_id: groupId,
            user_id: searchResult.id,
          })

        if (error) throw error

        fetch('/api/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId,
            userIdToAdd: searchResult.id,
          }),
        }).catch((err) => console.error('SNS trigger error:', err))
      } else {
        const res = await fetch('/api/groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId,
            userIdToAdd: searchResult.id,
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to add member')
      }

      setAddMemberModalOpen(false)
      setSearchCode('')
      setSearchResult(null)
      refetch()
    } catch (err: any) {
      setSearchError(err.message)
    } finally {
      setAddingMember(false)
    }
  }

  // Setup Settlement Modal Pre-filled
  const initSettlement = (fromId: string, fromName: string, toId: string, toName: string, amount: number) => {
    setSettlePayer({ id: fromId, name: fromName })
    setSettlePayee({ id: toId, name: toName })
    setSettleAmount(amount.toFixed(2))
    setSettleError(null)
    setSettleModalOpen(true)
  }

  // Record Settlement
  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettleError(null)

    const amt = parseFloat(settleAmount)
    if (isNaN(amt) || amt <= 0) {
      setSettleError('Please enter a valid amount greater than 0.')
      return
    }

    if (!settlePayer || !settlePayee) return

    setRecordingSettlement(true)
    try {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))

      if (mockActive) {
        const { error } = await supabase
          .from('settlements')
          .insert({
            group_id: groupId,
            payer_id: settlePayer.id,
            payee_id: settlePayee.id,
            amount: amt,
          })

        if (error) throw error

        fetch('/api/settlements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: groupId,
            payer_id: settlePayer.id,
            payee_id: settlePayee.id,
            amount: amt,
          }),
        }).catch((err) => console.error('SNS trigger error:', err))
      } else {
        const res = await fetch('/api/settlements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: groupId,
            payer_id: settlePayer.id,
            payee_id: settlePayee.id,
            amount: amt,
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to record settlement')
      }

      setSettleModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
      refetch()
    } catch (err: any) {
      setSettleError(err.message)
    } finally {
      setRecordingSettlement(false)
    }
  }

  return (
    <div className="space-y-6 text-white">
      {/* Back button and group controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link href="/groups" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4 text-brand-accent" /> Back to Groups
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isCreator && (
            <>
              <button
                onClick={openEditModal}
                className="p-2.5 bg-white/3 border border-white/5 hover:bg-white/6 rounded-xl transition-all cursor-pointer"
                title="Edit Group"
              >
                <Edit className="w-4.5 h-4.5 text-white/70" />
              </button>
              <button
                onClick={handleDeleteGroup}
                className="p-2.5 bg-brand-danger/10 border border-brand-danger/25 hover:bg-brand-danger/20 text-brand-danger rounded-xl transition-all cursor-pointer"
                title="Delete Group"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </>
          )}
          <button
            onClick={handleCopyInviteLink}
            className="px-4 py-2.5 bg-white/3 border border-white/5 hover:bg-white/6 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-brand-accent hover:border-brand-accent/30"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button
            onClick={() => setAddMemberModalOpen(true)}
            className="px-4 py-2.5 bg-white/3 border border-white/5 hover:bg-white/6 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Add Member
          </button>
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-xl text-xs shadow-[0_4px_20px_rgba(139,92,246,0.25)] transition-all cursor-pointer"
          >
            Add Expense
          </button>
        </div>
      </div>

      {/* Group Info Header Banner */}
      <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center text-3xl shadow-lg shrink-0">
            {group.icon || '✈️'}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
            <p className="text-xs text-white/50 mt-1 max-w-xl">{group.description || 'No description provided.'}</p>
          </div>
        </div>

        {/* User Status Balance Box */}
        <div className="px-5 py-4 bg-white/3 border border-white/5 rounded-2xl w-full md:w-auto shrink-0 flex flex-col items-start md:items-end justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/3 rounded-full blur-xl pointer-events-none"></div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Your Net Group Balance</p>
          {myBalance > 0 ? (
            <h2 className="text-xl font-extrabold text-brand-success mt-1 font-mono">+₹{myBalance.toFixed(2)}</h2>
          ) : myBalance < 0 ? (
            <h2 className="text-xl font-extrabold text-brand-danger mt-1 font-mono">-₹{Math.abs(myBalance).toFixed(2)}</h2>
          ) : (
            <h2 className="text-xl font-bold text-white/40 mt-1 uppercase tracking-wide">Settled Up</h2>
          )}
        </div>
      </div>

      {/* Main Grid: Balances + Suggested Debts, and Log Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Members & Suggested Settlements */}
        <div className="lg:col-span-1 space-y-6">
          {/* Members Balances */}
          <div className="glass-card p-6 border border-white/5">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-accent" />
              Members & Balances
            </h3>
            <div className="space-y-4">
              {members.map((member) => {
                const bal = netBalances[member.id] || 0
                return (
                  <div className="flex items-center justify-between" key={member.id}>
                    <div className="flex items-center gap-3">
                      <img src={member.avatar_url} alt={member.full_name} className="w-8 h-8 rounded-full border border-white/5 object-cover" />
                      <div>
                        <p className="text-sm font-semibold text-white/90">{member.full_name}</p>
                        <p className="text-[9px] text-white/35 font-mono">{member.unique_code}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold font-mono ${
                      bal > 0 ? 'text-brand-success' : bal < 0 ? 'text-brand-danger' : 'text-white/35'
                    }`}>
                      {bal > 0 ? `+₹${bal.toFixed(2)}` : bal < 0 ? `-₹${Math.abs(bal).toFixed(2)}` : 'Settled'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Simplified Settlements System */}
          <div className="glass-card p-6 border border-white/5">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-success" />
              Suggested Settlements
            </h3>
            {suggestedSettlements.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-6 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                Everyone is fully settled up in this group!
              </p>
            ) : (
              <div className="space-y-3">
                {suggestedSettlements.map((suggested, idx) => (
                  <div key={idx} className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-center justify-between gap-2 group">
                    <div className="text-xs">
                      <span className="font-bold text-brand-danger">{suggested.fromName}</span>
                      <span className="text-white/50"> owes </span>
                      <span className="font-bold text-brand-success">{suggested.toName}</span>
                      <p className="text-sm font-bold text-white font-mono mt-1">₹{suggested.amount.toFixed(2)}</p>
                    </div>
                    {(suggested.from === currentUser?.id || suggested.to === currentUser?.id) && (
                      <button
                        onClick={() => initSettlement(suggested.from, suggested.fromName, suggested.to, suggested.toName, suggested.amount)}
                        className="px-3 py-1.5 bg-brand-success/15 hover:bg-brand-success/25 border border-brand-success/20 text-brand-success text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Tabs for Expenses and Settlements log */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col min-h-[450px] border border-white/5">
          {/* Tabs header */}
          <div className="flex border-b border-white/5 mb-6">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all px-4 ${
                activeTab === 'expenses'
                  ? 'border-b-2 border-brand-accent text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Expenses ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all px-4 ${
                activeTab === 'settlements'
                  ? 'border-b-2 border-brand-accent text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Settlement Log ({settlements.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === 'expenses' ? (
              expenses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 border border-dashed border-white/8 rounded-2xl bg-white/[0.01]">
                  <FileText className="w-8 h-8 text-white/20 mb-3" />
                  <p className="text-white/60 font-semibold text-sm">No expenses logged yet</p>
                  <p className="text-xs text-white/35 max-w-[240px] mt-1">Add expenses to split them automatically with group members.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => {
                    const payer = members.find((m) => m.id === expense.paid_by)
                    const splitCount = splits.filter((s) => s.expense_id === expense.id).length
                    return (
                      <Link href={`/expenses/${expense.id}`} key={expense.id} className="block group">
                        <div className="p-4 bg-white/2 border border-white/5 hover:border-brand-accent/20 rounded-xl hover:bg-white/4 transition-all flex items-center justify-between cursor-pointer">
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-white group-hover:text-brand-accent transition-colors truncate max-w-xs sm:max-w-md">{expense.title}</h4>
                            <p className="text-xs text-white/40">
                              Paid by <span className="font-bold text-white/60">{payer?.id === currentUser?.id ? 'You' : payer?.full_name || 'Someone'}</span> • Split with {splitCount} {splitCount === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-3">
                            <div>
                              <p className="font-mono font-bold text-sm text-white">₹{Number(expense.amount).toFixed(2)}</p>
                              <p className="text-[9px] text-white/30 font-semibold mt-0.5">{new Date(expense.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-brand-accent transition-colors" />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )
            ) : (
              settlements.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 border border-dashed border-white/8 rounded-2xl bg-white/[0.01]">
                  <CheckCircle className="w-8 h-8 text-white/20 mb-3" />
                  <p className="text-white/60 font-semibold text-sm">No settlements logged</p>
                  <p className="text-xs text-white/35 max-w-[240px] mt-1">Logged settlement payments will display here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement) => {
                    const payer = members.find((m) => m.id === settlement.payer_id)
                    const payee = members.find((m) => m.id === settlement.payee_id)
                    return (
                      <div
                        key={settlement.id}
                        className="p-4 bg-white/2 border border-white/5 rounded-xl flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="text-sm font-semibold flex flex-wrap items-center gap-1">
                            <span className="text-brand-danger">{payer?.id === currentUser?.id ? 'You' : payer?.full_name}</span>
                            <span className="text-white/55 font-normal"> paid </span>
                            <span className="text-brand-success">{payee?.id === currentUser?.id ? 'You' : payee?.full_name}</span>
                          </div>
                          <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider">{new Date(settlement.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(settlement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-mono font-bold text-sm text-brand-success">+₹{Number(settlement.amount).toFixed(2)}</span>
                          {settlement.payer_id === currentUser?.id && (
                            <button
                              onClick={async () => {
                                if (confirm('Delete this settlement log?')) {
                                  await supabase.from('settlements').delete().eq('id', settlement.id)
                                  queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
                                  refetch()
                                }
                              }}
                              className="text-white/30 hover:text-brand-danger p-1.5 hover:bg-white/5 border border-transparent hover:border-white/5 rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="glass-card bg-[#0A0B14]/95 w-full max-w-md p-6 relative rounded-3xl border border-white/8 shadow-2xl"
            >
              <button
                onClick={() => setEditModalOpen(false)}
                className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/5 p-2 rounded-full border border-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-bold mb-4 gradient-text">Edit Group Settings</h2>
              <form onSubmit={handleEditGroup} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Group Icon</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 pr-1 scrollbar-thin">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditIcon(emoji)}
                        className={`text-xl p-2.5 rounded-xl border shrink-0 transition-all ${
                          editIcon === emoji ? 'bg-brand-accent/20 border-brand-accent text-white scale-105 shadow-sm' : 'bg-white/3 border-white/5 hover:border-white/12'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Group Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="glass-input w-full text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="glass-input w-full text-xs font-semibold resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingGroup}
                  className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all mt-6 cursor-pointer"
                >
                  {savingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {addMemberModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="glass-card bg-[#0A0B14]/95 w-full max-w-md p-6 relative rounded-3xl border border-white/8 shadow-2xl"
            >
              <button
                onClick={() => {
                  setAddMemberModalOpen(false)
                  setSearchCode('')
                  setSearchResult(null)
                  setSearchError(null)
                }}
                className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/5 p-2 rounded-full border border-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-bold mb-4 gradient-text">Add Member</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Format: SPDXXXXXX"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="glass-input w-full text-xs font-semibold uppercase font-mono"
                  />
                  <button
                    onClick={handleSearchFriend}
                    disabled={searching}
                    className="px-4 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 rounded-xl text-xs font-bold text-white cursor-pointer transition-all shrink-0"
                  >
                    {searching ? '...' : 'Search'}
                  </button>
                </div>

                {searchError && (
                  <p className="text-[10px] text-brand-danger font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {searchError}
                  </p>
                )}

                {searchResult && (
                  <div className="mt-3 p-3 bg-white/2 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={searchResult.avatar_url} alt={searchResult.full_name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                      <div>
                        <p className="text-xs font-bold text-white">{searchResult.full_name}</p>
                        <p className="text-[9px] text-brand-accent font-mono mt-0.5">{searchResult.unique_code}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleAddMember}
                      disabled={addingMember}
                      className="px-3 py-1.5 bg-brand-accent hover:bg-brand-accent/90 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      {addingMember ? '...' : 'Add'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Settlement Modal */}
      <AnimatePresence>
        {settleModalOpen && settlePayer && settlePayee && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="glass-card bg-[#0A0B14]/95 w-full max-w-md p-6 relative rounded-3xl border border-white/8 shadow-2xl"
            >
              <button
                onClick={() => setSettleModalOpen(false)}
                className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/5 p-2 rounded-full border border-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-bold mb-4 gradient-text">Confirm Settlement</h2>
              {settleError && (
                <div className="mb-4 p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/15 text-brand-danger flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>{settleError}</span>
                </div>
              )}
              <form onSubmit={handleRecordSettlement} className="space-y-4">
                <div className="text-xs space-y-2 text-white/80 p-3.5 bg-white/2 rounded-2xl border border-white/5">
                  <p>
                    <span className="font-bold text-brand-danger">{settlePayer.name}</span> is paying{' '}
                    <span className="font-bold text-brand-success">{settlePayee.name}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Amount Paid ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="glass-input w-full font-mono text-base font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recordingSettlement}
                  className="w-full bg-brand-success hover:bg-brand-success/90 disabled:bg-brand-success/45 py-3 rounded-2xl text-xs font-bold text-white flex justify-center items-center gap-1.5 shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                >
                  {recordingSettlement ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Payment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expense Modal Wrapper */}
      {expenseModalOpen && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false)
            refetch()
          }}
          groups={groupsProp}
          defaultGroupId={groupId}
          currentUserId={currentUser?.id || ''}
        />
      )}
    </div>
  )
}
