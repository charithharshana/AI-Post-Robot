# 📖 AI Post Robot - Comprehensive User Guide

Welcome to the complete user guide for AI Post Robot by Charith Harshana. This guide covers all features, detailed usage instructions, and advanced techniques.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Content Capture Methods](#content-capture-methods)
3. [Advanced Scheduler](#advanced-scheduler)
4. [AI Image+ Generator & Editor](#ai-image-generator--editor)
5. [Professional Image Editor](#professional-image-editor)
6. [AI-Powered Features](#ai-powered-features)
7. [Scheduling Options](#scheduling-options)
8. [Content Management](#content-management)
9. [API Configuration](#api-configuration)
10. [Examples & Use Cases](#examples--use-cases)
11. [Technical Architecture](#technical-architecture)
12. [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Installation
1. **Download**: Clone or download this repository
   ```bash
   git clone https://github.com/charithharshana/AI-Post-Robot.git
   ```
2. **Load Extension**:
   - Open Chrome/Edge and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory
3. **Configure APIs**: Set up your AI Post Robot and Gemini API keys in settings

### Initial Setup

#### 1. AI Post Robot API Configuration
1. Sign up at [AI Post Robot](https://app.aipostrobot.com)
2. Navigate to API settings in your dashboard
3. Generate an API key
4. In the extension: Settings → AI Post Robot API Configuration → Enter API key
5. Test the connection to verify setup

#### 2. Google Gemini API Setup (Optional)
1. Get API key from [Google AI Studio](https://aistudio.google.com/)
2. In the extension: Settings → Google Gemini API → Enter API key(s)
3. Configure preferred models and prompts
4. Test AI functionality in Advanced Scheduler

## 📥 Content Capture Methods

### Automatic Detection
- Extension automatically captures captions on supported platforms
- Works on Facebook and Pinterest by default
- Processes content in real-time as you browse

### Manual Capture

#### Image Posts with Captions
1. **Select text (caption)** → **Right-click on image** → **"Save image link and caption"** → **Choose category**
2. **Continue with Ctrl+click**: Hold Ctrl and click additional images to save them with the same caption
3. **Direct image capture**: Ctrl+click any image to save it with currently selected text

#### Text-Only Posts (NEW!)
4. **Select text** → **Right-click on selected text** → **"Save as text post"** → **Choose category**
   - Perfect for quotes, announcements, or text-based content
   - No image required - creates pure text posts
   - Integrates seamlessly with existing workflow

#### File Upload Methods
5. **Manual Upload**: Upload files directly in Advanced Scheduler
6. **Drag & Drop**: Drop files into the Advanced Scheduler interface

### Custom Domains
- Add any website for content capture in settings
- Configure custom selectors for specific sites
- Extend capture capabilities beyond default platforms

### 🚀 Complete Workflow Quick Reference

#### ✅ **Current Workflow (All Functional):**
1. **Select text + Right-click image** → Save image post with caption ✅
2. **Ctrl+click images** → Save more images with same caption ✅
3. **Ctrl+click image directly** → Save image with current caption ✅
4. **NEW: Select text + Right-click text** → "Save as text post" → Choose category ✅

#### 🎯 **Perfect User Experience:**
- **Consistent**: Same right-click pattern for both images and text
- **Intuitive**: No learning curve - users already know the workflow
- **Clean**: No UI clutter in popup
- **Fast**: One right-click → category → done!

## 🚀 Advanced Scheduler

The Advanced Scheduler is the heart of AI Post Robot, providing professional-grade content management and scheduling capabilities.

### Key Features
- **Visual Management**: Grid layout showing all posts with thumbnails
- **Text-Only Posts**: Support for pure text content with 📝 icons
- **Bulk Selection**: Select multiple posts for batch operations
- **Category Organization**: Organize content with custom categories
- **AI Integration**: Built-in AI text generation and image creation
- **Professional Image Editor**: Advanced editing capabilities
- **Flexible Scheduling**: Multiple timing algorithms

### Interface Overview
- **Post Grid**: Visual representation of all captured content
- **Category Tabs**: Switch between different content categories
- **Action Buttons**: Edit, Delete, Schedule, AI features
- **Selection Tools**: Bulk operations and management
- **Status Indicators**: Publishing status and progress tracking

### Text-Only Posts Management
Text-only posts are seamlessly integrated into the Advanced Scheduler with special visual indicators:

#### Visual Identification
- **📝 Green Icons**: Text posts display with green text icons instead of image thumbnails
- **Character Count**: Metadata shows character count instead of image dimensions
- **"TEXT POST" Label**: Clear identification in post metadata

#### Filtering & Organization
- **📝 Text Only Filter**: Dedicated filter button to show only text posts
- **Category Integration**: Text posts work with all existing categories
- **Mixed Content**: View text and image posts together or separately

#### AI Features for Text Posts
- **Full AI Support**: All AI rewriting features work with text-only posts
- **Text-Only Mode**: AI automatically switches to text-only processing
- **Same Workflow**: Identical AI interaction as with image posts

### Bulk Operations
1. **Select Posts**: Click checkboxes or use "Select All"
2. **Choose Action**: Schedule, Delete, Export, or Edit
3. **Configure Settings**: Set timing, channels, and preferences
4. **Execute**: Apply changes to all selected posts

## 🎨 AI Image+ Generator & Editor

The revolutionary AI Image+ feature transforms how you create and edit images for social media using Google Gemini's native image model.

### Getting Started with AI Image+
1. **Access AI Image+**: Click the "AI Image+" button in Advanced Scheduler
2. **Interactive Interface**: Use the chatbox interface for natural conversation
3. **Create or Edit**: Generate new images from scratch or edit existing ones
4. **Save & Use**: Generated images are automatically saved to your content library

### Key Features
- **Unlimited Generation**: Create as many image variations as needed
- **Interactive Chatbox**: Conversational AI interface with streaming responses
- **Context Integration**: Attach post titles/captions for relevant generation
- **File Attachments**: Upload reference images for AI-guided editing
- **Auto-Save**: Generated images automatically saved to AI category

### 25+ Predefined Prompts
Organized in four main categories:

#### Creative Storytelling
- Wedding invitation designs
- Cinderella storyboard sequences
- Character development illustrations
- Narrative visual content

#### How-To Guides
- Step-by-step recipe visuals
- Tutorial illustrations
- Instructional diagrams
- Process documentation

#### Progression & Transformation
- Before/after comparisons
- Seasonal changes
- Time progression sequences
- Transformation showcases

#### Product & Design Showcase
- Product display arrangements
- Design variations
- Marketing material layouts
- Brand presentation formats

### Custom Prompt Library
- Create and save personalized AI prompts
- Edit existing prompts to match your style
- Organize prompts by category or project
- Share prompts across different sessions

### AI Image+ Usage Guide
1. **Open AI Image+**: Click the "AI Image+" button
2. **Choose Mode**: Create new images or edit existing ones
3. **Select Prompts**: Use predefined prompts or create custom ones
4. **Add Context**: Attach post titles/captions for context-aware generation
5. **Upload References**: Add reference images for guided generation
6. **Generate Images**: Describe your vision in the chatbox
7. **Review Results**: View generated images with progress indicators
8. **Save & Organize**: Images saved to AI category automatically
9. **Continue Workflow**: Use generated images in scheduling

### Advanced Features
- **Multi-Image Generation**: Create multiple variations with single prompts
- **Clickable Parameters**: Easy composition, camera, lighting, and style settings
- **Streaming Responses**: Real-time AI interaction with progress updates
- **Error Handling**: Automatic retry and fallback mechanisms
- **Quota Management**: Efficient API usage and rate limiting

## 🖼️ Professional Image Editor

Advanced image editing capabilities with AI-powered enhancements and professional tools.

### Core Features
- **AI-Powered Editing**: Google Gemini integration for intelligent enhancements
- **Crop Presets**: Quick social media ratios (1:1, 16:9, 9:16)
- **Watermark Management**: Drag-and-drop positioning with persistence
- **Text Elements**: Full customization with custom fonts
- **Basic Tools**: Rotate, resize, crop, and adjust with visual feedback
- **Selection Tools**: Interactive selection with real-time preview

### Usage Guide
1. **Access Editor**: Select a single image post and click "Edit Image"
2. **Basic Editing**: Use rotate, crop, and resize tools
3. **Crop Presets**: Apply social media ratios instantly
4. **Add Watermarks**: Drag and drop watermark images
5. **Text Elements**: Add text overlays with customization
6. **AI Enhancement**: Use Google Gemini for improvements
7. **Selection Tools**: Make precise selections
8. **Save Changes**: Apply edits and update post image
9. **Quality Control**: Export with customizable settings

### Custom Font Management
- Upload custom fonts (.ttf, .otf, .woff, .woff2)
- Manage font library in settings
- Use custom fonts in text elements
- Persistent font storage across sessions

### Watermark Features
- Drag-and-drop positioning
- Center alignment by default
- Opacity controls
- Size adjustments
- Persistent positioning across edits

## 🤖 AI-Powered Features

### Google Gemini Integration
- **Multiple Models**: Support for various Gemini models
- **Favorites System**: Set preferred models for different tasks
- **API Key Rotation**: Automatic rotation for rate limit management
- **Custom Prompts**: 4 default rewrite prompts (Engaging, Shorten, Professional, Casual)

### Text Generation & Rewriting
- **Caption Enhancement**: Improve existing captions with AI
- **Style Variations**: Generate different tones and styles
- **Length Optimization**: Shorten or expand content as needed
- **Platform Optimization**: Tailor content for specific social platforms

### Image Analysis
- **AI-Powered Understanding**: Analyze images for context
- **Caption Generation**: Create captions based on image content
- **Content Suggestions**: Recommend improvements and enhancements
- **Context Integration**: Combine image analysis with text generation

## 📅 Scheduling Options

### Basic Scheduling (Popup Interface)
1. Click the extension icon
2. Click "🚀 Schedule Posts"
3. Select a category to schedule
4. Configure channels, timing, and intervals
5. Preview and confirm your schedule

### Advanced Scheduling
- **Fixed Intervals**: Schedule posts at regular intervals
- **Random Timing**: Add randomization to avoid detection
- **Optimal Timing**: AI-suggested best posting times
- **Custom Schedules**: Set specific dates and times
- **Bulk Scheduling**: Schedule multiple posts simultaneously

### Album Creation
- Select multiple related images
- Create unified captions and titles
- Schedule as photo albums
- Platform-specific album formatting

### Instant Publishing
- Immediate posting capabilities
- Real-time status updates
- Error handling and retry mechanisms
- Success confirmation and tracking

## 📊 Content Management

### Category Organization
- Create custom categories for different content types
- Organize captured content by topic, campaign, or platform
- Easy switching between categories
- Bulk category assignments

### Search & Filter
- Find specific posts quickly
- Filter by date, category, or status
- Search by caption content or title
- Advanced filtering options

### Statistics & Analytics
- Monitor capture counts and performance
- Track posting success rates
- View category distributions
- Export statistics for analysis

### Data Management
- **Export**: Download captured content as CSV
- **Import**: Bulk import from CSV files
- **Backup**: Create backups of all data
- **Clear**: Remove unwanted or old content

## ⚙️ API Configuration

### AI Post Robot API
- **Endpoint Configuration**: Custom domain support
- **Authentication**: Secure API key management
- **Rate Limiting**: Built-in delays and retry mechanisms
- **Error Handling**: Comprehensive error handling and user feedback

### Google Gemini API
- **Model Selection**: Choose from available Gemini models
- **Key Management**: Multiple API keys with rotation
- **Prompt Customization**: Edit default prompts
- **Usage Monitoring**: Track API usage and quotas

### Security Features
- **API Key Protection**: Masked display and secure storage
- **Encrypted Storage**: Local encryption of sensitive data
- **Secure Communications**: HTTPS-only API communications
- **User Control**: All actions require explicit consent

## 💡 Examples & Use Cases

### Example 1: Basic Content Capture
1. Visit Facebook or Pinterest
2. Extension automatically captures post captions
3. View captured content in popup
4. Organize content into categories

### Example 1.5: Text-Only Post Creation (NEW!)
1. **Visit any supported website** (Facebook, Pinterest)
2. **Select interesting text** (quote, announcement, tip)
3. **Right-click on selected text** → "Save as text post"
4. **Choose category** (e.g., "Quotes", "Tips", "Text Posts")
5. **View in Advanced Scheduler** with 📝 green icon
6. **Use AI rewriting** to create variations
7. **Schedule normally** - posts as text-only content

### Example 2: AI-Enhanced Scheduling
1. Open Advanced Scheduler
2. Select captured or uploaded content
3. Use AI to rewrite captions (4 style options)
4. Schedule posts with optimal timing
5. Monitor publishing status

### Example 3: AI Image+ Creation
1. Open Advanced Scheduler
2. Click "AI Image+" button
3. Use chatbox to describe desired image
4. Choose from predefined prompts or create custom ones
5. Generate multiple variations
6. Save to content library and schedule

### Example 4: Professional Image Editing
1. Select an image post in Advanced Scheduler
2. Click "Edit Image" to open professional editor
3. Apply crop presets for social media dimensions
4. Add watermarks or text overlays
5. Use AI enhancement for improved quality
6. Save changes and continue with scheduling

### Example 5: Bulk Album Creation
1. Select multiple related images
2. Choose "Album" publishing type
3. Add unified caption and title
4. Schedule or publish immediately

### Example 6: Complete Workflow - Mixed Content Campaign
**Scenario**: Creating a social media campaign with both images and text posts

#### Step 1: Capture Content
1. **Text Posts**: Select quotes/tips → Right-click → "Save as text post" → "Campaign"
2. **Image Posts**: Select caption → Right-click image → "Save image link and caption" → "Campaign"
3. **Bulk Images**: Ctrl+click multiple images with same caption

#### Step 2: Organize in Advanced Scheduler
1. **Open Advanced Scheduler** → Switch to "Campaign" category
2. **View Mixed Content**: See both 📝 text posts and 🖼️ image posts
3. **Use Filters**: Toggle "📝 Text Only" to focus on text content
4. **AI Enhancement**: Select posts → Use AI rewrite for variations

#### Step 3: Strategic Scheduling
1. **Select Mix**: Choose both text and image posts
2. **Stagger Content**: Schedule text posts between image posts
3. **Optimal Timing**: Use AI-suggested posting times
4. **Monitor Results**: Track publishing success

## 🔧 Technical Architecture

### Core Technologies
- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Background processing for API calls
- **Content Scripts**: Platform-specific content detection
- **Chrome Storage API**: Local storage for content and settings
- **Modern JavaScript**: ES6+ features with async/await

### File Structure
```
├── manifest.json              # Extension configuration
├── background.js              # Service worker
├── content.js                # Content script
├── popup.html/js             # Main popup interface
├── options.html/js           # Settings page
├── advanced-scheduler.html/js # Advanced scheduling
├── robopost-api.js           # API integration
├── gemini-api.js             # AI integration
├── image-editor-module/      # Image editing
│   ├── image-editor-integration.js
│   ├── ai-image-editor-module.js
│   └── assets/
├── docs/                     # Documentation
└── icons/                    # Extension icons
```

### API Integrations
- **AI Post Robot API**: Complete integration for media upload and scheduling
- **Google Gemini API**: AI text and image generation
- **Rate Limiting**: Built-in delays and retry mechanisms
- **Error Handling**: Comprehensive error handling
- **Bulk Operations**: Efficient batch processing

## 🛠️ Troubleshooting

### Common Issues

#### API Connection Problems
- Verify API keys are correctly entered
- Check internet connection
- Ensure API services are operational
- Try refreshing the extension

#### Content Capture Issues
- Verify you're on supported platforms
- Check if content scripts are loaded
- Try refreshing the page
- Clear extension data and restart

#### Scheduling Problems
- Verify channel configurations
- Check API quotas and limits
- Ensure proper permissions
- Review error messages in console

#### Image Editor Issues
- Ensure sufficient memory available
- Check image file formats
- Verify editor assets are loaded
- Try smaller image sizes

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check docs/ folder for guides
- **API Documentation**: See API knowledge base files
- **Community**: Join discussions and share experiences

### Performance Optimization
- **Memory Management**: Clear unused data regularly
- **API Efficiency**: Use bulk operations when possible
- **Image Optimization**: Compress images before editing
- **Cache Management**: Clear browser cache if needed

---

**Made with ❤️ by Charith Harshana**

*For more information, visit the [GitHub repository](https://github.com/charithharshana/AI-Post-Robot)*
