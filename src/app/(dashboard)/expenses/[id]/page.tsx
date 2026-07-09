'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trash2, Calendar, FileText, Download, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ExpenseDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { id: expenseId } = use(params)
  const supabase = createClient()

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  // Fetch expense details
  const { data: expenseData, isLoading, error } = useQuery({
    queryKey: ['expenseDetail', expenseId],
    queryFn: async () => {
      // 1. Get expense
      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .select('*, group:groups(*)')
        .eq('id', expenseId)
        .single()
      if (expError) throw expError

      // 2. Get splits for this expense (with user profiles)
      const { data: splits, error: splitsError } = await supabase
        .from('expense_splits')
        .select('*, profile:profiles(*)')
        .eq('expense_id', expenseId)
      if (splitsError) throw splitsError

      // 3. Get payer profile
      const { data: payer, error: payerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', expense.paid_by)
        .single()
      if (payerError) throw payerError

      return {
        expense,
        splits,
        payer,
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand-accent animate-spin" />
      </div>
    )
  }

  if (error || !expenseData) {
    return (
      <div className="text-center p-8 text-white">
        <AlertCircle className="w-12 h-12 text-brand-danger mx-auto mb-4" />
        <h3 className="text-xl font-bold">Expense Not Found</h3>
        <p className="text-sm text-white/50 mt-2">The expense could not be loaded or was deleted.</p>
        <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 text-brand-accent hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    )
  }

  const { expense, splits: rawSplits, payer } = expenseData
  const splits = (rawSplits || []) as any[]
  const isPayerOrGroupCreator = currentUser?.id === expense.paid_by || currentUser?.id === expense.group?.created_by

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense? This will restore everyone\'s balances.')) return
    try {
      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))

      if (mockActive) {
        // Delete locally in Mock mode
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId)

        if (error) throw error

        // Trigger SNS event asynchronously on the server
        fetch(`/api/expenses?id=${expenseId}`, {
          method: 'DELETE',
        }).catch((err) => console.error('SNS trigger error:', err))
      } else {
        // Live Mode: Call API route to delete from db and publish SNS
        const res = await fetch(`/api/expenses?id=${expenseId}`, {
          method: 'DELETE',
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to delete expense')
      }

      router.push(`/groups/${expense.group_id}`)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6 text-white max-w-3xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href={`/groups/${expense.group_id}`}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Group
        </Link>

        {isPayerOrGroupCreator && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-brand-danger/20 border border-brand-danger/30 hover:bg-brand-danger/30 text-brand-danger rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Delete Expense
          </button>
        )}
      </div>

      {/* Main Expense Card */}
      <div className="glass-card p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">{expense.title}</h1>
            <p className="text-sm text-white/50 mt-1">
              Group:{' '}
              <Link href={`/groups/${expense.group_id}`} className="text-brand-accent hover:underline font-semibold">
                {expense.group?.name}
              </Link>
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-mono font-bold text-white">₹{Number(expense.amount).toFixed(2)}</h2>
            <p className="text-xs text-white/40 mt-1 flex items-center gap-1.5 justify-end">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(expense.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Payer info */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl">
          <img src={payer.avatar_url} alt={payer.full_name} className="w-12 h-12 rounded-full object-cover" />
          <div>
            <p className="text-xs text-white/55">Paid By</p>
            <p className="text-base font-semibold text-white">
              {payer.id === currentUser?.id ? 'You' : payer.full_name}
            </p>
            <p className="text-[10px] text-white/35 font-mono">{payer.unique_code}</p>
          </div>
        </div>

        {/* Splits breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-white/5 pb-2">Split Breakdown ({splits.length})</h3>
          <div className="space-y-3">
            {splits.map((split) => {
              const profile = split.profile
              const isCurrentUser = profile.id === currentUser?.id
              return (
                <div key={split.id} className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-medium">{isCurrentUser ? 'You' : profile.full_name}</p>
                      {expense.split_mode !== 'equal' && split.share_value !== null && (
                        <p className="text-xs text-white/45">
                          {expense.split_mode === 'percentage'
                            ? `Share: ${split.share_value}%`
                            : `Exact share: ₹${Number(split.share_value).toFixed(2)}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-mono font-semibold text-white">₹{Number(split.amount).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Receipt display */}
        {expense.receipt_url && (
          <div className="border-t border-white/10 pt-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-accent" />
              Attached Receipt
            </h3>
            <div className="glass-card bg-white/[0.02] p-4 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
              {expense.receipt_url.endsWith('.pdf') ? (
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <FileText className="w-12 h-12 text-brand-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-white">PDF Document Receipt</p>
                  <p className="text-xs text-white/40 mt-1">Cannot be previewed in page</p>
                </div>
              ) : (
                <img
                  src={expense.receipt_url}
                  alt="Receipt Preview"
                  className="max-h-[350px] w-auto max-w-full rounded-xl object-contain border border-white/10 shadow-lg"
                />
              )}

              <a
                href={expense.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-xl transition-all"
              >
                <Download className="w-4 h-4" /> Open / Download Original File
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
