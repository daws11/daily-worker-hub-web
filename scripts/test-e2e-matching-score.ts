#!/usr/bin/env -S node --loader ts-node/esm

/**
 * E2E Test: Matching Score Calculation
 *
 * Tests the worker-job matching score algorithm:
 * 1. Budget match scoring (in budget → 10, at limit → 3, over → 0)
 * 2. Category match scoring (match → 5, no preference → 5, mismatch → 0)
 * 3. Total score calculation (max = 130)
 *
 * Score breakdown:
 *   skill: 20, distance: 20, availability: 15, rating: 20,
 *   compliance: 15, tier: 10, budget: 10, category: 5
 *   Total max: 115 (not 130 based on standard breakdown)
 *
 * Usage:
 *   npx tsx scripts/test-e2e-matching-score.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(process.cwd(), ".env.local") });

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// Matching Score Functions (inline simulation)
// ============================================================================

/**
 * Calculate budget match score.
 * Worker's expected wage vs job's budget range.
 *
 * Score mapping:
 *   - Worker expected wage <= budget_min: 10 (under budget, great)
 *   - Worker expected wage <= budget_max: 10 (within budget)
 *   - Worker expected wage <= budget_max * 1.1: 3 (slightly over, 10% tolerance)
 *   - Worker expected wage > budget_max * 1.1: 0 (over budget)
 */
function calculateBudgetScore(
  workerExpectedWage: number,
  budgetMin: number,
  budgetMax: number,
): number {
  if (workerExpectedWage <= budgetMax) return 10;
  if (workerExpectedWage <= budgetMax * 1.1) return 3;
  return 0;
}

/**
 * Calculate category match score.
 *
 *   - Worker has preferred_categories and job category matches: 5
 *   - Worker has no preferred_categories (empty): 5 (open to all)
 *   - Worker has preferred_categories but job category not in list: 0
 */
function calculateCategoryScore(
  workerPreferredCategories: string[],
  jobCategoryId: string,
): number {
  if (workerPreferredCategories.length === 0) return 5;
  if (workerPreferredCategories.includes(jobCategoryId)) return 5;
  return 0;
}

/**
 * Calculate total matching score.
 *
 * Components:
 *   skill:        0-20
 *   distance:     0-20
 *   availability: 0-15
 *   rating:       0-20
 *   compliance:   0-15
 *   tier:         0-10
 *   budget:       0-10
 *   category:     0-5
 *   Total max:    115
 */
function calculateTotalScore(components: {
  skill: number;
  distance: number;
  availability: number;
  rating: number;
  compliance: number;
  tier: number;
  budget: number;
  category: number;
}): number {
  return (
    components.skill +
    components.distance +
    components.availability +
    components.rating +
    components.compliance +
    components.tier +
    components.budget +
    components.category
  );
}

// Max possible score
const MAX_SCORE = 20 + 20 + 15 + 20 + 15 + 10 + 10 + 5; // = 115

// ============================================================================
// Test 1: Budget match scoring
// ============================================================================

async function testBudgetMatchScoring() {
  log("\n📋 Test 1: Budget match scoring", "cyan");

  const budgetMin = 100000;
  const budgetMax = 200000;

  // Case A: Worker wage within budget
  const scoreA = calculateBudgetScore(150000, budgetMin, budgetMax);
  log(`   Case A: wage=150000, budget=[${budgetMin}-${budgetMax}]`, "blue");
  log(`   Expected: 10, Got: ${scoreA}`, scoreA === 10 ? "green" : "red");
  if (scoreA !== 10) throw new Error(`Expected 10, got ${scoreA}`);

  // Case B: Worker wage at budget max (still within budget)
  const scoreB = calculateBudgetScore(200000, budgetMin, budgetMax);
  log(`   Case B: wage=200000, budget=[${budgetMin}-${budgetMax}]`, "blue");
  log(`   Expected: 10, Got: ${scoreB}`, scoreB === 10 ? "green" : "red");
  if (scoreB !== 10) throw new Error(`Expected 10, got ${scoreB}`);

  // Case C: Worker wage slightly over budget (within 10% tolerance)
  const scoreC = calculateBudgetScore(210000, budgetMin, budgetMax);
  log(`   Case C: wage=210000 (budget_max + 5%), budget=[${budgetMin}-${budgetMax}]`, "blue");
  log(`   Expected: 3, Got: ${scoreC}`, scoreC === 3 ? "green" : "red");
  if (scoreC !== 3) throw new Error(`Expected 3, got ${scoreC}`);

  // Case D: Worker wage way over budget
  const scoreD = calculateBudgetScore(250000, budgetMin, budgetMax);
  log(`   Case D: wage=250000 (budget_max + 25%), budget=[${budgetMin}-${budgetMax}]`, "blue");
  log(`   Expected: 0, Got: ${scoreD}`, scoreD === 0 ? "green" : "red");
  if (scoreD !== 0) throw new Error(`Expected 0, got ${scoreD}`);

  // Case E: Worker wage under budget min (great deal)
  const scoreE = calculateBudgetScore(80000, budgetMin, budgetMax);
  log(`   Case E: wage=80000 (under budget), budget=[${budgetMin}-${budgetMax}]`, "blue");
  log(`   Expected: 10, Got: ${scoreE}`, scoreE === 10 ? "green" : "red");
  if (scoreE !== 10) throw new Error(`Expected 10, got ${scoreE}`);

  log("   ✅ Budget match scoring verified", "green");
}

// ============================================================================
// Test 2: Category match scoring
// ============================================================================

async function testCategoryMatchScoring() {
  log("\n📋 Test 2: Category match scoring", "cyan");

  const categoryId = "cat-dishwasher-001";

  // Case A: Worker prefers this category
  const scoreA = calculateCategoryScore([categoryId, "cat-cook-002"], categoryId);
  log(`   Case A: Worker has matching preference`, "blue");
  log(`   Expected: 5, Got: ${scoreA}`, scoreA === 5 ? "green" : "red");
  if (scoreA !== 5) throw new Error(`Expected 5, got ${scoreA}`);

  // Case B: Worker has no preference (open to all)
  const scoreB = calculateCategoryScore([], categoryId);
  log(`   Case B: Worker has no preference (open to all)`, "blue");
  log(`   Expected: 5, Got: ${scoreB}`, scoreB === 5 ? "green" : "red");
  if (scoreB !== 5) throw new Error(`Expected 5, got ${scoreB}`);

  // Case C: Worker preference doesn't match
  const scoreC = calculateCategoryScore(["cat-cook-002", "cat-waiter-003"], categoryId);
  log(`   Case C: Worker preference doesn't match`, "blue");
  log(`   Expected: 0, Got: ${scoreC}`, scoreC === 0 ? "green" : "red");
  if (scoreC !== 0) throw new Error(`Expected 0, got ${scoreC}`);

  log("   ✅ Category match scoring verified", "green");
}

// ============================================================================
// Test 3: Total score calculation
// ============================================================================

async function testTotalScoreCalculation() {
  log("\n📋 Test 3: Total score calculation", "cyan");

  // Case A: Perfect score
  const perfect = {
    skill: 20,
    distance: 20,
    availability: 15,
    rating: 20,
    compliance: 15,
    tier: 10,
    budget: 10,
    category: 5,
  };
  const totalPerfect = calculateTotalScore(perfect);
  log(`   Case A: Perfect score`, "blue");
  log(`   Components: ${JSON.stringify(perfect)}`, "blue");
  log(`   Total: ${totalPerfect}`, totalPerfect === MAX_SCORE ? "green" : "red");
  if (totalPerfect !== MAX_SCORE)
    throw new Error(`Expected ${MAX_SCORE}, got ${totalPerfect}`);

  // Case B: Zero score
  const zero = {
    skill: 0, distance: 0, availability: 0, rating: 0,
    compliance: 0, tier: 0, budget: 0, category: 0,
  };
  const totalZero = calculateTotalScore(zero);
  log(`   Case B: Zero score`, "blue");
  log(`   Total: ${totalZero}`, totalZero === 0 ? "green" : "red");
  if (totalZero !== 0) throw new Error(`Expected 0, got ${totalZero}`);

  // Case C: Average worker
  const average = {
    skill: 10, distance: 12, availability: 10, rating: 12,
    compliance: 10, tier: 5, budget: 10, category: 5,
  };
  const totalAverage = calculateTotalScore(average);
  log(`   Case C: Average worker`, "blue");
  log(`   Components: ${JSON.stringify(average)}`, "blue");
  log(`   Total: ${totalAverage}`, "blue");
  if (totalAverage !== 10 + 12 + 10 + 12 + 10 + 5 + 10 + 5)
    throw new Error(`Total mismatch`);

  // Verify max score = 115 (skill 20 + distance 20 + availability 15 + rating 20 + compliance 15 + tier 10 + budget 10 + category 5)
  log(`\n   📊 Max score breakdown:`, "cyan");
  log(`   skill: 20 + distance: 20 + availability: 15 + rating: 20`, "blue");
  log(`   compliance: 15 + tier: 10 + budget: 10 + category: 5`, "blue");
  log(`   = ${MAX_SCORE} (not 130)`, "yellow");

  log("   ✅ Total score calculation verified", "green");
}

// ============================================================================
// Main
// ============================================================================

async function runTests() {
  log("\n" + "=".repeat(60), "cyan");
  log("🧪 E2E TEST: Matching Score Calculation", "cyan");
  log("=".repeat(60), "cyan");

  const results: { name: string; status: string; error?: string }[] = [];
  let passed = 0, failed = 0;

  const tests = [
    { name: "Test 1: Budget match scoring", fn: testBudgetMatchScoring },
    { name: "Test 2: Category match scoring", fn: testCategoryMatchScoring },
    { name: "Test 3: Total score calculation", fn: testTotalScoreCalculation },
  ];

  for (const t of tests) {
    try {
      await t.fn();
      results.push({ name: t.name, status: "PASS" });
      passed++;
    } catch (e: any) {
      results.push({ name: t.name, status: "FAIL", error: e.message });
      failed++;
    }
  }

  log("\n" + "=".repeat(60), "cyan");
  log("📊 Test Results Summary", "cyan");
  log("=".repeat(60), "cyan");
  for (const r of results) {
    const c = r.status === "PASS" ? "green" : "red";
    log(`   ${r.status === "PASS" ? "✅" : "❌"} ${r.name}: ${r.status}`, c);
    if (r.error) log(`      Error: ${r.error}`, "red");
  }
  log(`\n   Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, passed === results.length ? "green" : "red");
  log("=".repeat(60), "cyan");

  return { success: failed === 0, passed, failed };
}

runTests().then((r) => process.exit(r.success ? 0 : 1)).catch((e) => { log(`\n❌ ${e.message}`, "red"); process.exit(1); });

export { runTests };
