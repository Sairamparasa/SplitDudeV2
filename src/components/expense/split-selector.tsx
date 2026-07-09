'use client'

import { useEffect, useState, useRef } from 'react'
import { Check, AlertCircle } from 'lucide-react'

interface Member {
  id: string
  full_name: string
  avatar_url: string
}

interface Split {
  user_id: string
  amount: number
  share_value?: number // percentage or exact amount input
}

interface SplitSelectorProps {
  members: Member[]
  totalAmount: number
  splitMode: 'equal' | 'exact' | 'percentage'
  onChange: (splits: Split[], isValid: boolean) => void
}

export default function SplitSelector({
  members,
  totalAmount,
  splitMode,
  onChange,
}: SplitSelectorProps) {
  // Track which members are selected for the split
  const [selectedIds, setSelectedIds] = useState<string[]>(members.map((m) => m.id))
  // Track custom input values (for exact amounts or percentages)
  const [inputs, setInputs] = useState<Record<string, string>>({})

  // Keep latest onChange in ref to break render loops
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Initialize selected IDs if members list changes
  useEffect(() => {
    setSelectedIds(members.map((m) => m.id))
  }, [members])

  // Reset inputs when split mode changes
  useEffect(() => {
    const initialInputs: Record<string, string> = {}
    members.forEach((m) => {
      initialInputs[m.id] = ''
    })
    setInputs(initialInputs)
  }, [splitMode, members])

  // Recalculate and trigger onChange whenever variables change
  useEffect(() => {
    if (selectedIds.length === 0 || totalAmount <= 0) {
      onChangeRef.current([], false)
      return
    }

    let calculatedSplits: Split[] = []
    let isValid = false

    if (splitMode === 'equal') {
      const splitAmount = Math.round((totalAmount / selectedIds.length) * 100) / 100
      // Adjust last item to handle rounding errors
      let sum = 0
      calculatedSplits = selectedIds.map((id, index) => {
        let amt = splitAmount
        if (index === selectedIds.length - 1) {
          amt = Math.round((totalAmount - sum) * 100) / 100
        } else {
          sum += splitAmount
        }
        return { user_id: id, amount: amt }
      })
      isValid = true
    } else if (splitMode === 'exact') {
      let sum = 0
      calculatedSplits = selectedIds.map((id) => {
        const val = parseFloat(inputs[id] || '0') || 0
        sum += val
        return { user_id: id, amount: val, share_value: val }
      })
      isValid = Math.abs(sum - totalAmount) < 0.01
    } else if (splitMode === 'percentage') {
      let percentSum = 0
      calculatedSplits = selectedIds.map((id) => {
        const percent = parseFloat(inputs[id] || '0') || 0
        percentSum += percent
        const amt = Math.round(((percent / 100) * totalAmount) * 100) / 100
        return { user_id: id, amount: amt, share_value: percent }
      })
      isValid = Math.abs(percentSum - 100) < 0.01

      // Adjust for rounding differences if percent sum is exactly 100%
      if (isValid) {
        const currentSum = calculatedSplits.reduce((acc, curr) => acc + curr.amount, 0)
        const diff = Math.round((totalAmount - currentSum) * 100) / 100
        if (diff !== 0 && calculatedSplits.length > 0) {
          calculatedSplits[calculatedSplits.length - 1].amount = Math.round((calculatedSplits[calculatedSplits.length - 1].amount + diff) * 100) / 100
        }
      }
    }

    onChangeRef.current(calculatedSplits, isValid)
  }, [selectedIds, totalAmount, splitMode, inputs])

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleInputChange = (id: string, value: string) => {
    setInputs({
      ...inputs,
      [id]: value,
    })
  }

  // Calculate stats for feedback warnings
  const exactSum = selectedIds.reduce((sum, id) => sum + (parseFloat(inputs[id] || '0') || 0), 0)
  const percentSum = selectedIds.reduce((sum, id) => sum + (parseFloat(inputs[id] || '0') || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Split Between</span>
        <button
          type="button"
          onClick={() => {
            if (selectedIds.length === members.length) {
              setSelectedIds([])
            } else {
              setSelectedIds(members.map((m) => m.id))
            }
          }}
          className="text-xs text-brand-accent hover:underline font-medium"
        >
          {selectedIds.length === members.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
        {members.map((member) => {
          const isSelected = selectedIds.includes(member.id)
          return (
            <div
              key={member.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-white/5 border-white/10'
                  : 'bg-transparent border-transparent opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSelect(member.id)}>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    isSelected ? 'bg-brand-accent border-brand-accent text-white' : 'border-white/20'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <img src={member.avatar_url} alt={member.full_name} className="w-7 h-7 rounded-full object-cover" />
                <span className="text-sm font-medium">{member.full_name}</span>
              </div>

              {isSelected && splitMode !== 'equal' && (
                <div className="flex items-center gap-2">
                  {splitMode === 'exact' ? (
                    <div className="relative w-24">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/45">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={inputs[member.id] || ''}
                        onChange={(e) => handleInputChange(member.id, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-2 py-1 text-right text-xs font-mono focus:outline-none focus:border-brand-accent"
                      />
                    </div>
                  ) : (
                    <div className="relative w-20">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={inputs[member.id] || ''}
                        onChange={(e) => handleInputChange(member.id, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-2 pr-6 py-1 text-right text-xs font-mono focus:outline-none focus:border-brand-accent"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/45">%</span>
                    </div>
                  )}
                </div>
              )}

              {isSelected && splitMode === 'equal' && (
                <span className="text-xs font-mono text-white/50">
                  ₹{selectedIds.length > 0 ? (totalAmount / selectedIds.length).toFixed(2) : '0.00'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Validation Feedback Warning Messages */}
      {selectedIds.length > 0 && splitMode === 'exact' && Math.abs(exactSum - totalAmount) >= 0.01 && (
        <div className="p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-xl flex items-center gap-2 text-xs text-brand-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Sum of exact amounts (₹{exactSum.toFixed(2)}) must equal total amount (₹{totalAmount.toFixed(2)}).{' '}
            Difference: ₹{(totalAmount - exactSum).toFixed(2)}
          </span>
        </div>
      )}

      {selectedIds.length > 0 && splitMode === 'percentage' && Math.abs(percentSum - 100) >= 0.01 && (
        <div className="p-3 bg-brand-danger/10 border border-brand-danger/20 rounded-xl flex items-center gap-2 text-xs text-brand-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Sum of percentages ({percentSum.toFixed(1)}%) must equal 100%.{' '}
            Difference: {(100 - percentSum).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}
