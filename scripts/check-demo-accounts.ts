import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDemoAccounts() {
  console.log("🔍 Checking demo accounts...");

  const demoEmails = ["worker@demo.com", "business@demo.com"];

  for (const email of demoEmails) {
    console.log(`\n📧 ${email}:`);

    try {
      // Check auth user
      const {
        data: { users },
        error: authError,
      } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error(`  ❌ Auth error:`, authError.message);
        continue;
      }

      const authUser = users?.find((u: any) => u.email === email);

      if (authUser) {
        console.log(`  ✅ Auth user found: ${authUser.id.substring(0, 8)}...`);
        console.log(
          `  📝 Role in user_metadata:`,
          authUser.user_metadata?.role || "N/A",
        );
      } else {
        console.log(`  ❌ Auth user not found`);
        continue;
      }

      // Check profile in public.users
      const { data: profiles, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email);

      if (profileError) {
        console.error(`  ❌ Profile error:`, profileError.message);
      } else if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        console.log(`  ✅ Profile found:`);
        console.log(`     - ID: ${profile.id}`);
        console.log(`     - Role: ${profile.role}`);
        console.log(`     - Name: ${profile.full_name}`);
      } else {
        console.log(`  ⚠️  No profile in public.users`);
      }
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }
}

checkDemoAccounts();
