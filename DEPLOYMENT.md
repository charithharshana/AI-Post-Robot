# AI Post Robot - Deployment Guide

## Overview

This project uses a **dual git strategy** for clean Chrome extension distribution:

- **Local Repository**: Contains ALL development files (source code, tests, docs, deployment scripts)
- **GitHub Repository**: Contains ONLY clean Chrome extension files for distribution

## Quick Commands

### For Local Testing
```bash
# Update local extension/ folder for Chrome testing
node deploy.js local
```

### For GitHub Deployment
```bash
# Update local extension/ folder + deploy to GitHub
node deploy.js github
```

### Platform-Specific Shortcuts

**Windows:**
```cmd
deploy.bat local    # Local testing only
deploy.bat github   # Full deployment
```

**Linux/Mac:**
```bash
./deploy.sh local   # Local testing only
./deploy.sh github  # Full deployment
```

## What Each Command Does

### `node deploy.js local`
- Copies all Chrome extension files to `extension/` folder
- Ready for loading as unpacked extension in Chrome
- **Files copied**: manifest.json, background.js, content.js, popup files, options files, scheduler files, API files, icons/, image-editor-module/

### `node deploy.js github`
- First runs local update
- Navigates to `extension/` folder
- Sets up git repository with GitHub remote
- Commits and pushes ONLY extension files to GitHub
- Uses force push to maintain clean repository state

## Directory Structure

```
AI-Post-Robot-master/           # Local development repository
├── extension/                  # Local extension folder (for Chrome testing)
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   ├── options.html
│   ├── options.js
│   ├── advanced-scheduler.html
│   ├── advanced-scheduler.js
│   ├── schedule.html
│   ├── schedule.js
│   ├── robopost-api.js
│   ├── gemini-api.js
│   ├── icons/
│   ├── image-editor-module/
│   └── README.md
├── docs/                       # Development documentation
├── deploy.js                   # Main deployment script
├── deploy.bat                  # Windows wrapper
├── deploy.sh                   # Linux/Mac wrapper
├── DEPLOYMENT.md               # This file
└── [other development files]
```

## Chrome Extension Testing

1. Run: `node deploy.js local`
2. Open Chrome → Extensions → Developer mode ON
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Extension is now loaded for testing

## GitHub Repository

- **URL**: https://github.com/charithharshana/AI-Post-Robot
- **Contains**: Only clean Chrome extension files
- **Updated**: Automatically when running `node deploy.js github`

## Development Workflow

1. **Make changes** to source files in the root directory
2. **Test locally**: `node deploy.js local` → Load in Chrome
3. **Deploy to GitHub**: `node deploy.js github` when ready
4. **Commit development changes** to local git as needed

## Requirements

- **Node.js**: Required for deployment scripts
- **Git**: Required for GitHub deployment
- **Chrome**: For testing the extension

## Troubleshooting

### "Node.js not found"
- Install Node.js from https://nodejs.org/
- Ensure `node` command is in your PATH

### "Git not found"
- Install Git from https://git-scm.com/
- Ensure `git` command is in your PATH

### "No changes detected"
- This is normal if extension files haven't changed
- The GitHub repository is already up to date

### Permission errors
- On Linux/Mac, ensure deploy.sh is executable: `chmod +x deploy.sh`
- On Windows, run Command Prompt as Administrator if needed

## Notes

- The deployment process is **safe** - it never modifies your source files
- GitHub repository uses **force push** to maintain clean state
- Local `extension/` folder is automatically created/updated
- All development files remain in the local repository only
