import { supabase } from '../supabase/client'

/**
 * Uploads a KYC document to Supabase Storage
 *
 * @param file - The file to upload (KTP image or selfie)
 * @param userId - The user ID for organizing storage paths
 * @param documentType - Type of document ('ktp' or 'selfie')
 * @returns The public URL of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadKycDocument(
  file: File,
  userId: string,
  documentType: 'ktp' | 'selfie'
): Promise<string> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit.')
  }

  // Create unique file path
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${documentType}-${timestamp}.${fileExt}`
  const filePath = `kyc-documents/${fileName}`

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload ${documentType} document: ${error.message}`)
  }

  // Create signed URL for private bucket (valid for 10 years)
  const { data: urlData, error: urlError } = await supabase.storage
    .from('kyc-documents')
    .createSignedUrl(data.path, 315360000) // 10 years in seconds

  if (urlError) {
    throw new Error(`Failed to create signed URL for ${documentType}: ${urlError.message}`)
  }

  return urlData.signedUrl
}

/**
 * Deletes a KYC document from Supabase Storage
 *
 * @param url - The public URL of the file to delete
 * @returns true if deletion was successful
 * @throws Error if deletion fails
 */
export async function deleteKycDocument(url: string): Promise<boolean> {
  // Extract file path from URL
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  const bucketIndex = pathParts.indexOf('kyc-documents')

  if (bucketIndex === -1) {
    throw new Error('Invalid KYC document URL')
  }

  const filePath = pathParts.slice(bucketIndex + 1).join('/')

  const { error } = await supabase.storage
    .from('kyc-documents')
    .remove([filePath])

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`)
  }

  return true
}
