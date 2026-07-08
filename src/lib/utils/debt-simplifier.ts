export interface Member {
  id: string;
  full_name: string;
  unique_code: string;
  avatar_url: string;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  paid_by: string;
  created_at: string;
}

export interface ExpenseSplit {
  expense_id: string;
  user_id: string;
  amount: number;
}

export interface Settlement {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  created_at: string;
}

export interface SuggestedTransaction {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export function calculateNetBalances(
  members: Member[],
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: Settlement[]
): Record<string, number> {
  const balances: Record<string, number> = {}

  // Initialize all members to 0 balance
  members.forEach((m) => {
    balances[m.id] = 0
  })

  // 1. Add expense paid amounts and subtract owed split amounts
  expenses.forEach((expense) => {
    const payerId = expense.paid_by
    const amount = Number(expense.amount)

    if (balances[payerId] !== undefined) {
      balances[payerId] += amount
    }

    // Process splits for this expense
    const expenseSplits = splits.filter((s) => s.expense_id === expense.id)
    expenseSplits.forEach((split) => {
      const debtorId = split.user_id
      const splitAmount = Number(split.amount)
      if (balances[debtorId] !== undefined) {
        balances[debtorId] -= splitAmount
      }
    })
  })

  // 2. Add settlements paid and subtract settlements received
  settlements.forEach((settlement) => {
    const payerId = settlement.payer_id
    const payeeId = settlement.payee_id
    const amount = Number(settlement.amount)

    if (balances[payerId] !== undefined) {
      balances[payerId] += amount
    }
    if (balances[payeeId] !== undefined) {
      balances[payeeId] -= amount
    }
  })

  // Round all balances to 2 decimal places to avoid floating point issues
  Object.keys(balances).forEach((key) => {
    balances[key] = Math.round(balances[key] * 100) / 100
  })

  return balances
}

export function simplifyDebts(
  balances: Record<string, number>,
  members: Member[]
): SuggestedTransaction[] {
  const memberMap = new Map<string, Member>()
  members.forEach((m) => memberMap.set(m.id, m))

  // Separate debtors and creditors
  // We store them as arrays of { id: string; balance: number }
  const debtors: { id: string; balance: number }[] = []
  const creditors: { id: string; balance: number }[] = []

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance < -0.01) {
      debtors.push({ id, balance: Math.abs(balance) })
    } else if (balance > 0.01) {
      creditors.push({ id, balance })
    }
  })

  // Sort debtors descending (most owe first) and creditors descending (most owed first)
  debtors.sort((a, b) => b.balance - a.balance)
  creditors.sort((a, b) => b.balance - a.balance)

  const transactions: SuggestedTransaction[] = []

  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]

    const settleAmount = Math.min(debtor.balance, creditor.balance)
    const roundedSettleAmount = Math.round(settleAmount * 100) / 100

    if (roundedSettleAmount > 0) {
      const debtorMember = memberMap.get(debtor.id)
      const creditorMember = memberMap.get(creditor.id)

      transactions.push({
        from: debtor.id,
        fromName: debtorMember?.full_name || 'Unknown User',
        to: creditor.id,
        toName: creditorMember?.full_name || 'Unknown User',
        amount: roundedSettleAmount,
      })
    }

    // Update balances
    debtor.balance -= settleAmount
    creditor.balance -= settleAmount

    if (debtor.balance < 0.01) {
      debtorIndex++
    }
    if (creditor.balance < 0.01) {
      creditorIndex++
    }
  }

  return transactions
}
