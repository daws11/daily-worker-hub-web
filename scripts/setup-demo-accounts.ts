/**
 * Create demo accounts for testing
 * Run: npx tsx scripts/setup-demo-accounts.ts
 */

import { createClient } from "@supabase/supabase-js";

// Use local Supabase instance
const supabaseUrl = "http://127.0.0.1:54321";
const supabaseAnonKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const demoAccounts = [
  {
    email: "worker@demo.com",
    password: "demo123456",
    role: "worker",
    full_name: "Demo Worker",
  },
  {
    email: "business@demo.com",
    password: "demo123456",
    role: "business",
    full_name: "Demo Business",
  },
];

async function createDemoAccounts() {
  console.log("🔧 Creating demo accounts...");

  for (const account of demoAccounts) {
    console.log(`\nCreating ${account.role} account: ${account.email}`);

    try {
      // 1. Create auth user
      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            full_name: account.full_name,
            role: account.role,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          console.log(`  ⚠️  Account already exists, skipping...`);
        } else {
          console.error(
            `  ❌ Failed to create auth user:`,
            signUpError.message,
          );
        }
        continue;
      }

      if (!user) {
        console.error(`  ❌ No user created`);
        continue;
      }

      console.log(`  ✅ Auth user created: ${user.id.substring(0, 8)}...`);

      // 2. Create user profile in public.users table
      const { error: profileError } = await supabase.from("users").insert({
        id: user.id,
        email: account.email,
        full_name: account.full_name,
        role: account.role,
        phone: "",
        avatar_url: "",
      });

      if (profileError) {
        console.error(`  ❌ Failed to create profile:`, profileError.message);
      } else {
        console.log(`  ✅ Profile created`);
      }

      // 3. Create wallet (if worker or business)
      if (account.role === "worker" || account.role === "business") {
        const { error: walletError } = await supabase.from("wallets").insert({
          user_id: user.id,
          balance: 0.0,
          pending_balance: 0.0,
        });

        if (walletError) {
          console.error(`  ❌ Failed to create wallet:`, walletError.message);
        } else {
          console.log(`  ✅ Wallet created`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Unexpected error:`, error);
    }
  }

  console.log("\n✨ Demo account setup complete!");
  console.log("\nTest credentials:");
  console.log("  Worker: worker@demo.com / demo123456");
  console.log("  Business: business@demo.com / demo123456");
}

createDemoAccounts();
