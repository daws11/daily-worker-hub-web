#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

const TRANSLATIONS_DIR = path.join(process.cwd(), "lib/i18n/locales");
const COMPONENTS_DIR = path.join(process.cwd(), "components");
const APPS_DIR = path.join(process.cwd(), "app");

interface TranslationKeys {
  [namespace: string]: {
    [key: string]: string | TranslationKeys;
  };
}

function loadTranslationFile(locale: string): TranslationKeys {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Translation file not found: ${filePath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function flattenKeys(obj: TranslationKeys, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nestedKeys = flattenKeys(value as TranslationKeys, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
}

function isValidTranslationKey(key: string): boolean {
  if (!key || key.length < 2) return false;

  if (key.startsWith("/") || key.startsWith("./") || key.startsWith("@/")) return false;

  if (key.startsWith("@")) return false;

  if (key.includes(",") && (key.includes("_") || key.includes(" "))) return false;

  if (/^[a-zA-Z0-9_-]+$/.test(key) && !key.includes(".")) return false;

  if (key.includes("\\n") || key.includes("\\t")) return false;

  if (/^[A-Z_][A-Z_0-9]*$/.test(key)) return false;

  if (key.startsWith("X-") || key.startsWith("x-")) return false;

  if (key.includes(" ") && key.split(" ").length > 3) return false;

  return true;
}

function extractTranslationKeysFromFile(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, "utf-8");
  const keys = new Set<string>();

  const tCallRegex = /t\s*\(\s*["']([^"']+)["']\s*(?:,\s*\{[^}]*\})?\s*\)/g;
  let match;

  while ((match = tCallRegex.exec(content)) !== null) {
    const key = match[1];
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }

  return keys;
}

function extractTranslationKeysFromDir(dir: string): Set<string> {
  const keys = new Set<string>();
  const pattern = path.join(dir, "**/*.{ts,tsx}");

  const files = glob.sync(pattern, {
    ignore: ["**/node_modules/**", "**/*.d.ts", "**/i18n/**"],
  });

  for (const file of files) {
    const fileKeys = extractTranslationKeysFromFile(file);
    fileKeys.forEach((k) => keys.add(k));
  }

  return keys;
}

function reportMissingKeys(
  usedKeys: Set<string>,
  availableKeys: Set<string>,
  locale: string
): { missing: string[]; unused: string[] } {
  const missing: string[] = [];
  const unused: string[] = [];

  for (const key of usedKeys) {
    if (!availableKeys.has(key)) {
      missing.push(key);
    }
  }

  for (const key of availableKeys) {
    if (!usedKeys.has(key)) {
      unused.push(key);
    }
  }

  return { missing, unused };
}

function main() {
  const args = process.argv.slice(2);
  const locale = args.includes("--id") ? "id" : args.includes("--en") ? "en" : "all";
  const showUnused = args.includes("--show-unused");
  const fix = args.includes("--fix");

  console.log("\n🔍 Translation Key Linter");
  console.log("========================\n");

  const componentsKeys = extractTranslationKeysFromDir(COMPONENTS_DIR);
  const appsKeys = extractTranslationKeysFromDir(APPS_DIR);

  const usedKeys = new Set<string>();
  componentsKeys.forEach((k) => usedKeys.add(k));
  appsKeys.forEach((k) => usedKeys.add(k));

  console.log(`📁 Found ${usedKeys.size} translation keys used in components/app\n`);

  if (locale === "all" || locale === "en") {
    const enTranslations = loadTranslationFile("en");
    const enKeys = flattenKeys(enTranslations);
    const { missing, unused } = reportMissingKeys(usedKeys, enKeys, "en");

    console.log(`📄 en.json: ${enKeys.size} keys defined\n`);

    if (missing.length > 0) {
      console.log(`❌ MISSING KEYS (${missing.length}):`);
      missing.sort().forEach((key) => {
        console.log(`   - ${key}`);
      });
      console.log("");
    } else {
      console.log("✅ No missing keys in en.json\n");
    }

    if (showUnused && unused.length > 0) {
      console.log(`⚠️  UNUSED KEYS (${unused.length}):`);
      unused.sort().forEach((key) => {
        console.log(`   - ${key}`);
      });
      console.log("");
    }
  }

  if (locale === "all" || locale === "id") {
    const idTranslations = loadTranslationFile("id");
    const idKeys = flattenKeys(idTranslations);
    const { missing, unused } = reportMissingKeys(usedKeys, idKeys, "id");

    console.log(`📄 id.json: ${idKeys.size} keys defined\n`);

    if (missing.length > 0) {
      console.log(`❌ MISSING KEYS (${missing.length}):`);
      missing.sort().forEach((key) => {
        console.log(`   - ${key}`);
      });
      console.log("");
    } else {
      console.log("✅ No missing keys in id.json\n");
    }

    if (showUnused && unused.length > 0) {
      console.log(`⚠️  UNUSED KEYS (${unused.length}):`);
      unused.sort().forEach((key) => {
        console.log(`   - ${key}`);
      });
      console.log("");
    }
  }

  const enTranslations = loadTranslationFile("en");
  const enKeys = flattenKeys(enTranslations);
  const idTranslations = loadTranslationFile("id");
  const idKeys = flattenKeys(idTranslations);

  const { missing: enMissing } = reportMissingKeys(usedKeys, enKeys, "en");
  const { missing: idMissing } = reportMissingKeys(usedKeys, idKeys, "id");

  console.log("========================\n");

  if (enMissing.length > 0 || idMissing.length > 0) {
    console.log("❌ LINT FAILED: Missing translation keys detected\n");
    process.exit(1);
  } else {
    console.log("✅ LINT PASSED: All translation keys are defined\n");
    process.exit(0);
  }
}

main();
