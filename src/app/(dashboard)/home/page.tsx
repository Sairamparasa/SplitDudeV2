'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calculateNetBalances, Member, Expense, ExpenseSplit, Settlement } from '@/lib/utils/debt-simplifier'
import { PlusCircle, FileText, Users, UserPlus, ArrowRight, Bell, CheckCircle2, Zap, Clock, ChevronRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const ExpenseModal = dynamic(() => import('@/components/expense/expense-modal'), {
  loading: () => null,
  ssr: false,
})

export default function HomePage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [modalInitialStep, setModalInitialStep] = useState(1)

  // Fetch current user details
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      return profile
    },
  })

  // Format Greeting Name
  const formattedName = useMemo(() => {
    if (userData?.full_name) return userData.full_name
    const emailPrefix = userData?.email?.split('@')[0] || 'User'
    // Strip numbers, split on dot/dash/underscore, capitalize words
    return emailPrefix
      .replace(/[0-9]/g, '')
      .split(/[\._-]/)
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .filter(Boolean)
      .join(' ')
  }, [userData])

  // Fetch dashboard data (groups, expenses, settlements, splits)
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
        recentActivity: activityList,
        allMembers,
      }
    },
  })

  // Prefetch groups page data and notifications data for instant navigation
  useEffect(() => {
    if (userData?.id) {
      // 1. Prefetch Groups List
      queryClient.prefetchQuery({
        queryKey: ['groups', userData.id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('groups')
            .select(`
              id, name, description, icon, created_by, created_at,
              group_members (user_id, profiles (id, full_name, avatar_url, unique_code))
            `)
          if (error) throw error
          return data
        }
      })

      // 2. Prefetch Notifications
      queryClient.prefetchQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
          const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))
          if (mockActive) {
            const { data, error } = await supabase
              .from('notifications')
              .select('*')
              .order('created_at', { ascending: false })
            if (error) throw error
            return data || []
          }
          const res = await fetch('/api/notifications')
          const result = await res.json()
          if (!res.ok) throw new Error(result.error || 'Failed to fetch')
          return result.data || []
        }
      })
    }
  }, [userData?.id, queryClient, supabase])

  // Fetch notifications
  const { data: notifications, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))
      if (mockActive) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        return data || []
      }
      const res = await fetch('/api/notifications')
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to fetch')
      return result.data || []
    },
  })

  // Greeting dynamic value based on local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }, [])

  // Calculate net balances per group
  const groupsWithBalances = useMemo(() => {
    if (!dashboardData) return []
    return dashboardData.groups.map((group) => {
      const groupMembers = (group.group_members || []).map((gm: any) => gm.profiles) as Member[]
      const groupExpenses = dashboardData.expenses.filter((e) => e.group_id === group.id)
      const groupSplits = dashboardData.splits.filter((s) =>
        groupExpenses.some((e) => e.id === s.expense_id)
      )
      const groupSettlements = dashboardData.settlements.filter((s) => s.group_id === group.id)

      const netBalances = calculateNetBalances(groupMembers, groupExpenses, groupSplits, groupSettlements)
      const userBalance = netBalances[userData?.id || ''] || 0

      // Find last activity inside this group
      const groupActivity = dashboardData.recentActivity.filter(
        (a) => a.groupName === group.name
      )
      const lastActivityDate = groupActivity[0]?.createdAt || new Date(group.created_at)

      return {
        ...group,
        userBalance,
        memberCount: groupMembers.length,
        lastActivityDate,
      }
    })
  }, [dashboardData, userData?.id])

  // Get dynamic statistics & insights
  const { totalOwed, totalOwing } = useMemo(() => {
    let owed = 0
    let owing = 0
    groupsWithBalances.forEach((g) => {
      if (g.userBalance > 0) owed += g.userBalance
      else if (g.userBalance < 0) owing += Math.abs(g.userBalance)
    })
    return { totalOwed: owed, totalOwing: owing }
  }, [groupsWithBalances])

  const hasUploadedReceiptRecently = useMemo(() => {
    if (!dashboardData) return false
    return dashboardData.expenses.some(e => e.paid_by === userData?.id && (e as any).receipt_url)
  }, [dashboardData, userData?.id])

  const smartInsight = useMemo(() => {
    if (totalOwed === 0 && totalOwing === 0) {
      return { text: 'You are all caught up.', icon: ShieldCheck, color: 'text-brand-success', bg: 'bg-brand-success/10 border-brand-success/20' }
    }
    if (hasUploadedReceiptRecently) {
      return { text: 'You saved time by scanning receipts.', icon: Zap, color: 'text-brand-accent', bg: 'bg-brand-accent/10 border-brand-accent/20' }
    }
    return { text: 'You have no pending settlements.', icon: CheckCircle2, color: 'text-brand-success', bg: 'bg-brand-success/10 border-brand-success/20' }
  }, [totalOwed, totalOwing, hasUploadedReceiptRecently])

  // Calculate: Continue where you left off
  const continueItems = useMemo(() => {
    if (!dashboardData) return { recentGroup: null, recentExpense: null, recentSettlement: null }
    const { groups, expenses, settlements } = dashboardData

    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const sortedSettlements = [...settlements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const recentExp = sortedExpenses[0] || null
    const recentSettle = sortedSettlements[0] || null

    let recentGrp = null
    if (recentExp || recentSettle) {
      const expTime = recentExp ? new Date(recentExp.created_at).getTime() : 0
      const settleTime = recentSettle ? new Date(recentSettle.created_at).getTime() : 0
      const targetGroupId = expTime > settleTime ? recentExp.group_id : recentSettle.group_id
      recentGrp = groups.find(g => g.id === targetGroupId) || null
    }
    if (!recentGrp && groups.length > 0) {
      recentGrp = [...groups].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null
    }

    return {
      recentGroup: recentGrp,
      recentExpense: recentExp,
      recentSettlement: recentSettle
    }
  }, [dashboardData])

  const showContinueSection = useMemo(() => {
    return continueItems.recentGroup || continueItems.recentExpense || continueItems.recentSettlement
  }, [continueItems])

  const latestNotifications = useMemo(() => {
    return (notifications || []).slice(0, 3)
  }, [notifications])

  const latestGroups = useMemo(() => {
    return [...groupsWithBalances]
      .sort((a, b) => b.lastActivityDate.getTime() - a.lastActivityDate.getTime())
      .slice(0, 3)
  }, [groupsWithBalances])

  const isLoading = isUserLoading || isDataLoading || isNotificationsLoading

  const triggerAddExpense = () => {
    setModalInitialStep(3)
    setExpenseModalOpen(true)
  }

  const triggerScanReceipt = () => {
    setModalInitialStep(1)
    setExpenseModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 shimmer-bg rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-40 shimmer-bg rounded-3xl"></div>
          <div className="h-40 shimmer-bg rounded-3xl"></div>
          <div className="h-40 shimmer-bg rounded-3xl"></div>
          <div className="h-40 shimmer-bg rounded-3xl"></div>
        </div>
        <div className="h-48 shimmer-bg rounded-3xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-10 relative">
      {/* Premium Ambient Background Mesh */}
      <div className="absolute top-[-10%] left-[5%] w-72 h-72 bg-brand-accent/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[5%] w-96 h-96 bg-brand-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Calm Greeting Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-2">
            {greeting}, {formattedName} 👋
          </h2>
          <p className="text-white/45 text-sm mt-1">Manage your shared expenses effortlessly.</p>
        </div>

        {/* Dynamic Inline Status Badge */}
        {smartInsight && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${smartInsight.bg} ${smartInsight.color}`}>
            <smartInsight.icon className="w-4 h-4" />
            <span>{smartInsight.text}</span>
          </div>
        )}
      </div>

      {/* Sleeker Actions Row - Hover glows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Split Expense */}
        <motion.div
          whileHover={{ y: -3 }}
          onClick={triggerAddExpense}
          className="glass-card p-5 border border-white/5 hover:border-brand-accent/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-accent/15 rounded-xl border border-brand-accent/20 text-brand-accent shrink-0 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Split Expense</h4>
              <p className="text-[10px] text-white/40 mt-0.5">Manual bill logs</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-brand-accent transition-colors shrink-0" />
        </motion.div>

        {/* Card 2: Scan Receipt */}
        <motion.div
          whileHover={{ y: -3 }}
          onClick={triggerScanReceipt}
          className="glass-card p-5 border border-white/5 hover:border-brand-secondary/30 hover:shadow-[0_0_25px_rgba(37,99,235,0.15)] bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-secondary/15 rounded-xl border border-brand-secondary/20 text-brand-secondary shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Scan Receipt</h4>
              <p className="text-[10px] text-white/40 mt-0.5">OCR AI ingestion</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-brand-secondary transition-colors shrink-0" />
        </motion.div>

        {/* Card 3: Create Group */}
        <Link href="/groups" className="block w-full">
          <motion.div
            whileHover={{ y: -3 }}
            className="glass-card p-5 border border-white/5 hover:border-brand-success/30 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-success/15 rounded-xl border border-brand-success/20 text-brand-success shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Create Group</h4>
                <p className="text-[10px] text-white/40 mt-0.5">Start new ledger</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-brand-success transition-colors shrink-0" />
          </motion.div>
        </Link>

        {/* Card 4: Add Friend */}
        <Link href="/friends" className="block w-full">
          <motion.div
            whileHover={{ y: -3 }}
            className="glass-card p-5 border border-white/5 hover:border-brand-warning/30 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand-warning/15 rounded-xl border border-brand-warning/20 text-brand-warning shrink-0 group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Add Friend</h4>
                <p className="text-[10px] text-white/40 mt-0.5">Share Split ID</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-brand-warning transition-colors shrink-0" />
          </motion.div>
        </Link>
      </div>

      {/* Content Columns: Active Grid (Left) & Inbox Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2 columns): Continue where you left off */}
        <div className="lg:col-span-2 glass-card p-6 border border-white/5 flex flex-col min-h-[300px]">
          <h3 className="text-base font-bold mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-secondary" />
            Continue where you left off
          </h3>

          {!showContinueSection ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/8 rounded-2xl bg-white/[0.01]">
              <Users className="w-8 h-8 text-white/20 mb-3" />
              <p className="text-white/60 font-semibold text-sm">Create your first group</p>
              <p className="text-xs text-white/35 max-w-[260px] mt-1 mb-4">Start recording expenses by creating a ledger group for room rent or trips.</p>
              <Link href="/groups" className="px-4 py-2 bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent border border-brand-accent/20 rounded-xl text-xs font-bold transition-all">
                Create Group
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              {/* Recent Group card */}
              {continueItems.recentGroup && (
                <Link href={`/groups/${continueItems.recentGroup.id}`} className="block h-full group">
                  <div className="p-4 bg-white/2 border border-white/5 hover:border-brand-accent/25 hover:bg-white/[0.04] transition-all rounded-2xl h-full flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Recent Group</span>
                      <div className="flex items-center gap-2 mt-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center text-sm shadow shrink-0">
                          {continueItems.recentGroup.icon || '✈️'}
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">{continueItems.recentGroup.name}</h4>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-brand-accent flex items-center gap-0.5 mt-4 group-hover:underline">
                      <span>Open Group</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              )}

              {/* Recent Expense card */}
              {continueItems.recentExpense && (
                <Link href={`/expenses/${continueItems.recentExpense.id}`} className="block h-full group">
                  <div className="p-4 bg-white/2 border border-white/5 hover:border-brand-accent/25 hover:bg-white/[0.04] transition-all rounded-2xl h-full flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Recent Expense</span>
                      <h4 className="text-xs font-bold text-white truncate mt-4">{continueItems.recentExpense.title}</h4>
                      <p className="font-mono font-bold text-xs text-white/80 mt-1">₹{Number(continueItems.recentExpense.amount).toFixed(2)}</p>
                    </div>
                    <span className="text-[10px] font-bold text-brand-accent flex items-center gap-0.5 mt-4 group-hover:underline">
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              )}

              {/* Recent Settlement card */}
              {continueItems.recentSettlement && (
                <div className="p-4 bg-white/2 border border-white/5 rounded-2xl h-full flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block">Recent Settlement</span>
                    <p className="text-[11px] font-semibold text-white/70 mt-4 truncate">
                      Payer settled payee
                    </p>
                    <p className="font-mono font-bold text-xs text-brand-success mt-1">+₹{Number(continueItems.recentSettlement.amount).toFixed(2)}</p>
                  </div>
                  <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">
                    {new Date(continueItems.recentSettlement.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column (1 column): Recent Notifications timeline */}
        <div className="lg:col-span-1 glass-card p-6 border border-white/5 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-base font-bold mb-5 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-accent" />
              Notifications
            </h3>
            
            {latestNotifications.length === 0 ? (
              <p className="text-xs text-white/35 text-center py-8">Inbox is clear.</p>
            ) : (
              <div className="space-y-4 relative border-l border-white/5 pl-4 ml-2">
                {latestNotifications.map((notif: any) => (
                  <div key={notif.id} className="text-xs space-y-0.5 pb-2 border-b border-white/[0.01] last:border-0 last:pb-0 relative">
                    <span className="absolute -left-[21px] top-1.5 w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
                    <p className="font-bold text-white/95 line-clamp-1">{notif.title}</p>
                    <p className="text-[10px] text-white/40 line-clamp-1">{notif.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href="/notifications" className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-0.5 mt-6 pt-2 border-t border-white/[0.03]">
            <span>View All Notifications</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Groups List section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white/45 uppercase tracking-wider">Recent Active Groups</h3>
        
        {latestGroups.length === 0 ? (
          <div className="p-6 text-center text-xs text-white/35 border border-dashed border-white/5 rounded-2xl">
            No active groups.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestGroups.map((group) => (
              <div key={group.id} className="glass-card p-5 border border-white/5 flex flex-col justify-between min-h-[170px] relative overflow-hidden group hover:border-brand-accent/25 transition-all">
                <div className="flex justify-between items-start gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-accent to-brand-secondary flex items-center justify-center text-lg shadow shrink-0">
                    {group.icon || '✈️'}
                  </div>
                  {group.userBalance > 0 ? (
                    <span className="text-brand-success text-[9px] font-bold bg-brand-success/10 border border-brand-success/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Owed: ₹{group.userBalance.toFixed(2)}
                    </span>
                  ) : group.userBalance < 0 ? (
                    <span className="text-brand-danger text-[9px] font-bold bg-brand-danger/10 border border-brand-danger/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Owe: ₹{Math.abs(group.userBalance).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-white/35 text-[9px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Settled
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <h4 className="text-base font-bold text-white truncate group-hover:text-brand-accent transition-colors">{group.name}</h4>
                  <p className="text-[10px] text-white/40 mt-1">{group.memberCount} members • Active {new Date(group.lastActivityDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                </div>

                <Link href={`/groups/${group.id}`} className="mt-4 w-full bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 py-2 rounded-xl text-[10px] font-bold text-white text-center transition-all block">
                  Open Group
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Redirection Banner */}
      <div className="glass-card p-6 border border-white/5 bg-gradient-to-r from-brand-bg via-white/[0.01] to-brand-bg flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h4 className="text-base font-bold text-white">Need more detailed insights?</h4>
          <p className="text-xs text-white/40 mt-0.5">Observe spending trends, balances graphs, and historical coordinates.</p>
        </div>
        <Link href="/dashboard" className="bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.35)] text-xs transition-all flex items-center gap-1.5 shrink-0">
          <span>View Financial Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
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
          initialStep={modalInitialStep}
        />
      )}
    </div>
  )
}
