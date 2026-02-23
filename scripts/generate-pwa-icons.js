#!/usr/bin/env node

/**
 * Generate PWA icons for Daily Worker Hub
 * Creates icons in multiple sizes using ImageMagick
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const THEME_COLOR = '#0ea5e9'; // Sky blue from manifest
const BG_COLOR = '#ffffff';
const TEXT_COLOR = '#0ea5e9';
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

/**
 * Generate an icon with rounded background and DWH text
 */
function generateIcon(size, outputPath) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.45; // 90% of half size
  const fontSize = Math.floor(size * 0.35);

  const command = `convert -size ${size}x${size} xc:none \
    -fill "${THEME_COLOR}" \
    -draw "circle ${centerX},${centerY} ${centerX},$(echo "${centerX} - ${radius}" | bc)" \
    -fill white \
    -font Helvetica-Bold \
    -pointsize ${fontSize} \
    -gravity center \
    -annotate 0 "DWH" \
    "${outputPath}"`;

  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ Generated: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to generate: ${outputPath}`);
    console.error(error.message);
    return false;
  }
}

/**
 * Generate Apple Touch Icon with different design (solid background)
 */
function generateAppleTouchIcon(size, outputPath) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.2; // Squircle-like corners
  const fontSize = Math.floor(size * 0.25);

  const command = `convert -size ${size}x${size} xc:"${THEME_COLOR}" \
    -fill white \
    -font Helvetica-Bold \
    -pointsize ${fontSize} \
    -gravity center \
    -annotate 0 "DWH" \
    "${outputPath}"`;

  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ Generated: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to generate: ${outputPath}`);
    console.error(error.message);
    return false;
  }
}

/**
 * Generate favicon.ico with multiple sizes embedded
 */
function generateFavicon(outputPath) {
  // Generate temporary PNGs for favicon
  const temp16 = path.join(ICONS_DIR, 'temp-16.png');
  const temp32 = path.join(ICONS_DIR, 'temp-32.png');

  // Create small versions for favicon
  const command16 = `convert -size 16x16 xc:"${THEME_COLOR}" -fill white -font Helvetica -pointsize 8 -gravity center -annotate 0 "D" "${temp16}"`;
  const command32 = `convert -size 32x32 xc:"${THEME_COLOR}" -fill white -font Helvetica-Bold -pointsize 16 -gravity center -annotate 0 "D" "${temp32}"`;

  try {
    execSync(command16, { stdio: 'inherit' });
    execSync(command32, { stdio: 'inherit' });

    // Combine into ICO
    const icoCommand = `convert "${temp16}" "${temp32}" "${outputPath}"`;
    execSync(icoCommand, { stdio: 'inherit' });

    // Clean up temp files
    fs.unlinkSync(temp16);
    fs.unlinkSync(temp32);

    console.log(`✓ Generated: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to generate: ${outputPath}`);
    console.error(error.message);
    // Clean up on error
    if (fs.existsSync(temp16)) fs.unlinkSync(temp16);
    if (fs.existsSync(temp32)) fs.unlinkSync(temp32);
    return false;
  }
}

// Main execution
console.log('🎨 Generating PWA icons for Daily Worker Hub...\n');

const results = [];

// Generate standard PWA icons
results.push(generateIcon(192, path.join(ICONS_DIR, 'icon-192x192.png')));
results.push(generateIcon(512, path.join(ICONS_DIR, 'icon-512x512.png')));

// Generate Apple Touch Icon
results.push(generateAppleTouchIcon(180, path.join(ICONS_DIR, 'apple-touch-icon.png')));

// Generate Favicon
results.push(generateFavicon(path.join(ICONS_DIR, 'favicon.ico')));

// Summary
console.log('\n' + '='.repeat(50));
const allSuccess = results.every(r => r === true);
if (allSuccess) {
  console.log('✅ All icons generated successfully!');
  process.exit(0);
} else {
  console.log('⚠️  Some icons failed to generate. Please check ImageMagick installation.');
  process.exit(1);
}
