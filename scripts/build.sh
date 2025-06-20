#!/bin/bash

# Build script for Gmail Inbox Labels Chrome Extension

set -e

echo "🚀 Building Gmail Inbox Labels Chrome Extension..."

# Function to check version consistency
check_versions() {
    local manifest_version=$(node -p "require('./manifest.json').version")
    local package_version=$(node -p "require('./package.json').version")

    if [ "$manifest_version" != "$package_version" ]; then
        echo "⚠️  Warning: Version mismatch detected!"
        echo "   manifest.json: $manifest_version"
        echo "   package.json: $package_version"
        echo ""
        echo "To fix this, run: npm run version <version>"
        echo "Example: npm run version 1.2.2"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo "✅ Version consistency check passed: $manifest_version"
    fi
}

# Check if PEM key is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide the path to your PEM key file"
    echo "Usage: ./scripts/build.sh /path/to/your/key.pem"
    exit 1
fi

PEM_KEY_PATH="$1"

# Check if PEM key file exists
if [ ! -f "$PEM_KEY_PATH" ]; then
    echo "❌ Error: PEM key file not found at $PEM_KEY_PATH"
    exit 1
fi

# Check version consistency
check_versions

# Create temporary directory
echo "📁 Creating temporary directory..."
TEMP_DIR=$(mktemp -d)
echo "   Temporary directory: $TEMP_DIR"

# Copy extension files
echo "📋 Copying extension files..."
cp manifest.json "$TEMP_DIR/"
cp content.js "$TEMP_DIR/"
cp styles.css "$TEMP_DIR/"
cp -r images "$TEMP_DIR/"

# Check if crx tool is installed
if ! command -v crx &> /dev/null; then
    echo "📦 Installing crx tool..."
    npm install -g crx
fi

# Create .crx file
echo "🔐 Creating signed .crx file..."
crx pack "$TEMP_DIR" -o gmail-inbox-labels.crx -p "$PEM_KEY_PATH"

# Create zip file for Chrome Web Store
echo "📦 Creating zip file for Chrome Web Store..."
cd "$TEMP_DIR"
zip -r ../gmail-inbox-labels.zip .
cd - > /dev/null

# Clean up
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo "✅ Build complete!"
echo "📁 Generated files:"
echo "   - gmail-inbox-labels.crx (signed extension)"
echo "   - gmail-inbox-labels.zip (for Chrome Web Store)"
