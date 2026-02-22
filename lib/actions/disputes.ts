"use server"

import { createClient } from "../supabase/server"
import type { Database } from "../supabase/types"

type Dispute = Database["public"]["Tables"]["disputes"]["Row"]
type Booking = Database["public"]["Tables"]["bookings"]["Row"]

export type DisputeResult = {
  success: boolean
  error?: string
  data?: Dispute
}

/**
 * Business raises a dispute on a booking
 * - Creates a new dispute record
 * - Updates booking payment_status to 'disputed'
 * - Updates related wallet transaction status to 'disputed'
 * - Prevents auto-release of payment
 */
export async function raiseDispute(
  bookingId: string,
  businessId: string,
  reason: string,
  evidenceUrls?: string[]
): Promise<DisputeResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the business
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          budget_max
        )
      `)
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    // Check if booking is in a valid state for dispute
    if (booking.payment_status !== "pending_review") {
      return { success: false, error: `Hanya booking dengan status pembayaran pending_review yang bisa disengketakan` }
    }

    // Check if there's already an active dispute
    const { data: existingDispute } = await supabase
      .from("disputes")
      .select("*")
      .eq("booking_id", bookingId)
      .in("status", ["pending", "investigating"])
      .single()

    if (existingDispute) {
      return { success: false, error: "Booking ini sudah memiliki sengketa aktif" }
    }

    // Create the dispute
    const newDispute = {
      booking_id: bookingId,
      raised_by: businessId,
      reason,
      evidence_urls: evidenceUrls || null,
    }

    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert(newDispute)
      .select()
      .single()

    if (disputeError) {
      return { success: false, error: `Gagal membuat sengketa: ${disputeError.message}` }
    }

    // Update booking payment status to disputed
    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ payment_status: "disputed" })
      .eq("id", bookingId)

    if (bookingUpdateError) {
      return { success: false, error: `Gagal memperbarui status pembayaran: ${bookingUpdateError.message}` }
    }

    // Update related wallet transaction status to disputed
    const { data: walletTransaction } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "pending_review")
      .single()

    if (walletTransaction) {
      const { error: transactionUpdateError } = await supabase
        .from("wallet_transactions")
        .update({ status: "disputed" })
        .eq("id", walletTransaction.id)

      if (transactionUpdateError) {
        // Log but don't fail - dispute was created and booking updated
        console.error("Gagal memperbarui status transaksi dompet:", transactionUpdateError)
      }
    }

    return { success: true, data: dispute }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat sengketa" }
  }
}

/**
 * Worker can also raise a dispute on their completed booking
 */
export async function raiseDisputeByWorker(
  bookingId: string,
  workerId: string,
  reason: string,
  evidenceUrls?: string[]
): Promise<DisputeResult> {
  try {
    const supabase = await createClient()

    // Verify the booking belongs to the worker
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        jobs (
          id,
          title,
          budget_max
        )
      `)
      .eq("id", bookingId)
      .eq("worker_id", workerId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: "Booking tidak ditemukan" }
    }

    // Check if booking is in a valid state for dispute
    if (booking.payment_status !== "pending_review") {
      return { success: false, error: `Hanya booking dengan status pembayaran pending_review yang bisa disengketakan` }
    }

    // Check if there's already an active dispute
    const { data: existingDispute } = await supabase
      .from("disputes")
      .select("*")
      .eq("booking_id", bookingId)
      .in("status", ["pending", "investigating"])
      .single()

    if (existingDispute) {
      return { success: false, error: "Booking ini sudah memiliki sengketa aktif" }
    }

    // Create the dispute
    const newDispute = {
      booking_id: bookingId,
      raised_by: workerId,
      reason,
      evidence_urls: evidenceUrls || null,
    }

    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert(newDispute)
      .select()
      .single()

    if (disputeError) {
      return { success: false, error: `Gagal membuat sengketa: ${disputeError.message}` }
    }

    // Update booking payment status to disputed
    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ payment_status: "disputed" })
      .eq("id", bookingId)

    if (bookingUpdateError) {
      return { success: false, error: `Gagal memperbarui status pembayaran: ${bookingUpdateError.message}` }
    }

    // Update related wallet transaction status to disputed
    const { data: walletTransaction } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "pending_review")
      .single()

    if (walletTransaction) {
      const { error: transactionUpdateError } = await supabase
        .from("wallet_transactions")
        .update({ status: "disputed" })
        .eq("id", walletTransaction.id)

      if (transactionUpdateError) {
        // Log but don't fail - dispute was created and booking updated
        console.error("Gagal memperbarui status transaksi dompet:", transactionUpdateError)
      }
    }

    return { success: true, data: dispute }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat membuat sengketa" }
  }
}

/**
 * Get dispute details
 */
export async function getDispute(disputeId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("disputes")
      .select(`
        *,
        bookings (
          id,
          status,
          final_price,
          jobs (
            id,
            title,
            budget_max
          ),
          workers (
            id,
            full_name,
            phone,
            email
          ),
          businesses (
            id,
            name,
            phone,
            email
          )
        )
      `)
      .eq("id", disputeId)
      .single()

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data sengketa", data: null }
  }
}

/**
 * Get all disputes for a business
 */
export async function getBusinessDisputes(businessId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("disputes")
      .select(`
        *,
        bookings (
          id,
          status,
          final_price,
          jobs (
            id,
            title
          ),
          workers (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq("bookings.business_id", businessId)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data sengketa", data: null }
  }
}

/**
 * Get all disputes for a worker
 */
export async function getWorkerDisputes(workerId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("disputes")
      .select(`
        *,
        bookings (
          id,
          status,
          final_price,
          jobs (
            id,
            title
          ),
          businesses (
            id,
            name,
            phone,
            email
          )
        )
      `)
      .eq("bookings.worker_id", workerId)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data sengketa", data: null }
  }
}

/**
 * Admin updates dispute status and resolution
 * - If resolved: releases payment to worker or refunds business
 * - Updates booking and wallet transaction statuses accordingly
 */
export async function resolveDispute(
  disputeId: string,
  resolution: 'resolved_worker' | 'resolved_business' | 'rejected',
  resolutionNotes?: string
): Promise<DisputeResult> {
  try {
    const supabase = await createClient()

    // Get the dispute with booking details
    const { data: dispute, error: fetchError } = await supabase
      .from("disputes")
      .select(`
        *,
        bookings!inner (
          id,
          worker_id,
          business_id,
          final_price,
          payment_status
        )
      `)
      .eq("id", disputeId)
      .single()

    if (fetchError || !dispute) {
      return { success: false, error: "Sengketa tidak ditemukan" }
    }

    // Check if dispute is already resolved
    if (dispute.status === 'resolved' || dispute.status === 'rejected') {
      return { success: false, error: "Sengketa sudah diselesaikan" }
    }

    const bookingData = dispute.bookings as any

    let newDisputeStatus: 'resolved' | 'rejected'
    let newPaymentStatus: 'available' | 'cancelled' | 'pending_review'
    let resolutionText: string

    if (resolution === 'resolved_worker') {
      // Worker wins - release payment
      newDisputeStatus = 'resolved'
      newPaymentStatus = 'available'
      resolutionText = resolutionNotes || 'Sengketa diselesaikan dengan mendukung pekerja'

      // Release funds to worker's wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", bookingData.worker_id)
        .single()

      if (wallet) {
        const { data: transaction } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("booking_id", bookingData.id)
          .eq("status", "disputed")
          .single()

        if (transaction) {
          // Move funds from pending to available
          const amount = Number(transaction.amount)
          const newPendingBalance = Number(wallet.pending_balance) - amount
          const newAvailableBalance = Number(wallet.available_balance) + amount

          await supabase
            .from("wallets")
            .update({
              pending_balance: newPendingBalance,
              available_balance: newAvailableBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", wallet.id)

          await supabase
            .from("wallet_transactions")
            .update({ status: "available" })
            .eq("id", transaction.id)
        }
      }
    } else if (resolution === 'resolved_business') {
      // Business wins - refund/hold
      newDisputeStatus = 'resolved'
      newPaymentStatus = 'cancelled'
      resolutionText = resolutionNotes || 'Sengketa diselesaikan dengan mendukung bisnis'

      // Refund from worker's pending balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", bookingData.worker_id)
        .single()

      if (wallet) {
        const { data: transaction } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("booking_id", bookingData.id)
          .eq("status", "disputed")
          .single()

        if (transaction) {
          // Remove from pending (no refund to business in this simple model)
          const amount = Number(transaction.amount)
          const newPendingBalance = Number(wallet.pending_balance) - amount

          await supabase
            .from("wallets")
            .update({
              pending_balance: newPendingBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", wallet.id)

          await supabase
            .from("wallet_transactions")
            .update({ status: "cancelled" })
            .eq("id", transaction.id)
        }
      }
    } else {
      // Dispute rejected - restore to pending_review
      newDisputeStatus = 'rejected'
      newPaymentStatus = 'pending_review'
      resolutionText = resolutionNotes || 'Sengketa ditolak'

      // Restore transaction status to pending_review
      const { data: transaction } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("booking_id", bookingData.id)
        .eq("status", "disputed")
        .single()

      if (transaction) {
        await supabase
          .from("wallet_transactions")
          .update({ status: "pending_review" })
          .eq("id", transaction.id)
      }
    }

    // Update dispute
    const { data: updatedDispute, error: updateError } = await supabase
      .from("disputes")
      .update({
        status: newDisputeStatus,
        resolution: resolutionText,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: `Gagal memperbarui sengketa: ${updateError.message}` }
    }

    // Update booking payment status
    await supabase
      .from("bookings")
      .update({ payment_status: newPaymentStatus })
      .eq("id", bookingData.id)

    return { success: true, data: updatedDispute }
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menyelesaikan sengketa" }
  }
}

/**
 * Check if a booking has an active dispute
 */
export async function checkActiveDispute(bookingId: string): Promise<{
  hasActiveDispute: boolean
  dispute?: Dispute
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .eq("booking_id", bookingId)
      .in("status", ["pending", "investigating"])
      .single()

    if (error || !data) {
      return { hasActiveDispute: false }
    }

    return { hasActiveDispute: true, dispute: data }
  } catch (error) {
    return { hasActiveDispute: false }
  }
}

/**
 * Get all pending disputes (admin view)
 */
export async function getPendingDisputes() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("disputes")
      .select(`
        *,
        bookings (
          id,
          status,
          final_price,
          jobs (
            id,
            title,
            budget_max
          ),
          workers (
            id,
            full_name,
            phone,
            email
          ),
          businesses (
            id,
            name,
            phone,
            email
          )
        )
      `)
      .in("status", ["pending", "investigating"])
      .order("created_at", { ascending: true })

    if (error) {
      return { success: false, error: error.message, data: null }
    }

    return { success: true, data, error: null }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data sengketa", data: null }
  }
}
