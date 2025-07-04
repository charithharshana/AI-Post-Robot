/**
 * RoboPost API Integration Module for AI Post Robot
 * Handles media upload and post scheduling functionality
 */

class RoboPostAPI {
  constructor() {
    this.baseUrl = 'https://public-api.robopost.app/v1';
    this.apiKey = null;
  }

  /**
   * Initialize API with stored API key
   */
  async initialize() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['robopostApiKey'], (result) => {
        this.apiKey = result.robopostApiKey;
        resolve(!!this.apiKey);
      });
    });
  }

  /**
   * Test API connection
   */
  async testConnection() {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    try {
      console.log('Testing API connection to:', `${this.baseUrl}/channels`);
      console.log('Using API key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'None');

      // Use background script for network requests in extension context
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'apiRequest',
            method: 'GET',
            url: `${this.baseUrl}/channels`,
            apiKey: this.apiKey
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (response.success) {
              console.log('API test successful, channels found:', response.data.length);
              resolve({
                success: true,
                channels: response.data.length || 0,
                message: `Connected successfully! Found ${response.data.length || 0} channels.`
              });
            } else {
              console.error('API connection test failed:', response.error);
              if (response.error.includes('fetch') || response.error.includes('network')) {
                reject(new Error('Network error: Unable to connect to RoboPost API. Please check your internet connection and try again.'));
              } else {
                reject(new Error(`Connection failed: ${response.error}`));
              }
            }
          });
        });
      }

      // Fallback for non-extension contexts
      const response = await fetch(`${this.baseUrl}/channels?apikey=${this.apiKey}`);
      console.log('API test response:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.msg || errorData.message || response.statusText;
          console.log('API error data:', errorData);
        } catch (e) {
          errorMessage = response.statusText;
        }
        throw new Error(`API test failed: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      console.log('API test successful, channels found:', data.length);
      return {
        success: true,
        channels: data.length || 0,
        message: `Connected successfully! Found ${data.length || 0} channels.`
      };
    } catch (error) {
      console.error('API connection test failed:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to RoboPost API. Please check your internet connection and try again.');
      }
      throw new Error(`Connection failed: ${error.message}`);
    }
  }



  /**
   * Diagnostic function to help troubleshoot API issues
   */
  async runDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'Not configured',
      baseUrl: this.baseUrl,
      tests: []
    };

    // Test 1: API Key presence
    diagnostics.tests.push({
      name: 'API Key Configuration',
      status: this.apiKey ? 'PASS' : 'FAIL',
      message: this.apiKey ? 'API key is configured' : 'API key is missing'
    });

    // Test 2: Network connectivity
    try {
      const response = await fetch('https://httpbin.org/get', { method: 'GET' });
      diagnostics.tests.push({
        name: 'Internet Connectivity',
        status: response.ok ? 'PASS' : 'FAIL',
        message: response.ok ? 'Internet connection is working' : 'Internet connection issues'
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'Internet Connectivity',
        status: 'FAIL',
        message: `Network error: ${error.message}`
      });
    }

    // Test 3: RoboPost API connectivity
    if (this.apiKey) {
      try {
        await this.testConnection();
        diagnostics.tests.push({
          name: 'RoboPost API Connection',
          status: 'PASS',
          message: 'Successfully connected to RoboPost API'
        });
      } catch (error) {
        diagnostics.tests.push({
          name: 'RoboPost API Connection',
          status: 'FAIL',
          message: error.message
        });
      }
    }

    return diagnostics;
  }

  /**
   * Get all channels with detailed information
   * @returns {Promise<Array>} - Array of channel objects with id, name, platform, etc.
   */
  async getChannels() {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    try {
      // Use background script for network requests in extension context
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'apiRequest',
            method: 'GET',
            url: `${this.baseUrl}/channels`,
            apiKey: this.apiKey
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (response.success) {
              resolve(response.data || []);
            } else {
              reject(new Error(`Failed to get channels: ${response.error}`));
            }
          });
        });
      }

      // Fallback for non-extension contexts
      const response = await fetch(`${this.baseUrl}/channels?apikey=${this.apiKey}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.status} ${response.statusText}`);
      }

      const channels = await response.json();
      return channels || [];
    } catch (error) {
      throw new Error(`Failed to get channels: ${error.message}`);
    }
  }

  /**
   * Upload media file to RoboPost (Direct implementation like Python)
   * @param {File} fileObject - The file to upload
   * @returns {Promise<string>} - storage_object_id
   */
  async uploadMedia(fileObject) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    console.log('📤 Uploading media:', fileObject.name, fileObject.size, 'bytes');

    // Validate file (like Python validation)
    if (!fileObject.type || fileObject.type === '') {
      console.warn('⚠️ File has no MIME type, defaulting to image/jpeg');
      const correctedFile = new File([fileObject], fileObject.name, {
        type: 'image/jpeg',
        lastModified: fileObject.lastModified
      });
      return this.uploadMedia(correctedFile);
    }

    if (fileObject.size === 0) {
      throw new Error('File is empty (0 bytes)');
    }

    if (fileObject.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('File is too large (>50MB). Please use a smaller file.');
    }

    // Direct upload like Python: upload_url = f"{BASE_URL}/medias/upload"
    // Use HTTP for POST requests to avoid CORS redirect issues
    const uploadUrl = `http://public-api.robopost.app/v1/medias/upload`;

    try {
      // Create FormData like Python: files = {'file': image_file}
      const formData = new FormData();
      formData.append('file', fileObject);

      // Add API key as URL parameter like Python: params = {"apikey": API_KEY}
      const urlWithApiKey = `${uploadUrl}?apikey=${this.apiKey}`;

      console.log('📡 Upload URL:', urlWithApiKey);
      console.log('📁 File details:', {
        name: fileObject.name,
        size: fileObject.size,
        type: fileObject.type
      });

      // Make request like Python: response = requests.post(upload_url, params=params, files=files, timeout=60)
      const response = await fetch(urlWithApiKey, {
        method: 'POST',
        body: formData,
        // Add timeout like Python (60 seconds)
        signal: AbortSignal.timeout(60000)
      });

      console.log('📡 Upload response status:', response.status);

      // Handle response like Python
      if (response.status === 200 || response.status === 201) {
        const result = await response.json();
        const storageId = result.storage_object_id;

        if (storageId) {
          console.log('✅ Image uploaded successfully!');
          console.log('🆔 Storage Object ID:', storageId);
          return storageId;
        } else {
          console.log('❌ Upload succeeded but no storage_object_id found');
          throw new Error('Upload succeeded but no storage_object_id found');
        }
      } else {
        console.log('❌ Upload failed:', response.status);

        // Extract error message like Python
        let errorMessage;
        try {
          const errorData = await response.json();
          console.log('Response:', errorData);

          // Extract error message in order of preference
          if (errorData.msg) {
            errorMessage = errorData.msg;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        } catch (e) {
          errorMessage = response.statusText || 'Unknown error';
        }

        throw new Error(`Upload failed: ${response.status} - ${errorMessage}`);
      }

    } catch (error) {
      console.log('❌ Error uploading image:', error);

      // Handle specific error types
      if (error.name === 'TimeoutError') {
        throw new Error('Upload timeout: The upload took too long (>60 seconds). Please try with a smaller file.');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to RoboPost API. Please check your internet connection and try again.');
      } else {
        throw new Error(`Media upload error: ${error.message}`);
      }
    }
  }

  /**
   * Fetch image using background script (for CORS-restricted URLs)
   * @param {string} imageUrl - URL of the image to fetch
   * @returns {Promise<Blob>} - Image blob
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

        if (response.success) {
          // Convert base64 back to blob
          const byteCharacters = atob(response.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          // Ensure we have a valid MIME type
          let mimeType = response.contentType;
          if (!mimeType || mimeType === 'application/octet-stream') {
            // Try to detect MIME type from file signature
            mimeType = this.detectMimeType(byteArray) || 'image/jpeg';
          }

          const blob = new Blob([byteArray], { type: mimeType });
          console.log('📁 Created blob from background fetch:', blob.size, 'bytes, type:', blob.type);
          resolve(blob);
        } else {
          reject(new Error(response.error || 'Failed to fetch image via background script'));
        }
      });
    });
  }

  /**
   * Upload media from URL
   * @param {string} imageUrl - URL of the image to upload
   * @returns {Promise<string>} - storage_object_id
   */
  async uploadMediaFromUrl(imageUrl) {
    try {
      console.log('🔄 Attempting to upload media from URL:', imageUrl);

      // Check if it's a Facebook URL which often has CORS restrictions
      const isFacebookUrl = imageUrl.includes('facebook.com') || imageUrl.includes('fbcdn.net');
      if (isFacebookUrl) {
        console.log('📘 Detected Facebook image URL - may have CORS restrictions');
      }

      // For extension context, we need to handle CORS issues
      // Try direct fetch first, then fallback to background script if needed
      let imageResponse;

      try {
        console.log('🌐 Trying CORS fetch...');
        imageResponse = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        console.log('✅ CORS fetch response:', imageResponse.status, imageResponse.statusText);

        if (!imageResponse.ok) {
          throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`);
        }
      } catch (corsError) {
        console.log('❌ CORS failed:', corsError.message);
        console.log('🔄 Trying no-cors mode...');

        // If CORS fails, try with no-cors mode to get the image
        try {
          imageResponse = await fetch(imageUrl, {
            mode: 'no-cors'
          });
          console.log('⚠️ No-cors fetch response:', imageResponse.status, imageResponse.statusText);

          // no-cors mode returns opaque response, we can't check status
          if (imageResponse.type === 'opaque') {
            console.log('⚠️ Received opaque response - cannot verify success');
          }
        } catch (noCorsError) {
          console.error('❌ Both CORS and no-cors failed:', noCorsError.message);

          if (isFacebookUrl && typeof chrome !== 'undefined' && chrome.runtime) {
            console.log('🔄 Trying background script fallback for Facebook image...');
            try {
              const blob = await this.fetchImageViaBackground(imageUrl);
              console.log('✅ Successfully fetched via background script:', blob.size, 'bytes');

              const filename = this.getFilenameFromUrl(imageUrl) || this.generateFilename(blob.type);
              const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

              console.log('📁 Created file object via background:', filename, file.size, 'bytes');
              return await this.uploadMedia(file);

            } catch (backgroundError) {
              console.error('❌ Background script fallback also failed:', backgroundError.message);
              throw new Error(`Facebook image access blocked: All methods failed. Please save the image locally and upload manually. Error: ${backgroundError.message}`);
            }
          } else if (isFacebookUrl) {
            throw new Error(`Facebook image access blocked: Facebook images often have CORS restrictions. Please try using a direct image URL or upload the image manually. Error: ${noCorsError.message}`);
          } else {
            throw new Error(`Failed to fetch image from ${imageUrl}: ${noCorsError.message}`);
          }
        }
      }

      if (!imageResponse.ok && imageResponse.status !== 0) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }

      const blob = await imageResponse.blob();
      console.log('Image blob size:', blob.size, 'bytes, type:', blob.type);

      // Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Failed to download image - empty or invalid response. The image URL might be inaccessible or require authentication.');
      }

      // Create a File object from the blob (matching Python approach)
      const filename = this.getFilenameFromUrl(imageUrl) || this.generateFilename(blob.type);

      // Ensure we have a valid MIME type
      let mimeType = blob.type;
      if (!mimeType || mimeType === '' || mimeType === 'application/octet-stream') {
        console.log('🔧 No valid MIME type detected, defaulting to image/jpeg');
        mimeType = 'image/jpeg';
      }

      const file = new File([blob], filename, { type: mimeType });

      console.log('📁 Created file object:', filename, file.size, 'bytes, type:', file.type);

      // Additional validation before upload
      if (file.size === 0) {
        throw new Error('Created file is empty (0 bytes). The image URL might be inaccessible.');
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File is too large (>50MB). Please use a smaller image.');
      }

      return await this.uploadMedia(file);
    } catch (error) {
      console.error('❌ URL upload error:', error);

      // Check if it's a Facebook URL for specific error handling
      const isFacebookUrl = imageUrl.includes('facebook.com') || imageUrl.includes('fbcdn.net');

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (isFacebookUrl) {
          throw new Error('Facebook image access blocked: Facebook images are protected by CORS policies and cannot be directly accessed. Please try: 1) Save the image locally and upload manually, or 2) Use a different image source.');
        } else {
          throw new Error('Network error: Unable to fetch image. Please check your internet connection and ensure the image URL is accessible.');
        }
      }

      if (isFacebookUrl && (error.message.includes('CORS') || error.message.includes('blocked') || error.message.includes('empty'))) {
        throw new Error('Facebook image access restricted: Facebook protects their images with CORS policies. Please try: 1) Right-click the image and "Save image as..." then upload manually, or 2) Use a direct image URL from another source.');
      }

      // Ensure error message is properly formatted
      let errorMessage = error.message;
      if (typeof errorMessage === 'object') {
        errorMessage = JSON.stringify(errorMessage);
      } else if (typeof errorMessage !== 'string') {
        errorMessage = String(errorMessage);
      }
      throw new Error(`URL upload error: ${errorMessage}`);
    }
  }

  /**
   * Create a scheduled post
   * @param {Object} postData - Post configuration
   * @returns {Promise<Object>} - Scheduled post result
   */
  async createScheduledPost(postData) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    // Use HTTP directly since the API redirects HTTPS to HTTP
    // Chrome extensions can't follow redirects in CORS preflight requests
    const scheduleUrl = `http://public-api.robopost.app/v1/scheduled_posts/`;

    try {
      console.log('🔄 Creating scheduled post...');
      console.log('📤 Schedule URL:', scheduleUrl);
      console.log('🔑 API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'Not set');
      console.log('📋 Post data:', JSON.stringify(postData, null, 2));

      // Use background script for network requests in extension context
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'apiRequest',
            method: 'POST',
            url: scheduleUrl,
            apiKey: this.apiKey,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            if (response.success) {
              console.log('Post scheduled successfully:', response.data);
              resolve(response.data);
            } else {
              console.error('Post scheduling error:', response.error);
              console.error('Full error response:', response);

              // Provide more specific error messages based on error type
              if (response.error.includes('Failed to fetch') || response.error.includes('TypeError')) {
                reject(new Error('Network error: Unable to connect to RoboPost API. Please check your internet connection and try again.'));
              } else if (response.error.includes('401') || response.error.includes('Unauthorized')) {
                reject(new Error('Authentication failed: Please check your API key in Settings.'));
              } else if (response.error.includes('403') || response.error.includes('Forbidden')) {
                reject(new Error('Access denied: Please check your API permissions.'));
              } else if (response.error.includes('429') || response.error.includes('rate limit')) {
                reject(new Error('Rate limit exceeded: Please wait a moment and try again.'));
              } else if (response.error.includes('400') || response.error.includes('Bad Request')) {
                reject(new Error('Invalid request: Please check your post content and channel settings.'));
              } else if (response.error.includes('422')) {
                reject(new Error('Invalid data: The request contains invalid fields or values. Please check your post content and try again.'));
              } else {
                reject(new Error(`Post scheduling error: ${response.error}`));
              }
            }
          });
        });
      }

      // Fallback for non-extension contexts
      const response = await fetch(`${scheduleUrl}?apikey=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.msg || errorData.detail || response.statusText;
        } catch (parseError) {
          errorMessage = response.statusText || 'Unknown error';
        }
        throw new Error(`Scheduling failed: ${response.status} - ${errorMessage}`);
      }

      const result = await response.json();
      console.log('Post scheduled successfully:', result);
      return result;
    } catch (error) {
      console.error('Post scheduling error:', error);

      // Provide more specific error messages based on error type
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('Network error: Unable to connect to RoboPost API. Please check your internet connection and try again.');
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('Authentication failed: Please check your API key in Settings.');
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        throw new Error('Access denied: Please check your API permissions.');
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded: Please wait a moment and try again.');
      } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
        throw new Error('Invalid request: Please check your post content and channel settings.');
      } else if (error.message.includes('422')) {
        throw new Error('Invalid data: The request contains invalid fields or values. Please check your post content and try again.');
      }

      throw new Error(`Post scheduling error: ${error.message}`);
    }
  }

  /**
   * Schedule a post with media from captured content
   * @param {Object} options - Scheduling options
   */
  async schedulePostFromCapture(options) {
    const {
      imageUrl,
      caption,
      channelIds,
      scheduleAt,
      title,
      storageId, // Add support for pre-uploaded media
      platformSettings = {}
    } = options;

    try {
      console.log('🔄 Starting post scheduling...');

      let mediaStorageId;

      // Step 1: Use existing storageId or upload media
      if (storageId) {
        console.log('✅ Using existing storage_id:', storageId);
        mediaStorageId = storageId;
      } else {
        // Upload media from URL (like Python upload_image_to_robopost)
        mediaStorageId = await this.uploadMediaFromUrl(imageUrl);
        console.log('✅ Media uploaded, storage_id:', mediaStorageId);
      }

      // Step 2: Create simple payload (exactly like Python schedule_facebook_image)
      const payload = {
        text: caption || '',
        channel_ids: channelIds,
        schedule_at: scheduleAt,
        image_object_ids: [mediaStorageId],
        is_draft: false
      };

      // Only add YouTube settings if title provided
      if (title) {
        payload.youtube_settings = {
          videoTitle: title,
          videoDescription: caption || '',
          videoPrivacyStatus: "public",
          videoType: "video"
        };
      }

      console.log('📤 Scheduling with payload:', JSON.stringify(payload, null, 2));

      // Step 3: Schedule post (like Python)
      const result = await this.createScheduledPost(payload);
      console.log('📡 API response type:', typeof result);
      console.log('📡 API response is array:', Array.isArray(result));
      console.log('📡 API response:', JSON.stringify(result, null, 2));

      // Handle response exactly like Python: result.get('scheduled_posts')
      if (result.scheduled_posts && Array.isArray(result.scheduled_posts) && result.scheduled_posts.length > 0) {
        const scheduledPost = result.scheduled_posts[0];
        console.log('✅ Post scheduled successfully! ID:', scheduledPost.id);

        return {
          success: true,
          postId: scheduledPost.id,
          scheduledAt: scheduledPost.schedule_at,
          message: 'Post scheduled successfully!'
        };
      } else {
        console.error('❌ Invalid API response format. Expected object with scheduled_posts field');
        console.error('Response structure:', Object.keys(result || {}));
        console.error('Full response:', JSON.stringify(result, null, 2));
        throw new Error('Invalid API response format - no scheduled_posts field found');
      }

    } catch (error) {
      console.error('❌ Post scheduling failed:', error);
      throw new Error(`Failed to schedule post: ${error.message}`);
    }
  }

  /**
   * Schedule an album with multiple images
   * @param {Object} options - Album scheduling options
   */
  async scheduleAlbumFromCapture(options) {
    const {
      imageUrls,
      caption,
      channelIds,
      scheduleAt,
      title,
      platformSettings = {}
    } = options;

    try {
      console.log('🔄 Starting album scheduling...');

      // Step 1: Upload all images
      const storageIds = [];
      for (const imageUrl of imageUrls) {
        const storageId = await this.uploadMediaFromUrl(imageUrl);
        storageIds.push(storageId);
        console.log(`✅ Image ${storageIds.length}/${imageUrls.length} uploaded:`, storageId);

        // Add delay between uploads to avoid rate limiting
        await this.delay(500);
      }

      // Step 2: Create simple album payload (like Python)
      const payload = {
        text: caption || '',
        channel_ids: channelIds,
        schedule_at: scheduleAt,
        image_object_ids: storageIds,
        is_draft: false
      };

      // Only add YouTube settings if title provided
      if (title) {
        payload.youtube_settings = {
          videoTitle: title,
          videoDescription: caption || '',
          videoPrivacyStatus: "public",
          videoType: "video"
        };
      }

      console.log('📤 Scheduling album with payload:', JSON.stringify(payload, null, 2));

      // Step 3: Schedule album post
      const result = await this.createScheduledPost(payload);
      console.log('📡 Album API response type:', typeof result);
      console.log('📡 Album API response is array:', Array.isArray(result));
      console.log('📡 Album API response:', JSON.stringify(result, null, 2));

      // Handle response exactly like Python: result.get('scheduled_posts')
      if (result.scheduled_posts && Array.isArray(result.scheduled_posts) && result.scheduled_posts.length > 0) {
        const scheduledPost = result.scheduled_posts[0];
        console.log('✅ Album scheduled successfully! ID:', scheduledPost.id);

        return {
          success: true,
          postId: scheduledPost.id,
          scheduledAt: scheduledPost.schedule_at,
          imageCount: storageIds.length,
          message: `Album with ${storageIds.length} images scheduled successfully!`
        };
      } else {
        console.error('❌ Invalid album API response format. Expected object with scheduled_posts field');
        console.error('Response structure:', Object.keys(result || {}));
        console.error('Full response:', JSON.stringify(result, null, 2));
        throw new Error('Invalid API response format - no scheduled_posts field found');
      }

    } catch (error) {
      console.error('❌ Album scheduling failed:', error);
      throw new Error(`Failed to schedule album: ${error.message}`);
    }
  }

  /**
   * Bulk schedule posts from saved items
   * @param {Array} items - Array of saved items
   * @param {Object} options - Bulk scheduling options
   */
  async bulkSchedulePosts(items, options) {
    const {
      channelIds,
      startTime,
      intervalMinutes = 30,
      platformSettings = {}
    } = options;

    const results = [];
    let currentTime = new Date(startTime);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        const scheduleTime = new Date(currentTime.getTime() + (i * intervalMinutes * 60000));

        console.log(`📅 Scheduling post ${i + 1}/${items.length}:`, {
          imageUrl: item.imageUrl,
          caption: item.caption?.substring(0, 50) + '...',
          channelIds: channelIds,
          scheduleAt: scheduleTime.toISOString()
        });

        const result = await this.schedulePostFromCapture({
          imageUrl: item.imageUrl,
          caption: item.caption,
          title: item.caption, // Use caption as title as requested
          channelIds: channelIds,
          scheduleAt: scheduleTime.toISOString(),
          platformSettings: platformSettings
        });

        console.log(`✅ Post ${i + 1} scheduled successfully:`, result);

        results.push({
          index: i,
          success: true,
          result: result,
          item: item
        });

        // Add delay between requests to avoid rate limiting
        await this.delay(1000);
        
      } catch (error) {
        console.error(`Failed to schedule post ${i + 1}:`, error);
        let errorMessage = error.message;

        // Provide more specific error messages
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
          errorMessage = 'Network error: Unable to connect to RoboPost API. Please check your internet connection and try again.';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Authentication failed: Please check your API key in Settings.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Access denied: Please check your API permissions.';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded: Please wait a moment and try again.';
        }

        results.push({
          index: i,
          success: false,
          error: errorMessage,
          item: item
        });
      }
    }

    return results;
  }

  /**
   * Get default scheduling settings
   */
  async getDefaultSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'defaultDelay',
        'defaultChannels'
      ], (result) => {
        resolve({
          defaultDelay: result.defaultDelay || 10,
          defaultChannels: result.defaultChannels ? result.defaultChannels.split('\n').filter(c => c.trim()) : []
        });
      });
    });
  }

  /**
   * Utility function to extract filename from URL
   */
  getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename && filename.includes('.') ? filename : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a filename based on MIME type
   */
  generateFilename(mimeType) {
    const timestamp = Date.now();

    if (!mimeType) {
      return `image-${timestamp}.jpg`;
    }

    // Map common MIME types to extensions
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/avi': 'avi',
      'video/mov': 'mov',
      'video/wmv': 'wmv'
    };

    const extension = mimeToExt[mimeType.toLowerCase()] || 'jpg';
    const prefix = mimeType.startsWith('video/') ? 'video' : 'image';

    return `${prefix}-${timestamp}.${extension}`;
  }

  /**
   * Detect MIME type from file signature (magic bytes)
   */
  detectMimeType(byteArray) {
    if (byteArray.length < 4) return null;

    // Check for common image file signatures
    const bytes = Array.from(byteArray.slice(0, 12));

    // JPEG
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'image/png';
    }

    // GIF
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif';
    }

    // WebP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'image/webp';
    }

    // BMP
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
      return 'image/bmp';
    }

    return null; // Unknown format
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a test image for API testing
   */
  async createTestImage() {
    try {
      // Create a simple test image using canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, 400, 400);
      gradient.addColorStop(0, '#4F46E5');
      gradient.addColorStop(1, '#7C3AED');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 400);

      // Add test text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🧪 API TEST', 200, 180);

      ctx.font = '20px Arial';
      ctx.fillText('AI Post Robot', 200, 220);
      ctx.fillText('Extension Test', 200, 250);

      // Add timestamp
      ctx.font = '14px Arial';
      ctx.fillText(new Date().toLocaleString(), 200, 300);

      // Convert canvas to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 0.9);
      });

      // Create file object
      const testFile = new File([blob], 'api-test-image.png', {
        type: 'image/png',
        lastModified: Date.now()
      });

      // Upload the test image
      const storageId = await this.uploadMedia(testFile);
      return storageId;

    } catch (error) {
      console.error('❌ Failed to create test image:', error);
      throw new Error(`Test image creation failed: ${error.message}`);
    }
  }

  /**
   * Test function to debug API scheduling issues
   * Call this from console: window.roboPostAPI.testScheduling()
   */
  async testScheduling() {
    try {
      console.log('🧪 Starting RoboPost API scheduling test...');

      // Initialize API
      const isInitialized = await this.initialize();
      if (!isInitialized) {
        throw new Error('API key not configured');
      }

      console.log('✅ API initialized');

      // Test connection
      await this.testConnection();
      console.log('✅ API connection successful');

      // Get channels
      const channels = await this.getChannels();
      console.log('✅ Channels retrieved:', channels.length);

      if (channels.length === 0) {
        throw new Error('No channels found');
      }

      // Use first channel for test
      const testChannelId = channels[0].id;
      console.log('🎯 Using test channel:', channels[0].name, '(', testChannelId, ')');

      // Create a proper test image instead of using hardcoded storage ID
      console.log('🖼️ Creating test image...');
      const testStorageId = await this.createTestImage();
      console.log('✅ Test image uploaded, storage_id:', testStorageId);

      // Create test payload as DRAFT to prevent publishing to real social media
      const scheduleTime = new Date(Date.now() + 5 * 60000).toISOString(); // 5 minutes from now
      const payload = {
        text: '🧪 Test post from AI Post Robot extension - API debugging test (DRAFT MODE)',
        channel_ids: [testChannelId],
        schedule_at: scheduleTime,
        image_object_ids: [testStorageId],
        is_draft: true // This prevents the post from being published to real social media
      };

      console.log('📋 Test payload:', JSON.stringify(payload, null, 2));

      // Test the exact createScheduledPost call (as DRAFT)
      console.log('📅 Testing createScheduledPost in DRAFT mode (will not publish to social media)...');

      // First test with background script (extension context)
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('🔄 Testing via background script...');

        const scheduleUrl = `${this.baseUrl}/scheduled_posts/`;

        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'apiRequest',
            method: 'POST',
            url: scheduleUrl,
            apiKey: this.apiKey,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          }, (response) => {
            console.log('📡 Background script response:', response);

            if (chrome.runtime.lastError) {
              console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
              resolve({
                success: false,
                error: `Chrome runtime error: ${chrome.runtime.lastError.message}`,
                details: 'Extension messaging failed'
              });
              return;
            }

            if (response.success) {
              console.log('✅ Background script success:', response.data);
              resolve({
                success: true,
                message: 'Test completed successfully via background script! (Draft mode - not published to social media)',
                result: response.data
              });
            } else {
              console.error('❌ Background script error:', response.error);
              resolve({
                success: false,
                error: response.error,
                details: 'Background script API call failed',
                fullResponse: response
              });
            }
          });
        });
      } else {
        // Fallback direct fetch
        console.log('🔄 Testing via direct fetch...');
        const result = await this.createScheduledPost(payload);

        return {
          success: true,
          message: 'Test completed successfully via direct fetch! (Draft mode - not published to social media)',
          result: result
        };
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }



  /**
   * Get posting analytics and optimal times
   * @param {string} channelId - Channel ID to get analytics for
   */
  async getChannelAnalytics(channelId) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/channels/${channelId}/analytics?apikey=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Analytics not available for channel ${channelId}:`, error.message);
      return null;
    }
  }

  /**
   * Test image URL accessibility
   * @param {string} imageUrl - URL to test
   * @returns {Promise<Object>} - Test result
   */
  async testImageUrl(imageUrl) {
    try {
      console.log('🧪 Testing image URL accessibility:', imageUrl);

      const isFacebookUrl = imageUrl.includes('facebook.com') || imageUrl.includes('fbcdn.net');

      // Try a simple HEAD request first
      try {
        const headResponse = await fetch(imageUrl, { method: 'HEAD', mode: 'cors' });
        if (headResponse.ok) {
          return {
            success: true,
            method: 'HEAD request',
            status: headResponse.status,
            contentType: headResponse.headers.get('content-type'),
            contentLength: headResponse.headers.get('content-length')
          };
        }
      } catch (headError) {
        console.log('HEAD request failed:', headError.message);
      }

      // Try full fetch
      try {
        const response = await fetch(imageUrl, { mode: 'cors' });
        if (response.ok) {
          const blob = await response.blob();
          return {
            success: true,
            method: 'CORS fetch',
            status: response.status,
            size: blob.size,
            type: blob.type
          };
        }
      } catch (corsError) {
        console.log('CORS fetch failed:', corsError.message);
      }

      // If Facebook URL, try background script
      if (isFacebookUrl && typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          const blob = await this.fetchImageViaBackground(imageUrl);
          return {
            success: true,
            method: 'Background script',
            size: blob.size,
            type: blob.type
          };
        } catch (bgError) {
          return {
            success: false,
            method: 'All methods failed',
            error: `Facebook URL not accessible: ${bgError.message}`,
            suggestion: 'Please save the image locally and upload manually'
          };
        }
      }

      return {
        success: false,
        method: 'All methods failed',
        error: 'Image URL not accessible via any method',
        isFacebookUrl: isFacebookUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format date for scheduling (ISO 8601 UTC)
   */
  formatScheduleDate(date) {
    return new Date(date).toISOString();
  }

  /**
   * Calculate schedule time with default delay
   */
  async getDefaultScheduleTime() {
    const settings = await this.getDefaultSettings();
    const now = new Date();
    return new Date(now.getTime() + (settings.defaultDelay * 60000));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RoboPostAPI;
} else if (typeof window !== 'undefined') {
  window.RoboPostAPI = RoboPostAPI;
}

// Create global instance for extension use
if (typeof chrome !== 'undefined') {
  window.roboPostAPI = new RoboPostAPI();
}
