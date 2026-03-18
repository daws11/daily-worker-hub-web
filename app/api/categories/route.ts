import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const routeLogger = logger.createApiLogger('categories')

// GET /api/categories - Fetch all categories
export async function GET(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, { route: 'categories' })
  
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      routeLogger.error('Error fetching categories', error, { requestId })
      logger.requestError(request, error, 500, startTime, { requestId })
      
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    routeLogger.info('Categories fetched successfully', { requestId, count: categories?.length || 0 })
    logger.requestSuccess(request, { status: 200 }, startTime, { requestId, count: categories?.length || 0 })

    return NextResponse.json({ data: categories })
  } catch (error) {
    routeLogger.error('Unexpected error in GET /api/categories', error, { requestId })
    logger.requestError(request, error, 500, startTime, { requestId })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
