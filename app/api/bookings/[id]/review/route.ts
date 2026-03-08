import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/get-server-session'
import {
  addBookingReview,
  addWorkerReview,
  getBookingReviewStatus,
} from '@/lib/actions/bookings-completion'

type Params = {
  params: Promise<{ id: string }>
}

// GET /api/bookings/[id]/review - Get review status for a booking
export async function GET(
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

    const supabase = await createClient()

    // Verify user has access to this booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, business_id, worker_id')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

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

    // Verify access
    if (user.role === 'business') {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!business || business.id !== booking.business_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    } else if (user.role === 'worker') {
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!worker || worker.id !== booking.worker_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    const result = await getBookingReviewStatus(bookingId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('Error in GET /api/bookings/[id]/review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/bookings/[id]/review - Add a review for a booking
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
    const body = await request.json()

    // Validate required fields
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

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

    let result

    if (user.role === 'business') {
      // Business reviewing worker
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!business) {
        return NextResponse.json(
          { error: 'Unauthorized - Business profile not found' },
          { status: 403 }
        )
      }

      result = await addBookingReview(
        bookingId,
        body.rating,
        body.review || '',
        business.id
      )
    } else if (user.role === 'worker') {
      // Worker reviewing business
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!worker) {
        return NextResponse.json(
          { error: 'Unauthorized - Worker profile not found' },
          { status: 403 }
        )
      }

      result = await addWorkerReview(
        bookingId,
        body.rating,
        body.review || '',
        worker.id
      )
    } else {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid user role' },
        { status: 403 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: result.data,
      message: 'Review submitted successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/bookings/[id]/review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
