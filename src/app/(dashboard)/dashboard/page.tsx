'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calculateNetBalances, Member, Expense, ExpenseSplit, Settlement } from '@/lib/utils/debt-simplifier'
import { TrendingUp, TrendingDown, IndianRupee, Plus, Users, Clock, Loader2, FileText, UserPlus, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const ExpenseModal = dynamic(() => import('@/components/expense/expense-modal'), {
  loading: () => null,
  ssr: false,
})

const SpendingChart = dynamic(() => import('@/components/dashboard/spending-chart'), {
  loading: () => <div className="h-full flex items-center justify-center text-xs text-white/20 animate-pulse">Loading Chart Data...</div>,
  ssr: false,
})

export default function DashboardPage() {
  const supabase = createClient()
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

  // Quick Split States
  const [quickTitle, setQuickTitle] = useState('')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickGroupId, setQuickGroupId] = useState('')
  const [quickSubmitting, setQuickSubmitting] = useState(false)
  const [quickError, setQuickError] = useState<string | null>(null)
  const [quickSuccess, setQuickSuccess] = useState(false)

  // Fetch current user auth data
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  // Fetch dashboard data: groups, group memberships, expenses, splits, and settlements
  const { data: dashboardData, isLoading: isDataLoading, refetch } = useQuery({
    queryKey: ['dashboardData', userData?.id],
    enabled: !!userData?.id,
    queryFn: async () => {
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select(`
          id, name, description, icon, created_by, created_at,
          group_members (group_id, user_id, role, profiles (id, full_name, avatar_url, unique_code))
        `)
      if (groupsError) throw groupsError

      const groups = (groupsData || []) as any[]
      const groupIds = groups.map((g) => g.id)

      if (groupIds.length === 0) {
        return { groups: [], expenses: [], splits: [], settlements: [], recentActivity: [] }
      }

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('id, group_id, title, amount, paid_by, split_mode, created_at')
        .in('group_id', groupIds)
      if (expensesError) throw expensesError

      const expenses = (expensesData || []) as any[]
      const expenseIds = expenses.map((e) => e.id)

      let splits: ExpenseSplit[] = []
      if (expenseIds.length > 0) {
        const { data: splitsData, error: splitsError } = await supabase
          .from('expense_splits')
          .select('id, expense_id, user_id, amount, share_value')
          .in('expense_id', expenseIds)
        if (splitsError) throw splitsError
        splits = splitsData as any
      }

      const { data: settlements, error: settlementsError } = await supabase
        .from('settlements')
        .select('id, group_id, payer_id, payee_id, amount, created_at, payer:profiles!settlements_payer_id_fkey(id, full_name), payee:profiles!settlements_payee_id_fkey(id, full_name)')
        .in('group_id', groupIds)
      if (settlementsError) throw settlementsError

      const membersMap = new Map<string, Member>()
      groups.forEach((g) => {
        g.group_members?.forEach((gm: any) => {
          if (gm.profiles) {
            membersMap.set(gm.profiles.id, gm.profiles)
          }
        })
      })
      const allMembers = Array.from(membersMap.values())

      const activityList: any[] = []

      expenses.forEach((exp) => {
        const creator = allMembers.find((m) => m.id === exp.paid_by)
        activityList.push({
          id: exp.id,
          type: 'expense',
          title: exp.title,
          amount: Number(exp.amount),
          groupName: groups.find((g) => g.id === exp.group_id)?.name || 'Group',
          creatorName: creator?.id === userData?.id ? 'You' : creator?.full_name || 'Someone',
          creatorId: exp.paid_by,
          createdAt: new Date(exp.created_at),
        })
      })

      settlements.forEach((settle: any) => {
        activityList.push({
          id: settle.id,
          type: 'settlement',
          amount: Number(settle.amount),
          groupName: groups.find((g) => g.id === settle.group_id)?.name || 'Group',
          payerName: settle.payer_id === userData?.id ? 'You' : settle.payer?.full_name || 'Someone',
          payeeName: settle.payee_id === userData?.id ? 'you' : settle.payee?.full_name || 'someone',
          createdAt: new Date(settle.created_at),
        })
      })

      activityList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      return {
        groups,
        expenses: expenses as Expense[],
        splits,
        settlements: settlements as Settlement[],
        recentActivity: activityList.slice(0, 5),
        allMembers,
      }
    },
  })

  const handleQuickSplit = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuickError(null)
    setQuickSuccess(false)

    const amountNum = parseFloat(quickAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setQuickError('Invalid amount')
      return
    }

    const targetGroupId = quickGroupId || dashboardData?.groups?.[0]?.id
    if (!targetGroupId) {
      setQuickError('Select an active group')
      return
    }

    setQuickSubmitting(true)
    try {
      const selectedGroup = dashboardData?.groups.find((g) => g.id === targetGroupId)
      const groupMembers = (selectedGroup?.group_members || []).map((gm: any) => gm.profiles) as Member[]

      if (groupMembers.length === 0) {
        throw new Error('This group has no members')
      }

      const splitAmount = Math.round((amountNum / groupMembers.length) * 100) / 100
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))
      const cleanTitle = quickTitle.trim() || 'Quick Split'

      if (mockActive) {
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            group_id: targetGroupId,
            title: cleanTitle,
            amount: amountNum,
            paid_by: userData?.id,
            split_mode: 'equal',
          })
          .select()
          .single()

        if (expenseError) throw expenseError

        const splitsToInsert = groupMembers.map((m) => ({
          expense_id: expense.id,
          user_id: m.id,
          amount: splitAmount,
        }))

        const { error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitsToInsert)

        if (splitsError) throw splitsError

        const notifyingMembers = groupMembers.filter((m) => m.id !== userData?.id)
        if (notifyingMembers.length > 0) {
          const notificationsToInsert = notifyingMembers.map((m) => ({
            user_id: m.id,
            title: 'Quick Split Created',
            content: `You owe $${splitAmount.toFixed(2)} for "${cleanTitle}" in ${selectedGroup.name}.`,
            type: 'expense',
          }))
          await supabase.from('notifications').insert(notificationsToInsert)
        }

        fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: targetGroupId,
            title: cleanTitle,
            amount: amountNum,
            paid_by: userData?.id,
            split_mode: 'equal',
            splits: groupMembers.map((m) => ({
              user_id: m.id,
              amount: splitAmount,
            })),
          }),
        }).catch((err) => console.error('SNS trigger error:', err))
      } else {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: targetGroupId,
            title: cleanTitle,
            amount: amountNum,
            paid_by: userData?.id,
            split_mode: 'equal',
            splits: groupMembers.map((m) => ({
              user_id: m.id,
              amount: splitAmount,
            })),
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to quick split')

        const notifyingMembers = groupMembers.filter((m) => m.id !== userData?.id)
        if (notifyingMembers.length > 0) {
          const notificationsToInsert = notifyingMembers.map((m) => ({
            user_id: m.id,
            title: 'Quick Split Created',
            content: `You owe $${splitAmount.toFixed(2)} for "${cleanTitle}" in ${selectedGroup.name}.`,
            type: 'expense',
          }))
          await supabase.from('notifications').insert(notificationsToInsert)
        }
      }

      setQuickSuccess(true)
      setQuickTitle('')
      setQuickAmount('')
      refetch()
    } catch (err: any) {
      setQuickError(err.message || 'Failed to split expense')
    } finally {
      setQuickSubmitting(false)
    }
  }

  // Calculate Net Balances
  const groupsWithBalances = useMemo(() => {
    return (dashboardData?.groups || []).map((group) => {
      const groupMembers = (group.group_members || []).map((gm: any) => gm.profiles) as Member[]
      const groupExpenses = dashboardData?.expenses.filter((e) => e.group_id === group.id) || []
      const groupSplits = dashboardData?.splits.filter((s) =>
        groupExpenses.some((e) => e.id === s.expense_id)
      ) || []
      const groupSettlements = dashboardData?.settlements.filter((s) => s.group_id === group.id) || []

      const netBalances = calculateNetBalances(groupMembers, groupExpenses, groupSplits, groupSettlements)
      const userBalance = netBalances[userData?.id || ''] || 0

      return {
        ...group,
        userBalance,
        members: groupMembers,
      }
    })
  }, [dashboardData, userData?.id])

  // Calculate Overall totals
  const { totalOwed, totalOwing } = useMemo(() => {
    let owed = 0
    let owing = 0
    groupsWithBalances.forEach((g) => {
      if (g.userBalance > 0) {
        owed += g.userBalance
      } else if (g.userBalance < 0) {
        owing += Math.abs(g.userBalance)
      }
    })
    return { totalOwed: owed, totalOwing: owing }
  }, [groupsWithBalances])

  // Calculate monthly spending
  const monthlySpending = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    return (dashboardData?.expenses || [])
      .filter((e) => {
        const d = new Date(e.created_at)
        return e.paid_by === userData?.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }, [dashboardData?.expenses, userData?.id])

  // Compile monthly chart data for Recharts (last 6 months)
  const chartData = useMemo(() => {
    const data = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()

      const total = (dashboardData?.expenses || [])
        .filter((e) => {
          const ed = new Date(e.created_at)
          return e.paid_by === userData?.id && ed.getMonth() === m && ed.getFullYear() === y
        })
        .reduce((sum, e) => sum + Number(e.amount), 0)

      data.push({
        name: monthNames[m],
        amount: total,
      })
    }
    return data
  }, [dashboardData?.expenses, userData?.id])

  const isLoading = isUserLoading || isDataLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 shimmer-bg rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 shimmer-bg rounded-2xl"></div>
          <div className="h-32 shimmer-bg rounded-2xl"></div>
          <div className="h-32 shimmer-bg rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[260px] shimmer-bg rounded-2xl"></div>
          <div className="h-[260px] shimmer-bg rounded-2xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Command Center Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Financial Dashboard</h2>
        <p className="text-white/45 text-sm mt-1">Detailed balance analytics and spending trends.</p>
      </div>

      {/* Stats Grid - Apple Wallet Glow style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Owed */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 border border-white/5 hover:border-brand-success/30 transition-all relative overflow-hidden group shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-success/5 rounded-full blur-2xl group-hover:bg-brand-success/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-brand-success/15 rounded-xl border border-brand-success/20">
              <TrendingUp className="w-5 h-5 text-brand-success" />
            </div>
            <span className="text-[10px] font-bold bg-brand-success/10 text-brand-success px-2.5 py-1 rounded-full uppercase tracking-wider">
              Owed to you
            </span>
          </div>
          <h3 className="text-3xl font-bold tracking-tight text-white font-mono">
            ₹{totalOwed.toFixed(2)}
          </h3>
          <p className="text-xs text-white/45 mt-1.5">Outstanding balances friends need to pay you</p>
        </motion.div>

        {/* Total Owing */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 border border-white/5 hover:border-brand-danger/30 transition-all relative overflow-hidden group shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-danger/5 rounded-full blur-2xl group-hover:bg-brand-danger/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-brand-danger/15 rounded-xl border border-brand-danger/20">
              <TrendingDown className="w-5 h-5 text-brand-danger" />
            </div>
            <span className="text-[10px] font-bold bg-brand-danger/10 text-brand-danger px-2.5 py-1 rounded-full uppercase tracking-wider">
              You Owe
            </span>
          </div>
          <h3 className="text-3xl font-bold tracking-tight text-white font-mono">
            ₹{totalOwing.toFixed(2)}
          </h3>
          <p className="text-xs text-white/45 mt-1.5">Unsettled debts you owe to group members</p>
        </motion.div>

        {/* Monthly Spending */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-card p-6 border border-white/5 hover:border-brand-accent/30 transition-all relative overflow-hidden group shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-brand-accent/15 rounded-xl border border-brand-accent/20">
              <IndianRupee className="w-5 h-5 text-brand-accent" />
            </div>
            <span className="text-[10px] font-bold bg-brand-accent/10 text-brand-accent px-2.5 py-1 rounded-full uppercase tracking-wider">
              Spent This Month
            </span>
          </div>
          <h3 className="text-3xl font-bold tracking-tight text-white font-mono">
            ₹{monthlySpending.toFixed(2)}
          </h3>
          <p className="text-xs text-white/45 mt-1.5">Total group expenditures funded by you</p>
        </motion.div>
      </div>

      {/* Interactive Quick Actions Panel */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Interactive Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setExpenseModalOpen(true)}
            className="glass-card p-5 border border-white/5 hover:border-brand-accent/25 hover:bg-white/[0.05] transition-all cursor-pointer flex flex-col justify-between h-32 group"
          >
            <div className="p-2.5 bg-brand-accent/10 border border-brand-accent/20 rounded-xl w-fit group-hover:bg-brand-accent/20 transition-colors">
              <Plus className="w-5 h-5 text-brand-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Add Expense</p>
              <p className="text-[10px] text-white/40 mt-0.5">Split bills manually</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setExpenseModalOpen(true)}
            className="glass-card p-5 border border-white/5 hover:border-brand-secondary/25 hover:bg-white/[0.05] transition-all cursor-pointer flex flex-col justify-between h-32 group"
          >
            <div className="p-2.5 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl w-fit group-hover:bg-brand-secondary/20 transition-colors">
              <FileText className="w-5 h-5 text-brand-secondary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Scan Receipt</p>
              <p className="text-[10px] text-white/40 mt-0.5">OCR AI autofill split</p>
            </div>
          </motion.div>

          <Link href="/groups">
            <motion.div
              whileHover={{ y: -2 }}
              className="glass-card p-5 border border-white/5 hover:border-brand-success/25 hover:bg-white/[0.05] transition-all cursor-pointer flex flex-col justify-between h-32 w-full group"
            >
              <div className="p-2.5 bg-brand-success/10 border border-brand-success/20 rounded-xl w-fit group-hover:bg-brand-success/20 transition-colors">
                <Users className="w-5 h-5 text-brand-success" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Create Group</p>
                <p className="text-[10px] text-white/40 mt-0.5">Start new ledger</p>
              </div>
            </motion.div>
          </Link>

          <Link href="/friends">
            <motion.div
              whileHover={{ y: -2 }}
              className="glass-card p-5 border border-white/5 hover:border-brand-warning/25 hover:bg-white/[0.05] transition-all cursor-pointer flex flex-col justify-between h-32 w-full group"
            >
              <div className="p-2.5 bg-brand-warning/10 border border-brand-warning/20 rounded-xl w-fit group-hover:bg-brand-warning/20 transition-colors">
                <UserPlus className="w-5 h-5 text-brand-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Add Friend</p>
                <p className="text-[10px] text-white/40 mt-0.5">Share Split ID / QR</p>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* Spending Chart & Quick Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Area Spending Chart */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between border border-white/5 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold">Monthly Spending Trends</h3>
              <p className="text-xs text-white/40 mt-0.5">Expenditures funded by you over the last 6 months.</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/60 font-semibold bg-white/3 border border-white/5 px-2.5 py-1 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
              <span>Recharts Interactive</span>
            </div>
          </div>

          <div className="w-full h-[220px]">
            <SpendingChart chartData={chartData} />
          </div>
        </div>

        {/* Quick Split card widget */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between border border-white/5 shadow-md">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-1.5">
              Quick Split
            </h3>
            <p className="text-xs text-white/40 mt-0.5">Split an expense instantly and equally with group members.</p>
          </div>

          <form onSubmit={handleQuickSplit} className="space-y-4 mt-6">
            <div>
              <input
                type="text"
                placeholder="Description e.g. Starbucks"
                required
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="glass-input w-full py-3 px-4 text-xs font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Amount 0.00"
                required
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
                className="glass-input w-full py-3 px-4 text-xs font-mono font-semibold"
              />
              <select
                value={quickGroupId}
                onChange={(e) => setQuickGroupId(e.target.value)}
                className="glass-input w-full py-3 px-4 text-xs bg-brand-bg border border-white/5 focus:border-brand-accent outline-none appearance-none"
              >
                <option value="">Select Group...</option>
                {dashboardData?.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {quickError && (
              <p className="text-[11px] text-brand-danger bg-brand-danger/10 border border-brand-danger/15 p-2.5 rounded-xl font-medium">
                {quickError}
              </p>
            )}

            {quickSuccess && (
              <p className="text-[11px] text-brand-success bg-brand-success/10 border border-brand-success/15 p-2.5 rounded-xl font-medium">
                Expense split successfully!
              </p>
            )}

            <button
              type="submit"
              disabled={quickSubmitting || dashboardData?.groups.length === 0}
              className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.35)]"
            >
              {quickSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Split Bill'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Main Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Groups */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Active Groups</h3>
            <Link href="/groups" className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-0.5">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {groupsWithBalances.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/8 rounded-2xl bg-white/[0.01]">
              <Users className="w-8 h-8 text-white/20 mb-3" />
              <p className="text-white/60 font-semibold text-sm">No active groups yet</p>
              <p className="text-xs text-white/35 max-w-[240px] mt-1">Create a group or be added by friends to start splitting expenses.</p>
              <Link href="/groups" className="mt-4 px-4 py-2 bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent rounded-xl text-xs font-bold border border-brand-accent/20 transition-all">
                Create Group
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groupsWithBalances.slice(0, 4).map((group) => (
                <Link href={`/groups/${group.id}`} key={group.id}>
                  <div className="glass-card hover:bg-white/[0.04] p-5 cursor-pointer h-full flex flex-col justify-between border border-white/5 relative overflow-hidden group">
                    <div className="flex justify-between items-start gap-2">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center text-xl shadow-md shrink-0">
                        {group.icon || '✈️'}
                      </div>
                      {group.userBalance > 0 ? (
                        <span className="text-brand-success text-[10px] font-bold bg-brand-success/10 border border-brand-success/20 px-2.5 py-1 rounded-full shrink-0 text-right uppercase tracking-wider">
                          Owed: ₹{group.userBalance.toFixed(2)}
                        </span>
                      ) : group.userBalance < 0 ? (
                        <span className="text-brand-danger text-[10px] font-bold bg-brand-danger/10 border border-brand-danger/20 px-2.5 py-1 rounded-full shrink-0 text-right uppercase tracking-wider">
                          You owe: ₹{Math.abs(group.userBalance).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-white/40 text-[10px] font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-full shrink-0 text-right uppercase tracking-wider">
                          Settled
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-bold mt-4 text-white group-hover:text-brand-accent transition-colors line-clamp-1">
                        {group.name}
                      </h4>
                      <p className="text-xs text-white/40 mt-1 line-clamp-1">{group.description || 'No description'}</p>
                    </div>
                    {/* Member Avatars */}
                    <div className="flex -space-x-1.5 mt-4 overflow-hidden">
                      {group.members.slice(0, 5).map((member: Member) => (
                        <img
                          key={member.id}
                          className="w-7 h-7 rounded-full border border-brand-bg object-cover"
                          src={member.avatar_url}
                          alt={member.full_name}
                        />
                      ))}
                      {group.members.length > 5 && (
                        <div className="w-7 h-7 rounded-full border border-brand-bg bg-white/10 flex items-center justify-center text-[10px] font-bold">
                          +{group.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div className="glass-card p-6 flex flex-col border border-white/5">
          <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
          
          {(!dashboardData?.recentActivity || dashboardData.recentActivity.length === 0) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/8 rounded-2xl bg-white/[0.01]">
              <Clock className="w-8 h-8 text-white/20 mb-3" />
              <p className="text-white/60 font-semibold text-sm">No activity yet</p>
              <p className="text-xs text-white/35 max-w-[200px] mt-1">Recent expenses and settlements will appear here.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-5 overflow-y-auto max-h-[350px] pr-1">
              {dashboardData.recentActivity.map((activity, idx) => (
                <div className="flex gap-4" key={activity.id}>
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-2 ring-4 ${
                      activity.type === 'settlement'
                        ? 'bg-brand-success ring-brand-success/15'
                        : activity.creatorId === userData?.id
                        ? 'bg-brand-accent ring-brand-accent/15'
                        : 'bg-white/30 ring-white/5'
                    }`} />
                    {idx < dashboardData.recentActivity.length - 1 && (
                      <div className="w-px h-full bg-white/5 my-1 min-h-[30px]" />
                    )}
                  </div>
                  <div className="pb-3 border-b border-white/[0.02] flex-1">
                    {activity.type === 'expense' ? (
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {activity.creatorName} added <span className="text-brand-accent font-bold">₹{activity.amount.toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-white/45 mt-0.5">
                          For "{activity.title}" in <span className="text-white/60 font-medium">{activity.groupName}</span>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {activity.payerName} settled <span className="text-brand-success font-bold">₹{activity.amount.toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-white/45 mt-0.5">
                          To {activity.payeeName} in <span className="text-white/60 font-medium">{activity.groupName}</span>
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] text-white/30 font-semibold mt-1 uppercase tracking-wider">
                      {new Date(activity.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                      {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expense Modal Wrapper */}
      {expenseModalOpen && (
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false)
            refetch()
          }}
          groups={dashboardData?.groups || []}
          currentUserId={userData?.id || ''}
        />
      )}
    </div>
  )
}
