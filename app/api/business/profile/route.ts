import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/get-server-session'

// GET /api/business/profile - Get current business user profile
export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Fetch business profile for the user
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error) {
      console.error('Error fetching business profile:', error)
      return NextResponse.json(
        { error: 'Failed to fetch business profile' },
        { status: 500 }
      )
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: business })
  } catch (error) {
    console.error('Error in GET /api/business/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
