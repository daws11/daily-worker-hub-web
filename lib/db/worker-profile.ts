import { supabase } from '../supabase/client'
import { Database } from '../supabase/types'

type WorkerProfile = Database['public']['Tables']['workers']['Row']
type WorkerInsert = Database['public']['Tables']['workers']['Insert']
type WorkerUpdate = Database['public']['Tables']['workers']['Update']
type KycVerification = Database['public']['Tables']['kyc_verifications']['Row']
type KycVerificationInsert = Database['public']['Tables']['kyc_verifications']['Insert']
type WorkerSkillInsert = Database['public']['Tables']['worker_skills']['Insert']

/**
 * Get worker profile by user ID
 */
export async function getWorkerProfile(userId: string) {
  const { data, error } = await supabase
    .from('workers')
    .select(`
      *,
      worker_skills (
        skill_id,
        skills (
          id,
          name,
          slug
        )
      )
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Create a new worker profile
 */
export async function createWorkerProfile(
  userId: string,
  profile: Omit<WorkerInsert, 'user_id' | 'kyc_status' | 'reliability_score'>
) {
  const { data, error } = await supabase
    .from('workers')
    .insert({
      user_id: userId,
      kyc_status: 'unverified',
      reliability_score: 0,
      ...profile,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Update existing worker profile
 */
export async function updateWorkerProfile(
  workerId: string,
  updates: WorkerUpdate
) {
  const { data, error } = await supabase
    .from('workers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workerId)
    .select()
    .single()

  if (error) {
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Submit KYC verification
 */
export async function submitKycVerification(kycData: {
  workerId: string
  ktpNumber: string
  ktpImageUrl: string
  selfieImageUrl: string
  ktpExtractedData?: KycVerificationInsert['ktp_extracted_data']
}) {
  // First, update worker's KYC status to pending
  const { error: updateError } = await supabase
    .from('workers')
    .update({
      kyc_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', kycData.workerId)

  if (updateError) {
    return { data: null, error: updateError }
  }

  // Then insert KYC verification record
  const { data, error } = await supabase
    .from('kyc_verifications')
    .insert({
      worker_id: kycData.workerId,
      ktp_number: kycData.ktpNumber,
      ktp_image_url: kycData.ktpImageUrl,
      selfie_image_url: kycData.selfieImageUrl,
      ktp_extracted_data: kycData.ktpExtractedData || null,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Link skills to a worker (replaces all existing skills)
 */
export async function linkWorkerSkills(
  workerId: string,
  skillIds: string[]
) {
  // First, delete existing skills for this worker
  const { error: deleteError } = await supabase
    .from('worker_skills')
    .delete()
    .eq('worker_id', workerId)

  if (deleteError) {
    return { data: null, error: deleteError }
  }

  // If no skills to add, return success
  if (skillIds.length === 0) {
    return { data: [], error: null }
  }

  // Insert new skill links
  const insertData: WorkerSkillInsert[] = skillIds.map((skillId) => ({
    worker_id: workerId,
    skill_id: skillId,
  }))

  const { data, error } = await supabase
    .from('worker_skills')
    .insert(insertData)
    .select()

  if (error) {
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get worker profile with KYC verification details
 */
export async function getWorkerProfileWithKyc(userId: string) {
  const { data, error } = await supabase
    .from('workers')
    .select(`
      *,
      worker_skills (
        skill_id,
        skills (
          id,
          name,
          slug
        )
      ),
      kyc_verifications (
        id,
        ktp_number,
        ktp_image_url,
        selfie_image_url,
        ktp_extracted_data,
        status,
        rejection_reason,
        submitted_at,
        verified_at,
        verified_by
      )
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get KYC verification status for a worker
 */
export async function getKycStatus(workerId: string) {
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('worker_id', workerId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  return { data, error: null }
}
