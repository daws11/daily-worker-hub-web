/**
 * Structured Logger Utility for API Routes
 * 
 * Provides consistent logging across all API endpoints with:
 * - Structured JSON format
 * - Request context (method, path, userId)
 * - Error details (message, stack trace in dev, error code)
 * - Response status codes
 * - Audit trail for payment/webhook routes
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  method?: string
  path?: string
  userId?: string
  businessId?: string
  workerId?: string
  requestId?: string
  [key: string]: unknown
}

interface ErrorDetails {
  message: string
  stack?: string
  code?: string
  name?: string
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: LogContext
  error?: ErrorDetails
  response?: {
    status: number
    statusText?: string
  }
  duration?: number
  environment: string
}

/**
 * Check if we're in development mode
 */
const isDev = process.env.NODE_ENV === 'development'

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Format timestamp in ISO format
 */
function getTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Core logging function
 */
function log(entry: LogEntry): void {
  const output = JSON.stringify(entry)
  
  switch (entry.level) {
    case 'error':
      console.error(output)
      break
    case 'warn':
      console.warn(output)
      break
    case 'debug':
      if (isDev) {
        console.debug(output)
      }
      break
    default:
      console.log(output)
  }
}

/**
 * Extract user ID from request headers or session
 */
export function extractUserId(request: Request): string | undefined {
  // Try to get from authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // Extract from Bearer token if present
    const token = authHeader.replace('Bearer ', '')
    // Return partial token for logging (don't log full token)
    if (token && token.length > 10) {
      return `token_${token.substring(0, 10)}...`
    }
  }
  return undefined
}

/**
 * Get request context from Request object
 */
export function getRequestContext(request: Request): LogContext {
  const url = new URL(request.url)
  
  return {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    userId: extractUserId(request),
    requestId: request.headers.get('x-request-id') || generateRequestId(),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') ||
        'unknown',
  }
}

/**
 * Log API request start
 */
export function logRequestStart(
  request: Request,
  context?: LogContext
): { startTime: number; requestId: string } {
  const startTime = Date.now()
  const requestContext = getRequestContext(request)
  const requestId = requestContext.requestId || generateRequestId()
  
  log({
    timestamp: getTimestamp(),
    level: 'info',
    message: `API Request Started: ${request.method} ${requestContext.path}`,
    context: {
      ...requestContext,
      ...context,
      requestId,
    },
    environment: process.env.NODE_ENV || 'development',
  })
  
  return { startTime, requestId }
}

/**
 * Log API request success
 */
export function logRequestSuccess(
  request: Request,
  response: { status: number; statusText?: string },
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime
  const requestContext = getRequestContext(request)
  
  log({
    timestamp: getTimestamp(),
    level: 'info',
    message: `API Request Success: ${request.method} ${requestContext.path}`,
    context: {
      ...requestContext,
      ...context,
    },
    response: {
      status: response.status,
      statusText: response.statusText,
    },
    duration,
    environment: process.env.NODE_ENV || 'development',
  })
}

/**
 * Log API request error
 */
export function logRequestError(
  request: Request,
  error: unknown,
  statusCode: number,
  startTime: number,
  context?: LogContext
): void {
  const duration = Date.now() - startTime
  const requestContext = getRequestContext(request)
  
  const errorObj = error instanceof Error 
    ? {
        message: error.message,
        stack: isDev ? error.stack : undefined,
        code: (error as any).code || 'UNKNOWN_ERROR',
        name: error.name,
      }
    : {
        message: String(error),
        code: 'UNKNOWN_ERROR',
      }
  
  log({
    timestamp: getTimestamp(),
    level: 'error',
    message: `API Request Error: ${request.method} ${requestContext.path}`,
    context: {
      ...requestContext,
      ...context,
    },
    error: errorObj,
    response: {
      status: statusCode,
    },
    duration,
    environment: process.env.NODE_ENV || 'development',
  })
}

/**
 * Log info level message
 */
export function logInfo(
  message: string,
  context?: LogContext
): void {
  log({
    timestamp: getTimestamp(),
    level: 'info',
    message,
    context: context || {},
    environment: process.env.NODE_ENV || 'development',
  })
}

/**
 * Log warning level message
 */
export function logWarn(
  message: string,
  context?: LogContext,
  error?: unknown
): void {
  const errorDetails = error instanceof Error
    ? {
        message: error.message,
        stack: isDev ? error.stack : undefined,
        code: (error as any).code,
        name: error.name,
      }
    : undefined
  
  log({
    timestamp: getTimestamp(),
    level: 'warn',
    message,
    context: context || {},
    error: errorDetails,
    environment: process.env.NODE_ENV || 'development',
  })
}

/**
 * Log error level message
 */
export function logError(
  message: string,
  error: unknown,
  context?: LogContext
): void {
  const errorDetails = error instanceof Error
    ? {
        message: error.message,
        stack: isDev ? error.stack : undefined,
        code: (error as any).code || 'UNKNOWN_ERROR',
        name: error.name,
      }
    : {
        message: String(error),
        code: 'UNKNOWN_ERROR',
      }
  
  log({
    timestamp: getTimestamp(),
    level: 'error',
    message,
    context: context || {},
    error: errorDetails,
    environment: process.env.NODE_ENV || 'development',
  })
}

/**
 * Log debug level message (only in development)
 */
export function logDebug(
  message: string,
  context?: LogContext
): void {
  if (!isDev) return
  
  log({
    timestamp: getTimestamp(),
    level: 'debug',
    message,
    context: context || {},
    environment: process.env.NODE_ENV || 'development',
  })
}

/**
 * Log webhook/ payment event for audit trail
 */
export function logAudit(
  event: string,
  data: {
    provider?: string
    transactionId?: string
    amount?: number
    status?: string
    [key: string]: unknown
  },
  context?: LogContext
): void {
  log({
    timestamp: getTimestamp(),
    level: 'info',
    message: `AUDIT: ${event}`,
    context: {
      ...context,
      audit: true,
      eventType: event,
      ...data,
    },
    environment: process.env.NODE_ENV || 'development',
  })
}

/**
 * Create a logger instance with pre-filled context
 */
export function createApiLogger(routeName: string, defaultContext?: LogContext) {
  return {
    info: (message: string, context?: LogContext) => 
      logInfo(`[${routeName}] ${message}`, { ...defaultContext, ...context }),
    
    warn: (message: string, context?: LogContext, error?: unknown) => 
      logWarn(`[${routeName}] ${message}`, { ...defaultContext, ...context }, error),
    
    error: (message: string, error: unknown, context?: LogContext) => 
      logError(`[${routeName}] ${message}`, error, { ...defaultContext, ...context }),
    
    debug: (message: string, context?: LogContext) => 
      logDebug(`[${routeName}] ${message}`, { ...defaultContext, ...context }),
    
    audit: (event: string, data: Record<string, unknown>, context?: LogContext) => 
      logAudit(event, data, { ...defaultContext, ...context }),
    
    requestStart: (request: Request, context?: LogContext) =>
      logRequestStart(request, { routeName, ...defaultContext, ...context }),
    
    requestSuccess: (request: Request, response: { status: number }, startTime: number, context?: LogContext) =>
      logRequestSuccess(request, response, startTime, { routeName, ...defaultContext, ...context }),
    
    requestError: (request: Request, error: unknown, statusCode: number, startTime: number, context?: LogContext) =>
      logRequestError(request, error, statusCode, startTime, { routeName, ...defaultContext, ...context }),
  }
}

// Export default logger instance
export const logger = {
  info: logInfo,
  warn: logWarn,
  error: logError,
  debug: logDebug,
  audit: logAudit,
  requestStart: logRequestStart,
  requestSuccess: logRequestSuccess,
  requestError: logRequestError,
  createApiLogger,
  generateRequestId,
  getRequestContext,
}

export default logger
