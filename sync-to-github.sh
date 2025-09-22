#!/bin/bash

# AI Post Robot - GitHub Sync Script
# This script syncs only Chrome extension files to GitHub while keeping development files local

set -e

echo "🤖 AI Post Robot - GitHub Sync Script"
echo "======================================"

# Configuration
GITHUB_REPO="https://github.com/charithharshana/AI-Post-Robot.git"
TEMP_DIR="temp-github-sync"
EXTENSION_DIR="extension"
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

echo "📁 Creating local extension directory..."
mkdir -p "$EXTENSION_DIR"

echo "📋 Copying extension files to local extension directory..."
for file in "${EXTENSION_FILES[@]}"; do
    if [ -e "$file" ]; then
        if [ -d "$file" ]; then
            echo "   📂 Copying directory: $file"
            cp -r "$file" "$EXTENSION_DIR/"
        else
            echo "   📄 Copying file: $file"
            cp "$file" "$EXTENSION_DIR/"
        fi
    else
        echo "   ⚠️  Warning: $file not found, skipping..."
    fi
done

echo "✅ Local extension directory updated: $EXTENSION_DIR/"
echo "   You can now load this directory as an unpacked extension in Chrome for testing."
echo ""

echo "📁 Creating temporary directory for GitHub sync..."
rm -rf "$TEMP_DIR"
mkdir "$TEMP_DIR"

echo "📋 Copying extension files to temporary directory for GitHub..."
cp -r "$EXTENSION_DIR"/* "$TEMP_DIR/"

echo "🔧 Setting up git repository..."
cd "$TEMP_DIR"
git init
git remote add origin "$GITHUB_REPO"

# Fetch the existing repository to compare changes
echo "📥 Fetching existing repository for change detection..."
git fetch origin $BRANCH 2>/dev/null || echo "   📝 No existing branch found, will create new one"

# Check if branch exists and checkout
if git ls-remote --heads origin $BRANCH | grep -q $BRANCH; then
    echo "   📋 Existing branch found, checking for changes..."
    git checkout -b $BRANCH origin/$BRANCH 2>/dev/null || git checkout -b $BRANCH
else
    echo "   🆕 Creating new branch..."
    git checkout -b $BRANCH
fi

git add .

# Check if there are any changes to commit
if git diff --cached --quiet; then
    echo "✅ No changes detected - repository is already up to date!"
    cd ..
    rm -rf "$TEMP_DIR"
    echo "   📁 Local extension directory: $EXTENSION_DIR/ (ready for Chrome testing)"
    echo "   🔗 View on GitHub: https://github.com/charithharshana/AI-Post-Robot"
    exit 0
fi

# Create commit message with timestamp and change summary
COMMIT_MSG="Update Chrome extension files

Auto-sync from development repository - $(date '+%Y-%m-%d %H:%M:%S')
Updated extension files with latest changes from local development."

echo "📝 Changes detected, creating commit..."
git commit -m "$COMMIT_MSG"

echo "🚀 Pushing changes to GitHub..."
git push origin $BRANCH

cd ..
echo "🧹 Cleaning up temporary directory..."
rm -rf "$TEMP_DIR"

echo "✅ Sync completed successfully!"
echo "   📁 Local extension directory: $EXTENSION_DIR/ (ready for Chrome testing)"
echo "   🚀 GitHub repository updated with latest extension files"
echo "   📝 Local development files remain unchanged"
echo ""
echo "🔗 View on GitHub: https://github.com/charithharshana/AI-Post-Robot"
echo "💡 To test: Load the '$EXTENSION_DIR' folder as an unpacked extension in Chrome"
