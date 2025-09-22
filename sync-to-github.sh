#!/bin/bash

# AI Post Robot - GitHub Sync Script
# This script syncs only Chrome extension files to GitHub while keeping development files local

set -e

echo "🤖 AI Post Robot - GitHub Sync Script"
echo "======================================"

# Configuration
GITHUB_REPO="https://github.com/charithharshana/AI-Post-Robot.git"
TEMP_DIR="temp-github-sync"
BRANCH="main"

# Core Chrome extension files to sync
EXTENSION_FILES=(
    "manifest.json"
    "background.js"
    "content.js"
    "popup.html"
    "popup.js"
    "options.html"
    "options.js"
    "advanced-scheduler.html"
    "advanced-scheduler.js"
    "schedule.html"
    "schedule.js"
    "robopost-api.js"
    "gemini-api.js"
    "README.md"
    "icons/"
    "image-editor-module/"
)

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the extension root directory."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes in your local repository."
    echo "   It's recommended to commit your changes first."
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Sync cancelled."
        exit 1
    fi
fi

echo "📁 Creating temporary directory..."
rm -rf "$TEMP_DIR"
mkdir "$TEMP_DIR"

echo "📋 Copying extension files..."
for file in "${EXTENSION_FILES[@]}"; do
    if [ -e "$file" ]; then
        if [ -d "$file" ]; then
            echo "   📂 Copying directory: $file"
            cp -r "$file" "$TEMP_DIR/"
        else
            echo "   📄 Copying file: $file"
            cp "$file" "$TEMP_DIR/"
        fi
    else
        echo "   ⚠️  Warning: $file not found, skipping..."
    fi
done

echo "🔧 Setting up git repository..."
cd "$TEMP_DIR"
git init
git add .

# Create commit message
COMMIT_MSG="Update Chrome extension files

Auto-sync from development repository - $(date '+%Y-%m-%d %H:%M:%S')
Updated extension files with latest changes from local development."

git commit -m "$COMMIT_MSG"

echo "🚀 Pushing to GitHub..."
git remote add origin "$GITHUB_REPO"
git push -f origin HEAD:$BRANCH

cd ..
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ Sync completed successfully!"
echo "   GitHub repository updated with latest extension files."
echo "   Local development files remain unchanged."
echo ""
echo "🔗 View on GitHub: https://github.com/charithharshana/AI-Post-Robot"
