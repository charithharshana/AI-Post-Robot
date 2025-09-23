/**
 * Google Gemini API Integration Module for AI Post Robot
 * Handles AI text generation with key rotation and rate limiting
 */

class GeminiAPI {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.model = 'gemini-2.5-flash-lite-preview-06-17';
    this.imageModel = 'gemini-2.0-flash-preview-image-generation';
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 second between requests
  }

  /**
   * Initialize API with stored settings
   */
  async initialize() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['geminiApiKeys', 'geminiModel', 'geminiImageModel'], (result) => {
        if (result.geminiApiKeys) {
          this.apiKeys = result.geminiApiKeys.split('\n').map(key => key.trim()).filter(key => key);
        }
        this.model = result.geminiModel || 'gemini-2.5-flash-lite-preview-06-17';
        this.imageModel = result.geminiImageModel || 'gemini-2.0-flash-preview-image-generation';
        resolve(this.apiKeys.length > 0);
      });
    });
  }

  /**
   * Get next API key for rotation
   */
  getNextApiKey() {
    if (this.apiKeys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }
    
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  /**
   * Rate limiting - ensure minimum interval between requests
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make API request with retry logic
   */
  async makeRequest(endpoint, payload, retries = 2) {
    await this.enforceRateLimit();
    
    let lastError;
    
    // Try with different API keys if available
    for (let attempt = 0; attempt <= retries && attempt < this.apiKeys.length; attempt++) {
      try {
        const apiKey = this.getNextApiKey();
        
        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
        }

        return await response.json();
        
      } catch (error) {
        lastError = error;
        console.warn(`Gemini API attempt ${attempt + 1} failed:`, error.message);
        
        // If it's a rate limit error, wait longer
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    throw lastError || new Error('All API requests failed');
  }

  /**
   * Make API request with enhanced retry logic specifically for video content
   */
  async makeRequestWithRetry(endpoint, payload, isVideo = false) {
    const maxRetries = isVideo ? 3 : 2; // Extra retry for video content
    const baseDelay = isVideo ? 2000 : 1000; // Longer delay for video

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          const delay = baseDelay * attempt; // Progressive delay
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await this.makeRequest(endpoint, payload, 1); // Single attempt per retry

        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Re-throw on final attempt
        }


      }
    }
  }

  /**
   * Generate text content using Gemini
   */
  async generateText(prompt, options = {}) {
    const model = options.model || this.model;
    
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 1024,
      }
    };

    try {
      const response = await this.makeRequest(`models/${model}:generateContent`, payload);
      
      if (response.candidates && response.candidates.length > 0) {
        const content = response.candidates[0].content;
        if (content && content.parts && content.parts.length > 0) {
          return content.parts[0].text;
        }
      }
      
      throw new Error('No content generated');
      
    } catch (error) {
      console.error('Gemini text generation failed:', error);
      throw error;
    }
  }

  /**
   * Rewrite text with specific instructions
   */
  async rewriteText(originalText, instruction, options = {}) {
    // Detect the language of the original text for better consistency
    const languageHint = this.detectLanguageHint(originalText);

    const prompt = `${instruction}

Original text:
"${originalText}"

${languageHint}

Rewritten text:`;

    return await this.generateText(prompt, {
      temperature: 0.8,
      maxTokens: 500,
      ...options
    });
  }

  /**
   * Detect language hint for better consistency
   */
  detectLanguageHint(text) {
    if (!text || text.trim().length === 0) {
      return "IMPORTANT: Maintain the same language as the original text.";
    }

    // Simple language detection based on common patterns
    const englishPattern = /^[a-zA-Z0-9\s.,!?'"()-]+$/;
    const hasEnglishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/i.test(text);

    if (englishPattern.test(text.trim()) && hasEnglishWords) {
      return "IMPORTANT: The original text is in English. Write your response in English only.";
    } else {
      return "IMPORTANT: Write your response in the EXACT SAME LANGUAGE as the original text. Do not translate or change the language.";
    }
  }

  /**
   * Convert image/video file to base64 for API
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert image URL to base64
   */
  async imageUrlToBase64(imageUrl) {
    try {
      // Check if the URL is already a data URL (base64)
      if (imageUrl.startsWith('data:')) {
        // Extract base64 data from data URL
        const base64Data = imageUrl.split(',')[1];
        if (!base64Data) {
          throw new Error('Invalid data URL format');
        }
        return base64Data;
      }

      // For regular URLs, fetch and convert
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      // Check file size - Gemini API has a 20MB limit for inline data
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (blob.size > maxSize) {
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
        throw new Error(`Media file is too large (${sizeMB}MB). The Gemini API has a 20MB limit for inline media. Consider using a smaller file or the Files API for larger files.`);
      }

      // Special handling for videos
      if (blob.type.startsWith('video/')) {
        console.warn(`Processing video file (${(blob.size / (1024 * 1024)).toFixed(1)}MB). Video support may be limited with some models.`);
      }

      return await this.fileToBase64(blob);
    } catch (error) {
      console.error('Error converting image URL to base64:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from file extension or blob
   */
  getMimeType(fileOrUrl) {
    if (typeof fileOrUrl === 'string') {
      // Check if it's a data URL
      if (fileOrUrl.startsWith('data:')) {
        const mimeMatch = fileOrUrl.match(/^data:([^;]+)/);
        return mimeMatch ? mimeMatch[1] : 'image/jpeg';
      }

      // Regular URL case
      const extension = fileOrUrl.split('.').pop().toLowerCase();
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo'
      };
      return mimeTypes[extension] || 'image/jpeg';
    } else {
      // File/Blob case
      return fileOrUrl.type || 'image/jpeg';
    }
  }

  /**
   * Check if a model is known to have multimodal issues
   */
  isProblematicModel(model) {
    // List of models that have known issues with multimodal content
    const problematicModels = [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];

    return problematicModels.some(problematic => model.includes(problematic));
  }

  /**
   * Check if media data represents a video
   */
  isVideoContent(mediaData) {
    if (!mediaData || !mediaData.mimeType) return false;
    return mediaData.mimeType.startsWith('video/');
  }

  /**
   * Check if a model has known issues with video content specifically
   */
  hasVideoCompatibilityIssues(model) {
    // Models that work well with images but may have issues with videos
    const videoProblematicModels = [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];

    return videoProblematicModels.some(problematic => model.includes(problematic));
  }

  /**
   * Get the best model for video processing
   */
  getBestVideoModel() {
    // Prioritize models known to work well with video content
    const videoOptimizedModels = [
      'gemini-2.5-flash-lite-preview-06-17',
      'gemini-2.0-flash-preview',
      'gemini-1.5-flash-latest'
    ];

    // Return the first available model that's optimized for video
    for (const model of videoOptimizedModels) {
      // For now, we'll use the first one as it's known to work well
      return model;
    }

    // Fallback to default model
    return this.model;
  }

  /**
   * Automatically select the best model based on content type and current model
   */
  selectOptimalModel(mediaData, currentModel = null) {
    const targetModel = currentModel || this.model;

    // If no media, use current model
    if (!mediaData) {
      return targetModel;
    }

    const isVideo = this.isVideoContent(mediaData);

    // For video content, always use video-optimized model
    if (isVideo) {
      const videoModel = this.getBestVideoModel();
      if (videoModel !== targetModel) {
        console.log(`🎥 Auto-switching from ${targetModel} to ${videoModel} for video content`);
      }
      return videoModel;
    }

    // For image content, check if current model has known issues
    if (this.isProblematicModel(targetModel)) {
      const recommendedModel = 'gemini-2.5-flash-lite-preview-06-17';
      console.log(`🖼️ Auto-switching from ${targetModel} to ${recommendedModel} for better image support`);
      return recommendedModel;
    }

    // Current model is fine for image content
    return targetModel;
  }

  /**
   * Get model recommendation info for UI display
   */
  getModelRecommendation(mediaData, currentModel = null) {
    const targetModel = currentModel || this.model;
    const optimalModel = this.selectOptimalModel(mediaData, targetModel);

    const recommendation = {
      currentModel: targetModel,
      recommendedModel: optimalModel,
      shouldSwitch: optimalModel !== targetModel,
      reason: ''
    };

    if (mediaData && this.isVideoContent(mediaData)) {
      recommendation.reason = 'Video content detected - using video-optimized model';
    } else if (mediaData && this.isProblematicModel(targetModel)) {
      recommendation.reason = 'Current model may have multimodal issues - switching to more reliable model';
    } else {
      recommendation.reason = 'Current model is suitable for this content';
    }

    return recommendation;
  }

  /**
   * Enhanced video processing with proper async/sync handling
   */
  async processVideoWithRetry(mediaData, prompt, options = {}) {
    const maxRetries = 3;
    const baseDelay = 3000; // Start with 3 seconds
    const maxDelay = 10000; // Maximum 10 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎥 Video processing attempt ${attempt}/${maxRetries}`);

        // Progressive delay strategy - longer waits for later attempts
        const currentDelay = Math.min(baseDelay * attempt, maxDelay);

        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, currentDelay));
        } else {
          // Even first attempt needs initial delay for video processing
          await new Promise(resolve => setTimeout(resolve, baseDelay));
        }

        // Try different models for different attempts
        let modelToUse;
        switch (attempt) {
          case 1:
            modelToUse = 'gemini-2.5-flash-lite-preview-06-17';
            break;
          case 2:
            modelToUse = 'gemini-1.5-flash-latest';
            break;
          case 3:
            modelToUse = 'gemini-1.5-pro-latest';
            break;
          default:
            modelToUse = this.getBestVideoModel();
        }

        const processOptions = {
          ...options,
          model: modelToUse,
          temperature: 0.6, // Lower temperature for more stable results
          maxTokens: 800,   // Slightly reduced for better processing
          topP: 0.8,        // More focused responses
          topK: 20          // Reduced for consistency
        };

        // Add extra processing time for video content
        const result = await this.generateMultimodalTextWithTimeout(prompt, mediaData, processOptions, 45000); // 45 second timeout

        if (result && result.trim() && result.length > 10) { // Ensure meaningful content
          return result;
        } else {
          throw new Error(`Insufficient content generated: "${result}"`);
        }

      } catch (error) {
        if (attempt === maxRetries) {
          // On final attempt, throw a comprehensive error
          throw new Error(`Video processing failed after ${maxRetries} attempts with progressive delays. Last error: ${error.message}`);
        }

        // Continue to next attempt with longer delay
        continue;
      }
    }
  }

  /**
   * Generate multimodal text with custom timeout handling
   */
  async generateMultimodalTextWithTimeout(prompt, mediaData, options = {}, timeoutMs = 45000) {
    return new Promise(async (resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Video processing timeout after ${timeoutMs}ms - video may be too complex or large`));
      }, timeoutMs);

      try {
        // Add extra delay before actual API call for video content
        if (mediaData && this.isVideoContent(mediaData)) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pre-processing delay
        }

        const result = await this.generateMultimodalText(prompt, mediaData, options);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Validate media data before processing
   */
  validateMediaData(mediaData, model) {
    if (!mediaData) return { valid: true };

    const isVideo = this.isVideoContent(mediaData);
    const hasVideoIssues = this.hasVideoCompatibilityIssues(model);

    // Check for video compatibility issues
    if (isVideo && hasVideoIssues) {
      return {
        valid: false,
        warning: `Video content may not be fully supported by model ${model}. Consider using gemini-2.5-flash-lite-preview-06-17 for better video support.`,
        canProceed: true // Allow proceeding with warning
      };
    }

    // Check for supported video formats
    if (isVideo) {
      const supportedVideoTypes = [
        'video/mp4', 'video/mpeg', 'video/mov', 'video/avi',
        'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
      ];

      if (!supportedVideoTypes.includes(mediaData.mimeType)) {
        return {
          valid: false,
          error: `Unsupported video format: ${mediaData.mimeType}. Supported formats: ${supportedVideoTypes.join(', ')}`,
          canProceed: false
        };
      }
    }

    return { valid: true };
  }

  /**
   * Generate text content using Gemini with multimodal support (image/video + text)
   */
  async generateMultimodalText(prompt, mediaData, options = {}) {
    const model = options.model || this.model;

    // Validate media data before processing
    if (mediaData) {
      const validation = this.validateMediaData(mediaData, model);
      if (!validation.valid) {
        if (!validation.canProceed) {
          throw new Error(validation.error);
        } else if (validation.warning) {
          console.warn(validation.warning);
        }
      }
    }

    const parts = [{
      text: prompt
    }];

    // Add media data if provided
    if (mediaData) {
      // For video content, add proper async delays to ensure processing
      if (this.isVideoContent(mediaData)) {
        console.log('🎥 Processing video content with enhanced async timing...');

        // Progressive delay based on video size (estimate from base64 length)
        const videoSizeEstimate = mediaData.base64Data.length;
        const sizeBasedDelay = Math.min(Math.max(1000, videoSizeEstimate / 10000), 5000); // 1-5 seconds based on size

        await new Promise(resolve => setTimeout(resolve, sizeBasedDelay));

        // Additional processing delay for video stabilization
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      parts.push({
        inline_data: {
          mime_type: mediaData.mimeType,
          data: mediaData.base64Data
        }
      });
    }

    const payload = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 1024,
      }
    };

    try {
      // Enhanced async handling for video content
      const isVideo = mediaData && this.isVideoContent(mediaData);
      const timeoutMs = isVideo ? 60000 : 20000; // 60s for video, 20s for images (increased)

      if (isVideo) {
        // Additional delay before making the actual API request for videos
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const response = await Promise.race([
        this.makeRequestWithRetry(`models/${model}:generateContent`, payload, isVideo),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms - video processing may need more time`)), timeoutMs)
        )
      ]);

      if (response.candidates && response.candidates.length > 0) {
        const content = response.candidates[0].content;
        if (content && content.parts && content.parts.length > 0) {
          const result = content.parts[0].text;
          if (result && result.trim() && result.length > 5) { // Ensure meaningful content
            return result;
          }
        }
      }

      throw new Error('No content generated - API returned empty or invalid response');

    } catch (error) {
      console.error('Gemini multimodal generation failed:', error);

      // Provide specific error messages based on content type and model
      if (mediaData) {
        const isVideo = this.isVideoContent(mediaData);
        const hasVideoIssues = this.hasVideoCompatibilityIssues(model);

        if (isVideo && hasVideoIssues) {
          console.warn(`Model ${model} failed with video content. Video support may be limited.`);
          throw new Error(`Video processing failed with model ${model}. Videos may not be fully supported by this model. Try using gemini-2.5-flash-lite-preview-06-17 for better video support, or remove the video to use text-only generation.`);
        } else if (this.isProblematicModel(model)) {
          console.warn(`Model ${model} failed with multimodal content. Attempting text-only fallback...`);
          throw new Error(`Multimodal generation failed with model ${model}. This model may have compatibility issues with image/video content. Try using gemini-2.5-flash-lite-preview-06-17 for better multimodal support, or remove the image/video to use text-only generation.`);
        }
      }

      throw error;
    }
  }

  /**
   * Rewrite text with multimodal support (image/video + text)
   */
  async rewriteTextWithMedia(originalText, instruction, mediaUrl, options = {}) {
    let mediaData = null;

    // Prepare media data if URL is provided
    if (mediaUrl) {
      try {
        const base64Data = await this.imageUrlToBase64(mediaUrl);
        const mimeType = this.getMimeType(mediaUrl);
        mediaData = {
          base64Data,
          mimeType
        };
      } catch (error) {
        console.warn('Failed to process media, falling back to text-only:', error);
        // Fall back to text-only if media processing fails
        return await this.rewriteText(originalText, instruction, options);
      }
    }

    // Automatically select the optimal model for the content type
    const optimalModel = this.selectOptimalModel(mediaData, options.model);
    const modelRecommendation = this.getModelRecommendation(mediaData, options.model);

    if (modelRecommendation.shouldSwitch) {
      console.log(`🔄 ${modelRecommendation.reason}`);
    }

    // Create prompt with media context and language consistency
    const languageHint = this.detectLanguageHint(originalText);

    const prompt = `${instruction}

Original text:
"${originalText}"

${languageHint}

Rewritten text:`;

    // Prepare options with optimal model
    const processOptions = {
      temperature: 0.8,
      maxTokens: 500,
      ...options,
      model: optimalModel // Use the automatically selected optimal model
    };

    try {
      // Check if this is video content and use enhanced processing
      if (mediaData && this.isVideoContent(mediaData)) {
        console.log('🎥 Detected video content, using enhanced video processing...');
        return await this.processVideoWithRetry(mediaData, prompt, processOptions);
      } else {
        // Use standard multimodal processing for images
        return await this.generateMultimodalText(prompt, mediaData, processOptions);
      }
    } catch (error) {
      // Enhanced fallback logic
      if (mediaData) {
        const isVideo = this.isVideoContent(mediaData);
        const mediaType = isVideo ? 'video' : 'image';

        console.warn(`${mediaType} processing failed, attempting fallback strategies...`);

        // For videos, try one more time with a different approach
        if (isVideo && !error.message.includes('after') && !error.message.includes('attempts')) {
          try {
            console.log('🔄 Trying video processing with fallback model...');
            const fallbackOptions = {
              ...processOptions,
              model: 'gemini-2.5-flash-lite-preview-06-17', // Force specific model
              temperature: 0.6, // Lower temperature for stability
              maxTokens: 400
            };

            return await this.generateMultimodalText(prompt, mediaData, fallbackOptions);
          } catch (fallbackError) {
            console.warn('Video fallback model also failed:', fallbackError.message);
          }
        }

        // Final fallback to text-only
        console.warn(`Falling back to text-only generation...`);
        const textOnlyInstruction = `${instruction} (Note: Processing without ${mediaType} context due to compatibility issues)`;

        try {
          return await this.rewriteText(originalText, textOnlyInstruction, {
            ...options,
            model: optimalModel // Use optimal model even for text-only fallback
          });
        } catch (fallbackError) {
          console.error('Text-only fallback also failed:', fallbackError);
          throw new Error(`Both multimodal and text-only generation failed. Original error: ${error.message}. Fallback error: ${fallbackError.message}`);
        }
      }

      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    if (this.apiKeys.length === 0) {
      throw new Error('No API keys configured');
    }

    try {
      const response = await this.generateText("Say 'Hello' in one word", { maxTokens: 10 });
      return response.trim().toLowerCase().includes('hello');
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Get model compatibility info
   */
  getModelCompatibilityInfo(model = null) {
    const targetModel = model || this.model;

    const compatibility = {
      isRecommended: targetModel.includes('gemini-2.5-flash-lite-preview-06-17'),
      hasKnownIssues: this.isProblematicModel(targetModel),
      recommendation: ''
    };

    if (compatibility.isRecommended) {
      compatibility.recommendation = '✅ Recommended model with excellent multimodal support';
    } else if (compatibility.hasKnownIssues) {
      compatibility.recommendation = '⚠️ This model may have issues with image/video content. Consider using gemini-2.5-flash-lite-preview-06-17 for better reliability.';
    } else {
      compatibility.recommendation = '✅ Model should work well for most tasks';
    }

    return compatibility;
  }





  /**
   * Debug function to show exact prompt structure sent to LLM
   * This helps users understand what gets sent to the AI
   */
  getPromptExample(originalText, instruction, mediaUrl = null) {
    const example = {
      textOnlyPrompt: `${instruction}

Original text:
"${originalText}"

Rewritten text:`,

      multimodalPrompt: mediaUrl ? {
        prompt: `${instruction}

Original text:
"${originalText}"

Rewritten text:`,
        mediaInfo: {
          url: mediaUrl,
          note: "Image/video is converted to base64 and included as inline_data in the API request"
        },
        apiStructure: {
          contents: [{
            parts: [
              { text: "The prompt text shown above" },
              {
                inline_data: {
                  mime_type: "image/jpeg (or appropriate type)",
                  data: "base64_encoded_image_data_here"
                }
              }
            ]
          }]
        }
      } : null
    };

    console.log('📋 Prompt Example Structure:', example);
    return example;
  }
}

// Create global instance
window.geminiAPI = new GeminiAPI();

// Store original default prompts for reference
window.originalGeminiRewritePrompts = null;

// Default rewrite prompts with multimodal support
window.geminiRewritePrompts = {
  title: [
    {
      name: "Make Engaging Title",
      icon: "✨",
      prompt: "Based on this image/video and text, create a short, engaging title. IMPORTANT: Write the title in the EXACT SAME LANGUAGE as the original text. If the original text is in English, write in English. If it's in another language, use that language. Provide only one option:",
      editable: true
    },
    {
      name: "Shorten Title",
      icon: "📝",
      prompt: "Based on this image/video and text, create a short, concise title. IMPORTANT: Write the title in the EXACT SAME LANGUAGE as the original text. If the original text is in English, write in English. If it's in another language, use that language. Provide only one option:",
      editable: true
    },
    {
      name: "Professional Title",
      icon: "💼",
      prompt: "Based on this image/video and text, create a short, professional title. IMPORTANT: Write the title in the EXACT SAME LANGUAGE as the original text. If the original text is in English, write in English. If it's in another language, use that language. Provide only one option:",
      editable: true
    },
    {
      name: "Casual Title",
      icon: "😊",
      prompt: "Based on this image/video and text, create a short, casual title. IMPORTANT: Write the title in the EXACT SAME LANGUAGE as the original text. If the original text is in English, write in English. If it's in another language, use that language. Provide only one option:",
      editable: true
    }
  ],
  caption: [
    {
      name: "Make Engaging Caption",
      icon: "✨",
      prompt: "Based on this image/video, rewrite this text as an engaging social media caption in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Shorten Caption",
      icon: "📝",
      prompt: "Based on this image/video, rewrite this text as a shorter social media caption in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Professional Caption",
      icon: "💼",
      prompt: "Based on this image/video, rewrite this text as a professional social media caption in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Casual Caption",
      icon: "😊",
      prompt: "Based on this image/video, rewrite this text as a casual social media caption in the same language. Provide only one option:",
      editable: true
    }
  ]
};

// Initialize original prompts backup
window.initializeOriginalPrompts = function() {
  if (!window.originalGeminiRewritePrompts) {
    window.originalGeminiRewritePrompts = JSON.parse(JSON.stringify(window.geminiRewritePrompts));
    console.log('✅ Original prompts backed up');
  }
};

// Reset prompts to original state
window.resetToOriginalPrompts = function() {
  if (window.originalGeminiRewritePrompts) {
    window.geminiRewritePrompts = JSON.parse(JSON.stringify(window.originalGeminiRewritePrompts));
    console.log('🔄 Prompts reset to original state');
  }
};

// Load custom prompts from storage
window.loadCustomPrompts = async function() {
  return new Promise((resolve) => {
    // Initialize original prompts backup if not done
    window.initializeOriginalPrompts();

    // Reset to original state first
    window.resetToOriginalPrompts();

    chrome.storage.local.get(['customGeminiPrompts'], (result) => {
      if (result.customGeminiPrompts) {
        const customPrompts = result.customGeminiPrompts;
        console.log('📥 Loading custom prompts from storage:', customPrompts);

        // Process title prompts
        if (customPrompts.title) {
          customPrompts.title.forEach(savedPrompt => {
            if (savedPrompt.custom) {
              // Add custom prompts
              window.geminiRewritePrompts.title.push(savedPrompt);
            } else if (savedPrompt.modified) {
              // Replace modified default prompts using originalName for matching
              const searchName = savedPrompt.originalName || savedPrompt.name;
              const defaultIndex = window.geminiRewritePrompts.title.findIndex(p =>
                p.name.toLowerCase().replace(/\s+/g, ' ').trim() ===
                searchName.toLowerCase().replace(/\s+/g, ' ').trim() && !p.custom
              );
              if (defaultIndex !== -1) {
                window.geminiRewritePrompts.title[defaultIndex] = savedPrompt;
                console.log(`✅ Replaced default prompt "${searchName}" with modified version "${savedPrompt.name}"`);
              } else {
                console.warn(`⚠️ Could not find default prompt to replace: "${searchName}"`);
              }
            }
          });
        }

        // Process caption prompts
        if (customPrompts.caption) {
          customPrompts.caption.forEach(savedPrompt => {
            if (savedPrompt.custom) {
              // Add custom prompts
              window.geminiRewritePrompts.caption.push(savedPrompt);
            } else if (savedPrompt.modified) {
              // Replace modified default prompts using originalName for matching
              const searchName = savedPrompt.originalName || savedPrompt.name;
              const defaultIndex = window.geminiRewritePrompts.caption.findIndex(p =>
                p.name.toLowerCase().replace(/\s+/g, ' ').trim() ===
                searchName.toLowerCase().replace(/\s+/g, ' ').trim() && !p.custom
              );
              if (defaultIndex !== -1) {
                window.geminiRewritePrompts.caption[defaultIndex] = savedPrompt;
                console.log(`✅ Replaced default prompt "${searchName}" with modified version "${savedPrompt.name}"`);
              } else {
                console.warn(`⚠️ Could not find default prompt to replace: "${searchName}"`);
              }
            }
          });
        }

        console.log('✅ Custom and modified prompts loaded successfully');
      }
      resolve();
    });
  });
};

// Save custom prompts to storage
window.saveCustomPrompts = function(prompts) {
  console.log('💾 Saving to chrome storage:', prompts);
  chrome.storage.local.set({ customGeminiPrompts: prompts }, () => {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to save custom prompts:', chrome.runtime.lastError);
    } else {
      console.log('✅ Custom prompts saved to storage successfully');
    }
  });
};

// Update a specific prompt
window.updatePrompt = function(target, index, newPrompt) {
  if (window.geminiRewritePrompts[target] && window.geminiRewritePrompts[target][index]) {
    window.geminiRewritePrompts[target][index].prompt = newPrompt;

    // Save to storage if it's a custom prompt or modified default
    const customPrompts = {
      title: window.geminiRewritePrompts.title.filter(p => p.custom || p.modified),
      caption: window.geminiRewritePrompts.caption.filter(p => p.custom || p.modified)
    };

    // Mark as modified if it's a default prompt
    if (!window.geminiRewritePrompts[target][index].custom) {
      window.geminiRewritePrompts[target][index].modified = true;
    }

    window.saveCustomPrompts(customPrompts);
  }
};
