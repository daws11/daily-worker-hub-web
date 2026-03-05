import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/get-server-session'
import {
  completeBooking,
  confirmBookingCompletion,
} from '@/lib/actions/bookings-completion'

type Params = {
  params: Promise<{ id: string }>
}

// POST /api/bookings/[id]/complete - Complete a booking
// Can be called by:
// - Business: To finalize the booking and trigger payment
// - Both: To confirm completion after review period
export async function POST(
  request: Request,
  { params }: Params
) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: bookingId } = await params
    const body = await request.json().catch(() => ({}))

    const supabase = await createClient()

    // Get user role
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get booking status
    const { data: booking } = await supabase
      .from('bookings')
      .select('status, business_id')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Business actions
    if (user.role === 'business') {
      // Get business ID
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!business) {
        return NextResponse.json(
          { error: 'Business not found' },
          { status: 404 }
        )
      }

      // Verify business owns this booking
      if (booking.business_id !== business.id) {
        return NextResponse.json(
          { error: 'Unauthorized - Not your booking' },
          { status: 403 }
        )
      }

      // If booking is already completed (after worker checkout), confirm completion
      if (booking.status === 'completed' && body.confirm) {
        const result = await confirmBookingCompletion(bookingId, business.id)

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          data: result.data,
          message: 'Booking completion confirmed and payment released'
        })
      }

      // Otherwise, complete the booking
      const result = await completeBooking(bookingId, business.id, {
        finalPrice: body.final_price,
        actualHours: body.actual_hours,
        notes: body.notes,
      })

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        data: result.data,
        message: 'Booking completed successfully'
      })
    }

    return NextResponse.json(
      { error: 'Unauthorized - Only businesses can complete bookings' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error in POST /api/bookings/[id]/complete:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
