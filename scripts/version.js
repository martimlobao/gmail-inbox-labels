#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get version from command line argument or package.json
const newVersion = process.argv[2];

if (!newVersion) {
    console.error('❌ Error: Please provide a version number');
    console.log('Usage: node scripts/version.js <version>');
    console.log('Example: node scripts/version.js 1.2.2');
    process.exit(1);
}

// Validate version format (simple check)
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error('❌ Error: Version must be in format x.y.z (e.g., 1.2.2)');
    process.exit(1);
}

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const packagePath = path.join(__dirname, '..', 'package.json');

try {
    // Update manifest.json
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✅ Updated manifest.json version to ${newVersion}`);

    // Update package.json
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json version to ${newVersion}`);

    console.log(`🎉 Version ${newVersion} has been set in both files!`);
} catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
}
