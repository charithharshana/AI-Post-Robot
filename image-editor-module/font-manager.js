/**
 * Font Manager for Image Editor Module
 * Handles custom font storage, loading, and management
 */

class FontManager {
  constructor() {
    this.storageKey = 'imageEditor_customFonts';
    this.defaultFonts = [
      {
        family: 'Roboto',
        src: 'fonts/open-sans-v27-latin-ext_latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Fuzzy Bubbles',
        src: 'fonts/fuzzy-bubbles-v3-latin-700.woff2',
        descriptors: { weight: '700' },
        isDefault: true
      },
      {
        family: 'Aleo Bold',
        src: 'fonts/aleo-v4-latin-ext_latin-700.woff2',
        descriptors: { weight: '700' },
        isDefault: true
      },
      {
        family: 'Amatic SC',
        src: 'fonts/amatic-sc-v16-latin-ext_latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Corinthia Bold',
        src: 'fonts/corinthia-v7-latin-ext_latin-700.woff2',
        isDefault: true
      },
      {
        family: 'Bungee Inline',
        src: 'fonts/bungee-inline-v6-latin-ext_latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Robot Slab Bold',
        src: 'fonts/roboto-slab-v16-latin-ext_latin-500.woff2',
        isDefault: true
      },
      {
        family: 'Carter One',
        src: 'fonts/carter-one-v12-latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Cody Star',
        src: 'fonts/codystar-v10-latin-ext_latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Fira Sans',
        src: 'fonts/fira-sans-v11-latin-ext_latin_cyrillic-regular.woff2',
        isDefault: true
      },
      {
        family: 'Krona One',
        src: 'fonts/krona-one-v9-latin-ext_latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Kumar One Outline',
        src: 'fonts/kumar-one-outline-v8-latin-ext_latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Lobster Two',
        src: 'fonts/lobster-two-v13-latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Molle Italic',
        src: 'fonts/molle-v11-latin-ext_latin-italic.woff2',
        isDefault: true
      },
      {
        family: 'Monoton',
        src: 'fonts/monoton-v10-latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Nixie One',
        src: 'fonts/nixie-one-v11-latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Permanent Marker',
        src: 'fonts/permanent-marker-v10-latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Sancreek',
        src: 'fonts/sancreek-v13-latin-ext_latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Stint Ultra Expanded',
        src: 'fonts/stint-ultra-expanded-v10-latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'VT323',
        src: 'fonts/vt323-v12-latin-ext_latin-regular.woff2',
        isDefault: true
      },
      {
        family: 'Trash Hand',
        src: 'fonts/TrashHand.ttf',
        isDefault: true
      }
    ];
    this.loadedFonts = new Set();
  }

  /**
   * Get all fonts (default + custom)
   */
  async getAllFonts() {
    const customFonts = await this.getCustomFonts();
    return [...this.defaultFonts, ...customFonts];
  }

  /**
   * Get custom fonts from storage
   */
  async getCustomFonts() {
    try {
      const result = await chrome.storage.local.get([this.storageKey]);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('Failed to get custom fonts:', error);
      return [];
    }
  }

  /**
   * Add a custom font
   */
  async addCustomFont(fontFile) {
    try {
      // Validate file - check both MIME type and file extension
      const validMimeTypes = [
        'font/ttf',
        'font/otf',
        'font/woff',
        'font/woff2',
        'application/font-woff',
        'application/font-woff2',
        'application/x-font-woff',
        'application/x-font-woff2',
        'application/x-font-ttf',
        'application/x-font-otf',
        'application/vnd.ms-fontobject',
        'application/octet-stream' // Some servers serve fonts as octet-stream
      ];

      const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
      const fileName = fontFile.name.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      const hasValidMimeType = validMimeTypes.includes(fontFile.type.toLowerCase());

      // Debug logging
      console.log('🔍 Font validation debug:', {
        fileName: fontFile.name,
        fileType: fontFile.type,
        fileSize: fontFile.size,
        hasValidExtension,
        hasValidMimeType
      });

      // Accept if either MIME type is valid OR file extension is valid
      if (!hasValidMimeType && !hasValidExtension) {
        throw new Error(`Invalid font file type. File: "${fontFile.name}", Type: "${fontFile.type}". Please select a valid font file (.ttf, .otf, .woff, .woff2)`);
      }

      if (fontFile.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Font file is too large. Please select a file under 5MB.');
      }

      // Read file as data URL
      const dataUrl = await this.fileToDataUrl(fontFile);
      
      // Extract font family name from file name (basic approach)
      const fontFamily = this.extractFontFamily(fontFile.name);
      
      // Create font object
      const fontConfig = {
        family: fontFamily,
        src: dataUrl,
        fileName: fontFile.name,
        size: fontFile.size,
        dateAdded: new Date().toISOString(),
        isDefault: false,
        id: this.generateId()
      };

      // Get existing custom fonts
      const customFonts = await this.getCustomFonts();
      
      // Check for duplicates
      const existingFont = customFonts.find(font => font.family === fontFamily);
      if (existingFont) {
        throw new Error(`Font "${fontFamily}" already exists. Please choose a different font.`);
      }

      // Add to storage
      customFonts.push(fontConfig);
      await chrome.storage.local.set({ [this.storageKey]: customFonts });

      // Load the font immediately
      await this.loadFont(fontConfig);

      console.log('✅ Custom font added successfully:', fontFamily);
      return fontConfig;
    } catch (error) {
      console.error('❌ Failed to add custom font:', error);
      throw error;
    }
  }

  /**
   * Remove a custom font
   */
  async removeCustomFont(fontId) {
    try {
      const customFonts = await this.getCustomFonts();
      const updatedFonts = customFonts.filter(font => font.id !== fontId);
      
      await chrome.storage.local.set({ [this.storageKey]: updatedFonts });
      
      console.log('✅ Custom font removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to remove custom font:', error);
      throw error;
    }
  }

  /**
   * Load a font into the document
   */
  async loadFont(fontConfig) {
    try {
      if (this.loadedFonts.has(fontConfig.family)) {
        return; // Already loaded
      }

      const fontFace = new FontFace(
        fontConfig.family,
        `url(${fontConfig.src})`,
        fontConfig.descriptors || {}
      );

      await fontFace.load();
      document.fonts.add(fontFace);
      this.loadedFonts.add(fontConfig.family);
      
      console.log('✅ Font loaded successfully:', fontConfig.family);
    } catch (error) {
      console.error('❌ Failed to load font:', fontConfig.family, error);
      throw error;
    }
  }

  /**
   * Load all fonts
   */
  async loadAllFonts() {
    try {
      const allFonts = await this.getAllFonts();
      const loadPromises = allFonts.map(font => {
        if (font.isDefault) {
          // For default fonts, construct the full URL
          const fullSrc = chrome.runtime.getURL(`image-editor-module/assets/${font.src}`);
          return this.loadFont({ ...font, src: fullSrc });
        } else {
          // Custom fonts already have data URLs
          return this.loadFont(font);
        }
      });

      await Promise.allSettled(loadPromises);
      console.log('✅ All fonts loaded');
    } catch (error) {
      console.error('❌ Failed to load fonts:', error);
    }
  }

  /**
   * Get fonts formatted for Pixie editor
   */
  async getFontsForPixie() {
    const allFonts = await this.getAllFonts();
    return allFonts.map(font => ({
      family: font.family,
      src: font.isDefault 
        ? font.src // Keep relative path for default fonts
        : font.src, // Use data URL for custom fonts
      descriptors: font.descriptors || {}
    }));
  }

  /**
   * Utility methods
   */
  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read font file'));
      reader.readAsDataURL(file);
    });
  }

  extractFontFamily(fileName) {
    // Remove file extension and clean up the name
    let name = fileName.replace(/\.(ttf|otf|woff|woff2)$/i, '');

    // Handle common font naming patterns
    // Example: "AbhayaLibre-Bold" -> "Abhaya Libre Bold"
    name = name
      // Split on hyphens and underscores
      .replace(/[-_]/g, ' ')
      // Add space before uppercase letters that follow lowercase letters
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim();

    // Capitalize first letter of each word
    name = name.replace(/\b\w/g, l => l.toUpperCase());

    console.log('🔤 Font name extraction:', fileName, '->', name);

    return name;
  }

  generateId() {
    return 'font_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Clear all custom fonts
   */
  async clearAllCustomFonts() {
    try {
      await chrome.storage.local.remove([this.storageKey]);
      console.log('✅ All custom fonts cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear custom fonts:', error);
      throw error;
    }
  }
}

// Create global instance
window.FontManager = new FontManager();

// Test function to verify font system works
window.FontManager.test = async function() {
  console.log('🧪 Testing Font Manager...');

  try {
    // Test 1: Get all fonts
    const allFonts = await this.getAllFonts();
    console.log('✅ Test 1 - Get all fonts:', allFonts.length, 'fonts found');

    // Test 2: Get custom fonts
    const customFonts = await this.getCustomFonts();
    console.log('✅ Test 2 - Get custom fonts:', customFonts.length, 'custom fonts found');

    // Test 3: Get fonts for Pixie
    const pixieFonts = await this.getFontsForPixie();
    console.log('✅ Test 3 - Get fonts for Pixie:', pixieFonts.length, 'fonts formatted');

    // Test 4: Load all fonts
    await this.loadAllFonts();
    console.log('✅ Test 4 - Load all fonts: completed');

    // Test 5: Check loaded fonts
    console.log('✅ Test 5 - Loaded fonts count:', this.loadedFonts.size);

    console.log('🎉 All font manager tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Font manager test failed:', error);
    return false;
  }
};
