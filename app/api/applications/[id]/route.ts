import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/get-server-session'
import {
  updateApplicationStatus,
  acceptApplicationAndCreateBooking,
  withdrawApplication,
} from '@/lib/actions/job-applications'

type Params = {
  params: Promise<{ id: string }>
}

// GET /api/applications/[id] - Get single application details
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

    const { id } = await params
    const supabase = await createClient()

    // Get application with related data
    // @ts-expect-error - Supabase query type instantiation is too deep
    const { data: application, error } = await supabase
      .from('job_applications')
      .select(`
        *,
        jobs (
          id,
          title,
          description,
          budget_min,
          budget_max,
          deadline,
          address
        ),
        workers (
          id,
          full_name,
          phone,
          bio,
          avatar_url,
          tier,
          rating,
          reliability_score,
          jobs_completed
        ),
        businesses (
          id,
          name,
          phone,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (error || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this application
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

    if (user.role === 'worker') {
      // Verify worker owns this application
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!worker || worker.id !== application.worker_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    } else if (user.role === 'business') {
      // Verify business owns this application
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!business || business.id !== application.business_id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ data: application })
  } catch (error) {
    console.error('Error in GET /api/applications/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/applications/[id] - Update application status
export async function PATCH(
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

    const { id } = await params
    const body = await request.json()

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

    // Business actions: shortlist, accept, reject
    if (body.status && ['shortlisted', 'accepted', 'rejected'].includes(body.status)) {
      if (user.role !== 'business') {
        return NextResponse.json(
          { error: 'Only businesses can update application status' },
          { status: 403 }
        )
      }

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

      // If accepting, also create booking
      if (body.status === 'accepted' && body.create_booking) {
        const result = await acceptApplicationAndCreateBooking(id, business.id)

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          data: result.data,
          message: 'Application accepted and booking created'
        })
      }

      // Otherwise just update status
      const result = await updateApplicationStatus(
        id,
        body.status as 'shortlisted' | 'accepted' | 'rejected',
        business.id
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        data: result.data,
        message: `Application ${body.status}`
      })
    }

    // Worker action: withdraw
    if (body.status === 'withdrawn') {
      if (user.role !== 'worker') {
        return NextResponse.json(
          { error: 'Only workers can withdraw applications' },
          { status: 403 }
        )
      }

      // Get worker ID
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!worker) {
        return NextResponse.json(
          { error: 'Worker not found' },
          { status: 404 }
        )
      }

      const result = await withdrawApplication(id, worker.id)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        data: result.data,
        message: 'Application withdrawn'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in PATCH /api/applications/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
