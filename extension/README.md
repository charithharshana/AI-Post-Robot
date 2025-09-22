# AI Post Robot Chrome Extension

This folder contains the production-ready Chrome extension files for AI Post Robot.

## Installation Instructions

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" button
4. Select this `extension` folder
5. The AI Post Robot extension will be installed and ready to use

## Recent Updates

### Title Generation Fix (Latest)
- **Fixed language consistency issue**: Titles now maintain the same language as the original input text
- **Improved prompt preservation**: User-defined prompts (both default and custom) are never overridden
- **Enhanced title source priority**: 
  1. User's overridden title (if exists)
  2. Original title from post (if exists) 
  3. Caption as fallback (only if no title exists)
- **Stronger language instructions**: Prompts now explicitly specify to use the exact same language as the original text

### Key Features
- Auto-capture images and videos from Facebook and Pinterest
- Advanced scheduler with bulk operations
- AI-powered title and caption generation with Gemini API
- Image editing capabilities with AI integration
- Custom prompt management
- Multi-platform posting support
- Ctrl+Click functionality for quick saves

## Files Included

### Core Extension Files
- `manifest.json` - Extension configuration
- `background.js` - Service worker for background operations
- `content.js` - Content script for web page interaction
- `popup.html/js` - Extension popup interface
- `options.html/js` - Settings and configuration page

### Advanced Features
- `advanced-scheduler.html/js` - Advanced post scheduling interface
- `schedule.html/js` - Basic scheduling functionality
- `robopost-api.js` - RoboPost API integration
- `gemini-api.js` - Google Gemini AI integration

### Image Editor Module
- `image-editor-module/` - Complete AI image editing system
  - `ai-image-editor-module.js` - Main AI image editor
  - `ai-image-editor.js` - Core image editing functionality
  - `image-editor-integration.js` - Integration with main extension
  - `font-manager.js` - Font management system
  - `font-settings.js` - Font configuration

### Assets
- `icons/` - Extension icons (16px, 32px, 48px, 128px)

## Development Notes

This extension folder contains only the essential files needed for Chrome extension installation. Development files (tests, documentation, temporary files) are kept in the main repository but excluded from this production build.

## Support

For issues or questions, please refer to the main repository documentation or contact support.
