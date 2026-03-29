"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import type {
  BusinessSocialConnection,
  BusinessSocialConnectionWithPlatform,
  CreateConnectionInput,
  ConnectionStatus,
} from "../types/social";

// ============================================================================
// SOCIAL PLATFORM CONNECTION ACTIONS
// ============================================================================

type SocialConnectionRow =
  Database["public"]["Tables"]["business_social_connections"]["Row"];
type SocialConnectionInsert =
  Database["public"]["Tables"]["business_social_connections"]["Insert"];

/**
 * Result type for single social connection operations
 */
export type SocialConnectionResult = {
  success: boolean;
  error?: string;
  data?: BusinessSocialConnection;
};

/**
 * Result type for listing social connections with platform details
 */
export type SocialConnectionListResult = {
  success: boolean;
  error?: string;
  data?: BusinessSocialConnectionWithPlatform[];
  total?: number;
};

/**
 * Connect a business's social platform account
 * Creates a new connection with the provided access token and account details
 */
export async function connectSocialPlatform(
  businessId: string,
  platformId: string,
  input: CreateConnectionInput,
): Promise<SocialConnectionResult> {
  try {
    const supabase = await createClient();

    // Check if business already has a connection to this platform
    const { data: existingConnection, error: checkError } = await supabase
      .from("business_social_connections")
      .select("*")
      .eq("business_id", businessId)
      .eq("platform_id", platformId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = not found, which is expected for new connections
      return { success: false, error: "Gagal mengecek status koneksi" };
    }

    if (existingConnection) {
      // If connection exists but is not active, update it
      if (existingConnection.status !== "active") {
        const { data, error } = await (supabase as any)
          .from("business_social_connections")
          .update({
            access_token: input.access_token,
            refresh_token: input.refresh_token || null,
            token_expires_at: input.token_expires_at || null,
            platform_account_id: input.platform_account_id || null,
            platform_account_name: input.platform_account_name || null,
            platform_account_url: input.platform_account_url || null,
            platform_page_id: input.platform_page_id || null,
            scopes: input.scopes || null,
            settings: input.settings || {},
            status: "active",
            error_count: 0,
            last_error: null,
            last_error_at: null,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConnection.id)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: `Gagal mengupdate koneksi: ${error.message}`,
          };
        }

        return { success: true, data: data as BusinessSocialConnection };
      }

      return { success: false, error: "Platform ini sudah terhubung" };
    }

    // Verify the platform exists
    const { data: platform, error: platformError } = await supabase
      .from("social_platforms")
      .select("id, is_available")
      .eq("id", platformId)
      .single();

    if (platformError || !platform) {
      return { success: false, error: "Platform tidak ditemukan" };
    }

    if (!platform.is_available) {
      return { success: false, error: "Platform sedang tidak tersedia" };
    }

    // Create the new connection
    const newConnection: SocialConnectionInsert = {
      business_id: businessId,
      platform_id: platformId,
      access_token: input.access_token,
      refresh_token: input.refresh_token || null,
      token_expires_at: input.token_expires_at || null,
      platform_account_id: input.platform_account_id || null,
      platform_account_name: input.platform_account_name || null,
      platform_account_url: input.platform_account_url || null,
      status: "active",
      auto_post_enabled: input.settings?.autoPostEnabled ?? null,
      metadata: input.settings ? { ...input.settings } : null,
    };

    const { data, error } = await (supabase as any)
      .from("business_social_connections")
      .insert(newConnection as unknown as SocialConnectionInsert)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal menghubungkan platform: ${error.message}`,
      };
    }

    return { success: true, data: data as BusinessSocialConnection };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat menghubungkan platform",
    };
  }
}

/**
 * Disconnect a business's social platform account
 * Sets the connection status to 'revoked'
 */
export async function disconnectSocialPlatform(
  connectionId: string,
  businessId: string,
): Promise<SocialConnectionResult> {
  try {
    const supabase = await createClient();

    // Verify the connection belongs to the business
    const { data: connection, error: fetchError } = await supabase
      .from("business_social_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !connection) {
      return { success: false, error: "Koneksi tidak ditemukan" };
    }

    const connectionData = connection as SocialConnectionRow;

    if (connectionData.status === "disconnected") {
      return { success: false, error: "Koneksi sudah diputus" };
    }

    // Update the connection status to revoked
    const { data, error } = await (
      supabase.from("business_social_connections") as any
    )
      .update({ status: "disconnected" })
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal memutus koneksi: ${error.message}`,
      };
    }

    return { success: true, data: data as BusinessSocialConnection };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat memutus koneksi" };
  }
}

/**
 * Get all social connections for a specific business
 * Returns connections with platform details
 */
export async function getSocialConnections(
  businessId: string,
  filters?: {
    platform_id?: string;
    status?: ConnectionStatus;
  },
): Promise<SocialConnectionListResult> {
  try {
    const supabase = await createClient();

    let query = (supabase as any)
      .from("business_social_connections")
      .select(
        `
        *,
        social_platforms (
          id,
          platform_name,
          platform_type,
          description,
          is_available,
          status
        )
      `,
      )
      .eq("business_id", businessId);

    if (filters?.platform_id) {
      query = query.eq("platform_id", filters.platform_id);
    }

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return { success: false, error: error.message, data: undefined };
    }

    // Transform the data to include platform as a nested object
    const connections = data?.map((row: Record<string, unknown>) => ({
      ...row,
      platform: row.social_platforms,
    })) as BusinessSocialConnectionWithPlatform[];

    return { success: true, data: connections, total: connections?.length };
  } catch (error) {
    return {
      success: false,
      error: "Gagal mengambil data koneksi social",
      data: undefined,
    };
  }
}

/**
 * Get a single social connection by ID
 */
export async function getSocialConnection(
  connectionId: string,
  businessId: string,
): Promise<SocialConnectionResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("business_social_connections")
      .select(
        `
        *,
        social_platforms (
          id,
          platform_name,
          platform_type,
          description,
          is_available,
          status
        )
      `,
      )
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .single();

    if (error || !data) {
      return { success: false, error: "Koneksi tidak ditemukan" };
    }

    const connection = {
      ...data,
      platform: (data as Record<string, unknown>).social_platforms,
    } as BusinessSocialConnectionWithPlatform;

    return { success: true, data: connection as unknown as BusinessSocialConnection };
  } catch (error) {
    return { success: false, error: "Gagal mengambil data koneksi" };
  }
}

/**
 * Update connection error status
 * Used to track and increment error counts when API calls fail
 */
export async function updateConnectionError(
  connectionId: string,
  businessId: string,
  errorMessage: string,
  errorCode?: string,
): Promise<SocialConnectionResult> {
  try {
    const supabase = await createClient();

    // First get the current connection to check error count
    const { data: current, error: fetchError } = await supabase
      .from("business_social_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !current) {
      return { success: false, error: "Koneksi tidak ditemukan" };
    }

    const currentData = current as SocialConnectionRow;
    const currentMeta = (currentData.metadata as Record<string, unknown>) || {};
    const newErrorCount = ((currentMeta.error_count as number) || 0) + 1;

    // Update error tracking in metadata
    const { data, error } = await (supabase as any)
      .from("business_social_connections")
      .update({
        metadata: {
          ...currentMeta,
          error_count: newErrorCount,
          last_error: errorMessage,
          last_error_at: new Date().toISOString(),
        } as Record<string, unknown>,
        status: newErrorCount >= 5 ? "disconnected" : currentData.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal mengupdate status error: ${error.message}`,
      };
    }

    return { success: true, data: data as BusinessSocialConnection };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengupdate status error",
    };
  }
}

/**
 * Update connection's last used timestamp
 * Called when a connection is successfully used for posting
 */
export async function updateConnectionLastUsed(
  connectionId: string,
  businessId: string,
): Promise<SocialConnectionResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("business_social_connections")
      .update({
        last_posted_at: new Date().toISOString(),
        metadata: {
          error_count: 0,
          last_error: null,
          last_error_at: null,
          last_used_at: new Date().toISOString(),
        } as Record<string, unknown>,
      })
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal mengupdate timestamp: ${error.message}`,
      };
    }

    return { success: true, data: data as BusinessSocialConnection };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengupdate timestamp",
    };
  }
}

/**
 * Update platform settings for a business connection
 * Updates the settings JSONB field with auto-post preferences
 */
export async function updatePlatformSettings(
  connectionId: string,
  businessId: string,
  settings: {
    autoPostEnabled?: boolean;
    defaultPostTiming?: "immediate" | "scheduled";
    scheduledTime?: string;
    customFormatting?: boolean;
    hashtags?: string[];
  },
): Promise<SocialConnectionResult> {
  try {
    const supabase = await createClient();

    // Verify the connection belongs to the business
    const { data: connection, error: fetchError } = await supabase
      .from("business_social_connections")
      .select("id, metadata, status")
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !connection) {
      return { success: false, error: "Koneksi tidak ditemukan" };
    }

    const connectionData = connection as SocialConnectionRow;
    const currentMeta =
      (connectionData.metadata as Record<string, unknown>) || {};

    // Merge settings
    const updatedMeta = {
      ...currentMeta,
      ...settings,
    };

    // Update the connection settings
    const { data, error } = await (supabase as any)
      .from("business_social_connections")
      .update({
        metadata: updatedMeta as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal mengupdate pengaturan: ${error.message}`,
      };
    }

    return { success: true, data: data as BusinessSocialConnection };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengupdate pengaturan",
    };
  }
}

/**
 * Get platform settings for a business connection
 * Returns the settings JSONB field
 */
export async function getPlatformSettings(
  connectionId: string,
  businessId: string,
): Promise<{
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("business_social_connections")
      .select("metadata")
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .single();

    if (error || !data) {
      return { success: false, error: "Koneksi tidak ditemukan" };
    }

    const settings =
      (data as { metadata: Record<string, unknown> | null }).metadata || {};

    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: "Gagal mengambil pengaturan" };
  }
}
