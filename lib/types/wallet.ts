import { Database } from '../supabase/types'

type WalletTransactionRow = Database['public']['Tables']['wallet_transactions']['Row']

export type WalletTransactionType = WalletTransactionRow['type']

export interface TransactionFilters {
  type?: WalletTransactionType
  dateAfter?: string
  dateBefore?: string
  amountMin?: number
  amountMax?: number
}
