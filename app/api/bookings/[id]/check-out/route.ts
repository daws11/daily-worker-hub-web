import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/get-server-session'
import { checkOutBooking } from '@/lib/actions/bookings-completion'

type Params = {
  params: Promise<{ id: string }>
}

// POST /api/bookings/[id]/check-out - Worker checks out from a booking
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

    // Verify user is a worker
    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!worker) {
      return NextResponse.json(
        { error: 'Unauthorized - Worker not found' },
        { status: 403 }
      )
    }

    const result = await checkOutBooking(
      bookingId,
      worker.id,
      body.actual_hours,
      body.notes
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: result.data,
      message: 'Check-out successful'
    })
  } catch (error) {
    console.error('Error in POST /api/bookings/[id]/check-out:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
