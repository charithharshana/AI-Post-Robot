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
          <div id="image-editor-content" class="image-editor-content">
            <div class="loading-message">🎨 Loading image editor...</div>
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
        width: 95%;
        height: 95%;
        max-width: 1400px;
        max-height: 900px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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
        position: relative !important;
        z-index: 1 !important;
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
    freshContainer.style.height = '500px';
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

      this.pixieInstance = new window.Pixie({
        selector: '#image-editor-content',
        baseUrl: chrome.runtime.getURL('image-editor-module/assets'),
        image: processedImageUrl,
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
          }
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

      // Export the edited image as data URL
      const editedImageDataUrl = await this.exportImage();

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
        if (this.pixieInstance.tools.export.getDataUrl) {
          this.pixieInstance.tools.export.getDataUrl('image/jpeg', 0.9).then(dataUrl => {
            if (timeout) clearTimeout(timeout);
            console.log('✅ Image exported successfully (method 2)');
            resolve(dataUrl);
          }).catch(error => {
            if (timeout) clearTimeout(timeout);
            console.warn('Export method 2 failed, trying alternative:', error);
            this.tryAlternativeExport(resolve, reject);
          });
        } else {
          if (timeout) clearTimeout(timeout);
          console.warn('getDataUrl not available, trying alternative...');
          this.tryAlternativeExport(resolve, reject);
        }
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
   * Force cleanup of the editor (more thorough than regular close)
   */
  async forceCleanup() {
    console.log('🔄 Force cleaning up image editor...');

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
}

// Export for use in other modules
window.ImageEditorIntegration = ImageEditorIntegration;
