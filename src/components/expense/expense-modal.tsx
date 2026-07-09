'use client'

import { X, AlertCircle, Loader2, Upload, ArrowRight, ArrowLeft, Check, FileText, Coffee, Car, Plane, ShoppingBag, Tv, HelpCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Member } from '@/lib/utils/debt-simplifier'
import { motion, AnimatePresence } from 'framer-motion'
import SplitSelector from './split-selector'

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  groups: any[]
  defaultGroupId?: string
  currentUserId: string
  initialStep?: number
}

// Generate random filename helper
function generateUniqueFileName(originalName: string): string {
  const fileExt = originalName.split('.').pop()
  const randomStr = Math.random().toString(36).substring(2)
  const timestamp = Date.now()
  return `${randomStr}-${timestamp}.${fileExt}`
}

// Client-side image compression to preserve OCR accuracy while targeting 300-800KB size
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height)
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            // Keep original extension in name but write blob as optimized jpeg
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          0.8
        )
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = () => resolve(file)
  })
}

function getTempId(): string {
  return `temp-expense-id-${Date.now()}`
}

export default function ExpenseModal({
  isOpen,
  onClose,
  groups,
  defaultGroupId,
  currentUserId,
  initialStep,
}: ExpenseModalProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  // Guided steps: 1 (Upload), 2 (Scanning), 3 (Details), 4 (Split), 5 (Confirm)
  const [step, setStep] = useState(initialStep || 1)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId || groups[0]?.id || '')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitMode, setSplitMode] = useState<'equal' | 'exact' | 'percentage'>('equal')
  const [category, setCategory] = useState('food') // food, travel, entertainment, shopping, utilities, other
  
  // Splits and validity state
  const [splits, setSplits] = useState<any[]>([])
  const [isSplitsValid, setIsSplitsValid] = useState(true)

  // Receipt File upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptUploading, setReceiptUploading] = useState(false)
  const [prefilled, setPrefilled] = useState(false)
  const [ocrReceiptUrl, setOcrReceiptUrl] = useState<string | null>(null)

  // Form handling
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setStep(initialStep || 1)
      setTitle('')
      setAmount('')
      setReceiptFile(null)
      setError(null)
    }
  }, [isOpen, initialStep])

  // Find active group members
  const activeGroup = groups.find((g) => g.id === selectedGroupId)
  const members = (activeGroup?.group_members || []).map((gm: any) => gm.profiles) as Member[]

  // Reset paidBy to current user or first member when group changes
  useEffect(() => {
    const activeGroup = groups.find((g) => g.id === selectedGroupId)
    const currentMembers = (activeGroup?.group_members || []).map((gm: any) => gm.profiles) as Member[]
    if (currentMembers.length > 0) {
      const isUserInGroup = currentMembers.some((m) => m.id === currentUserId)
      const targetPaidBy = isUserInGroup ? currentUserId : currentMembers[0].id
      setPaidBy((prev) => prev === targetPaidBy ? prev : targetPaidBy)
    }
  }, [selectedGroupId, groups, currentUserId])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
      
      if (!allowedTypes.includes(file.type)) {
        setError('Only PDF, PNG, JPG, and JPEG are allowed.')
        setReceiptFile(null)
        return
      }

      const maxSize = file.type.startsWith('image/') ? 15 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxSize) {
        setError(file.type.startsWith('image/') ? 'Image file size is too large. Max limit is 15MB.' : 'PDF file size too large. Max limit is 5MB.')
        setReceiptFile(null)
        return
      }

      setError(null)
      setStep(2) // Transition to scanning animation

      let fileToUpload = file
      try {
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file)
        }
        setReceiptFile(fileToUpload)

        const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))
        if (mockActive) {
          await new Promise((resolve) => setTimeout(resolve, 2200))
          setTitle('Whole Foods Market')
          setAmount('128.42')
          setPrefilled(true)
          setTimeout(() => setPrefilled(false), 2000)
          setStep(3) // Transition to edit details page
          return
        }

        const formData = new FormData()
        formData.append('file', fileToUpload)

        const res = await fetch('/api/receipts/analyze', {
          method: 'POST',
          body: formData,
        })
        const result = await res.json()

        if (res.ok && result.success) {
          setTitle(result.data.merchant || '')
          setAmount(result.data.amount ? String(result.data.amount) : '')
          setOcrReceiptUrl(result.data.receiptUrl || null)
          setPrefilled(true)
          setTimeout(() => setPrefilled(false), 2000)
        } else {
          setError(result.error || 'Failed to scan receipt. Please enter manually.')
        }
      } catch {
        setError('Scanning error. Plase fill manually.')
      } finally {
        setStep(3)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.')
      return
    }

    if (!isSplitsValid) {
      setError('Splits are invalid or do not sum to total amount.')
      return
    }

    setSaving(true)
    let previousGroupDetail: any = null
    let previousDashboardData: any = null

    try {
      let receiptUrl = ocrReceiptUrl

      // 1. Upload receipt to S3 if there's a file but not scanned already
      if (receiptFile && !receiptUrl) {
        setReceiptUploading(true)
        const filePath = generateUniqueFileName(receiptFile.name)
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile)

        if (uploadError) {
          throw new Error(`Receipt upload failed: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath)

        receiptUrl = urlData.publicUrl
        setReceiptUploading(false)
      }

      // Save previous state snapshots
      previousGroupDetail = queryClient.getQueryData(['groupDetail', selectedGroupId])
      previousDashboardData = queryClient.getQueryData(['dashboardData', currentUserId])

      // Optimistically update group details cache
      const tempExpenseId = getTempId()
      const optimisticExpense = {
        id: tempExpenseId,
        group_id: selectedGroupId,
        title,
        amount: numAmount,
        description: '',
        paid_by: paidBy,
        split_mode: splitMode,
        receipt_url: receiptUrl || null,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData(['groupDetail', selectedGroupId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          expenses: [optimisticExpense, ...(old.expenses || [])],
          splits: [...(old.splits || []), ...splits.map((s) => ({
            id: `temp-split-id-${Math.random()}`,
            expense_id: tempExpenseId,
            user_id: s.user_id,
            amount: s.amount,
            share_value: s.share_value || null,
          }))],
        }
      })

      // Close the modal early so the user sees the new expense list item instantly
      onClose()

      const mockActive = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_MOCK_SUPABASE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-url'))

      if (mockActive) {
        // 1. Insert Expense locally
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            group_id: selectedGroupId,
            title,
            amount: numAmount,
            paid_by: paidBy,
            split_mode: splitMode,
            receipt_url: receiptUrl,
          })
          .select()
          .single()

        if (expenseError) throw expenseError

        // 2. Insert Splits locally
        const splitsToInsert = splits.map((s) => ({
          expense_id: expense.id,
          user_id: s.user_id,
          amount: s.amount,
          share_value: s.share_value || null,
        }))

        const { error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitsToInsert)

        if (splitsError) throw splitsError

        // 3. Create Notification locally
        const notifyingMembers = members.filter((m) => m.id !== paidBy)
        if (notifyingMembers.length > 0) {
          const notificationsToInsert = notifyingMembers.map((m) => ({
            user_id: m.id,
            title: 'New Expense Added',
            content: `A new expense "${title}" of ₹${numAmount.toFixed(2)} was added to your group.`,
            type: 'expense',
          }))
          await supabase.from('notifications').insert(notificationsToInsert)
        }

        // 4. Trigger SNS event asynchronously on the server
        fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: selectedGroupId,
            title,
            amount: numAmount,
            paid_by: paidBy,
            split_mode: splitMode,
            splits: splits.map((s) => ({
              user_id: s.user_id,
              amount: s.amount,
              share_value: s.share_value || null,
            })),
          }),
        }).catch((err) => console.error('SNS trigger error:', err))
      } else {
        // Live Mode: Call API route to save and publish SNS
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: selectedGroupId,
            title,
            amount: numAmount,
            paid_by: paidBy,
            split_mode: splitMode,
            splits: splits.map((s) => ({
              user_id: s.user_id,
              amount: s.amount,
              share_value: s.share_value || null,
            })),
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Failed to save expense')

        // Create notification on real server
        const notifyingMembers = members.filter((m) => m.id !== paidBy)
        if (notifyingMembers.length > 0) {
          const notificationsToInsert = notifyingMembers.map((m) => ({
            user_id: m.id,
            title: 'New Expense Added',
            content: `A new expense "${title}" of ₹${numAmount.toFixed(2)} was added to your group.`,
            type: 'expense',
          }))
          await supabase.from('notifications').insert(notificationsToInsert)
        }
      }

      // Sync caches to guarantee correct data
      queryClient.invalidateQueries({ queryKey: ['groupDetail', selectedGroupId] })
      queryClient.invalidateQueries({ queryKey: ['dashboardData', currentUserId] })
    } catch (err: any) {
      // Rollback cache updates on error
      queryClient.setQueryData(['groupDetail', selectedGroupId], previousGroupDetail)
      queryClient.setQueryData(['dashboardData', currentUserId], previousDashboardData)
      alert(err.message || 'Failed to save expense. Rolled back state.')
    } finally {
      setSaving(false)
      setReceiptUploading(false)
    }
  }

  // Categories helper list
  const categories = [
    { id: 'food', label: 'Food & Dining', icon: Coffee },
    { id: 'travel', label: 'Travel', icon: Plane },
    { id: 'transport', label: 'Transport', icon: Car },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
    { id: 'entertainment', label: 'Entertainment', icon: Tv },
    { id: 'other', label: 'Other', icon: HelpCircle },
  ]


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="glass-card bg-[#0A0B14]/95 w-full max-w-lg p-6 relative shadow-[0_24px_50px_rgba(0,0,0,0.8)] border border-white/8 rounded-3xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all border border-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Stepper Progress bar */}
            <div className="flex items-center gap-1.5 mb-6 pr-8">
              {[1, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s ? 'bg-brand-accent w-8' : 'bg-white/10 w-4'
                  }`}
                />
              ))}
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-auto">
                Step {step === 2 ? 'OCR Scan' : step === 5 ? 'Review' : step} of 5
              </span>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger flex items-start gap-2.5 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Receipt Upload */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Add Group Expense</h2>
                  <p className="text-xs text-white/45 mt-1">Upload a receipt to prefill details using AI, or enter manually.</p>
                </div>

                <div className="border-2 border-dashed border-white/10 hover:border-brand-accent/40 rounded-2xl p-8 text-center hover:bg-white/[0.02] transition-all cursor-pointer relative group">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-4 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl w-fit mx-auto mb-4 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6 text-brand-accent" />
                  </div>
                  <p className="text-sm font-semibold text-white">Upload receipt file</p>
                  <p className="text-xs text-white/35 mt-1">Accepts PNG, JPG, PDF up to 5MB</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-white/5 flex-1"></div>
                  <span className="text-[10px] text-white/35 font-bold uppercase tracking-wider">Or</span>
                  <div className="h-px bg-white/5 flex-1"></div>
                </div>

                <button
                  onClick={() => setStep(3)}
                  className="w-full bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/12 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  Enter details manually
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: Scanning Laser OCR Animation */}
            {step === 2 && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
                {/* Laser scan lines */}
                <div className="w-40 h-40 border border-white/15 rounded-2xl relative overflow-hidden bg-white/3">
                  <div className="absolute inset-0 bg-brand-accent/5"></div>
                  <motion.div
                    animate={{ y: [0, 160, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent shadow-[0_0_15px_rgba(139,92,246,1)] z-10"
                  />
                  <div className="h-full flex items-center justify-center">
                    <FileText className="w-16 h-16 text-white/20" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                    AI Textract Scanning...
                  </h3>
                  <p className="text-xs text-white/45">Extracting merchant, date, and invoice totals.</p>
                </div>
              </div>
            )}

            {/* STEP 3: Edit Details (Manual/Prefilled) */}
            {step === 3 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(4); }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Expense Details</h2>
                  <p className="text-xs text-white/45 mt-1">Configure expense parameters and billing details.</p>
                </div>

                {/* Group and Paid By */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Group</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="glass-input w-full text-xs font-semibold bg-brand-bg border border-white/5 focus:border-brand-accent outline-none appearance-none"
                    >
                      {groups.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Paid By</label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="glass-input w-full text-xs font-semibold bg-brand-bg border border-white/5 focus:border-brand-accent outline-none appearance-none"
                    >
                      {members.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.id === currentUserId ? 'You' : m.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dinner, Taxi"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`glass-input w-full text-xs font-semibold transition-all duration-500 ${
                      prefilled ? 'border-brand-success ring-2 ring-brand-success/20' : ''
                    }`}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`glass-input w-full font-mono text-base font-bold transition-all duration-500 ${
                      prefilled ? 'border-brand-success ring-2 ring-brand-success/20' : ''
                    }`}
                  />
                </div>

                {/* Category selectors */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((c) => {
                      const CatIcon = c.icon
                      const isSel = category === c.id
                      return (
                        <div
                          key={c.id}
                          onClick={() => setCategory(c.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                            isSel
                              ? 'bg-brand-accent/15 border-brand-accent text-white shadow-sm'
                              : 'bg-white/3 border-white/5 text-white/50 hover:text-white hover:border-white/10'
                          }`}
                        >
                          <CatIcon className={`w-4 h-4 ${isSel ? 'text-brand-accent' : 'text-white/40'}`} />
                          <span className="text-[10px] font-bold">{c.label.split(' ')[0]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-4">
                  {receiptFile && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-3 bg-white/5 hover:bg-white/8 border border-white/8 rounded-2xl text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 bg-brand-accent hover:bg-brand-accent/90 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(139,92,246,0.25)]"
                  >
                    <span>Configure Splits</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Configure Splits */}
            {step === 4 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(5); }} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Configure Splits</h2>
                  <p className="text-xs text-white/45 mt-1">Specify how this expense is divided among group members.</p>
                </div>

                {/* Split Mode selection */}
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Split Mode</label>
                  <select
                    value={splitMode}
                    onChange={(e) => setSplitMode(e.target.value as any)}
                    className="glass-input w-full text-xs font-semibold bg-brand-bg border border-white/5 focus:border-brand-accent outline-none appearance-none"
                  >
                    <option value="equal">Equally among members</option>
                    <option value="exact">Exact amounts (₹)</option>
                    <option value="percentage">Percentage splits (%)</option>
                  </select>
                </div>

                {/* Split Selector list */}
                {members.length > 0 && (
                  <div className="pt-2 max-h-[220px] overflow-y-auto pr-1">
                    <SplitSelector
                      members={members}
                      totalAmount={parseFloat(amount) || 0}
                      splitMode={splitMode}
                      onChange={(calculatedSplits, isValid) => {
                        setSplits(calculatedSplits)
                        setIsSplitsValid(isValid)
                      }}
                    />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/8 border border-white/8 rounded-2xl text-xs font-bold flex items-center justify-center cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!isSplitsValid}
                    className="flex-1 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(139,92,246,0.25)]"
                  >
                    <span>Review Summary</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 5: Review & Save */}
            {step === 5 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Review Summary</h2>
                  <p className="text-xs text-white/45 mt-1">Review transaction parameters before posting to group ledger.</p>
                </div>

                {/* Details box */}
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Description</span>
                    <span className="text-sm font-semibold text-white">{title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Total Amount</span>
                    <span className="text-base font-bold text-brand-accent font-mono">₹{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Paid By</span>
                    <span className="text-sm font-semibold text-white">
                      {members.find((m) => m.id === paidBy)?.full_name || 'Someone'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Category</span>
                    <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 text-[10px] font-bold text-white/70">
                      {category === 'food' ? <Coffee className="w-3.5 h-3.5 text-brand-accent" /> :
                       category === 'travel' ? <Plane className="w-3.5 h-3.5 text-brand-secondary" /> :
                       category === 'transport' ? <Car className="w-3.5 h-3.5 text-brand-info" /> :
                       category === 'shopping' ? <ShoppingBag className="w-3.5 h-3.5 text-brand-success" /> :
                       category === 'entertainment' ? <Tv className="w-3.5 h-3.5 text-brand-warning" /> :
                       <HelpCircle className="w-3.5 h-3.5 text-white/40" />}
                      <span>{category.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Splits summary list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Split Distribution</span>
                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                    {splits.map((s: any) => {
                      const m = members.find((mem) => mem.id === s.user_id)
                      return (
                        <div key={s.user_id} className="flex justify-between items-center bg-white/[0.01] border border-white/[0.03] rounded-xl px-3 py-2 text-xs">
                          <span className="text-white/60 font-medium">{m?.full_name || 'Someone'}</span>
                          <span className="text-white font-mono font-bold">₹{Number(s.amount).toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Navigation & Save Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/8 border border-white/8 rounded-2xl text-xs font-bold flex items-center justify-center cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={saving || receiptUploading}
                    className="flex-1 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/40 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-[0_4px_25px_rgba(139,92,246,0.35)] cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Post Expense</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
