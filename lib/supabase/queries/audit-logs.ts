import { supabase } from '../client'
import type {
  AuditLog,
  AuditLogWithAdmin,
  AuditAction,
  PaginatedAdminResponse,
} from '../../types/admin'

/**
 * Represents an audit log entry in the database
 */
type AuditLogRow = {
  id: string
  admin_id: string
  action: string
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown>
  new_values: Record<string, unknown>
  reason: string
  ip_address: string
  user_agent: string
  created_at: string
}

type AuditLogInsert = Omit<AuditLogRow, 'id' | 'created_at'>

/**
 * Create a new audit log entry
 */
export async function createAuditLog(
  auditData: Omit<AuditLogInsert, 'old_values' | 'new_values'> & {
    old_values?: Record<string, unknown>
    new_values?: Record<string, unknown>
  }
): Promise<AuditLog> {
  const { data, error } = await (supabase
    // @ts-ignore - admin_audit_logs table not in Database types yet
    .from('admin_audit_logs')
    // @ts-ignore - admin_audit_logs table not in Database types yet
    .insert({
      old_values: auditData.old_values || {},
      new_values: auditData.new_values || {},
      ...auditData,
    })
    .select()
    .single() as any)

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to create audit log: No data returned')
  }

  return {
    id: data.id,
    admin_id: data.admin_id,
    action: data.action as AuditAction,
    entity_type: data.entity_type as AuditLog['entity_type'],
    entity_id: data.entity_id,
    details: {
      old_values: data.old_values,
      new_values: data.new_values,
      reason: data.reason,
    },
    ip_address: data.ip_address || null,
    user_agent: data.user_agent || null,
    created_at: data.created_at,
  }
}

/**
 * Get paginated audit logs with optional filters
 */
export async function getAuditLogs(
  filters: {
    adminId?: string
    action?: AuditAction
    entityType?: AuditLog['entity_type']
    entityId?: string
    search?: string
    startDate?: string
    endDate?: string
    sortBy?: 'created_at' | 'action' | 'entity_type'
    sortOrder?: 'asc' | 'desc'
  } = {},
  page: number = 1,
  limit: number = 50
): Promise<{ data: PaginatedAdminResponse<AuditLogWithAdmin> | null; error?: string }> {
  try {
    const offset = (page - 1) * limit

    let query = supabase
      // @ts-ignore - admin_audit_logs table not in Database types yet
      .from('admin_audit_logs')
      .select('*, admin:users(*)', { count: 'exact' })

    if (filters.adminId) {
      query = query.eq('admin_id', filters.adminId)
    }

    if (filters.action) {
      query = query.eq('action', filters.action)
    }

    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    if (filters.entityId) {
      query = query.eq('entity_id', filters.entityId)
    }

    if (filters.search) {
      query = query.or(`action.ilike.%${filters.search}%,reason.ilike.%${filters.search}%,entity_id.ilike.%${filters.search}%`)
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const sortBy = filters.sortBy || 'created_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query as {
      data: any[] | null
      error: { message: string } | null
      count: number | null
    }

    if (error) {
      return { data: null, error: error.message }
    }

    const items: AuditLogWithAdmin[] = (data || []).map((log: any) => ({
      id: log.id,
      admin_id: log.admin_id,
      action: log.action as AuditAction,
      entity_type: log.entity_type as AuditLog['entity_type'],
      entity_id: log.entity_id,
      details: {
        old_values: log.old_values || {},
        new_values: log.new_values || {},
        reason: log.reason || '',
      },
      ip_address: log.ip_address || null,
      user_agent: log.user_agent || null,
      created_at: log.created_at,
      admin: {
        id: log.admin_id,
        user_id: log.admin_id,
        role: 'admin',
        permissions: [],
        is_active: true,
        created_at: log.admin?.created_at || log.created_at,
        updated_at: log.admin?.updated_at || log.created_at,
        user: log.admin,
      },
    }))

    const totalPages = count ? Math.ceil(count / limit) : 0

    return {
      data: {
        items,
        total: count ?? 0,
        page,
        limit,
        totalPages,
      },
      error: undefined,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get audit logs',
    }
  }
}

/**
 * Get audit logs by admin ID
 */
export async function getAuditLogsByAdminId(
  adminId: string,
  page: number = 1,
  limit: number = 50
): Promise<AuditLogWithAdmin[]> {
  const { data } = await getAuditLogs({ adminId }, page, limit)
  return data?.items || []
}

/**
 * Get audit logs by entity (type and id)
 */
export async function getAuditLogsByEntity(
  entityType: AuditLog['entity_type'],
  entityId: string,
  page: number = 1,
  limit: number = 50
): Promise<AuditLogWithAdmin[]> {
  const { data } = await getAuditLogs({ entityType, entityId }, page, limit)
  return data?.items || []
}

/**
 * Get audit logs by action type
 */
export async function getAuditLogsByAction(
  action: AuditAction,
  page: number = 1,
  limit: number = 50
): Promise<AuditLogWithAdmin[]> {
  const { data } = await getAuditLogs({ action }, page, limit)
  return data?.items || []
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLogById(
  logId: string
): Promise<{ data: AuditLogWithAdmin | null; error?: string }> {
  try {
    const { data, error } = await supabase
      // @ts-ignore - admin_audit_logs table not in Database types yet
      .from('admin_audit_logs')
      .select('*, admin:users(*)')
      .eq('id', logId)
      .single() as {
      data: any | null
      error: { message: string; code?: string } | null
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: 'Audit log not found' }
      }
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: null, error: 'Audit log not found' }
    }

    const log: AuditLogWithAdmin = {
      id: data.id,
      admin_id: data.admin_id,
      action: data.action as AuditAction,
      entity_type: data.entity_type as AuditLog['entity_type'],
      entity_id: data.entity_id,
      details: {
        old_values: data.old_values || {},
        new_values: data.new_values || {},
        reason: data.reason || '',
      },
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      created_at: data.created_at,
      admin: {
        id: data.admin_id,
        user_id: data.admin_id,
        role: 'admin',
        permissions: [],
        is_active: true,
        created_at: data.admin?.created_at || data.created_at,
        updated_at: data.admin?.updated_at || data.created_at,
        user: data.admin,
      },
    }

    return { data: log, error: undefined }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get audit log',
    }
  }
}

/**
 * Get recent audit logs (for dashboard/activity feed)
 */
export async function getRecentAuditLogs(
  limit: number = 20
): Promise<AuditLogWithAdmin[]> {
  const { data } = await getAuditLogs(
    {
      sortBy: 'created_at',
      sortOrder: 'desc',
    },
    1,
    limit
  )
  return data?.items || []
}

/**
 * Get audit logs count by action type (for analytics)
 */
export async function getAuditLogCountsByAction(
  startDate?: string,
  endDate?: string
): Promise<{ data: Record<string, number> | null; error?: string }> {
  try {
    let query = supabase
      // @ts-ignore - admin_audit_logs table not in Database types yet
      .from('admin_audit_logs')
      .select('action')

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query as {
      data: { action: string }[] | null
      error: { message: string } | null
    }

    if (error) {
      return { data: null, error: error.message }
    }

    const counts: Record<string, number> = {}
    for (const log of data || []) {
      counts[log.action] = (counts[log.action] || 0) + 1
    }

    return { data: counts, error: undefined }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get audit log counts',
    }
  }
}

/**
 * Get audit log statistics for a date range
 */
export async function getAuditLogStats(
  startDate: string,
  endDate: string
): Promise<{
  data: {
    total: number
    byAction: Record<string, number>
    byAdmin: Record<string, number>
    byEntityType: Record<string, number>
  } | null
  error?: string
}> {
  try {
    const { data, error } = await supabase
      // @ts-ignore - admin_audit_logs table not in Database types yet
      .from('admin_audit_logs')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate) as {
      data: any[] | null
      error: { message: string } | null
    }

    if (error) {
      return { data: null, error: error.message }
    }

    const byAction: Record<string, number> = {}
    const byAdmin: Record<string, number> = {}
    const byEntityType: Record<string, number> = {}

    for (const log of data || []) {
      byAction[log.action] = (byAction[log.action] || 0) + 1
      byAdmin[log.admin_id] = (byAdmin[log.admin_id] || 0) + 1
      byEntityType[log.entity_type] = (byEntityType[log.entity_type] || 0) + 1
    }

    return {
      data: {
        total: data?.length || 0,
        byAction,
        byAdmin,
        byEntityType,
      },
      error: undefined,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get audit log stats',
    }
  }
}
