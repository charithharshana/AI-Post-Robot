# AI Post Robot - Deployment Guide

## Overview

This project uses a **dual repository strategy** for clean Chrome extension distribution:

- **Development Repository**: `https://github.com/charithharshana/AI-Post-Robot-Development.git`
  - Contains ALL development files (source code, docs, deployment scripts)
  - Located at: `AI Post Robot\AI-Post-Robot-master`

- **Distribution Repository**: `https://github.com/charithharshana/AI-Post-Robot.git`
  - Contains ONLY clean Chrome extension files for public distribution
  - Located at: `AI Post Robot\extension\extension`

## Quick Commands

### For Extension Deployment
```cmd
# Run from the development workspace (AI-Post-Robot-master)
deploy.bat
```

This single command will:
1. Copy all extension files from `extension/` to `../extension/extension/`
2. Initialize/update the distribution git repository
3. Commit and push changes to the public extension repository

## Repository Structure

The project maintains two separate git repositories:

1. **Development Repository** (`AI-Post-Robot-master/`)
   - Remote: `https://github.com/charithharshana/AI-Post-Robot-Development.git`
   - Contains source code, documentation, and deployment scripts
   - Clean workspace with only development-related files
   - Uses comprehensive `.gitignore` to exclude unnecessary files

2. **Distribution Repository** (`../extension/extension/`)
   - Remote: `https://github.com/charithharshana/AI-Post-Robot.git`
   - Contains ONLY the clean extension files needed for Chrome Web Store
   - Automatically managed by deployment script
   - Public repository for extension distribution

## Directory Structure

```
AI Post Robot/
├── AI-Post-Robot-master/       # Development workspace
│   ├── extension/              # Source extension files
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── content.js
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── options.html
│   │   ├── options.js
│   │   ├── advanced-scheduler.html
│   │   ├── advanced-scheduler.js
│   │   ├── schedule.html
│   │   ├── schedule.js
│   │   ├── robopost-api.js
│   │   ├── gemini-api.js
│   │   ├── icons/
│   │   ├── image-editor-module/
│   │   └── README.md
│   ├── docs/                   # Development documentation
│   ├── deploy.bat              # Deployment script
│   ├── DEPLOYMENT.md           # This file
│   ├── README.md               # Project documentation
│   ├── USER_GUIDE.md
│   └── RELEASE_NOTES.md
└── extension/
    └── extension/              # Distribution copy (auto-managed)
        ├── manifest.json       # Copied from development
        ├── background.js       # Copied from development
        └── ...                 # All extension files

## Chrome Extension Testing

1. Run: `deploy.bat` from the development workspace
2. Open Chrome → Extensions → Developer mode ON
3. Click "Load unpacked"
4. Select the `../extension/extension/` folder

## Workflow

### Development Workflow
1. Make changes to files in `AI-Post-Robot-master/extension/`
2. Test locally by running `deploy.bat`
3. Load the extension in Chrome from `../extension/extension/`
4. When ready to commit development changes:
   ```cmd
   git add .
   git commit -m "Your development changes"
   git push origin development
   ```

### Distribution Workflow
1. When ready to publish extension updates:
   ```cmd
   deploy.bat
   ```
2. This automatically:
   - Copies latest extension files to distribution directory
   - Commits changes to the distribution repository
   - Pushes to the public GitHub repository

## Benefits of This Structure

- **Clean Separation**: Development files stay separate from distribution files
- **Automated Deployment**: Single command handles the entire deployment process
- **Version Control**: Both development and distribution have proper git history
- **Public Repository**: Clean extension repository for users and Chrome Web Store
- **Development Privacy**: Development repository can remain private if needed

## Troubleshooting

### If deployment fails:
1. Check that the `../extension/` directory exists
2. Ensure you have git configured with proper credentials
3. Verify network connectivity to GitHub

### If extension doesn't load:
1. Check Chrome's Extensions page for error messages
2. Verify all required files are present in `../extension/extension/`
3. Check manifest.json for syntax errors

## Notes

- The development repository remote points to: `AI-Post-Robot-Development.git`
- The distribution repository remote points to: `AI-Post-Robot.git`
- All deployment is handled automatically by the `deploy.bat` script
- The `.gitignore` in the development repository excludes unnecessary files
4. Select the `extension/` folder
5. Extension is now loaded for testing

## GitHub Repository

- **URL**: https://github.com/charithharshana/AI-Post-Robot
- **Contains**: Only clean Chrome extension files
- **Updated**: Automatically when running `node deploy.js github`

## Development Workflow

1. **Work on development branch**: `git checkout development`
2. **Make changes** to source files in the root directory
3. **Test locally**: `node deploy.js local` → Load in Chrome
4. **Deploy to GitHub**: `node deploy.js github` when ready
5. **Commit development changes**: `git add -A && git commit -m "Your changes"`

### Branch Strategy

- **`development` branch**: Contains all development files (recommended for daily work)
- **`main` branch**: Kept clean, aligned with GitHub extension repository
- **GitHub repository**: Contains only extension files (automatically managed)

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
