# AI Post Robot - Development Workflow Guide

This document explains the development workflow and repository structure for the AI Post Robot Chrome extension project.

## 📁 Repository Structure Overview

### **Local Development Repository** (Full Environment)
**Location**: `D:/AI Post Robot/AI-Post-Robot-master/`
**Purpose**: Complete development environment with all files
**Branch**: `master`

**Contains:**
- ✅ **Chrome Extension Files**: All extension code and assets
- ✅ **Development Documentation**: README.md, USER_GUIDE.md, RELEASE_NOTES.md
- ✅ **API Documentation**: docs/AIPostRobot_API_Knowledge_Base.md, docs/api more.txt
- ✅ **Development Tools**: sync scripts, guides, temporary files
- ✅ **Git History**: Complete development history and commits

### **GitHub Repository** (Clean Extension Only)
**Location**: `https://github.com/charithharshana/AI-Post-Robot`
**Purpose**: Clean Chrome extension distribution
**Branch**: `main` (default)

**Contains:**
- ✅ **Chrome Extension Files Only**: 16 core extension files and folders
- ✅ **Extension README**: Comprehensive user-facing documentation
- ❌ **Development Files**: Excluded for clean distribution

## 🔄 Development Workflow

### **Daily Development Process**

1. **Work Locally**: Make all changes in the local development repository
   ```bash
   cd "D:/AI Post Robot/AI-Post-Robot-master"
   # Make your changes to extension files
   # Test the extension locally
   ```

2. **Commit Changes Locally**: 
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

3. **Sync to GitHub**: Use the automated sync script
   ```bash
   ./sync-to-github.sh    # Linux/Mac/Git Bash
   # OR
   sync-to-github.bat     # Windows Command Prompt
   ```

### **What the Sync Script Does**

1. **Creates Temporary Directory**: `temp-github-sync/`
2. **Copies Extension Files Only**:
   - `manifest.json`, `background.js`, `content.js`
   - `popup.html`, `popup.js`, `options.html`, `options.js`
   - `advanced-scheduler.html`, `advanced-scheduler.js`
   - `schedule.html`, `schedule.js`
   - `robopost-api.js`, `gemini-api.js`
   - `README.md` (comprehensive version)
   - `icons/` folder, `image-editor-module/` folder
3. **Creates Clean Git Repository**: Fresh commit history
4. **Force Pushes to GitHub**: Updates `main` branch
5. **Cleans Up**: Removes temporary directory

## 🛠️ Available Scripts

### **sync-to-github.sh** (Linux/Mac/Git Bash)
```bash
chmod +x sync-to-github.sh
./sync-to-github.sh
```

### **sync-to-github.bat** (Windows)
```cmd
sync-to-github.bat
```

**Features:**
- ✅ Checks for uncommitted changes
- ✅ Copies only extension files
- ✅ Creates clean commit with timestamp
- ✅ Force pushes to GitHub
- ✅ Preserves local development environment

## 📋 File Categories

### **Extension Files** (Synced to GitHub)
```
manifest.json              # Extension manifest
background.js              # Service worker
content.js                 # Content script
popup.html, popup.js       # Extension popup
options.html, options.js   # Settings page
advanced-scheduler.html     # Main scheduler interface
advanced-scheduler.js       # Scheduler logic
schedule.html, schedule.js  # Scheduling functionality
robopost-api.js            # RoboPost integration
gemini-api.js              # Google Gemini AI integration
README.md                  # User documentation
icons/                     # Extension icons
image-editor-module/       # Complete image editor
```

### **Development Files** (Local Only)
```
docs/                      # API documentation and guides
RELEASE_NOTES.md          # Version history and changes
USER_GUIDE.md             # Detailed user manual
DEVELOPMENT_WORKFLOW.md   # This file
.gitignore                # Git ignore rules
sync-to-github.sh         # Sync script (Linux/Mac)
sync-to-github.bat        # Sync script (Windows)
```

## 🔧 Making Changes

### **Extension Code Changes**
1. Edit files in local repository
2. Test extension locally in Chrome
3. Commit changes locally
4. Run sync script to update GitHub

### **Documentation Changes**
- **README.md**: Edit locally, will sync to GitHub
- **USER_GUIDE.md**: Local only, not synced
- **Development docs**: Local only, not synced

### **Adding New Extension Files**
1. Add file to local repository
2. Update sync script to include new file:
   ```bash
   # Edit sync-to-github.sh
   EXTENSION_FILES=(
       # ... existing files ...
       "your-new-file.js"
   )
   ```
3. Run sync script

## 🚨 Important Guidelines

### **DO:**
- ✅ Always work in the local development repository
- ✅ Test changes locally before syncing
- ✅ Use the sync scripts for GitHub updates
- ✅ Commit changes locally first
- ✅ Keep development documentation updated

### **DON'T:**
- ❌ Edit files directly on GitHub
- ❌ Push development files to GitHub manually
- ❌ Delete the local repository
- ❌ Work directly in the GitHub repository
- ❌ Skip local testing

## 🔍 Troubleshooting

### **Sync Script Issues**
```bash
# If script fails, check:
1. Are you in the correct directory?
2. Do you have uncommitted changes?
3. Is git configured properly?
4. Do you have internet connection?
```

### **GitHub Repository Issues**
```bash
# If GitHub shows old files:
1. Check if sync completed successfully
2. Clear browser cache
3. Check the specific commit hash
4. Re-run sync script
```

### **Local Repository Issues**
```bash
# If local changes are lost:
1. Check git status and log
2. Use git reflog to find commits
3. Never delete local repository
4. Keep regular backups
```

## 📞 Support

If you encounter issues with the development workflow:
1. Check this documentation first
2. Review script output for errors
3. Ensure all prerequisites are met
4. Contact the development team

---

**Last Updated**: 2025-09-22
**Workflow Version**: 1.0.0
