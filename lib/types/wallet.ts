import { Database } from '../supabase/types'

type WalletTransactionRow = {
  id: string
  wallet_id: string
  amount: number
  type: 'credit' | 'debit' | 'pending' | 'released'
  booking_id: string | null
  description: string | null
  created_at: string
}

export type WalletTransactionType = WalletTransactionRow['type']

export interface TransactionFilters {
  type?: WalletTransactionType
  dateAfter?: string
  dateBefore?: string
  amountMin?: number
  amountMax?: number
}
