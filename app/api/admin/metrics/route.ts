/**
 * Admin Metrics API Route
 * 
 * Provides system metrics for the monitoring dashboard.
 * Collects data from cache, rate limiting, database, and logs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { rateLimitStore } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import os from 'os'

const routeLogger = logger.createApiLogger('admin-metrics')

/**
 * Verify admin authentication
 * TODO: Implement proper admin auth check
 */
async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  
  // For now, check for a simple admin secret
  // In production, this should use proper admin authentication
  const adminSecret = process.env.ADMIN_API_SECRET
  
  if (!adminSecret) {
    // If no admin secret is configured, deny access
    return false
  }
  
  return authHeader === `Bearer ${adminSecret}`
}

/**
 * Get system health metrics
 */
function getSystemHealth() {
  const cpus = os.cpus()
  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory
  const uptime = os.uptime()
  
  // Calculate CPU usage (average across all cores)
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
    const idle = cpu.times.idle
    return acc + ((total - idle) / total)
  }, 0) / cpus.length
  
  return {
    cpu: {
      usage: Math.round(cpuUsage * 100),
      cores: cpus.length,
      model: cpus[0].model,
    },
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercent: Math.round((usedMemory / totalMemory) * 100),
    },
    uptime: {
      seconds: uptime,
      formatted: formatUptime(uptime),
    },
    platform: os.platform(),
    nodeVersion: process.version,
  }
}

/**
 * Format uptime to human-readable string
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  
  return parts.join(' ') || '< 1m'
}

/**
 * Get cache performance metrics
 */
function getCacheMetrics() {
  const stats = cache.getStats()
  
  return {
    hits: stats.hits,
    misses: stats.misses,
    size: stats.size,
    maxSize: stats.maxSize,
    hitRate: Math.round(stats.hitRate * 100),
    entries: stats.entries.length,
  }
}

/**
 * Get rate limiting metrics
 */
function getRateLimitMetrics() {
  const stats = {
    totalRequests: 0,
    blockedRequests: 0,
    activeLimiters: rateLimitStore.size,
    byType: {
      auth: { requests: 0, blocked: 0 },
      'api-authenticated': { requests: 0, blocked: 0 },
      'api-public': { requests: 0, blocked: 0 },
      payment: { requests: 0, blocked: 0 },
    },
    topEndpoints: [] as Array<{ endpoint: string; count: number }>,
  }
  
  // Aggregate rate limit data
  for (const [key, record] of rateLimitStore.entries()) {
    const type = key.split(':')[1] as keyof typeof stats.byType
    
    if (type && stats.byType[type]) {
      stats.byType[type].requests += record.count
      stats.totalRequests += record.count
      
      // If count equals max requests, consider it as potentially blocked
      if (record.count >= 5) { // Assuming 5 is the minimum threshold
        stats.byType[type].blocked++
        stats.blockedRequests++
      }
    }
  }
  
  // Get top endpoints (simplified - would need better tracking in production)
  const endpointCounts = new Map<string, number>()
  for (const [key, record] of rateLimitStore.entries()) {
    const endpoint = key.split(':')[0] || 'unknown'
    endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + record.count)
  }
  
  stats.topEndpoints = Array.from(endpointCounts.entries())
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return stats
}

/**
 * Get API response time metrics (mock data for now)
 * In production, this would be collected from actual API calls
 */
function getApiResponseMetrics() {
  // Mock data - in production, this would come from APM tools or custom metrics
  const now = Date.now()
  const oneHourAgo = now - 3600000
  
  return {
    average: 145, // ms
    p95: 280,
    p99: 450,
    total: 1250,
    lastHour: {
      average: 132,
      p95: 265,
      p99: 410,
      total: 312,
    },
    dataPoints: Array.from({ length: 12 }, (_, i) => ({
      timestamp: oneHourAgo + (i * 5 * 60 * 1000),
      average: 100 + Math.random() * 100,
      p95: 200 + Math.random() * 100,
      p99: 300 + Math.random() * 200,
    })),
  }
}

/**
 * Get error rate metrics (mock data for now)
 * In production, this would integrate with Sentry or error logs
 */
function getErrorMetrics() {
  // Mock data - in production, this would come from Sentry API
  const now = Date.now()
  const oneHourAgo = now - 3600000
  const oneDayAgo = now - 86400000
  
  return {
    total24h: 23,
    errorsPerMinute: 0.016,
    byType: [
      { type: 'NetworkError', count: 8 },
      { type: 'ValidationError', count: 6 },
      { type: 'AuthError', count: 5 },
      { type: 'DatabaseError', count: 3 },
      { type: 'Other', count: 1 },
    ],
    trend24h: Array.from({ length: 24 }, (_, i) => ({
      hour: oneDayAgo + (i * 3600000),
      count: Math.floor(Math.random() * 3),
    })),
    lastHour: {
      total: 2,
      errorsPerMinute: 0.033,
    },
  }
}

/**
 * Get active users metrics (mock data for now)
 * In production, this would come from session tracking
 */
function getActiveUsersMetrics() {
  // Mock data - in production, this would come from session store or analytics
  return {
    currentlyLoggedIn: 47,
    dailyActive: 234,
    weeklyActive: 892,
    monthlyActive: 1567,
    byType: {
      workers: 28,
      businesses: 18,
      admins: 1,
    },
  }
}

/**
 * Get database metrics (mock data for now)
 * In production, this would come from database connection pool
 */
function getDatabaseMetrics() {
  // Mock data - in production, this would come from Supabase or connection pool
  return {
    connectionCount: 5,
    maxConnections: 20,
    slowQueries: [
      { query: 'SELECT * FROM jobs WHERE...', duration: 1234, timestamp: Date.now() - 600000 },
      { query: 'SELECT * FROM bookings...', duration: 987, timestamp: Date.now() - 1200000 },
    ],
    averageQueryTime: 45, // ms
  }
}

/**
 * @openapi
 * /api/admin/metrics:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get system metrics
 *     description: Returns comprehensive system metrics for monitoring dashboard. Requires admin authentication.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                 system:
 *                   type: object
 *                 cache:
 *                   type: object
 *                 rateLimit:
 *                   type: object
 *                 api:
 *                   type: object
 *                 errors:
 *                   type: object
 *                 users:
 *                   type: object
 *                 database:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const isAuthorized = await verifyAdminAuth(request)
    
    if (!isAuthorized) {
      routeLogger.warn('Unauthorized metrics access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Collect all metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      system: getSystemHealth(),
      cache: getCacheMetrics(),
      rateLimit: getRateLimitMetrics(),
      api: getApiResponseMetrics(),
      errors: getErrorMetrics(),
      users: getActiveUsersMetrics(),
      database: getDatabaseMetrics(),
    }

    routeLogger.info('Metrics retrieved successfully')

    return NextResponse.json(metrics)
  } catch (error) {
    routeLogger.error('Error retrieving metrics', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
