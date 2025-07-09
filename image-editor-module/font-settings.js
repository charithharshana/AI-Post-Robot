/**
 * Font Settings Management for Options Page
 * Handles the UI and interactions for font management in the settings
 */

class FontSettings {
  constructor() {
    this.fontManager = null;
    this.init();
  }

  async init() {
    // Wait for FontManager to be available
    if (typeof window.FontManager === 'undefined') {
      // Load FontManager if not available
      await this.loadFontManager();
    }
    
    this.fontManager = window.FontManager;
    this.setupEventListeners();
    await this.loadCustomFontsList();
  }

  async loadFontManager() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('image-editor-module/font-manager.js');
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  setupEventListeners() {
    // Upload font button
    const uploadBtn = document.getElementById('uploadFontBtn');
    const fontUpload = document.getElementById('fontUpload');
    
    if (uploadBtn && fontUpload) {
      uploadBtn.addEventListener('click', () => this.handleFontUpload());
      fontUpload.addEventListener('change', () => this.handleFileSelect());
    }

    // Clear all fonts button
    const clearBtn = document.getElementById('clearCustomFontsBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClearAllFonts());
    }
  }

  async handleFileSelect() {
    const fileInput = document.getElementById('fontUpload');
    const uploadBtn = document.getElementById('uploadFontBtn');
    
    if (fileInput.files.length > 0) {
      uploadBtn.textContent = '📤 Upload Font';
      uploadBtn.disabled = false;
    } else {
      uploadBtn.textContent = '📤 Upload Font';
      uploadBtn.disabled = false;
    }
  }

  async handleFontUpload() {
    const fileInput = document.getElementById('fontUpload');
    const uploadBtn = document.getElementById('uploadFontBtn');

    if (!fileInput.files.length) {
      this.showMessage('Please select a font file first.', 'error');
      return;
    }

    const file = fileInput.files[0];

    try {
      uploadBtn.textContent = '⏳ Uploading...';
      uploadBtn.disabled = true;

      console.log('📤 Starting font upload:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const result = await this.fontManager.addCustomFont(file);

      console.log('✅ Font upload successful:', result);
      this.showMessage(`Font "${result.family}" uploaded successfully!`, 'success');
      fileInput.value = ''; // Clear file input
      await this.loadCustomFontsList(); // Refresh the list

    } catch (error) {
      console.error('❌ Font upload failed:', error);
      this.showMessage(`Failed to upload font: ${error.message}`, 'error');
    } finally {
      uploadBtn.textContent = '📤 Upload Font';
      uploadBtn.disabled = false;
    }
  }

  async handleClearAllFonts() {
    if (!confirm('Are you sure you want to delete all custom fonts? This action cannot be undone.')) {
      return;
    }

    try {
      await this.fontManager.clearAllCustomFonts();
      this.showMessage('All custom fonts have been cleared.', 'success');
      await this.loadCustomFontsList();
    } catch (error) {
      this.showMessage(`Failed to clear fonts: ${error.message}`, 'error');
    }
  }

  async loadCustomFontsList() {
    const container = document.getElementById('customFontsList');
    if (!container) return;

    try {
      container.innerHTML = '<div class="loading-fonts">🔄 Loading fonts...</div>';
      
      const customFonts = await this.fontManager.getCustomFonts();
      
      if (customFonts.length === 0) {
        container.innerHTML = '<div class="no-fonts">No custom fonts uploaded yet. Upload your first font above!</div>';
        return;
      }

      container.innerHTML = '';
      
      for (const font of customFonts) {
        const fontItem = this.createFontItem(font);
        container.appendChild(fontItem);
      }
      
    } catch (error) {
      console.error('Failed to load custom fonts:', error);
      container.innerHTML = '<div class="no-fonts">Failed to load fonts. Please try refreshing the page.</div>';
    }
  }

  createFontItem(font) {
    const item = document.createElement('div');
    item.className = 'font-item';
    
    const info = document.createElement('div');
    info.className = 'font-info';
    
    const name = document.createElement('div');
    name.className = 'font-name';
    name.textContent = font.family;
    
    const details = document.createElement('div');
    details.className = 'font-details';
    details.textContent = `${font.fileName} • ${this.formatFileSize(font.size)} • Added ${this.formatDate(font.dateAdded)}`;
    
    const preview = document.createElement('div');
    preview.className = 'font-preview';
    preview.textContent = 'The quick brown fox jumps over the lazy dog';
    preview.style.fontFamily = `"${font.family}", sans-serif`;
    
    info.appendChild(name);
    info.appendChild(details);
    info.appendChild(preview);
    
    const actions = document.createElement('div');
    actions.className = 'font-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger';
    deleteBtn.textContent = '🗑️ Delete';
    deleteBtn.onclick = () => this.handleDeleteFont(font.id, font.family);
    
    actions.appendChild(deleteBtn);
    
    item.appendChild(info);
    item.appendChild(actions);
    
    return item;
  }

  async handleDeleteFont(fontId, fontName) {
    if (!confirm(`Are you sure you want to delete the font "${fontName}"?`)) {
      return;
    }

    try {
      await this.fontManager.removeCustomFont(fontId);
      this.showMessage(`Font "${fontName}" deleted successfully.`, 'success');
      await this.loadCustomFontsList();
    } catch (error) {
      this.showMessage(`Failed to delete font: ${error.message}`, 'error');
    }
  }

  showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('fontMessage');
    if (!messageDiv) return;

    messageDiv.textContent = message;
    messageDiv.className = `status-message status-${type}`;
    messageDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FontSettings();
});
