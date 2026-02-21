import { supabase } from './client'

const AVATARS_BUCKET = 'avatars'
const BUSINESS_LICENSES_BUCKET = 'business-licenses'

export async function uploadAvatar(
  userId: string,
  file: File,
  currentUrl?: string
): Promise<{ url: string; error?: string }> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: '', error: 'File must be an image' }
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { url: '', error: 'File size must be less than 5MB' }
    }

    // Delete old avatar if exists
    if (currentUrl) {
      const oldPath = currentUrl.split(`/`).pop()
      if (oldPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([oldPath])
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    // Upload new file
    const { data, error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      return { url: '', error: error.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(data.path)

    return { url: publicUrl }
  } catch (error) {
    return {
      url: '',
      error: error instanceof Error ? error.message : 'Failed to upload avatar',
    }
  }
}

export async function uploadBusinessLicense(
  businessId: string,
  file: File,
  currentUrl?: string
): Promise<{ url: string; error?: string }> {
  try {
    // Validate file type (PDF or images)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return { url: '', error: 'File must be PDF or image (JPEG, PNG)' }
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return { url: '', error: 'File size must be less than 10MB' }
    }

    // Delete old license if exists
    if (currentUrl) {
      const oldPath = currentUrl.split(`/`).pop()
      if (oldPath) {
        await supabase.storage.from(BUSINESS_LICENSES_BUCKET).remove([oldPath])
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${businessId}/${Date.now()}.${fileExt}`

    // Upload new file
    const { data, error } = await supabase.storage
      .from(BUSINESS_LICENSES_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      return { url: '', error: error.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUSINESS_LICENSES_BUCKET).getPublicUrl(data.path)

    return { url: publicUrl }
  } catch (error) {
    return {
      url: '',
      error:
        error instanceof Error ? error.message : 'Failed to upload business license',
    }
  }
}

export async function deleteAvatar(url: string): Promise<{ error?: string }> {
  try {
    const path = url.split(`/`).pop()
    if (!path) {
      return { error: 'Invalid URL' }
    }

    const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([path])

    if (error) {
      return { error: error.message }
    }

    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to delete avatar',
    }
  }
}

export async function deleteBusinessLicense(
  url: string
): Promise<{ error?: string }> {
  try {
    const path = url.split(`/`).pop()
    if (!path) {
      return { error: 'Invalid URL' }
    }

    const { error } = await supabase.storage
      .from(BUSINESS_LICENSES_BUCKET)
      .remove([path])

    if (error) {
      return { error: error.message }
    }

    return {}
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to delete business license',
    }
  }
}
