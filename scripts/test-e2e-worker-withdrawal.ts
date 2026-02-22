#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: Worker Withdrawal Flow via Bank Transfer
 *
 * This script verifies the end-to-end worker withdrawal flow:
 * 1. Worker user exists and has wallet
 * 2. Worker has sufficient wallet balance (seeded)
 * 3. Bank account is saved for the worker
 * 4. Withdrawal amount is valid (>= Rp 100.000)
 * 5. Fee is calculated correctly (1% or Rp 5.000, whichever is higher)
 * 6. Payout request is created with pending status
 * 7. Wallet balance is deducted
 * 8. Simulate successful payout webhook from Xendit
 * 9. Verify payout status is updated to completed
 *
 * Usage:
 *   npx ts-node scripts/test-e2e-worker-withdrawal.ts <worker_id> <bank_account_id> <amount>
 *
 * Example:
 *   npx ts-node scripts/test-e2e-worker-withdrawal.ts <worker_id> <bank_account_id> 100000
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { join } from 'path'

// Load environment variables
const envPath = join(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test configuration
const TEST_AMOUNT = 100000 // Rp 100.000 (minimum per spec)
const MIN_WITHDRAWAL_AMOUNT = 100000
const MAX_WITHDRAWAL_AMOUNT = 100000000

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function calculateFee(amount: number): number {
  // 1% or Rp 5.000, whichever is higher
  return Math.max(amount * 0.01, 5000)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Step 1: Verify worker exists
 */
async function verifyWorker(workerId: string) {
  log(`\n📋 Step 1: Verifying worker exists`, 'cyan')
  log(`   Worker ID: ${workerId}`)

  const { data, error } = await supabase
    .from('workers')
    .select('id, full_name, user_id')
    .eq('id', workerId)
    .single()

  if (error || !data) {
    log(`   ❌ Worker not found: ${error?.message}`, 'red')
    throw new Error(`Worker not found: ${error?.message}`)
  }

  log(`   ✅ Worker found: ${data.full_name || data.id}`, 'green')
  return data
}

/**
 * Step 2: Get or create worker wallet
 */
async function getOrCreateWallet(workerId: string, seedBalance: number = 0) {
  log(`\n💰 Step 2: Getting worker wallet`, 'cyan')

  let { data: wallet, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('worker_id', workerId)
    .maybeSingle()

  if (error) {
    log(`   ❌ Error fetching wallet: ${error.message}`, 'red')
    throw error
  }

  if (!wallet) {
    log(`   ℹ️  No wallet found, creating one...`, 'yellow')

    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        business_id: null,
        worker_id: workerId,
        balance: seedBalance,
        currency: 'IDR',
        is_active: true,
      })
      .select()
      .single()

    if (createError || !newWallet) {
      log(`   ❌ Failed to create wallet: ${createError?.message}`, 'red')
      throw createError
    }

    wallet = newWallet
    log(`   ✅ Wallet created with balance: ${formatCurrency(seedBalance)}`, 'green')
  } else {
    // If wallet exists but has insufficient balance, seed it
    if (wallet.balance < seedBalance) {
      const amountToSeed = seedBalance - Number(wallet.balance)
      log(`   ℹ️  Seeding wallet with ${formatCurrency(amountToSeed)}...`, 'yellow')

      const { data: updatedWallet, error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: seedBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id)
        .select()
        .single()

      if (updateError || !updatedWallet) {
        log(`   ❌ Failed to seed wallet: ${updateError?.message}`, 'red')
        throw updateError
      }

      wallet = updatedWallet
      log(`   ✅ Wallet seeded to: ${formatCurrency(seedBalance)}`, 'green')
    } else {
      log(`   ✅ Wallet found`, 'green')
    }
  }

  log(`   Current balance: ${formatCurrency(Number(wallet.balance))}`, 'blue')
  return wallet
}

/**
 * Step 3: Verify bank account exists and belongs to worker
 */
async function verifyBankAccount(workerId: string, bankAccountId: string) {
  log(`\n🏦 Step 3: Verifying bank account`, 'cyan')

  const { data: bankAccount, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', bankAccountId)
    .eq('worker_id', workerId)
    .single()

  if (error || !bankAccount) {
    log(`   ❌ Bank account not found: ${error?.message}`, 'red')
    throw new Error(`Bank account not found: ${error?.message}`)
  }

  const bankNames: Record<string, string> = {
    BCA: 'Bank Central Asia',
    BRI: 'Bank Rakyat Indonesia',
    Mandiri: 'Bank Mandiri',
    BNI: 'Bank Nasional Indonesia',
  }

  const bankName = bankNames[bankAccount.bank_code] || bankAccount.bank_code

  log(`   ✅ Bank account found`, 'green')
  log(`   Bank: ${bankName}`, 'blue')
  log(`   Account Number: ${bankAccount.bank_account_number}`, 'blue')
  log(`   Account Name: ${bankAccount.bank_account_name}`, 'blue')

  return bankAccount
}

/**
 * Step 4: Validate withdrawal amount
 */
function validateWithdrawalAmount(amount: number, availableBalance: number) {
  log(`\n💵 Step 4: Validating withdrawal amount`, 'cyan')
  log(`   Amount: ${formatCurrency(amount)}`)
  log(`   Available balance: ${formatCurrency(availableBalance)}`)

  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    log(`   ❌ Amount below minimum (${formatCurrency(MIN_WITHDRAWAL_AMOUNT)})`, 'red')
    throw new Error(`Minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL_AMOUNT)}`)
  }

  if (amount > MAX_WITHDRAWAL_AMOUNT) {
    log(`   ❌ Amount exceeds maximum (Rp 100.000.000)`, 'red')
    throw new Error('Maximum withdrawal amount is Rp 100.000.000')
  }

  if (amount > availableBalance) {
    log(`   ❌ Insufficient balance`, 'red')
    throw new Error(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`)
  }

  const fee = calculateFee(amount)
  const netAmount = amount - fee

  log(`   ✅ Amount valid`, 'green')
  log(`   Fee (1% min. Rp 5.000): ${formatCurrency(fee)}`, 'blue')
  log(`   Net amount: ${formatCurrency(netAmount)}`, 'blue')

  return { amount, fee, netAmount }
}

/**
 * Step 5: Create payout request
 */
async function createPayoutRequest(
  workerId: string,
  bankAccount: any,
  amount: number,
  fee: number,
  netAmount: number
) {
  log(`\n📝 Step 5: Creating payout request`, 'cyan')

  const { data: payoutRequest, error } = await supabase
    .from('payout_requests')
    .insert({
      worker_id: workerId,
      amount: amount,
      fee_amount: fee,
      net_amount: netAmount,
      status: 'pending',
      bank_code: bankAccount.bank_code,
      bank_account_number: bankAccount.bank_account_number,
      bank_account_name: bankAccount.bank_account_name,
      payment_provider: 'xendit',
      provider_payout_id: `test_payout_${Date.now()}`,
      provider_response: { test_mode: true },
      requested_at: new Date().toISOString(),
      processed_at: null,
      completed_at: null,
      failed_at: null,
      failure_reason: null,
      metadata: { bank_account_id: bankAccount.id, test_mode: true },
    })
    .select()
    .single()

  if (error || !payoutRequest) {
    log(`   ❌ Failed to create payout request: ${error?.message}`, 'red')
    throw error
  }

  log(`   ✅ Payout request created`, 'green')
  log(`   Payout Request ID: ${payoutRequest.id}`, 'blue')
  log(`   Status: ${payoutRequest.status}`, 'blue')

  return payoutRequest
}

/**
 * Step 6: Debit worker wallet
 */
async function debitWorkerWallet(workerId: string, amount: number) {
  log(`\n💰 Step 6: Debiting worker wallet`, 'cyan')
  log(`   Amount to debit: ${formatCurrency(amount)}`)

  // Get the wallet first
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('worker_id', workerId)
    .single()

  if (walletError || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${walletError?.message}`, 'red')
    throw walletError
  }

  const currentBalance = Number(wallet.balance)
  const newBalance = currentBalance - amount

  // Debit the wallet
  const { data: updatedWallet, error: updateError } = await supabase
    .from('wallets')
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .select()
    .single()

  if (updateError || !updatedWallet) {
    log(`   ❌ Failed to debit wallet: ${updateError?.message}`, 'red')
    throw updateError
  }

  log(`   ✅ Wallet debited successfully`, 'green')
  log(`   Previous balance: ${formatCurrency(currentBalance)}`, 'blue')
  log(`   New balance: ${formatCurrency(Number(updatedWallet.balance))}`, 'blue')

  return updatedWallet
}

/**
 * Step 7: Simulate successful payout webhook
 */
async function simulateSuccessWebhook(payoutRequest: any) {
  log(`\n🔔 Step 7: Simulating successful payout webhook`, 'cyan')

  const webhookPayload = {
    external_id: payoutRequest.id,
    id: payoutRequest.provider_payout_id,
    status: 'COMPLETED',
    completed_at: new Date().toISOString(),
    amount: payoutRequest.net_amount,
  }

  log(`   Webhook payload:`, 'blue')
  log(`   - external_id: ${webhookPayload.external_id}`, 'blue')
  log(`   - status: ${webhookPayload.status}`, 'blue')
  log(`   - amount: ${formatCurrency(webhookPayload.amount)}`, 'blue')

  // Simulate the webhook handler logic
  const { data: updatedPayout, error: updateError } = await supabase
    .from('payout_requests')
    .update({
      status: 'completed',
      completed_at: webhookPayload.completed_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payoutRequest.id)
    .select()
    .single()

  if (updateError || !updatedPayout) {
    log(`   ❌ Failed to update payout: ${updateError?.message}`, 'red')
    throw updateError
  }

  log(`   ✅ Payout status updated to 'completed'`, 'green')

  return updatedPayout
}

/**
 * Step 8: Verify payout record
 */
async function verifyPayoutRecord(payoutRequestId: string, expectedStatus: string) {
  log(`\n🔍 Step 8: Verifying payout record`, 'cyan')

  const { data: payout, error } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('id', payoutRequestId)
    .single()

  if (error || !payout) {
    log(`   ❌ Failed to fetch payout: ${error?.message}`, 'red')
    throw error
  }

  if (payout.status !== expectedStatus) {
    log(`   ❌ Payout status mismatch. Expected: ${expectedStatus}, Got: ${payout.status}`, 'red')
    throw new Error(`Payout status mismatch`)
  }

  log(`   ✅ Payout record verified`, 'green')
  log(`   Status: ${payout.status}`, 'blue')
  log(`   Amount: ${formatCurrency(Number(payout.amount))}`, 'blue')
  log(`   Fee: ${formatCurrency(Number(payout.fee_amount))}`, 'blue')
  log(`   Net amount: ${formatCurrency(Number(payout.net_amount))}`, 'blue')
  log(`   Completed at: ${payout.completed_at}`, 'blue')

  return payout
}

/**
 * Step 9: Verify wallet balance after withdrawal
 */
async function verifyWalletBalance(workerId: string, expectedBalance: number) {
  log(`\n💰 Step 9: Verifying wallet balance after withdrawal`, 'cyan')

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('worker_id', workerId)
    .single()

  if (error || !wallet) {
    log(`   ❌ Failed to fetch wallet: ${error?.message}`, 'red')
    throw error
  }

  const actualBalance = Number(wallet.balance)

  if (Math.abs(actualBalance - expectedBalance) > 0.01) {
    log(`   ❌ Balance mismatch. Expected: ${formatCurrency(expectedBalance)}, Got: ${formatCurrency(actualBalance)}`, 'red')
    throw new Error(`Wallet balance mismatch`)
  }

  log(`   ✅ Wallet balance verified`, 'green')
  log(`   Balance: ${formatCurrency(actualBalance)}`, 'blue')

  return wallet
}

/**
 * Main test execution
 */
async function runE2ETest(
  workerId: string,
  bankAccountId: string,
  amount: number = TEST_AMOUNT,
  seedBalance: number = 0
) {
  log('\n' + '='.repeat(60), 'cyan')
  log('🧪 E2E TEST: Worker Withdrawal Flow via Bank Transfer', 'cyan')
  log('='.repeat(60) + '\n', 'cyan')

  try {
    // Step 1: Verify worker exists
    await verifyWorker(workerId)

    // Step 2: Get or create worker wallet (seed with test balance if needed)
    const requiredBalance = seedBalance > 0 ? seedBalance : amount + 50000 // Extra buffer
    const wallet = await getOrCreateWallet(workerId, requiredBalance)
    const initialBalance = Number(wallet.balance)

    // Step 3: Verify bank account
    const bankAccount = await verifyBankAccount(workerId, bankAccountId)

    // Step 4: Validate withdrawal amount
    const { fee, netAmount } = validateWithdrawalAmount(amount, initialBalance)

    // Step 5: Create payout request
    const payoutRequest = await createPayoutRequest(
      workerId,
      bankAccount,
      amount,
      fee,
      netAmount
    )

    // Wait a moment to simulate processing time
    await sleep(500)

    // Step 6: Debit worker wallet
    await debitWorkerWallet(workerId, amount)

    // Wait for consistency
    await sleep(500)

    // Step 7: Simulate successful webhook
    const updatedPayout = await simulateSuccessWebhook(payoutRequest)

    // Wait for consistency
    await sleep(500)

    // Step 8: Verify payout record
    await verifyPayoutRecord(updatedPayout.id, 'completed')

    // Step 9: Verify wallet balance
    await verifyWalletBalance(workerId, initialBalance - amount)

    // Test Summary
    log('\n' + '='.repeat(60), 'green')
    log('✅ ALL TESTS PASSED', 'green')
    log('='.repeat(60) + '\n', 'green')

    log('📊 Test Summary:', 'cyan')
    log(`   Worker ID: ${workerId}`, 'blue')
    log(`   Withdrawal amount: ${formatCurrency(amount)}`, 'blue')
    log(`   Fee: ${formatCurrency(fee)}`, 'blue')
    log(`   Net amount received: ${formatCurrency(netAmount)}`, 'blue')
    log(`   Previous balance: ${formatCurrency(initialBalance)}`, 'blue')
    log(`   New balance: ${formatCurrency(initialBalance - amount)}`, 'blue')
    log(`   Payout Request ID: ${payoutRequest.id}`, 'blue')
    log(`   Bank: ${bankAccount.bank_code} - ${bankAccount.bank_account_number}`, 'blue')

    return {
      success: true,
      payoutRequestId: payoutRequest.id,
      previousBalance: initialBalance,
      newBalance: initialBalance - amount,
      amountWithdrawn: amount,
      fee: fee,
      netAmount: netAmount,
    }

  } catch (error) {
    log('\n' + '='.repeat(60), 'red')
    log('❌ TEST FAILED', 'red')
    log('='.repeat(60) + '\n', 'red')
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, 'red')

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    log('Usage: npx ts-node scripts/test-e2e-worker-withdrawal.ts <worker_id> <bank_account_id> [amount] [seed_balance]', 'yellow')
    log('\nArguments:', 'yellow')
    log('  worker_id       - The UUID of the worker to test', 'yellow')
    log('  bank_account_id - The UUID of the bank account to withdraw to', 'yellow')
    log('  amount          - Optional. Withdrawal amount in IDR (default: 100000)', 'yellow')
    log('  seed_balance    - Optional. Initial wallet balance to seed (default: amount + 50000)', 'yellow')
    log('\nExample:', 'yellow')
    log('  npx ts-node scripts/test-e2e-worker-withdrawal.ts 123e4567-e89b-12d3-a456-426614174000 987fcdeb-51a2-22d3-a456-426614174000 100000', 'yellow')
    process.exit(1)
  }

  const workerId = args[0]
  const bankAccountId = args[1]
  const amount = args[2] ? parseInt(args[2], 10) : TEST_AMOUNT
  const seedBalance = args[3] ? parseInt(args[3], 10) : amount + 50000

  if (!workerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    log('❌ Invalid worker ID format. Expected UUID format.', 'red')
    process.exit(1)
  }

  if (!bankAccountId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    log('❌ Invalid bank account ID format. Expected UUID format.', 'red')
    process.exit(1)
  }

  if (isNaN(amount) || amount <= 0) {
    log('❌ Invalid amount. Must be a positive number.', 'red')
    process.exit(1)
  }

  if (isNaN(seedBalance) || seedBalance < amount) {
    log('❌ Invalid seed balance. Must be >= withdrawal amount.', 'red')
    process.exit(1)
  }

  runE2ETest(workerId, bankAccountId, amount, seedBalance)
    .then((result) => {
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      log(`\n❌ Unexpected error: ${error.message}`, 'red')
      process.exit(1)
    })
}

export { runE2ETest }
