"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import type {
  BusinessSocialConnection,
  BusinessSocialConnectionWithPlatform,
  CreateConnectionInput,
  ConnectionStatus,
} from "../types/social";

type SocialConnectionRow =
  Database["public"]["Tables"]["business_social_connections"]["Row"];
type SocialConnectionInsert =
  Database["public"]["Tables"]["business_social_connections"]["Insert"];
type SocialConnectionUpdate =
  Database["public"]["Tables"]["business_social_connections"]["Update"] & {
    scopes?: string | null;
    settings?: Record<string, unknown> | null;
    platform_page_id?: string | null;
    platform_account_url?: string | null;
    last_error?: string | null;
    last_error_at?: string | null;
    last_verified_at?: string | null;
    last_used_at?: string | null;
    error_count?: number;
  };

/** Extended Update type including settings field */
type SocialConnectionUpdateExt = SocialConnectionUpdate & {
  settings?: Record<string, unknown> | null;
};

/** Extended Row type for fields not in the generated schema */
type SocialConnectionRowExt = SocialConnectionRow & {
  scopes?: string | null;
  settings?: Record<string, unknown> | null;
  platform_page_id?: string | null;
  error_count?: number | null;
  last_error?: string | null;
  last_error_at?: string | null;
  last_verified_at?: string | null;
  last_used_at?: string | null;
};

/** Extended Insert type for fields not in the generated schema */
type SocialConnectionInsertExt = SocialConnectionInsert & {
  scopes?: string | null;
  settings?: Record<string, unknown> | null;
  platform_page_id?: string | null;
  error_count?: number;
  last_verified_at?: string;
};

/** Extended select type for specific column selects */
type SocialConnectionSelectExt = {
  id: string;
  settings?: Record<string, unknown> | null;
  status: Database["public"]["Enums"]["connection_status"];
};

export type SocialConnectionResult = {
  success: boolean;
  error?: string;
  data?: BusinessSocialConnection;
};

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
    const extra = input as unknown as Record<string, unknown>;

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
        const updateData: SocialConnectionUpdate = {
          access_token: input.access_token,
          refresh_token: input.refresh_token || null,
          token_expires_at: input.token_expires_at || null,
          platform_account_id: input.platform_account_id || null,
          platform_account_name: input.platform_account_name || null,
          platform_account_url: input.platform_account_url || null,
          platform_page_id: (extra.platform_page_id as string | null) || null,
          scopes: (extra.scopes as string | null) || null,
          settings: (extra.settings as Record<string, unknown> | null) || null,
          status: "active",
          error_count: 0,
          last_error: null,
          last_error_at: null,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("business_social_connections")
          .update(updateData)
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
    const newConnection: SocialConnectionInsertExt = {
      business_id: businessId,
      platform_id: platformId,
      access_token: input.access_token,
      refresh_token: input.refresh_token || null,
      token_expires_at: input.token_expires_at || null,
      platform_account_id: input.platform_account_id || null,
      platform_account_name: input.platform_account_name || null,
      platform_account_url: input.platform_account_url || null,
      platform_page_id: (extra.platform_page_id as string | null) || null,
      scopes: (extra.scopes as string | null) || null,
      settings: (extra.settings as Record<string, unknown> | null) || null,
      status: "active",
      error_count: 0,
      last_verified_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
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

    // Update the connection status to disconnected
    const { data, error } = await supabase
      .from("business_social_connections")
      .update({ status: "disconnected" } as SocialConnectionUpdate)
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

    let query = supabase
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
    const connections = data?.map((row: any) => ({
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
      // @ts-ignore – join result type not generated by Supabase
      platform: (data as Record<string, unknown>).social_platforms,
    } as BusinessSocialConnectionWithPlatform;

    return { success: true, data: connection };
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

    const currentData = current as SocialConnectionRowExt;
    const newErrorCount = (currentData.error_count || 0) + 1;

    // Update error tracking
    const { data, error } = await supabase
      .from("business_social_connections")
      .update({
        error_count: newErrorCount,
        last_error: errorMessage,
        last_error_at: new Date().toISOString(),
        status: newErrorCount >= 5 ? "expired" : currentData.status,
      } as SocialConnectionUpdate)
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

    const { data, error } = await supabase
      .from("business_social_connections")
      .update({
        last_used_at: new Date().toISOString(),
        error_count: 0,
        last_error: null,
        last_error_at: null,
      } as SocialConnectionUpdate)
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
      .select("id, settings, status")
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !connection) {
      return { success: false, error: "Koneksi tidak ditemukan" };
    }

    const connectionData = connection as unknown as SocialConnectionSelectExt;
    const currentSettings =
      (connectionData.settings as Record<string, unknown> | undefined) || {};

    // Merge settings
    const updatedSettings = {
      ...currentSettings,
      ...settings,
    };

    // Update the connection settings
    const updateData: SocialConnectionUpdateExt = {
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("business_social_connections")
      .update(updateData)
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
      .select("settings")
      .eq("id", connectionId)
      .eq("business_id", businessId)
      .single();

    if (error || !data) {
      return { success: false, error: "Koneksi tidak ditemukan" };
    }

    const settings =
      (data as unknown as { settings: Record<string, unknown> | null }).settings || {};

    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: "Gagal mengambil pengaturan" };
  }
}
