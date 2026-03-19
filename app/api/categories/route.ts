/**
 * Categories API Route
 * 
 * Endpoints for managing job categories in the Daily Worker Hub platform.
 * Categories are used to classify job postings.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const routeLogger = logger.createApiLogger('categories')

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags:
 *       - Categories
 *     summary: Get all job categories
 *     description: Retrieve all available job categories. Public endpoint - no authentication required.
 *     security: []
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       description:
 *                         type: string
 *                       icon:
 *                         type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
