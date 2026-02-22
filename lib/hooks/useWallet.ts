"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  getWalletByUserId,
  getWalletBalance,
  getOrCreateWallet,
  getWalletTransactions,
  getUserWalletTransactions,
  updateWalletBalance,
  addPendingFunds,
  releaseFunds,
  deductAvailableFunds,
  type WalletWithUser,
  type WalletTransactionWithDetails,
} from "../supabase/queries/wallets"
import type { Database } from "../supabase/types"

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"]
type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"]
type TransactionStatus = WalletTransactionRow["status"]

type UseWalletOptions = {
  userId?: string
  walletId?: string
  autoFetch?: boolean
  transactionsLimit?: number
}

type UseWalletReturn = {
  wallet: WalletWithUser | null
  walletBalance: { pending_balance: number; available_balance: number } | null
  transactions: WalletTransactionWithDetails[] | null
  isLoading: boolean
  error: string | null
  fetchWallet: () => Promise<void>
  fetchWalletBalance: () => Promise<void>
  fetchTransactions: () => Promise<void>
  fetchUserTransactions: () => Promise<void>
  initializeWallet: () => Promise<void>
  addFundsToPending: (amount: number, bookingId: string, description?: string) => Promise<void>
  releasePendingFunds: (amount: number) => Promise<void>
  withdrawFunds: (amount: number, description?: string) => Promise<void>
  refreshWallet: () => Promise<void>
}

export function useWallet(options: UseWalletOptions = {}): UseWalletReturn {
  const { userId, walletId, autoFetch = true, transactionsLimit = 50 } = options

  const [wallet, setWallet] = useState<WalletWithUser | null>(null)
  const [walletBalance, setWalletBalance] = useState<{ pending_balance: number; available_balance: number } | null>(null)
  const [transactions, setTransactions] = useState<WalletTransactionWithDetails[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWallet = useCallback(async () => {
    if (!userId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getWalletByUserId(userId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil data dompet: " + result.error.message)
        return
      }

      setWallet(result.data as WalletWithUser | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil data dompet: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const fetchWalletBalance = useCallback(async () => {
    if (!userId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getWalletBalance(userId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil saldo dompet: " + result.error.message)
        return
      }

      setWalletBalance(result.data as { pending_balance: number; available_balance: number } | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil saldo dompet: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const fetchTransactions = useCallback(async () => {
    if (!walletId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getWalletTransactions(walletId, transactionsLimit)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil riwayat transaksi: " + result.error.message)
        return
      }

      setTransactions(result.data as WalletTransactionWithDetails[] | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil riwayat transaksi: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [walletId, transactionsLimit])

  const fetchUserTransactions = useCallback(async () => {
    if (!userId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getUserWalletTransactions(userId, transactionsLimit)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil riwayat transaksi: " + result.error.message)
        return
      }

      setTransactions(result.data as WalletTransactionWithDetails[] | null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil riwayat transaksi: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId, transactionsLimit])

  const initializeWallet = useCallback(async () => {
    if (!userId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getOrCreateWallet(userId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal membuat dompet: " + result.error.message)
        return
      }

      setWallet(result.data as WalletWithUser | null)
      toast.success("Dompet berhasil dibuat")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal membuat dompet: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const addFundsToPending = useCallback(async (amount: number, bookingId: string, description?: string) => {
    if (!wallet) {
      toast.error("Dompet tidak ditemukan")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await addPendingFunds(wallet.id, amount)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal menambahkan dana: " + result.error.message)
        return
      }

      toast.success(`Rp ${amount.toLocaleString()} ditambahkan ke saldo pending`)

      // Refresh wallet and transactions
      await fetchWallet()
      await fetchUserTransactions()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menambahkan dana: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [wallet, fetchWallet, fetchUserTransactions])

  const releasePendingFunds = useCallback(async (amount: number) => {
    if (!wallet) {
      toast.error("Dompet tidak ditemukan")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await releaseFunds(wallet.id, amount)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal melepaskan dana: " + result.error.message)
        return
      }

      toast.success(`Rp ${amount.toLocaleString()} dilepaskan ke saldo tersedia`)

      // Refresh wallet and transactions
      await fetchWallet()
      await fetchUserTransactions()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal melepaskan dana: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [wallet, fetchWallet, fetchUserTransactions])

  const withdrawFunds = useCallback(async (amount: number, description?: string) => {
    if (!wallet) {
      toast.error("Dompet tidak ditemukan")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await deductAvailableFunds(wallet.id, amount)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal menarik dana: " + result.error.message)
        return
      }

      toast.success(`Rp ${amount.toLocaleString()} berhasil ditarik`)

      // Refresh wallet and transactions
      await fetchWallet()
      await fetchUserTransactions()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menarik dana: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [wallet, fetchWallet, fetchUserTransactions])

  const refreshWallet = useCallback(async () => {
    await fetchWallet()
    await fetchUserTransactions()
  }, [fetchWallet, fetchUserTransactions])

  // Auto-fetch on mount and when options change
  useEffect(() => {
    if (autoFetch && userId) {
      fetchWallet()
      fetchUserTransactions()
    }
  }, [autoFetch, userId, fetchWallet, fetchUserTransactions])

  return {
    wallet,
    walletBalance,
    transactions,
    isLoading,
    error,
    fetchWallet,
    fetchWalletBalance,
    fetchTransactions,
    fetchUserTransactions,
    initializeWallet,
    addFundsToPending,
    releasePendingFunds,
    withdrawFunds,
    refreshWallet,
  }
}
