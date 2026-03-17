import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
// Updated to ES256 key format (matches supabase local dev keys)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MjA4OTEwMDYyOX0.w2KSPkKSSK_TP_7RB2luvZ5Qf_ILXZBjFYjqdUNAjaN3J-aeX2LYl2Wrrzq1smdTC8rLcts6bCNYPvrXB9WS7Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createDemoAccounts() {
  console.log('🚀 Creating demo accounts...\n')

  // Demo Worker Account
  const workerEmail = 'worker@demo.com'
  const workerPassword = 'demo123456'
  
  console.log('👷 Creating worker account...')
  
  // Check if worker exists
  const { data: existingWorker } = await supabase
    .from('workers')
    .select('id, user_id')
    .limit(1)
    .single()

  if (existingWorker) {
    console.log('ℹ️  Worker already exists:', existingWorker.user_id)
  } else {
    const { data: workerUser, error: workerError } = await supabase.auth.signUp({
      email: workerEmail,
      password: workerPassword,
      emailRedirectTo: undefined
    })

    if (workerError && !workerError.message.includes('already registered')) {
      console.error('❌ Worker error:', workerError.message)
    } else if (workerUser?.user) {
      console.log('✅ Worker user created:', workerUser.user.id)
      
      // Create users entry first
      await supabase
        .from('users')
        .upsert({
          id: workerUser.user.id,
          email: workerEmail,
          full_name: 'Demo Worker',
          phone: '+6281234567890',
          role: 'worker'
        })
      
      // Create worker profile
      const { error: workerProfileError } = await supabase
        .from('workers')
        .insert({
          user_id: workerUser.user.id,
          full_name: 'Demo Worker',
          phone: '+6281234567890',
          bio: 'Demo worker for testing purposes',
          tier: 'pro',
          rating: 4.5,
          reliability_score: 4.5,
          jobs_completed: 25,
          kyc_status: 'verified'
        })
      
      if (workerProfileError) {
        console.error('❌ Worker profile error:', workerProfileError.message)
      } else {
        console.log('✅ Worker profile created')
      }
    }
  }

  // Demo Business Account
  const businessEmail = 'business@demo.com'
  const businessPassword = 'demo123456'
  
  console.log('\n🏢 Creating business account...')
  
  // Check if business exists
  const { data: existingBusiness } = await supabase
    .from('businesses')
    .select('id, user_id')
    .limit(1)
    .single()

  if (existingBusiness) {
    console.log('ℹ️  Business already exists:', existingBusiness.user_id)
  } else {
    const { data: businessUser, error: businessError } = await supabase.auth.signUp({
      email: businessEmail,
      password: businessPassword,
      emailRedirectTo: undefined
    })

    if (businessError && !businessError.message.includes('already registered')) {
      console.error('❌ Business error:', businessError.message)
    } else if (businessUser?.user) {
      console.log('✅ Business user created:', businessUser.user.id)
      
      // Create users entry first
      await supabase
        .from('users')
        .upsert({
          id: businessUser.user.id,
          email: businessEmail,
          full_name: 'Demo Business',
          phone: '+6281234567891',
          role: 'business'
        })
      
      // Create business profile
      const { error: businessProfileError } = await supabase
        .from('businesses')
        .insert({
          user_id: businessUser.user.id,
          name: 'Demo Business',
          email: businessEmail,
          phone: '+6281234567891',
          address: 'Jl. Demo No. 123, Badung, Bali',
          description: 'Demo business for testing purposes',
          verification_status: 'verified'
        })
      
      if (businessProfileError) {
        console.error('❌ Business profile error:', businessProfileError.message)
      } else {
        console.log('✅ Business profile created')
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ DEMO ACCOUNTS READY!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('👷 Worker Account:')
  console.log('   Email: worker@demo.com')
  console.log('   Password: demo123456\n')
  console.log('🏢 Business Account:')
  console.log('   Email: business@demo.com')
  console.log('   Password: demo123456\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

createDemoAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
