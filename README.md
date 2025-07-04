# 🤖 AI Post Robot by Charith Harshana

An intelligent Chrome/Edge extension for capturing and bulk scheduling social media content with RoboPost API integration.

## Features

### 🎯 Smart Content Capture
- **Auto-detection**: Automatically captures captions from Facebook and Pinterest
- **Manual selection**: Select any text to use as caption
- **Image capture**: Right-click on images to save with associated captions
- **Smart processing**: Automatic caption cleaning and length optimization

### 🚀 Bulk Scheduling
- **RoboPost Integration**: Direct integration with RoboPost API for automated posting
- **Bulk operations**: Schedule multiple posts with customizable intervals
- **Multi-platform**: Support for Facebook and Pinterest
- **Smart scheduling**: Configurable delays and posting intervals

### 📊 Content Management
- **Category organization**: Organize captured content by custom categories
- **Export functionality**: Export captured content as CSV files
- **Statistics tracking**: Monitor captured captions and image links
- **Site management**: Add custom domains for content capture

### ⚙️ Advanced Settings
- **API configuration**: Secure RoboPost API key management
- **Capture preferences**: Customize auto-capture behavior and caption limits
- **Scheduling defaults**: Set default channels and timing preferences
- **Data management**: Export and clear captured data

## Installation

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. Configure your RoboPost API key in the settings

## Setup

### 1. Get RoboPost API Key
1. Sign up at [RoboPost.app](https://robopost.app)
2. Navigate to API settings in your dashboard
3. Generate an API key
4. Copy the key for use in the extension

### 2. Configure Extension
1. Click the extension icon in your browser
2. Click "⚙️ Settings & API Configuration"
3. Enter your RoboPost API key
4. Test the connection
5. Configure default channels and scheduling preferences

### 3. Start Capturing Content
1. Visit supported social media platforms
2. Select text or right-click on images
3. Content is automatically captured and categorized
4. Use the popup to manage and schedule your content

## Supported Platforms

- **Facebook**: Posts, images, and captions
- **Pinterest**: Pin descriptions and images

## Usage

### Capturing Content
1. **Text Selection**: Select any text on supported platforms
2. **Image Capture**: Right-click on images → "Save image link and caption"
3. **Auto-detection**: Extension automatically detects captions on page load

### Scheduling Posts
1. Click the extension icon
2. Click "🚀 Schedule Posts"
3. Select a category to schedule
4. Configure channels, timing, and intervals
5. Preview and confirm your schedule

### Managing Content
- **Categories**: Add custom categories for organization
- **Export**: Download captured content as CSV
- **Statistics**: View capture counts and totals
- **Settings**: Configure API, capture, and scheduling preferences

## Chrome Web Store Compliance

This extension follows Chrome Web Store policies:
- **Privacy**: No data collection or tracking
- **Security**: Secure API key storage
- **Permissions**: Minimal required permissions
- **Content**: Only operates on user-initiated actions

## Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Background processing for API calls
- **Content Scripts**: Platform-specific content detection
- **Storage API**: Local storage for captured content and settings

### API Integration
- **RoboPost API**: Full integration with media upload and scheduling
- **Error Handling**: Comprehensive error handling and user feedback
- **Rate Limiting**: Built-in delays to respect API limits
- **Bulk Operations**: Efficient batch processing for multiple posts

## Development

### File Structure
```
├── manifest.json          # Extension configuration
├── background.js          # Service worker for context menus and storage
├── content.js            # Content script for page interaction
├── popup.html/js         # Extension popup interface
├── options.html/js       # Settings page
├── schedule.html/js      # Scheduling interface
├── robopost-api.js       # RoboPost API integration
└── icons/               # Extension icons
```

### Key Components
- **Content Detection**: Platform-specific selectors for caption extraction
- **API Integration**: Modular RoboPost API wrapper
- **UI Components**: Modern, responsive interface design
- **Data Management**: Efficient storage and retrieval systems

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Contact: [Your contact information]

## License

[Your chosen license]

## Version History

### v2.0.0
- Complete rewrite with modern UI
- RoboPost API integration
- Enhanced content capture
- Bulk scheduling functionality
- Professional branding and Chrome Web Store compliance

### v1.0.0
- Initial release
- Basic content capture
- CSV export functionality
