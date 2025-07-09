/**
 * Image Editor Integration Module
 * Integrates Pixie Image Editor with the Advanced Scheduler
 * This module is self-contained and can be easily added/removed from the extension
 */

class ImageEditorIntegration {
  constructor() {
    this.pixieInstance = null;
    this.currentPostId = null;
    this.currentImageUrl = null;
    this.onSaveCallback = null;
    this.isInitialized = false;

    // Initialize watermark manager
    this.watermarkManager = new WatermarkManager();
  }

  /**
   * Initialize the image editor integration
   */
  async init() {
    try {
      console.log('🔄 Initializing Image Editor Integration...');

      // Always reload editor assets to ensure fresh state
      await this.loadEditorAssets();

      // Wait a bit for the script to fully initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      this.isInitialized = true;
      console.log('✅ Image Editor Integration initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Image Editor Integration:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Load AI Image Editor CSS and JS assets
   */
  async loadEditorAssets() {
    return new Promise((resolve, reject) => {
      console.log('🔄 Loading AI Image Editor assets...');

      // Always reload the script to ensure fresh state for each editor instance
      // Remove existing script if present
      const existingScript = document.querySelector('script[src*="ai-image-editor.js"]');
      if (existingScript) {
        console.log('🔄 Removing existing AI Image Editor script...');
        existingScript.remove();
        // Clear the Pixie constructor to force fresh initialization
        if (window.Pixie) {
          delete window.Pixie;
        }
      }

      // Load AI Image Editor script fresh
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('image-editor-module/ai-image-editor.js');
      script.onload = () => {
        console.log('✅ AI Image Editor script loaded');
        if (window.Pixie) {
          console.log('✅ AI Image Editor constructor available');
        } else {
          console.warn('⚠️ AI Image Editor script loaded but constructor not found');
        }
        resolve();
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load AI Image Editor script:', error);
        reject(new Error('Failed to load AI Image Editor script'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Check if image editor can be used for the selected posts
   */
  canEditImage(selectedPosts) {
    // Only allow editing if exactly one image post is selected
    if (!selectedPosts || selectedPosts.size !== 1) {
      return { canEdit: false, reason: 'Please select exactly one image post to edit' };
    }

    const postId = Array.from(selectedPosts)[0];
    const post = this.getPostById(postId);
    
    if (!post) {
      return { canEdit: false, reason: 'Selected post not found' };
    }

    if (!post.imageUrl) {
      return { canEdit: false, reason: 'Selected post does not have an image' };
    }

    // Check if it's a video (basic check)
    if (post.isVideo || this.isVideoUrl(post.imageUrl)) {
      return { canEdit: false, reason: 'Video editing is not supported' };
    }

    return { canEdit: true, post: post };
  }

  /**
   * Basic check if URL is a video
   */
  isVideoUrl(url) {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Get post by ID (this will be connected to the main app's post management)
   */
  getPostById(postId) {
    // This will be connected to the main application's post management
    if (typeof window.getPostById === 'function') {
      return window.getPostById(postId);
    }
    return null;
  }

  /**
   * Get current watermark properties directly from the ImageEditorIntegration
   */
  getCurrentWatermarkPropertiesDirect() {
    if (!this.watermarkElement) {
      console.warn('⚠️ No watermark element found for direct properties');
      return null;
    }

    const img = this.watermarkElement.querySelector('.watermark-image, img');
    if (!img) {
      console.warn('⚠️ No watermark image found in element');
      return null;
    }

    const imgRect = img.getBoundingClientRect();

    const properties = {
      position: {
        x: parseInt(this.watermarkElement.style.left) || 0,
        y: parseInt(this.watermarkElement.style.top) || 0
      },
      size: {
        width: imgRect.width || img.offsetWidth || 100,
        height: imgRect.height || img.offsetHeight || 'auto'
      },
      opacity: parseFloat(this.watermarkElement.style.opacity) || 1
    };

    console.log('📊 Direct watermark properties:', properties);
    return properties;
  }

  /**
   * Complete reset of the editor state
   */
  async completeReset() {
    console.log('🔄 Performing complete editor reset...');

    // Force cleanup first
    await this.forceCleanup();

    // Reset initialization state to force fresh initialization
    this.isInitialized = false;

    // Clear any cached references
    this.pixieInstance = null;
    this.currentPostId = null;
    this.currentImageUrl = null;
    this.onSaveCallback = null;

    // Wait for cleanup to complete and DOM to settle
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('✅ Complete reset finished');
  }

  /**
   * Load fonts for the image editor
   * @returns {Promise<Array>} Array of font configurations for Pixie
   */
  async loadFonts() {
    try {
      // Load FontManager if not available
      if (typeof window.FontManager === 'undefined') {
        await this.loadFontManager();
      }

      // Load all fonts (default + custom)
      await window.FontManager.loadAllFonts();

      // Get fonts formatted for Pixie
      const fonts = await window.FontManager.getFontsForPixie();

      console.log('✅ Loaded fonts for image editor:', fonts.length);
      return fonts;
    } catch (error) {
      console.error('❌ Failed to load fonts:', error);
      // Return default fonts if custom font loading fails
      return [
        { family: 'Arial', src: null },
        { family: 'Helvetica', src: null },
        { family: 'Times New Roman', src: null },
        { family: 'Georgia', src: null },
        { family: 'Verdana', src: null }
      ];
    }
  }

  /**
   * Load FontManager script
   * @returns {Promise}
   */
  async loadFontManager() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('image-editor-module/font-manager.js');
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Open the image editor with the specified image
   */
  async openEditor(postId, imageUrl, onSaveCallback) {
    console.log('🔄 Opening image editor for post:', postId, 'with image:', imageUrl?.substring(0, 50) + '...');

    // Always perform complete reset before opening new editor
    await this.completeReset();

    // Initialize fresh
    console.log('🔄 Initializing image editor...');
    await this.init();

    this.currentPostId = postId;
    this.currentImageUrl = imageUrl;
    this.onSaveCallback = onSaveCallback;

    try {
      // Create editor modal
      console.log('🔄 Creating editor modal...');
      this.createEditorModal();

      // Initialize Pixie editor
      console.log('🔄 Initializing Pixie editor...');
      await this.initializePixieEditor(imageUrl);

      // Clear any lingering messages from the parent window
      if (window.clearMessage && typeof window.clearMessage === 'function') {
        window.clearMessage();
      }

      console.log('✅ Image editor opened successfully for post:', postId);
    } catch (error) {
      console.error('❌ Failed to open image editor:', error);
      await this.closeEditor();
      throw error;
    }
  }

  /**
   * Create the modal overlay for the image editor
   */
  createEditorModal() {
    // Remove existing modal if any
    this.removeEditorModal();

    // Remove any existing styles to prevent conflicts
    const existingStyle = document.getElementById('image-editor-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add styles first to prevent visual glitch
    const style = document.createElement('style');
    style.id = 'image-editor-styles';
    style.textContent = this.getEditorStyles();
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'image-editor-modal';
    modal.className = 'image-editor-modal';
    modal.innerHTML = `
      <div class="image-editor-overlay">
        <div class="image-editor-container">
          <div class="image-editor-header">
            <h3>🎨 Edit Image</h3>
            <div class="image-editor-actions">
              <button id="image-editor-apply" class="btn btn-success">✅ Apply Changes</button>
              <button id="image-editor-close" class="btn btn-secondary">✖️ Close</button>
            </div>
          </div>
          <div class="image-editor-main">
            <div class="image-editor-sidebar">
              <div class="watermark-panel">
                <div class="watermark-header">
                  <span class="watermark-title">🏷️ Watermarks</span>
                  <div class="watermark-header-actions">
                    <button id="add-watermark-btn" class="btn-compact btn-add">+ Add</button>
                  </div>
                </div>
                <input type="file" id="watermark-file-input" accept="image/*" style="display: none;">
                <div id="watermark-list" class="watermark-list">
                  <!-- Watermarks will be populated here -->
                </div>
                <!-- Watermark controls removed - canvas has built-in delete functionality -->
              </div>
            </div>
            <div id="image-editor-content" class="image-editor-content">
              <div class="loading-message">🎨 Loading image editor...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('image-editor-apply').addEventListener('click', () => this.saveImage());
    document.getElementById('image-editor-close').addEventListener('click', async () => {
      await this.closeEditor();
    });

    // Watermark-only mode button removed due to implementation issues

    // Close on overlay click
    modal.querySelector('.image-editor-overlay').addEventListener('click', async (e) => {
      if (e.target === e.currentTarget) {
        await this.closeEditor();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Watermark UI will be setup after Pixie loads
  }

  /**
   * Get CSS styles for the image editor modal
   */
  getEditorStyles() {
    return `
      .image-editor-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .image-editor-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .image-editor-container {
        background: white;
        border-radius: 8px;
        width: 98%;
        height: 98%;
        max-width: 1600px;
        max-height: 1000px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }

      .image-editor-main {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .image-editor-sidebar {
        width: 220px;
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
        padding: 10px;
        overflow-y: auto;
        flex-shrink: 0;
      }

      .image-editor-header {
        padding: 15px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
        border-radius: 8px 8px 0 0;
        z-index: 10001;
        position: relative;
        flex-shrink: 0;
      }

      .image-editor-header h3 {
        margin: 0;
        color: #2d3748;
        font-size: 18px;
      }

      .image-editor-actions {
        display: flex;
        gap: 10px;
        z-index: 10002;
        position: relative;
      }

      .image-editor-content {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #f9f9f9;
        min-height: 600px;
        display: flex;
        flex-direction: column;
      }

      /* Watermark Panel Styles - Compact Design */
      .watermark-panel {
        margin-bottom: 15px;
      }

      .watermark-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .watermark-title {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .watermark-header-actions {
        display: flex;
        gap: 4px;
      }

      .btn-compact {
        padding: 4px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: white;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-add {
        color: #059669;
        border-color: #059669;
      }

      .btn-add:hover {
        background: #ecfdf5;
      }

      .btn-remove {
        color: #dc2626;
        border-color: #dc2626;
      }

      .btn-remove:hover {
        background: #fef2f2;
      }

      .btn-watermark-only {
        color: #7c3aed;
        border-color: #7c3aed;
      }

      .btn-watermark-only:hover {
        background: #f3f4f6;
      }

      .watermark-list {
        max-height: 150px;
        overflow-y: auto;
        margin-bottom: 10px;
      }

      .watermark-item {
        display: flex;
        align-items: center;
        padding: 6px;
        margin-bottom: 6px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .watermark-item:hover {
        border-color: #007bff;
        background: #f0f8ff;
      }

      .watermark-item.active {
        border-color: #007bff;
        background: #e3f2fd;
      }

      .watermark-item img {
        width: 32px;
        height: 32px;
        object-fit: contain;
        border-radius: 3px;
        margin-right: 8px;
        background: white;
        border: 1px solid #e2e8f0;
      }

      .watermark-item-info {
        flex: 1;
        min-width: 0;
      }

      .watermark-item-name {
        font-size: 11px;
        font-weight: 500;
        color: #374151;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .watermark-item-delete {
        background: none;
        border: none;
        color: #dc3545;
        cursor: pointer;
        padding: 2px;
        border-radius: 3px;
        opacity: 0.7;
        transition: opacity 0.2s ease;
        font-size: 12px;
      }

      .watermark-item-delete:hover {
        opacity: 1;
        background: #fee;
      }

      /* .watermark-controls removed - no longer needed */

      /* .controls-compact removed - no longer needed */

      .control-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 24px;
      }

      .control-row label {
        font-size: 11px;
        font-weight: 500;
        color: #374151;
        min-width: 50px;
        margin: 0;
      }

      .control-input {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        max-width: 120px;
      }

      .control-input input[type="range"] {
        flex: 1;
        min-width: 80px;
      }

      .control-input span {
        font-size: 10px;
        color: #6b7280;
        min-width: 35px;
        text-align: right;
      }

      .control-actions {
        display: flex;
        justify-content: center;
        margin-top: 4px;
      }

      /* Watermark overlay styles */
      .watermark-container {
        position: absolute !important;
        z-index: 1000 !important;
        user-select: none !important;
        pointer-events: auto !important;
      }

      .watermark-container:hover {
        border: 2px dashed #007bff !important;
      }

      .watermark-image {
        display: block !important;
        pointer-events: none !important;
        max-width: none !important;
      }

      /* Watermark container styling */
      .watermark-container {
        box-sizing: border-box;
      }

      .watermark-container:hover {
        border-color: rgba(0, 123, 255, 0.8) !important;
        background: rgba(255, 255, 255, 0.2) !important;
      }

      .watermark-repeat {
        opacity: 0.6 !important;
      }

      .loading-message {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        color: #666;
        text-align: center;
        z-index: 1;
      }

      /* Scoped button styles for image editor only */
      .image-editor-modal .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .image-editor-modal .btn-success {
        background: #48bb78;
        color: white;
      }

      .image-editor-modal .btn-success:hover {
        background: #38a169;
      }

      .image-editor-modal .btn-secondary {
        background: #e2e8f0;
        color: #4a5568;
      }

      .image-editor-modal .btn-secondary:hover {
        background: #cbd5e0;
      }

      /* Ensure Pixie editor fills the container but doesn't cover header */
      .image-editor-content .pi {
        width: 100% !important;
        height: 100% !important;
        min-height: 600px !important;
        position: relative !important;
        z-index: 1 !important;
        display: flex !important;
        flex-direction: column !important;
      }

      /* Ensure Pixie canvas area takes full space */
      .image-editor-content .pi .canvas-container,
      .image-editor-content .pi .main-content {
        flex: 1 !important;
        min-height: 500px !important;
      }

      /* Ensure Pixie toolbar doesn't interfere with our buttons */
      .image-editor-content .pi .toolbar {
        z-index: 2 !important;
      }

      /* Hide Pixie's own close/export buttons if they appear */
      .image-editor-content .pi .close-button,
      .image-editor-content .pi .export-button {
        display: none !important;
      }
    `;
  }

  /**
   * Initialize the AI Image Editor instance
   */
  async initializePixieEditor(imageUrl) {
    if (!window.Pixie) {
      throw new Error('AI Image Editor not loaded');
    }

    const editorContainer = document.getElementById('image-editor-content');
    if (!editorContainer) {
      throw new Error('Editor container not found');
    }

    // Clear container completely and reset any existing state
    editorContainer.innerHTML = '';
    editorContainer.className = 'image-editor-content'; // Reset classes

    // Remove any data attributes that might interfere
    Array.from(editorContainer.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        editorContainer.removeAttribute(attr.name);
      }
    });

    // Remove any event listeners that might be attached
    const newContainer = editorContainer.cloneNode(false);
    editorContainer.parentNode.replaceChild(newContainer, editorContainer);

    // Get the fresh container reference
    const freshContainer = document.getElementById('image-editor-content');
    if (!freshContainer) {
      throw new Error('Fresh editor container not found after cleanup');
    }

    // Ensure container is properly sized and visible
    freshContainer.style.cssText = '';
    freshContainer.style.width = '100%';
    freshContainer.style.height = '100%';
    freshContainer.style.minHeight = '600px';
    freshContainer.style.position = 'relative';
    freshContainer.style.overflow = 'hidden';

    // Handle different image types (data URLs, blob URLs, regular URLs)
    let processedImageUrl = imageUrl;
    try {
      console.log('🔄 Processing image URL:', imageUrl.substring(0, 100) + '...');

      if (imageUrl.startsWith('data:')) {
        // Already a data URL, use as is
        console.log('✅ Using data URL directly');
        processedImageUrl = imageUrl;
      } else if (imageUrl.startsWith('blob:')) {
        // Convert blob URL to data URL
        console.log('🔄 Converting blob URL to data URL');
        processedImageUrl = await this.convertBlobToDataUrl(imageUrl);
      } else if (this.isCrossOriginUrl(imageUrl)) {
        // Convert cross-origin URL to data URL
        console.log('🔄 Converting cross-origin URL to data URL');
        processedImageUrl = await this.convertImageToDataUrl(imageUrl);
      } else {
        console.log('✅ Using regular URL directly');
      }
    } catch (error) {
      console.warn('Failed to process image, using original URL:', error);
      processedImageUrl = imageUrl;
    }

    // Ensure we have the fresh container reference
    const finalContainer = document.getElementById('image-editor-content');
    if (!finalContainer) {
      throw new Error('Final editor container not found');
    }

    // Clear any remaining content
    finalContainer.innerHTML = '';

    // Create Pixie editor with inline mode to prevent overlay conflicts
    console.log('🎨 Initializing Pixie editor with processed image...');

    try {
      console.log('🔄 Creating Pixie instance with config:', {
        selector: '#image-editor-content',
        baseUrl: chrome.runtime.getURL('image-editor-module/assets'),
        imageType: processedImageUrl.startsWith('data:') ? 'data URL' : 'regular URL',
        imageLength: processedImageUrl.length
      });

      // Add a small delay to ensure DOM is ready and fresh
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify container is still available
      if (!document.getElementById('image-editor-content')) {
        throw new Error('Editor container disappeared during initialization');
      }

      // Load fonts before creating Pixie instance
      const fonts = await this.loadFonts();

      this.pixieInstance = new window.Pixie({
        selector: '#image-editor-content',
        baseUrl: chrome.runtime.getURL('image-editor-module/assets'),
        image: processedImageUrl,
        // Enable native watermark support
        watermarkText: '', // Will be set dynamically when watermark is applied
        ui: {
          visible: true,
          mode: 'inline', // Use inline mode instead of overlay
          allowEditorClose: false,
          toolbar: {
            hide: ['export'] // Hide export button since we handle saving
          }
        },
        tools: {
          export: {
            defaultFormat: 'jpeg',
            defaultQuality: 0.9
          },
          text: {
            items: fonts
          }
        },
        onLoad: () => {
          console.log('✅ Pixie editor loaded successfully');
          this.setupWatermarkUI();
        }
      });

      if (!this.pixieInstance) {
        throw new Error('Failed to create Pixie instance');
      }

      console.log('✅ Pixie instance created, checking methods...');
      console.log('Available methods:', {
        hasExport: typeof this.pixieInstance.export === 'function',
        hasTools: !!this.pixieInstance.tools,
        hasToolsExport: !!(this.pixieInstance.tools && this.pixieInstance.tools.export),
        hasReady: !!this.pixieInstance.ready
      });

      // Wait for Pixie to be ready with timeout
      if (this.pixieInstance.ready) {
        await Promise.race([
          this.pixieInstance.ready.then(() => {
            console.log('✅ Pixie editor initialized successfully');
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Pixie initialization timeout')), 10000)
          )
        ]);
      } else {
        console.log('✅ Pixie editor created (no ready promise)');
        // Add a small delay to ensure initialization is complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Validate that the instance is still valid after initialization
      if (!this.pixieInstance) {
        throw new Error('Pixie instance became null after initialization');
      }

    } catch (error) {
      console.error('❌ Failed to create Pixie instance:', error);
      throw error;
    }

    console.log('✅ Pixie editor initialized');
  }

  /**
   * Check if URL is cross-origin
   */
  isCrossOriginUrl(url) {
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return false;
    }

    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Convert blob URL to data URL
   */
  async convertBlobToDataUrl(blobUrl) {
    return new Promise((resolve, reject) => {
      fetch(blobUrl)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });
  }

  /**
   * Convert image to data URL to handle CORS issues
   */
  async convertImageToDataUrl(imageUrl) {
    // Check if it's a Facebook URL which needs special handling
    const isFacebookUrl = imageUrl.includes('facebook.com') || imageUrl.includes('fbcdn.net');

    if (isFacebookUrl && typeof chrome !== 'undefined' && chrome.runtime) {
      console.log('🔄 Using background script for Facebook image in editor...');
      try {
        return await this.fetchImageViaBackground(imageUrl);
      } catch (error) {
        console.warn('Background script failed, trying direct method:', error);
        // Fall through to direct method as fallback
      }
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        if (isFacebookUrl) {
          reject(new Error('Facebook image access blocked: Please save the image locally and upload manually'));
        } else {
          reject(new Error('Failed to load image'));
        }
      };

      img.src = imageUrl;
    });
  }

  /**
   * Fetch image using background script (for CORS-restricted URLs like Facebook)
   */
  async fetchImageViaBackground(imageUrl) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'fetchImage',
        url: imageUrl
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error('No response from background script'));
          return;
        }

        if (!response.success) {
          reject(new Error(response.error || 'Background script failed'));
          return;
        }

        try {
          // Convert base64 back to data URL
          const dataUrl = `data:${response.contentType || 'image/jpeg'};base64,${response.data}`;
          console.log('✅ Successfully fetched Facebook image via background script');
          resolve(dataUrl);
        } catch (error) {
          reject(new Error('Failed to process background script response'));
        }
      });
    });
  }

  /**
   * Save the edited image
   */
  async saveImage() {
    if (!this.pixieInstance) {
      console.error('❌ No Pixie instance available');
      alert('Image editor not properly initialized. Please close and try again.');
      return;
    }

    try {
      // Show loading state
      const applyBtn = document.getElementById('image-editor-apply');
      const originalText = applyBtn ? applyBtn.textContent : '';
      if (applyBtn) {
        applyBtn.textContent = '⏳ Applying...';
        applyBtn.disabled = true;
      }

      console.log('🔄 Starting image export process...');

      // Export the edited image as data URL (including watermarks)
      const editedImageDataUrl = await this.exportImageWithWatermark();

      if (!editedImageDataUrl) {
        throw new Error('Export returned empty result');
      }

      console.log('✅ Image exported, calling save callback...');

      // Call the save callback with the edited image
      if (this.onSaveCallback) {
        await this.onSaveCallback(this.currentPostId, editedImageDataUrl);
      } else {
        throw new Error('No save callback available');
      }

      console.log('✅ Image applied successfully');
      this.closeEditor();

    } catch (error) {
      console.error('❌ Failed to apply image changes:', error);

      // Reset button state
      const applyBtn = document.getElementById('image-editor-apply');
      if (applyBtn) {
        applyBtn.textContent = '✅ Apply Changes';
        applyBtn.disabled = false;
      }

      // Provide more specific error messages
      let errorMessage = 'Failed to apply image changes. ';
      if (error.message.includes('export')) {
        errorMessage += 'The image could not be exported from the editor. ';
      } else if (error.message.includes('save')) {
        errorMessage += 'The image could not be saved. ';
      } else if (error.message.includes('callback')) {
        errorMessage += 'Save function not available. ';
      }
      errorMessage += 'Please try again or close the editor and retry.';

      alert(errorMessage);
    }
  }

  /**
   * Export the current image with watermark applied
   */
  async exportImageWithWatermark() {
    try {
      // With fabric.js integration, watermarks are already part of the canvas
      // So we can directly export from Pixie
      console.log('🔄 Exporting image with fabric.js watermarks...');

      if (!this.pixieInstance) {
        throw new Error('Pixie instance not available');
      }

      // Export directly from Pixie - watermarks are already on the canvas
      const exportedDataUrl = await this.exportImage();

      console.log('✅ Image exported with watermarks included');
      return exportedDataUrl;

    } catch (error) {
      console.error('❌ Failed to export image with watermark:', error);
      // Fallback to base image export
      return await this.exportImage();
    }
  }

  // Note: combineImageWithWatermark method removed - watermarks are now handled natively by fabric.js

  /**
   * Fallback method to draw watermark when canvas positioning fails
   */
  drawWatermarkFallback(ctx, canvas, watermarkImg, watermarkProps) {
    console.log('🔄 Using fallback watermark positioning');

    // Use simple percentage-based positioning with better scaling
    const editorWidth = 1000; // Assume reasonable editor width
    const editorHeight = 700; // Assume reasonable editor height

    const x = Math.max(0, (watermarkProps.position.x / editorWidth) * canvas.width);
    const y = Math.max(0, (watermarkProps.position.y / editorHeight) * canvas.height);

    // Scale watermark size appropriately
    const scaleX = canvas.width / editorWidth;
    const scaleY = canvas.height / editorHeight;
    const avgScale = (scaleX + scaleY) / 2;

    const width = Math.min(watermarkProps.size.width * avgScale, canvas.width * 0.4);
    const height = watermarkProps.size.height === 'auto' ?
      (width * (watermarkImg.height / watermarkImg.width)) :
      Math.min(watermarkProps.size.height * avgScale, canvas.height * 0.4);

    // Apply opacity
    ctx.globalAlpha = watermarkProps.opacity;

    // Draw main watermark
    ctx.drawImage(watermarkImg, x, y, width, height);



    // Reset alpha
    ctx.globalAlpha = 1.0;

    console.log('✅ Fallback watermark drawn:', { x, y, width, height, scale: avgScale });
  }

  /**
   * Export the current image from Pixie editor
   */
  async exportImage() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Attempting to export image from Pixie...');

        if (!this.pixieInstance) {
          reject(new Error('Pixie instance not available'));
          return;
        }

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.warn('⏰ Export timeout, trying alternative method...');
          this.tryAlternativeExport(resolve, reject);
        }, 10000); // 10 second timeout

        // Try different export methods based on Pixie version
        if (this.pixieInstance.export) {
          // Newer Pixie API
          console.log('🔄 Trying export method 1 (pixieInstance.export)...');
          this.pixieInstance.export('image/jpeg', 0.9).then(dataUrl => {
            clearTimeout(timeout);
            console.log('✅ Image exported successfully (method 1)');
            resolve(dataUrl);
          }).catch(error => {
            clearTimeout(timeout);
            console.warn('Export method 1 failed, trying method 2:', error);
            this.tryMethod2Export(resolve, reject);
          });
        } else if (this.pixieInstance.tools && this.pixieInstance.tools.export) {
          // Older Pixie API
          console.log('🔄 Trying export method 2 (tools.export)...');
          this.tryMethod2Export(resolve, reject, timeout);
        } else {
          clearTimeout(timeout);
          console.warn('Standard export methods not available, trying alternative...');
          this.tryAlternativeExport(resolve, reject);
        }

      } catch (error) {
        console.error('❌ Export error:', error);
        reject(error);
      }
    });
  }

  /**
   * Try method 2 export (tools.export)
   */
  tryMethod2Export(resolve, reject, timeout = null) {
    try {
      if (this.pixieInstance.tools && this.pixieInstance.tools.export) {
        // Try different export methods based on Pixie API
        if (typeof this.pixieInstance.tools.export.getDataUrl === 'function') {
          // Method 2a: Direct function call (synchronous)
          try {
            const dataUrl = this.pixieInstance.tools.export.getDataUrl('image/jpeg', 0.9);
            if (dataUrl && typeof dataUrl === 'string') {
              if (timeout) clearTimeout(timeout);
              console.log('✅ Image exported successfully (method 2a - sync)');
              resolve(dataUrl);
              return;
            }
          } catch (syncError) {
            console.log('Method 2a failed, trying async version:', syncError.message);
          }

          // Method 2b: Try as promise (asynchronous)
          try {
            const result = this.pixieInstance.tools.export.getDataUrl('image/jpeg', 0.9);
            if (result && typeof result.then === 'function') {
              result.then(dataUrl => {
                if (timeout) clearTimeout(timeout);
                console.log('✅ Image exported successfully (method 2b - async)');
                resolve(dataUrl);
              }).catch(error => {
                if (timeout) clearTimeout(timeout);
                console.warn('Export method 2b failed, trying alternative:', error);
                this.tryAlternativeExport(resolve, reject);
              });
              return;
            }
          } catch (asyncError) {
            console.log('Method 2b failed:', asyncError.message);
          }
        }

        // Method 2c: Try export() method
        if (typeof this.pixieInstance.tools.export.export === 'function') {
          try {
            const result = this.pixieInstance.tools.export.export('image/jpeg', 0.9);
            if (result && typeof result === 'string') {
              if (timeout) clearTimeout(timeout);
              console.log('✅ Image exported successfully (method 2c)');
              resolve(result);
              return;
            }
          } catch (exportError) {
            console.log('Method 2c failed:', exportError.message);
          }
        }

        if (timeout) clearTimeout(timeout);
        console.warn('All method 2 variants failed, trying alternative...');
        this.tryAlternativeExport(resolve, reject);
      } else {
        if (timeout) clearTimeout(timeout);
        console.warn('tools.export not available, trying alternative...');
        this.tryAlternativeExport(resolve, reject);
      }
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      console.warn('Method 2 export error, trying alternative:', error);
      this.tryAlternativeExport(resolve, reject);
    }
  }

  /**
   * Try alternative export method using canvas
   */
  tryAlternativeExport(resolve, reject) {
    try {
      console.log('🔄 Trying alternative export method...');

      // Try multiple canvas selectors
      const canvasSelectors = [
        '#image-editor-content canvas',
        '.image-editor-content canvas',
        '.pi canvas',
        'canvas'
      ];

      let canvas = null;
      for (const selector of canvasSelectors) {
        const foundCanvas = document.querySelector(selector);
        if (foundCanvas && foundCanvas.width > 0 && foundCanvas.height > 0) {
          canvas = foundCanvas;
          console.log(`✅ Found canvas with selector: ${selector}`);
          break;
        }
      }

      if (canvas) {
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          if (dataUrl && dataUrl.length > 100) { // Basic validation
            console.log('✅ Image exported successfully (alternative method)');
            resolve(dataUrl);
            return;
          } else {
            console.warn('Canvas export produced invalid data URL');
          }
        } catch (canvasError) {
          console.warn('Canvas toDataURL failed:', canvasError);
        }
      }

      // If canvas method fails, try to get the original image
      console.log('🔄 Canvas export failed, trying to return original image...');
      if (this.currentImageUrl) {
        console.log('✅ Returning original image as fallback');
        resolve(this.currentImageUrl);
      } else {
        reject(new Error('No export method available: Canvas not found and no original image URL'));
      }

    } catch (error) {
      console.error('❌ Alternative export failed:', error);
      reject(error);
    }
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      // Don't await here to avoid blocking the event handler
      this.closeEditor().catch(error => {
        console.error('Error closing editor via keyboard:', error);
      });
    }
  }

  /**
   * Setup watermark UI functionality
   */
  setupWatermarkUI() {
    // Prevent duplicate setup
    if (this.watermarkUISetup) {
      console.log('⚠️ Watermark UI already setup, skipping...');
      return;
    }

    console.log('🔄 Setting up watermark UI...');

    // Pass Pixie instance to watermark manager
    if (this.pixieInstance) {
      this.watermarkManager.setPixieInstance(this.pixieInstance);
    }

    // Clean up any existing listeners first
    this.cleanupWatermarkListeners();

    // Add watermark button
    const addWatermarkBtn = document.getElementById('add-watermark-btn');
    const fileInput = document.getElementById('watermark-file-input');

    if (addWatermarkBtn && fileInput) {
      // Store references for cleanup
      this.watermarkUploadHandler = () => {
        fileInput.click();
      };

      this.watermarkFileChangeHandler = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            await this.handleWatermarkUpload(file);
            // Clear the input to allow selecting the same file again if needed
            e.target.value = '';
          } catch (error) {
            console.error('Failed to upload watermark:', error);
            alert('Failed to upload watermark. Please try again.');
            // Clear the input on error too
            e.target.value = '';
          }
        }
      };

      addWatermarkBtn.addEventListener('click', this.watermarkUploadHandler);
      fileInput.addEventListener('change', this.watermarkFileChangeHandler);
    }

    // Setup watermark controls
    this.setupWatermarkControls();

    // Load existing watermarks
    this.loadWatermarkList();

    // Mark as setup
    this.watermarkUISetup = true;
    console.log('✅ Watermark UI setup complete');
  }

  /**
   * Clean up existing watermark event listeners to prevent duplicates
   */
  cleanupWatermarkListeners() {
    const addWatermarkBtn = document.getElementById('add-watermark-btn');
    const fileInput = document.getElementById('watermark-file-input');

    if (addWatermarkBtn && this.watermarkUploadHandler) {
      addWatermarkBtn.removeEventListener('click', this.watermarkUploadHandler);
    }

    if (fileInput && this.watermarkFileChangeHandler) {
      fileInput.removeEventListener('change', this.watermarkFileChangeHandler);
    }

    // Clear handler references
    this.watermarkUploadHandler = null;
    this.watermarkFileChangeHandler = null;
  }

  /**
   * Handle watermark file upload
   */
  async handleWatermarkUpload(file) {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select an image file');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Image file is too large. Please select a file under 5MB.');
    }

    // Add to watermark manager
    const watermark = await this.watermarkManager.addWatermark(file);

    // Refresh the watermark list
    this.loadWatermarkList();

    console.log('✅ Watermark uploaded successfully:', watermark.name);
  }

  /**
   * Load and display watermark list
   */
  loadWatermarkList() {
    const watermarkList = document.getElementById('watermark-list');
    if (!watermarkList) return;

    const watermarks = this.watermarkManager.getWatermarks();

    if (watermarks.length === 0) {
      watermarkList.innerHTML = '<p style="color: #6b7280; font-size: 12px; text-align: center; padding: 20px;">No watermarks added yet</p>';
      return;
    }

    watermarkList.innerHTML = watermarks.map(watermark => `
      <div class="watermark-item" data-watermark-id="${watermark.id}">
        <img src="${watermark.dataUrl}" alt="${watermark.name}">
        <div class="watermark-item-info">
          <div class="watermark-item-name">${watermark.name}</div>
        </div>
        <button class="watermark-item-delete" data-watermark-id="${watermark.id}" title="Delete watermark">
          🗑️
        </button>
      </div>
    `).join('');

    // Add event listeners
    watermarkList.querySelectorAll('.watermark-item').forEach(item => {
      const watermarkId = item.dataset.watermarkId;

      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('watermark-item-delete')) {
          this.selectWatermark(watermarkId);
        }
      });
    });

    watermarkList.querySelectorAll('.watermark-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const watermarkId = btn.dataset.watermarkId;
        this.deleteWatermark(watermarkId);
      });
    });
  }

  /**
   * Select and apply a watermark
   */
  selectWatermark(watermarkId) {
    // Update UI
    document.querySelectorAll('.watermark-item').forEach(item => {
      item.classList.remove('active');
    });

    const selectedItem = document.querySelector(`[data-watermark-id="${watermarkId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
    }

    // Apply watermark
    this.watermarkManager.applyWatermark(watermarkId);

    // No controls to show - canvas handles everything

    console.log('✅ Watermark selected:', watermarkId);
  }

  /**
   * Delete a watermark
   */
  deleteWatermark(watermarkId) {
    if (confirm('Are you sure you want to delete this watermark?')) {
      this.watermarkManager.removeWatermark(watermarkId);
      this.loadWatermarkList();

      // No controls to hide - canvas handles everything
    }
  }

  /**
   * Setup watermark control event listeners
   */
  setupWatermarkControls() {
    console.log('🔄 Setting up watermark controls...');

    // Clean up existing control listeners first
    this.cleanupWatermarkControlListeners();

    // No remove button needed - canvas has built-in delete functionality

    console.log('✅ Watermark controls setup complete');
  }

  /**
   * Clean up watermark control event listeners
   */
  cleanupWatermarkControlListeners() {
    // No listeners to clean up - canvas handles everything
    console.log('🧹 Watermark control listeners cleaned up (none needed)');
  }

  /**
   * Open watermark-only mode (simplified interface for just adding watermarks)
   * REMOVED: This feature was causing errors and is not needed
   */
  async openWatermarkOnlyMode() {
    console.log('⚠️ Watermark-only mode has been removed due to implementation issues');
    alert('Watermark-only mode has been removed. Please use the full image editor to add watermarks.');
  }

  /**
   * Create watermark-only modal
   */
  createWatermarkOnlyModal() {
    // Remove existing modal if any
    this.removeEditorModal();

    const style = document.createElement('style');
    style.id = 'watermark-only-styles';
    style.textContent = this.getWatermarkOnlyStyles();
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'watermark-only-modal';
    modal.className = 'watermark-only-modal';
    modal.innerHTML = `
      <div class="watermark-only-overlay">
        <div class="watermark-only-container">
          <div class="watermark-only-header">
            <h3>🏷️ Add Watermark</h3>
            <button id="watermark-only-close" class="btn btn-secondary">✖️ Close</button>
          </div>
          <div class="watermark-only-content">
            <div class="image-drop-zone" id="image-drop-zone">
              <div class="drop-zone-content">
                <div class="drop-zone-icon">📁</div>
                <div class="drop-zone-text">Drop image here or click to select</div>
                <input type="file" id="watermark-image-input" accept="image/*" style="display: none;">
              </div>
            </div>
            <div id="watermark-preview-area" class="watermark-preview-area" style="display: none;">
              <div class="preview-container">
                <div id="preview-image-container" class="preview-image-container"></div>
              </div>
              <div class="watermark-controls-panel">
                <div class="watermark-panel">
                  <div class="watermark-header">
                    <span class="watermark-title">🏷️ Watermarks</span>
                    <button id="add-watermark-btn-only" class="btn-compact btn-add">+ Add</button>
                  </div>
                  <input type="file" id="watermark-file-input-only" accept="image/*" style="display: none;">
                  <div id="watermark-list-only" class="watermark-list"></div>
                  <!-- Watermark controls removed - canvas has built-in functionality -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup event listeners for watermark-only mode
    this.setupWatermarkOnlyListeners();
  }

  /**
   * Get styles for watermark-only mode
   */
  getWatermarkOnlyStyles() {
    return `
      .watermark-only-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .watermark-only-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .watermark-only-container {
        background: white;
        border-radius: 8px;
        width: 90%;
        height: 90%;
        max-width: 1200px;
        max-height: 800px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      }

      .watermark-only-header {
        padding: 15px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
        border-radius: 8px 8px 0 0;
      }

      .watermark-only-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .image-drop-zone {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px dashed #d1d5db;
        margin: 20px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .image-drop-zone:hover {
        border-color: #007bff;
        background: #f8f9ff;
      }

      .drop-zone-content {
        text-align: center;
        padding: 40px;
      }

      .drop-zone-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .drop-zone-text {
        font-size: 16px;
        color: #6b7280;
      }

      .watermark-preview-area {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .preview-container {
        flex: 1;
        position: relative;
        background: #f9f9f9;
        overflow: hidden;
      }

      .preview-image-container {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .watermark-controls-panel {
        width: 250px;
        background: #f8fafc;
        border-left: 1px solid #e2e8f0;
        padding: 15px;
        overflow-y: auto;
      }
    `;
  }

  /**
   * Setup event listeners for watermark-only mode
   */
  setupWatermarkOnlyListeners() {
    // Close button
    const closeBtn = document.getElementById('watermark-only-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeWatermarkOnlyMode();
      });
    }

    // Image drop zone
    const dropZone = document.getElementById('image-drop-zone');
    const imageInput = document.getElementById('watermark-image-input');

    if (dropZone && imageInput) {
      dropZone.addEventListener('click', () => imageInput.click());

      imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.loadImageForWatermarking(file);
        }
      });

      // Drag and drop functionality
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007bff';
        dropZone.style.background = '#f8f9ff';
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#d1d5db';
        dropZone.style.background = '';
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#d1d5db';
        dropZone.style.background = '';

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
          this.loadImageForWatermarking(files[0]);
        }
      });
    }

    // Watermark controls (similar to main editor but with different IDs)
    // this.setupWatermarkOnlyControls(); // Removed due to implementation issues
  }

  /**
   * Close watermark-only mode
   */
  closeWatermarkOnlyMode() {
    const modal = document.getElementById('watermark-only-modal');
    if (modal) {
      modal.remove();
    }

    const style = document.getElementById('watermark-only-styles');
    if (style) {
      style.remove();
    }
  }

  /**
   * Force cleanup of the editor (more thorough than regular close)
   */
  async forceCleanup() {
    console.log('🔄 Force cleaning up image editor...');

    // Clean up watermark elements
    if (this.watermarkManager) {
      this.watermarkManager.removeWatermarkElement();
    }

    // Clean up watermark UI listeners
    this.cleanupWatermarkListeners();
    this.cleanupWatermarkControlListeners();
    this.watermarkUISetup = false;

    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));

    // Destroy AI Image Editor instance more thoroughly
    if (this.pixieInstance) {
      try {
        console.log('🔄 Destroying Pixie instance...');

        // Try multiple cleanup methods
        if (typeof this.pixieInstance.destroy === 'function') {
          await this.pixieInstance.destroy();
        } else if (typeof this.pixieInstance.close === 'function') {
          await this.pixieInstance.close();
        } else if (typeof this.pixieInstance.dispose === 'function') {
          await this.pixieInstance.dispose();
        }

        // Force clear the instance
        this.pixieInstance = null;
        console.log('✅ Pixie instance destroyed');
      } catch (error) {
        console.warn('Warning during AI Image Editor cleanup:', error);
        this.pixieInstance = null;
      }
    }

    // Remove modal and clean up DOM
    this.removeEditorModal();

    // Clean up any remaining Pixie elements that might be left behind
    const pixieElements = document.querySelectorAll('.pi, .pixie-editor, [class*="pixie"], .pixie, .pixie-container, .pixie-overlay, .pixie-modal');
    console.log(`🔄 Removing ${pixieElements.length} orphaned Pixie elements...`);
    pixieElements.forEach(el => {
      try {
        el.remove();
      } catch (e) {
        console.warn('Could not remove pixie element:', e);
      }
    });

    // Clean up any canvas elements that might be left behind
    const canvasElements = document.querySelectorAll('canvas[data-pixie], canvas.pixie-canvas, canvas[class*="pixie"]');
    console.log(`🔄 Removing ${canvasElements.length} orphaned canvas elements...`);
    canvasElements.forEach(canvas => {
      try {
        canvas.remove();
      } catch (e) {
        console.warn('Could not remove canvas element:', e);
      }
    });

    // Clean up any style elements that might be left behind
    const pixieStyles = document.querySelectorAll('style[data-pixie], style[id*="pixie"]');
    console.log(`🔄 Removing ${pixieStyles.length} orphaned Pixie style elements...`);
    pixieStyles.forEach(style => {
      try {
        style.remove();
      } catch (e) {
        console.warn('Could not remove pixie style element:', e);
      }
    });

    // Restore body scroll
    document.body.style.overflow = '';

    // Reset state completely
    this.currentPostId = null;
    this.currentImageUrl = null;
    this.onSaveCallback = null;

    // Clear any global Pixie state that might interfere
    if (window.Pixie) {
      console.log('🔄 Clearing global Pixie state...');
      // Don't delete window.Pixie here as we'll reload it fresh next time
    }

    console.log('✅ Force cleanup completed');
  }

  /**
   * Close the image editor
   */
  async closeEditor() {
    await this.forceCleanup();
  }

  /**
   * Remove the editor modal from DOM
   */
  removeEditorModal() {
    // Remove the main modal
    const modal = document.getElementById('image-editor-modal');
    if (modal) {
      modal.remove();
    }

    // Remove styles properly to prevent style conflicts
    const style = document.getElementById('image-editor-styles');
    if (style) {
      style.remove();
    }

    // Clean up any orphaned modals or overlays that might exist
    const orphanedModals = document.querySelectorAll('.image-editor-modal, .image-editor-overlay');
    orphanedModals.forEach(el => {
      try {
        el.remove();
      } catch (e) {
        console.warn('Could not remove orphaned modal element:', e);
      }
    });
  }

  /**
   * Get current watermark properties for WatermarkManager
   */
  getCurrentWatermarkProperties() {
    if (!this.watermarkElement) {
      console.warn('⚠️ WatermarkManager: No watermark element found for properties');
      return null;
    }

    const img = this.watermarkElement.querySelector('.watermark-image');
    if (!img) {
      console.warn('⚠️ WatermarkManager: No watermark image found in element');
      return null;
    }

    const imgRect = img.getBoundingClientRect();

    const properties = {
      position: {
        x: parseInt(this.watermarkElement.style.left) || 0,
        y: parseInt(this.watermarkElement.style.top) || 0
      },
      size: {
        width: imgRect.width || img.offsetWidth || 100,
        height: imgRect.height || img.offsetHeight || 'auto'
      },
      opacity: parseFloat(this.watermarkElement.style.opacity) || 1
    };

    console.log('📊 WatermarkManager - Current watermark properties:', properties);
    return properties;
  }

  /**
   * Test both watermark repeat pattern and saving functionality
   */
  async testWatermarkFeatures() {
    console.log('🧪 Testing all watermark features...');

    // Test saving
    if (this.watermarkManager) {
      setTimeout(async () => {
        await this.watermarkManager.testWatermarkSaving();
      }, 1000);
    } else {
      console.error('❌ Watermark manager not available');
    }
  }
}

/**
 * Watermark Manager Class
 * Handles watermark storage, management, and application using Pixie's native fabric.js system
 */
class WatermarkManager {
  constructor() {
    this.watermarks = [];
    this.currentWatermark = null;
    this.watermarkObjects = []; // Store fabric.js watermark objects
    this.pixieInstance = null;
    this.loadWatermarksFromStorage();
  }

  /**
   * Set the Pixie instance for fabric.js integration
   */
  setPixieInstance(pixieInstance) {
    this.pixieInstance = pixieInstance;
    console.log('✅ Pixie instance set for watermark manager');
  }

  /**
   * Load watermarks from local storage
   */
  async loadWatermarksFromStorage() {
    try {
      const stored = localStorage.getItem('ai-post-robot-watermarks');
      if (stored) {
        this.watermarks = JSON.parse(stored);
        console.log('✅ Loaded watermarks from storage:', this.watermarks.length);
      }
    } catch (error) {
      console.error('❌ Failed to load watermarks from storage:', error);
      this.watermarks = [];
    }
  }

  /**
   * Save watermarks to local storage
   */
  async saveWatermarksToStorage() {
    try {
      localStorage.setItem('ai-post-robot-watermarks', JSON.stringify(this.watermarks));
      console.log('✅ Saved watermarks to storage:', this.watermarks.length);
    } catch (error) {
      console.error('❌ Failed to save watermarks to storage:', error);
    }
  }

  /**
   * Add a new watermark to the collection
   */
  async addWatermark(file, name) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const watermark = {
          id: Date.now().toString(),
          name: name || file.name,
          dataUrl: e.target.result,
          createdAt: new Date().toISOString()
        };

        this.watermarks.push(watermark);
        this.saveWatermarksToStorage();
        console.log('✅ Added watermark:', watermark.name);
        resolve(watermark);
      };
      reader.onerror = () => reject(new Error('Failed to read watermark file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Remove a watermark from the collection
   */
  removeWatermark(watermarkId) {
    const index = this.watermarks.findIndex(w => w.id === watermarkId);
    if (index !== -1) {
      const removed = this.watermarks.splice(index, 1)[0];
      this.saveWatermarksToStorage();
      console.log('✅ Removed watermark:', removed.name);
      return true;
    }
    return false;
  }

  /**
   * Get all watermarks
   */
  getWatermarks() {
    return this.watermarks;
  }

  /**
   * Get watermark by ID
   */
  getWatermark(watermarkId) {
    return this.watermarks.find(w => w.id === watermarkId);
  }

  /**
   * Apply watermark to the image editor using fabric.js
   */
  applyWatermark(watermarkId, options = {}) {
    console.log('🔄 applyWatermark called with:', { watermarkId, options });

    const watermark = this.getWatermark(watermarkId);
    if (!watermark) {
      console.error('❌ Watermark not found:', watermarkId);
      return false;
    }

    console.log('✅ Watermark found:', watermark.name);

    if (!this.pixieInstance) {
      console.error('❌ Pixie instance not available');
      return false;
    }

    if (!this.pixieInstance.fabric) {
      console.error('❌ Pixie fabric canvas not available');
      console.log('Available pixie properties:', Object.keys(this.pixieInstance));
      return false;
    }

    console.log('✅ Pixie instance and fabric canvas available');

    this.currentWatermark = watermark;
    this.createWatermarkOnCanvas(watermark, options);
    return true;
  }

  /**
   * Create watermark on fabric.js canvas
   */
  createWatermarkOnCanvas(watermark, options = {}) {
    console.log('🔄 createWatermarkOnCanvas called with:', watermark.name);

    if (!this.pixieInstance || !this.pixieInstance.fabric) {
      console.error('❌ Pixie instance or fabric canvas not available');
      return;
    }

    console.log('✅ Pixie instance and fabric available');

    // Remove existing watermarks
    this.removeAllWatermarks();

    const canvas = this.pixieInstance.fabric;
    console.log('✅ Canvas obtained:', canvas.constructor.name);

    // Create watermark image object using the fabric instance from Pixie
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('✅ Watermark image loaded successfully');

      // Check if fabric is available globally (loaded by Pixie)
      if (typeof fabric === 'undefined') {
        console.error('❌ Fabric.js not available globally');
        console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('fabric')));
        return;
      }

      console.log('✅ Fabric.js available globally');
      const fabricImg = new fabric.Image(img);

      // Calculate scale to maintain aspect ratio - minimum 250px width, up to 1/3 of canvas size
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const maxWidth = Math.max(250, Math.min(canvasWidth / 3, canvasHeight / 3));
      const scale = maxWidth / img.width;

      console.log('🔍 Canvas dimensions:', { canvasWidth, canvasHeight });
      console.log('🔍 Watermark scale:', scale);

      fabricImg.set({
        scaleX: options.scaleX || scale,
        scaleY: options.scaleY || scale, // Use same scale to maintain aspect ratio
        opacity: options.opacity || 0.7,
        selectable: true,
        moveable: true,
        hasControls: true,
        hasBorders: true,
        name: 'watermark',
        watermarkId: watermark.id
      });

      // Add to canvas
      canvas.add(fabricImg);

      // Use the proper Pixie method to center the watermark in viewport
      fabricImg.viewportCenter();

      canvas.setActiveObject(fabricImg);
      canvas.renderAll();

      // Store reference
      this.watermarkObjects.push(fabricImg);

      console.log('✅ Watermark added to fabric canvas');
    };

    img.onerror = (error) => {
      console.error('❌ Failed to load watermark image:', error);
      console.log('Watermark dataUrl:', watermark.dataUrl.substring(0, 100) + '...');
    };

    console.log('🔄 Loading watermark image from dataUrl...');
    img.src = watermark.dataUrl;
  }

  /**
   * Remove all watermarks from canvas
   */
  removeAllWatermarks() {
    if (!this.pixieInstance || !this.pixieInstance.fabric) {
      return;
    }

    const canvas = this.pixieInstance.fabric;

    // Remove all watermark objects
    this.watermarkObjects.forEach(obj => {
      canvas.remove(obj);
    });

    this.watermarkObjects = [];
    canvas.renderAll();

    console.log('✅ All watermarks removed from canvas');
  }




  /**
   * Find the actual canvas and position watermark
   */
  findAndPositionWatermark(watermark, options, editorContent) {
    // Try multiple selectors to find the actual image canvas
    const canvasSelectors = [
      'canvas[data-fabric="main"]',
      '.canvas-container canvas',
      '.pi canvas',
      'canvas'
    ];

    let pixieCanvas = null;
    for (const selector of canvasSelectors) {
      const canvas = editorContent.querySelector(selector);
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        pixieCanvas = canvas;
        console.log(`✅ Found canvas for watermark positioning: ${selector}`);
        break;
      }
    }

    let baseX = 100, baseY = 100;

    if (pixieCanvas) {
      const canvasRect = pixieCanvas.getBoundingClientRect();
      const editorRect = editorContent.getBoundingClientRect();

      // Calculate position relative to the actual image canvas
      baseX = Math.max(50, canvasRect.left - editorRect.left + 50);
      baseY = Math.max(50, canvasRect.top - editorRect.top + 50);

      console.log('📍 Watermark positioning:', {
        canvasRect,
        editorRect,
        baseX,
        baseY
      });
    } else {
      console.warn('⚠️ Could not find canvas for watermark positioning, using default position');
    }

    // Apply default options with better positioning
    const defaultOptions = {
      position: { x: baseX, y: baseY },
      size: { width: 120, height: 'auto' },
      opacity: 0.7,
      repeat: false,
      spacing: 50
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Create watermark container
    const watermarkContainer = document.createElement('div');
    watermarkContainer.id = 'watermark-container';
    watermarkContainer.className = 'watermark-container';

    // Create watermark image
    const watermarkImg = document.createElement('img');
    watermarkImg.src = watermark.dataUrl;
    watermarkImg.className = 'watermark-image';
    watermarkImg.draggable = false;

    // Set initial styles with better visibility and precise control
    watermarkContainer.style.cssText = `
      position: absolute;
      left: ${finalOptions.position.x}px;
      top: ${finalOptions.position.y}px;
      opacity: ${finalOptions.opacity};
      cursor: grab;
      z-index: 1000;
      user-select: none;
      border: 2px solid transparent;
      border-radius: 4px;
      transition: border-color 0.2s ease;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px;
      box-sizing: border-box;
      min-width: 20px;
      min-height: 20px;
    `;

    watermarkImg.style.cssText = `
      width: ${finalOptions.size.width}px;
      height: ${finalOptions.size.height === 'auto' ? 'auto' : finalOptions.size.height + 'px'};
      display: block;
      pointer-events: none;
    `;

    watermarkContainer.appendChild(watermarkImg);
    editorContent.appendChild(watermarkContainer);

    this.watermarkElement = watermarkContainer;
    this.setupWatermarkInteractions();



    console.log('✅ Watermark applied:', watermark.name);
  }

  /**
   * Setup drag and resize interactions for watermark
   */
  setupWatermarkInteractions() {
    if (!this.watermarkElement) return;

    // Track if this was a drag operation to prevent click removal
    let wasDragged = false;

    // Mouse events for dragging
    this.watermarkElement.addEventListener('mousedown', (e) => {
      wasDragged = false;
      this.handleMouseDown(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        wasDragged = true;
        this.handleMouseMove(e);
      }
    });

    document.addEventListener('mouseup', (e) => {
      this.handleMouseUp(e);
    });

    // Only prevent click if it wasn't a drag operation
    this.watermarkElement.addEventListener('click', (e) => {
      if (wasDragged) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎯 Watermark drag completed - preventing click removal');
      }
      wasDragged = false;
    });

    // Hover effects with better visibility and control
    this.watermarkElement.addEventListener('mouseenter', () => {
      if (!this.isDragging) {
        this.watermarkElement.style.borderColor = 'rgba(0, 123, 255, 0.8)';
        this.watermarkElement.style.background = 'rgba(255, 255, 255, 0.15)';
        this.watermarkElement.style.cursor = 'grab';
        this.watermarkElement.style.transform = 'scale(1.02)';
        this.watermarkElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
      }
    });

    this.watermarkElement.addEventListener('mouseleave', () => {
      if (!this.isDragging) {
        this.watermarkElement.style.borderColor = 'transparent';
        this.watermarkElement.style.background = 'rgba(255, 255, 255, 0.05)';
        this.watermarkElement.style.cursor = 'grab';
        this.watermarkElement.style.transform = 'scale(1)';
        this.watermarkElement.style.boxShadow = 'none';
      }
    });
  }

  /**
   * Handle mouse down for dragging
   */
  handleMouseDown(e) {
    if (!this.watermarkElement) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent Pixie editor from handling this event

    this.isDragging = true;
    this.watermarkElement.style.borderColor = '#007bff';
    this.watermarkElement.style.cursor = 'grabbing';

    const rect = this.watermarkElement.getBoundingClientRect();

    // Calculate precise drag offset relative to where the mouse clicked within the watermark
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Prevent text selection during drag

    console.log('🎯 Watermark drag started:', {
      mousePos: { x: e.clientX, y: e.clientY },
      watermarkRect: rect,
      dragOffset: this.dragOffset
    });
  }

  /**
   * Handle mouse move for dragging
   */
  handleMouseMove(e) {
    if (!this.isDragging || !this.watermarkElement) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent Pixie editor from handling this event

    const editorContent = document.getElementById('image-editor-content');
    const parentRect = editorContent.getBoundingClientRect();

    // Calculate new position based on mouse position and drag offset
    const newX = e.clientX - parentRect.left - this.dragOffset.x;
    const newY = e.clientY - parentRect.top - this.dragOffset.y;

    // Try to find the actual canvas bounds for constraint
    const canvas = editorContent.querySelector('canvas');
    let constraintBounds = parentRect;

    if (canvas) {
      const canvasRect = canvas.getBoundingClientRect();
      // Calculate canvas-relative bounds within the editor content
      const canvasOffsetX = canvasRect.left - parentRect.left;
      const canvasOffsetY = canvasRect.top - parentRect.top;

      constraintBounds = {
        left: canvasOffsetX,
        top: canvasOffsetY,
        width: canvasRect.width,
        height: canvasRect.height
      };
    } else {
      constraintBounds = {
        left: 0,
        top: 0,
        width: parentRect.width,
        height: parentRect.height
      };
    }

    // Apply constraints to keep watermark within canvas bounds
    const minX = Math.max(0, constraintBounds.left);
    const minY = Math.max(0, constraintBounds.top);
    const maxX = constraintBounds.left + constraintBounds.width - this.watermarkElement.offsetWidth;
    const maxY = constraintBounds.top + constraintBounds.height - this.watermarkElement.offsetHeight;

    const constrainedX = Math.max(minX, Math.min(newX, maxX));
    const constrainedY = Math.max(minY, Math.min(newY, maxY));

    // Apply the new position
    this.watermarkElement.style.left = constrainedX + 'px';
    this.watermarkElement.style.top = constrainedY + 'px';

    // Update repeat pattern if enabled

  }

  /**
   * Handle mouse up for dragging
   */
  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = ''; // Restore text selection

      if (this.watermarkElement) {
        this.watermarkElement.style.borderColor = 'transparent';
        this.watermarkElement.style.cursor = 'grab'; // Reset cursor to grab
      }

      // Clear any pending repeat pattern updates
      clearTimeout(this.repeatUpdateTimeout);

      console.log('🎯 Watermark drag completed');
    }
  }

  /**
   * Remove watermark element
   */
  removeWatermarkElement() {
    const existing = document.getElementById('watermark-container');
    if (existing) {
      existing.remove();
    }

    // Remove repeat elements
    const editorContent = document.getElementById('image-editor-content');
    if (editorContent) {
      const repeats = editorContent.querySelectorAll('.watermark-repeat');
      repeats.forEach(el => el.remove());
    }

    this.watermarkElement = null;
    this.currentWatermark = null;
  }

  /**
   * Update watermark properties
   */
  updateWatermark(properties) {
    if (!this.watermarkElement) return;

    if (properties.opacity !== undefined) {
      this.watermarkElement.style.opacity = properties.opacity;
    }

    if (properties.size) {
      const img = this.watermarkElement.querySelector('.watermark-image');
      if (img) {
        if (properties.size.width) {
          img.style.width = properties.size.width + 'px';
        }
        if (properties.size.height && properties.size.height !== 'auto') {
          img.style.height = properties.size.height + 'px';
        } else if (properties.size.height === 'auto') {
          img.style.height = 'auto';
        }
      }
    }

    if (properties.position) {
      this.watermarkElement.style.left = properties.position.x + 'px';
      this.watermarkElement.style.top = properties.position.y + 'px';
    }


  }

  /**
   * Debug method to show watermark info
   */
  debugWatermarkInfo() {
    console.log('🔍 Watermark Debug Info:');
    console.log('Current watermark:', this.currentWatermark);
    console.log('Watermark element:', this.watermarkElement);

    if (this.watermarkElement) {
      const rect = this.watermarkElement.getBoundingClientRect();
      console.log('Watermark element rect:', rect);
      console.log('Watermark element styles:', {
        left: this.watermarkElement.style.left,
        top: this.watermarkElement.style.top,
        opacity: this.watermarkElement.style.opacity,
        zIndex: this.watermarkElement.style.zIndex
      });
    }

    const props = this.getCurrentWatermarkProperties();
    console.log('Current watermark properties:', props);

    const editorContent = document.getElementById('image-editor-content');
    if (editorContent) {
      const canvas = editorContent.querySelector('canvas');
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const editorRect = editorContent.getBoundingClientRect();
        console.log('Canvas info:', {
          canvasRect,
          editorRect,
          canvasOffset: {
            x: canvasRect.left - editorRect.left,
            y: canvasRect.top - editorRect.top
          }
        });
      }
    }

    const repeatElements = document.querySelectorAll('.watermark-repeat');
    console.log(`Found ${repeatElements.length} repeat elements`);
    repeatElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      console.log(`Repeat ${index + 1}:`, {
        rect,
        dataX: el.getAttribute('data-repeat-x'),
        dataY: el.getAttribute('data-repeat-y'),
        visible: rect.width > 0 && rect.height > 0
      });
    });
  }

  /**
   * Get current watermark properties
   */
  getCurrentWatermarkProperties() {
    if (!this.watermarkElement) {
      console.warn('⚠️ No watermark element found for properties');
      return null;
    }

    const img = this.watermarkElement.querySelector('.watermark-image');
    if (!img) {
      console.warn('⚠️ No watermark image found in element');
      return null;
    }

    const imgRect = img.getBoundingClientRect();

    const properties = {
      position: {
        x: parseInt(this.watermarkElement.style.left) || 0,
        y: parseInt(this.watermarkElement.style.top) || 0
      },
      size: {
        width: imgRect.width || img.offsetWidth || 100,
        height: imgRect.height || img.offsetHeight || 'auto'
      },
      opacity: parseFloat(this.watermarkElement.style.opacity) || 1
    };

    console.log('📊 Current watermark properties:', properties);
    return properties;
  }

  /**
   * Test watermark saving functionality
   */
  async testWatermarkSaving() {
    console.log('🧪 Testing watermark saving functionality...');

    try {
      // Test export with watermark
      const exportedImage = await this.exportImageWithWatermark();

      if (exportedImage) {
        console.log('✅ Image exported successfully with watermark');
        console.log('📊 Exported image data URL length:', exportedImage.length);

        // Create a test image element to verify the export
        const testImg = document.createElement('img');
        testImg.src = exportedImage;
        testImg.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          max-width: 200px;
          max-height: 200px;
          border: 2px solid #007bff;
          border-radius: 5px;
          z-index: 10000;
          background: white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;
        testImg.title = 'Test Export - Click to remove';
        testImg.onclick = () => testImg.remove();

        document.body.appendChild(testImg);

        console.log('✅ Test export image displayed in top-right corner (click to remove)');

        // Auto-remove after 10 seconds
        setTimeout(() => {
          if (testImg.parentNode) {
            testImg.remove();
            console.log('🗑️ Test export image auto-removed');
          }
        }, 10000);

      } else {
        console.error('❌ Failed to export image with watermark');
      }
    } catch (error) {
      console.error('❌ Error testing watermark saving:', error);
    }
  }
}

// Export for use in other modules
window.ImageEditorIntegration = ImageEditorIntegration;
window.WatermarkManager = WatermarkManager;
