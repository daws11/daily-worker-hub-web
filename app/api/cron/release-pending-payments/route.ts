import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { releaseFundsAction } from '@/lib/actions/wallets'
import { createNotification } from '@/lib/actions/notifications'

/**
 * Cron endpoint to auto-release pending payments after review period
 * Should be called every hour by Vercel Cron or external scheduler
 * 
 * Security: Requires CRON_SECRET header for authentication
 * 
 * IMPORTANT: Set CRON_SECRET environment variable in Vercel dashboard
 * Example: Set a secure random string like `openssl rand -base64 32`
 * 
 * Query: Find bookings where:
 * - status = 'completed'
 * - payment_status = 'pending_review'
 * - review_deadline < NOW()
 * 
 * Action: Release funds to worker's available balance
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Find bookings ready for auto-release
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        worker_id,
        final_price,
        review_deadline,
        workers (
          id,
          user_id,
          full_name
        ),
        jobs (
          id,
          title
        )
      `)
      .eq('status', 'completed')
      .eq('payment_status', 'pending_review')
      .lt('review_deadline', new Date().toISOString())
      .limit(100) // Process in batches

    if (fetchError) {
      console.error('Error fetching bookings for auto-release:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bookings to release',
        released: 0
      })
    }

    let releasedCount = 0
    let failedCount = 0
    const results: any[] = []

    // Process each booking
    for (const booking of bookings) {
      try {
        const worker = booking.workers as any
        const job = booking.jobs as any

        if (!worker || !booking.final_price) {
          failedCount++
          results.push({
            bookingId: booking.id,
            status: 'skipped',
            reason: 'Missing worker or price'
          })
          continue
        }

        // Release funds
        const releaseResult = await releaseFundsAction(
          worker.user_id,
          booking.final_price,
          booking.id,
          'Pembayaran otomatis tersedia setelah periode review'
        )

        if (releaseResult.success) {
          // Update booking payment status
          await supabase
            .from('bookings')
            .update({ payment_status: 'available' })
            .eq('id', booking.id)

          // Notify worker
          await createNotification(
            worker.user_id,
            'Pembayaran Tersedia',
            `Pembayaran Rp ${booking.final_price.toLocaleString('id-ID')} untuk ${job?.title || 'pekerjaan'} telah tersedia untuk ditarik`,
            '/worker/wallet'
          )

          releasedCount++
          results.push({
            bookingId: booking.id,
            status: 'released',
            amount: booking.final_price
          })
        } else {
          failedCount++
          results.push({
            bookingId: booking.id,
            status: 'failed',
            error: releaseResult.error
          })
        }
      } catch (error) {
        failedCount++
        results.push({
          bookingId: booking.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Released ${releasedCount} payments, ${failedCount} failed`,
      released: releasedCount,
      failed: failedCount,
      results
    })
  } catch (error) {
    console.error('Error in auto-release cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
