#!/bin/bash

# Build script for Gmail Inbox Labels Chrome Extension

set -e

echo "🚀 Building Gmail Inbox Labels Chrome Extension..."

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

# Create temporary directory
echo "📁 Creating temporary directory..."
rm -rf temp-extension
mkdir -p temp-extension

# Copy extension files
echo "📋 Copying extension files..."
cp manifest.json temp-extension/
cp content.js temp-extension/
cp styles.css temp-extension/
cp -r images temp-extension/

# Check if crx tool is installed
if ! command -v crx &> /dev/null; then
    echo "📦 Installing crx tool..."
    npm install -g crx
fi

# Create .crx file
echo "🔐 Creating signed .crx file..."
crx pack temp-extension -o gmail-inbox-labels.crx -p "$PEM_KEY_PATH"

# Create zip file for Chrome Web Store
echo "📦 Creating zip file for Chrome Web Store..."
cd temp-extension
zip -r ../gmail-inbox-labels.zip .
cd ..

# Clean up
echo "🧹 Cleaning up temporary files..."
rm -rf temp-extension

echo "✅ Build complete!"
echo "📁 Generated files:"
echo "   - gmail-inbox-labels.crx (signed extension)"
echo "   - gmail-inbox-labels.zip (for Chrome Web Store)"
