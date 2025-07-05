# 🤖 AI Post Robot by Charith Harshana

An intelligent Chrome/Edge extension for capturing and bulk scheduling social media content with advanced AI features, RoboPost API integration, and comprehensive content management tools.

## ✨ Key Features

### 🎯 Smart Content Capture
- **Auto-detection**: Automatically captures captions from Facebook and Pinterest
- **Manual selection**: Select any text to use as caption
- **Image capture**: Right-click on images to save with associated captions
- **Smart processing**: Automatic caption cleaning and length optimization
- **Multi-platform support**: Works seamlessly across supported social media platforms

### 🚀 Advanced Scheduling System
- **RoboPost Integration**: Direct integration with RoboPost API for automated posting
- **Advanced Scheduler**: Professional scheduling interface with visual post management
- **Bulk operations**: Schedule multiple posts with customizable intervals
- **Smart scheduling**: Fixed, random, and optimal timing algorithms
- **Album support**: Create and schedule photo albums
- **Instant publishing**: Immediate posting capabilities

### 🤖 AI-Powered Features
- **Google Gemini Integration**: Advanced AI text generation and rewriting
- **Multiple AI Models**: Support for various Gemini models with favorites system
- **API Key Rotation**: Automatic rotation for rate limit management
- **Custom Prompts**: 4 default rewrite prompts (Engaging, Shorten, Professional, Casual)
- **Image Analysis**: AI-powered image understanding and caption generation
- **Video Support**: Advanced video processing with fallback mechanisms

### 🖼️ Image & Media Management
- **Image Editor**: Built-in image editing with crop presets (1:1, 16:9, 9:16)
- **Watermark Support**: Persistent logo/watermark functionality
- **Media Upload**: Direct file upload from PC with drag-and-drop
- **Format Support**: Images, videos, and various media formats
- **Storage Management**: Efficient media storage and retrieval

### 📊 Content Management
- **Category organization**: Organize captured content by custom categories
- **Export functionality**: Export captured content as CSV files
- **Statistics tracking**: Monitor captured captions and image links
- **Site management**: Add custom domains for content capture
- **Post deletion**: Remove unwanted posts from scheduler
- **Batch operations**: Select and manage multiple posts simultaneously

### ⚙️ Advanced Settings & Configuration
- **API Management**: Secure RoboPost and Gemini API key management
- **Capture preferences**: Customize auto-capture behavior and caption limits
- **Scheduling defaults**: Set default channels and timing preferences
- **AI Configuration**: Model selection, prompt customization, and key rotation
- **Data management**: Export and clear captured data
- **UI Preferences**: Customizable interface settings

## 🚀 Quick Start

### Installation
1. **Download**: Clone or download this repository
   ```bash
   git clone https://github.com/charithharshana/AI-Post-Robot.git
   ```
2. **Load Extension**:
   - Open Chrome/Edge and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory
3. **Configure APIs**: Set up your RoboPost and Gemini API keys in settings

### Initial Setup

#### 1. RoboPost API Configuration
1. Sign up at [RoboPost.app](https://robopost.app)
2. Navigate to API settings in your dashboard
3. Generate an API key
4. In the extension: Settings → RoboPost API Configuration → Enter API key
5. Test the connection to verify setup

#### 2. Google Gemini API Setup (Optional)
1. Get API key from [Google AI Studio](https://aistudio.google.com/)
2. In the extension: Settings → Google Gemini API → Enter API key(s)
3. Configure preferred models and prompts
4. Test AI functionality in Advanced Scheduler

#### 3. Start Using the Extension
1. **Content Capture**: Visit Facebook or Pinterest, content is auto-captured
2. **Manual Capture**: Select text or right-click images to save
3. **Scheduling**: Use popup → "🚀 Schedule Posts" or Advanced Scheduler
4. **AI Features**: Access AI rewriting in Advanced Scheduler

## 🌐 Supported Platforms

### Content Capture
- **Facebook**: Posts, images, captions, and media content
- **Pinterest**: Pin descriptions, images, and board content
- **Custom Domains**: Add any website for content capture

### Publishing Platforms (via RoboPost)
- **Facebook**: Pages, Groups, Personal Profiles
- **Instagram**: Business accounts, Personal accounts
- **Twitter/X**: Personal and Business accounts
- **LinkedIn**: Personal profiles, Company pages
- **Pinterest**: Business accounts
- **TikTok**: Business accounts
- **YouTube**: Channel posting
- **And many more** (depends on your RoboPost plan)

## 📖 Detailed Usage Guide

### Content Capture Methods
1. **Auto-Detection**: Extension automatically captures captions on page load
2. **Text Selection**: Select any text on supported platforms
3. **Image Capture**: Right-click on images → "Save image link and caption"
4. **Manual Upload**: Upload files directly in Advanced Scheduler
5. **Drag & Drop**: Drop files into the Advanced Scheduler interface

### Scheduling Options

#### Basic Scheduling (Popup Interface)
1. Click the extension icon
2. Click "🚀 Schedule Posts"
3. Select a category to schedule
4. Configure channels, timing, and intervals
5. Preview and confirm your schedule

#### Advanced Scheduler
1. Access via popup → "Advanced Scheduler" or direct link
2. **Visual Management**: See all posts in a grid layout
3. **Bulk Selection**: Select multiple posts for batch operations
4. **AI Enhancement**: Use Gemini AI to rewrite captions
5. **Flexible Scheduling**: Fixed, random, or optimal timing
6. **Album Creation**: Group multiple images into albums
7. **Instant Publishing**: Publish immediately or schedule for later

### Content Management
- **Categories**: Organize content with custom categories
- **Search & Filter**: Find specific posts quickly
- **Statistics**: Monitor capture counts and performance
- **Export**: Download captured content as CSV
- **Bulk Operations**: Delete, schedule, or modify multiple posts
- **Image Editing**: Crop, resize, and add watermarks

## 🔧 Technical Architecture

### Core Technologies
- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Background processing for API calls and context menus
- **Content Scripts**: Platform-specific content detection and capture
- **Chrome Storage API**: Local storage for captured content and settings
- **Modern JavaScript**: ES6+ features with async/await patterns

### API Integrations
- **RoboPost API**: Complete integration for media upload and scheduling
- **Google Gemini API**: AI text generation with key rotation
- **Rate Limiting**: Built-in delays and retry mechanisms
- **Error Handling**: Comprehensive error handling and user feedback
- **Bulk Operations**: Efficient batch processing for multiple posts

### File Structure
```
├── manifest.json              # Extension configuration and permissions
├── background.js              # Service worker for context menus and storage
├── content.js                # Content script for page interaction
├── popup.html/js             # Main extension popup interface
├── options.html/js           # Settings and configuration page
├── schedule.html/js          # Basic scheduling interface
├── advanced-scheduler.html/js # Advanced scheduling with AI features
├── robopost-api.js           # RoboPost API integration module
├── gemini-api.js             # Google Gemini AI integration
├── docs/                     # Documentation and testing guides
│   ├── RoboPost_API_Knowledge_Base.md
│   └── TESTING.md
└── icons/                    # Extension icons (16, 32, 48, 128px)
```

### Key Features Implementation
- **Content Detection**: Platform-specific selectors for caption extraction
- **AI Integration**: Modular Gemini API wrapper with model management
- **Image Processing**: Built-in image editor with crop and watermark features
- **Scheduling Engine**: Multiple timing algorithms (fixed, random, optimal)
- **Data Management**: Efficient storage, retrieval, and export systems
- **UI Components**: Modern, responsive interface with drag-and-drop support

## 🛡️ Privacy & Security

### Chrome Web Store Compliance
- **Privacy First**: No data collection or user tracking
- **Secure Storage**: API keys encrypted in local storage
- **Minimal Permissions**: Only required permissions requested
- **User Control**: All actions require explicit user consent
- **Data Ownership**: All data stays on user's device

### Security Features
- **API Key Protection**: Masked display and secure storage
- **Rate Limiting**: Prevents API abuse and quota exhaustion
- **Error Isolation**: Robust error handling prevents crashes
- **Content Validation**: Input sanitization and validation
- **Secure Communications**: HTTPS-only API communications

## 🚀 Getting Started Examples

### Example 1: Basic Content Capture
1. Visit Facebook or Pinterest
2. Extension automatically captures post captions
3. View captured content in popup (click extension icon)
4. Organize content into categories

### Example 2: AI-Enhanced Scheduling
1. Open Advanced Scheduler
2. Upload or select captured images
3. Use AI to rewrite captions (4 style options)
4. Schedule posts with optimal timing
5. Monitor publishing status

### Example 3: Bulk Album Creation
1. Select multiple related images in Advanced Scheduler
2. Choose "Album" publishing type
3. Add unified caption and title
4. Schedule or publish immediately

## 🔧 Development & Contribution

### Local Development
1. Clone the repository
2. Load as unpacked extension in Chrome
3. Make changes and test locally
4. Follow Chrome extension development guidelines

### Testing
- See `docs/TESTING.md` for comprehensive testing procedures
- Test on multiple platforms and browsers
- Verify API integrations work correctly

### Contributing
- Fork the repository
- Create feature branches
- Submit pull requests with detailed descriptions
- Follow existing code style and patterns

## 📞 Support & Community

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check `docs/` folder for detailed guides
- **API Documentation**: See `docs/RoboPost_API_Knowledge_Base.md`

### Contact Information
- **Developer**: Charith Harshana
- **GitHub**: [charithharshana](https://github.com/charithharshana)
- **Repository**: [AI-Post-Robot](https://github.com/charithharshana/AI-Post-Robot)

## 📄 License

This project is open source. Please check the repository for license details.

## 📈 Version History

### v2.0.0 (Current)
- **Major Rewrite**: Complete codebase overhaul with modern architecture
- **Advanced Scheduler**: Professional scheduling interface with visual management
- **AI Integration**: Google Gemini API with multiple models and key rotation
- **Image Editor**: Built-in editing with crop presets and watermark support
- **Enhanced UI**: Modern, responsive design with improved user experience
- **Album Support**: Create and schedule photo albums
- **Video Processing**: Advanced video handling with fallback mechanisms
- **Bulk Operations**: Enhanced batch processing and management
- **API Improvements**: Better error handling and rate limiting
- **Chrome Web Store Ready**: Full compliance with store policies

### v1.0.0
- **Initial Release**: Basic content capture functionality
- **Platform Support**: Facebook and Pinterest integration
- **CSV Export**: Basic data export capabilities
- **Simple Scheduling**: Basic post scheduling features

## 🎯 Roadmap

### Upcoming Features
- **More Platforms**: Additional social media platform support
- **Advanced Analytics**: Post performance tracking and insights
- **Team Collaboration**: Multi-user support and shared workspaces
- **Template System**: Reusable post templates and campaigns
- **Automation Rules**: Smart automation based on content type
- **Mobile App**: Companion mobile application

---

**Made with ❤️ by Charith Harshana**

*Transform your social media workflow with intelligent automation and AI-powered content management.*
