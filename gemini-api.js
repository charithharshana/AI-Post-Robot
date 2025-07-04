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
    const prompt = `${instruction}

Original text:
"${originalText}"

Rewritten text:`;

    return await this.generateText(prompt, {
      temperature: 0.8,
      maxTokens: 500,
      ...options
    });
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
}

// Create global instance
window.geminiAPI = new GeminiAPI();

// Default rewrite prompts
window.geminiRewritePrompts = {
  title: [
    {
      name: "Engaging",
      icon: "✨",
      prompt: "Create a short, engaging title from this text in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Shorten",
      icon: "📝",
      prompt: "Create a short, concise title from this text in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Professional",
      icon: "💼",
      prompt: "Create a short, professional title from this text in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Casual",
      icon: "😊",
      prompt: "Create a short, casual title from this text in the same language. Provide only one option:",
      editable: true
    }
  ],
  caption: [
    {
      name: "Engaging",
      icon: "✨",
      prompt: "Rewrite this as an engaging social media caption in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Shorten",
      icon: "📝",
      prompt: "Rewrite this as a shorter social media caption in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Professional",
      icon: "💼",
      prompt: "Rewrite this as a professional social media caption in the same language. Provide only one option:",
      editable: true
    },
    {
      name: "Casual",
      icon: "😊",
      prompt: "Rewrite this as a casual social media caption in the same language. Provide only one option:",
      editable: true
    }
  ]
};

// Load custom prompts from storage
window.loadCustomPrompts = async function() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['customGeminiPrompts'], (result) => {
      if (result.customGeminiPrompts) {
        // Merge custom prompts with defaults
        const customPrompts = result.customGeminiPrompts;
        if (customPrompts.title) {
          window.geminiRewritePrompts.title = [...window.geminiRewritePrompts.title, ...customPrompts.title];
        }
        if (customPrompts.caption) {
          window.geminiRewritePrompts.caption = [...window.geminiRewritePrompts.caption, ...customPrompts.caption];
        }
      }
      resolve();
    });
  });
};

// Save custom prompts to storage
window.saveCustomPrompts = function(prompts) {
  chrome.storage.local.set({ customGeminiPrompts: prompts });
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
