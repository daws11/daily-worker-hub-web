import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// GET /api/jobs - Get jobs (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Build query
    const filters: string[] = []

    if (searchParams.get('category_id')) {
      filters.push(`category_id=eq.${searchParams.get('category_id')}`)
    }

    if (searchParams.get('search')) {
      filters.push(`title=ilike.*${searchParams.get('search')}*`)
    }

    if (searchParams.get('wage_min')) {
      filters.push(`budget_min=gte.${searchParams.get('wage_min')}`)
    }

    if (searchParams.get('wage_max')) {
      filters.push(`budget_max=lte.${searchParams.get('wage_max')}`)
    }

    const sort = (searchParams.get('sort') as any) || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Add sorting
    let sortParam = 'order=created_at.desc'
    switch (sort) {
      case 'oldest':
        sortParam = 'order=created_at.asc'
        break
      case 'highest_wage':
        sortParam = 'order=budget_max.desc'
        break
      case 'lowest_wage':
        sortParam = 'order=budget_min.asc'
        break
    }

    // Build URL with relationships
    const selectParams = [
      'select=*,business:businesses(id,name,is_verified,address,phone),category:categories(id,name,slug)'
    ]

    const allParams = [...selectParams, sortParam, ...filters, `limit=${limit}`]
    const queryString = allParams.join('&')

    const url = `${SUPABASE_URL}/rest/v1/jobs?${queryString}`

    // Fetch from Supabase
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch jobs from database' },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({ data, total: data?.length || 0 })
  } catch (error) {
    console.error('Error in GET /api/jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['business_id', 'category_id', 'title', 'description', 'budget_min', 'budget_max', 'hours_needed', 'address']
    const missingFields = requiredFields.filter(field => !body[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify business belongs to user (requires server-side verification)
    // This would need proper auth verification - for now skip or implement properly
    const url = `${SUPABASE_URL}/rest/v1/businesses?id=eq.${body.business_id}&select=id,user_id`

    const businessResponse = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    })

    if (!businessResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to verify business' },
        { status: 500 }
      )
    }

    const businessData = await businessResponse.json()
    if (!businessData || businessData.length === 0) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Create job
    const createUrl = `${SUPABASE_URL}/rest/v1/jobs`
    const createBody = {
      business_id: body.business_id,
      category_id: body.category_id,
      title: body.title,
      description: body.description,
      requirements: body.requirements || '',
      budget_min: body.budget_min,
      budget_max: body.budget_max,
      hours_needed: body.hours_needed,
      address: body.address,
      lat: body.lat || null,
      lng: body.lng || null,
      deadline: body.deadline || null,
      is_urgent: body.is_urgent || false,
      overtime_multiplier: body.overtime_multiplier || 1.0,
      status: 'open'
    }

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(createBody)
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('Error creating job:', errorText)
      return NextResponse.json(
        { error: 'Failed to create job', details: errorText },
        { status: 500 }
      )
    }

    const job = await createResponse.json()

    return NextResponse.json({
      data: job,
      message: 'Job created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
