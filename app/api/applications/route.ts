import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/get-server-session'
import {
  createJobApplication,
  getApplicationsByJob,
  getApplicationsByWorker,
} from '@/lib/actions/job-applications'

// GET /api/applications - Get applications (for worker or business)
export async function GET(request: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')
    const workerId = searchParams.get('worker_id')
    const businessId = searchParams.get('business_id')
    const status = searchParams.get('status') || undefined

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

    // Business viewing applicants for a job
    if (jobId && businessId && user.role === 'business') {
      // Verify business belongs to user
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('user_id', session.user.id)
        .single()

      if (!business) {
        return NextResponse.json(
          { error: 'Unauthorized - Business not found' },
          { status: 403 }
        )
      }

      const result = await getApplicationsByJob(jobId, businessId)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({ data: result.data })
    }

    // Worker viewing their applications
    if (workerId && user.role === 'worker') {
      // Verify worker belongs to user
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('id', workerId)
        .eq('user_id', session.user.id)
        .single()

      if (!worker) {
        return NextResponse.json(
          { error: 'Unauthorized - Worker not found' },
          { status: 403 }
        )
      }

      const result = await getApplicationsByWorker(workerId, status)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({ data: result.data })
    }

    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in GET /api/applications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/applications - Create a new job application
export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.job_id || !body.worker_id) {
      return NextResponse.json(
        { error: 'Missing required fields: job_id, worker_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify worker belongs to user
    const { data: worker } = await supabase
      .from('workers')
      .select('id')
      .eq('id', body.worker_id)
      .eq('user_id', session.user.id)
      .single()

    if (!worker) {
      return NextResponse.json(
        { error: 'Unauthorized - Worker not found' },
        { status: 403 }
      )
    }

    const result = await createJobApplication(
      body.job_id,
      body.worker_id,
      {
        coverLetter: body.cover_letter,
        proposedWage: body.proposed_wage,
        availability: body.availability,
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: result.data,
      message: 'Application submitted successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/applications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
