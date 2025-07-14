// AI Post Robot Background Service Worker
let selectedText = "";
let categories = ["Facebook", "Pinterest"];
let enabledUrls = [];

// Enhanced message handling for new features
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "updateSelectedText":
      selectedText = request.text;
      break;
    case "addCategory":
      addCategory(request.category);
      break;
    case "removeCategory":
      removeCategory(request.category);
      break;
    case "addUrl":
      addUrl(request.url);
      break;
    case "removeUrl":
      removeUrl(request.url);
      break;
    case "updateCaptureSettings":
      // Forward settings update to content scripts
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "updateCaptureSettings",
            settings: request.settings
          }).catch(() => {}); // Ignore errors for inactive tabs
        });
      });
      break;
    case "ctrlClickSave":
      // Handle Ctrl+click save with last used category
      const imageUrl = request.imageUrl;
      const caption = request.caption || selectedText.replace(/[\n\r]+/g, ' ').trim();

      chrome.storage.local.get(["savedItems", "counters", "lastUsedCategory"], (result) => {
        const savedItems = result.savedItems || {};
        const counters = result.counters || { captionCount: 0, linkCount: 0 };
        const category = result.lastUsedCategory || categories[0] || 'General';

        if (!savedItems[category]) savedItems[category] = [];
        savedItems[category].push({ imageUrl, caption });

        // Update counters
        if (caption.trim()) counters.captionCount++;
        if (imageUrl) counters.linkCount++;

        chrome.storage.local.set({ savedItems, counters }, () => {
          updateBadgeText(savedItems);
          const totalCount = getTotalCount(savedItems);
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "showSavedMessage",
            count: totalCount,
            textCount: counters.captionCount,
            linkCount: counters.linkCount
          });
        });
      });
      break;
    case "testRoboPostAPI":
      // Handle API testing if needed
      sendResponse({ success: true });
      break;
    case "fetchImage":
      // Handle image fetching for CORS-restricted URLs
      fetchImageForExtension(request.url, sendResponse);
      return true; // Keep message channel open for async response
    case "apiRequest":
      // Handle API requests for RoboPost
      handleApiRequest(request, sendResponse);
      return true; // Keep message channel open for async response
    case "uploadMedia":
      // Handle media upload for RoboPost
      handleMediaUpload(request, sendResponse);
      return true; // Keep message channel open for async response
    case "testNetworkFromBackground":
      // Test network connectivity from background script
      testNetworkFromBackground(request, sendResponse);
      return true; // Keep message channel open for async response
  }
});

// Function to fetch images for CORS-restricted URLs
async function fetchImageForExtension(imageUrl, sendResponse) {
  try {
    console.log('Background: Fetching image from:', imageUrl);

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error('Received empty image data');
    }

    // Convert blob to base64 for message passing
    const reader = new FileReader();
    reader.onload = function() {
      const base64Data = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      sendResponse({
        success: true,
        data: base64Data,
        contentType: blob.type,
        size: blob.size
      });
    };
    reader.onerror = function() {
      sendResponse({
        success: false,
        error: 'Failed to convert image to base64'
      });
    };
    reader.readAsDataURL(blob);

  } catch (error) {
    console.error('Background: Image fetch failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Function to handle API requests for RoboPost
async function handleApiRequest(request, sendResponse) {
  try {
    console.log('Background: Making API request to:', request.url);
    console.log('Background: Method:', request.method);

    // Add API key as URL parameter
    const url = new URL(request.url);
    if (request.apiKey) {
      url.searchParams.set('apikey', request.apiKey);
    }

    const fetchOptions = {
      method: request.method,
      headers: request.headers || {}
    };

    if (request.body) {
      fetchOptions.body = request.body;
    }

    console.log('Background: Final URL with API key:', url.toString());
    const response = await fetch(url.toString(), fetchOptions);
    console.log('Background: API response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        console.log('Background: API error data:', errorData);

        // Handle different error response formats
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.msg) {
          errorMessage = errorData.msg;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } catch (e) {
        errorMessage = response.statusText || 'Unknown error';
      }
      throw new Error(`API request failed: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json();
    console.log('Background: API request successful');
    console.log('Background: Response data type:', typeof data);
    console.log('Background: Response is array:', Array.isArray(data));
    console.log('Background: Response data:', JSON.stringify(data, null, 2));

    sendResponse({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Background: API request failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Function to test network connectivity from background script
async function testNetworkFromBackground(request, sendResponse) {
  try {
    console.log('Background: Testing network connectivity...');

    // Test 1: Basic internet connectivity
    const internetTest = await fetch('https://httpbin.org/get', { method: 'GET' });
    console.log('Background: Internet test response:', internetTest.status, internetTest.statusText);

    // Test 2: AI Post Robot API connectivity
    const apiUrl = `https://public-api.robopost.app/v1/channels?apikey=${request.apiKey}`;
    console.log('Background: Testing AI Post Robot API:', apiUrl);
    const apiTest = await fetch(apiUrl, { method: 'GET' });
    console.log('Background: AI Post Robot API test response:', apiTest.status, apiTest.statusText);

    // Test 3: RoboPost media upload endpoint
    const uploadUrl = `https://public-api.robopost.app/v1/medias/upload?apikey=${request.apiKey}`;
    console.log('Background: Testing RoboPost upload endpoint (HEAD request):', uploadUrl);
    const uploadTest = await fetch(uploadUrl, { method: 'HEAD' });
    console.log('Background: RoboPost upload test response:', uploadTest.status, uploadTest.statusText);

    sendResponse({
      success: true,
      tests: {
        internet: { status: internetTest.status, ok: internetTest.ok },
        api: { status: apiTest.status, ok: apiTest.ok },
        upload: { status: uploadTest.status, ok: uploadTest.ok }
      }
    });

  } catch (error) {
    console.error('Background: Network test failed:', error);
    sendResponse({
      success: false,
      error: error.message,
      errorName: error.name
    });
  }
}

// Function to handle media upload for RoboPost
async function handleMediaUpload(request, sendResponse) {
  try {
    console.log('Background: Uploading media to:', request.url);
    console.log('Background: File size:', request.fileSize, 'bytes');

    // Add API key as URL parameter
    const url = new URL(request.url);
    if (request.apiKey) {
      url.searchParams.set('apikey', request.apiKey);
    }

    // Validate input data
    if (!request.fileData) {
      throw new Error('No file data provided');
    }

    if (!request.fileName) {
      throw new Error('No file name provided');
    }

    // Convert base64 back to blob
    const byteCharacters = atob(request.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Ensure we have a valid MIME type (matching Python approach)
    let fileType = request.fileType;
    if (!fileType || fileType === '' || fileType === 'application/octet-stream') {
      console.log('Background: No valid MIME type, defaulting to image/jpeg');
      fileType = 'image/jpeg';
    }

    const blob = new Blob([byteArray], { type: fileType });

    // Validate blob size matches original
    if (blob.size !== request.fileSize) {
      console.warn(`Background: Size mismatch - Original: ${request.fileSize}, Reconstructed: ${blob.size}`);
    }

    // Validate blob is not empty
    if (blob.size === 0) {
      throw new Error('Reconstructed file is empty (0 bytes)');
    }

    // Create FormData (exactly like Python: files = {'file': image_file})
    const formData = new FormData();
    formData.append('file', blob, request.fileName);

    console.log('Background: Final upload URL with API key:', url.toString());
    console.log('Background: File details - Name:', request.fileName, 'Type:', fileType, 'Original Size:', request.fileSize);
    console.log('Background: Reconstructed blob - Size:', blob.size, 'Type:', blob.type);
    console.log('Background: FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`Background: FormData ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes, ${value.type})` : value);
    }

    // Create fetch with timeout (matching Python's 60-second timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Background: Upload timeout after 60 seconds');
      controller.abort();
    }, 60000); // 60 seconds

    try {
      console.log('Background: Starting fetch request...');
      const response = await fetch(url.toString(), {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log('Background: Fetch completed successfully');

      console.log('Background: Upload response status:', response.status);
      console.log('Background: Upload response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorData = null;
      try {
        const responseText = await response.text();
        console.log('Background: Upload error response text:', responseText);

        if (responseText) {
          try {
            errorData = JSON.parse(responseText);
            console.log('Background: Parsed error data:', errorData);

            // Extract error message in order of preference (matching Python approach)
            if (errorData.msg) {
              errorMessage = errorData.msg;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
              // Handle validation errors array
              errorMessage = errorData.errors.map(err =>
                typeof err === 'string' ? err :
                err.message || err.msg || JSON.stringify(err)
              ).join(', ');
            } else {
              // If it's an object with unknown structure, extract meaningful info
              const keys = Object.keys(errorData);
              if (keys.length > 0) {
                errorMessage = keys.map(key => `${key}: ${errorData[key]}`).join(', ');
              } else {
                errorMessage = 'Unknown API error';
              }
            }
          } catch (parseError) {
            console.log('Background: Failed to parse error JSON:', parseError);
            errorMessage = responseText || response.statusText || 'Unknown error';
          }
        } else {
          errorMessage = response.statusText || 'Unknown error';
        }
      } catch (e) {
        console.log('Background: Failed to read error response:', e);
        errorMessage = response.statusText || 'Unknown error';
      }

      console.log('Background: Final error message:', errorMessage);
      throw new Error(`Upload failed: ${response.status} - ${errorMessage}`);
    }

      const result = await response.json();
      console.log('Background: Upload successful, storage_object_id:', result.storage_object_id);

      sendResponse({
        success: true,
        data: result
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout errors specifically
      if (fetchError.name === 'AbortError') {
        throw new Error('Upload timeout: The upload took too long (>60 seconds). Please try with a smaller file.');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Background: Media upload failed:', error);
    console.error('Background: Error name:', error.name);
    console.error('Background: Error message:', error.message);
    console.error('Background: Full error object:', error);

    // Provide more specific error messages but preserve the original error details
    let errorMessage = error.message;
    if (error.name === 'AbortError') {
      errorMessage = 'Upload timeout: The upload took too long. Please try with a smaller file.';
    } else if (error.name === 'TypeError' && errorMessage.includes('fetch')) {
      errorMessage = `Network error: Unable to connect to RoboPost API. Original error: ${error.message}`;
    } else if (errorMessage.includes('Failed to fetch')) {
      errorMessage = `Network connectivity issue: ${error.message}. Please check your internet connection and try again.`;
    }
    // Don't modify other error messages - let them pass through as-is

    sendResponse({
      success: false,
      error: errorMessage
    });
  }
}

// Remove duplicate message listener (already handled above)

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();

  // Initialize storage with enhanced default settings
  chrome.storage.local.set({
    savedItems: {},
    categories: categories,
    counters: {
      captionCount: 0,
      linkCount: 0
    },
    enabledUrls: [
      "*://*.facebook.com/*",
      "*://*.pinterest.com/*"
    ],
    // Default settings for new features
    defaultDelay: 10,
    defaultChannels: '',
    autoCapture: true,
    captionMaxLength: -1, // No limit - capture full captions
    robopostApiKey: '',
    enableCtrlClick: true,
    lastUsedCategory: categories[0] || 'General'
  });

  // Set initial badge with black background and white text
  chrome.action.setBadgeText({ text: "0" });
  chrome.action.setBadgeBackgroundColor({ color: "#000000" }); // Black background
  chrome.action.setBadgeTextColor({ color: "#FFFFFF" }); // White text
});

function addUrl(newUrl) {
  chrome.storage.local.get("enabledUrls", (result) => {
    let urls = result.enabledUrls || [];
    if (!urls.includes(newUrl)) {
      // Format URL to proper pattern
      if (!newUrl.startsWith("*://")) {
        newUrl = `*://*.${newUrl}/*`;
      }
      urls.push(newUrl);
      chrome.storage.local.set({ enabledUrls: urls }, () => {
        updateContextMenuPatterns(urls);
      });
    }
  });
}

function removeUrl(urlToRemove) {
  chrome.storage.local.get("enabledUrls", (result) => {
    let urls = result.enabledUrls || [];
    urls = urls.filter(url => url !== urlToRemove);
    chrome.storage.local.set({ enabledUrls: urls }, () => {
      updateContextMenuPatterns(urls);
    });
  });
}

function updateContextMenuPatterns(urls) {
  // Remove existing context menu
  chrome.contextMenus.removeAll(() => {
    // Recreate with new patterns
    chrome.contextMenus.create({
      id: "saveSocialImage",
      title: "Save image link and caption",
      contexts: ["image"],
      documentUrlPatterns: urls
    });

    // Recreate category submenus
    categories.forEach(category => {
      chrome.contextMenus.create({
        id: `save_${category}`,
        parentId: "saveSocialImage",
        title: category,
        contexts: ["image"],
        documentUrlPatterns: urls
      });
    });
  });
}

function createContextMenu() {
  // Image context menu
  chrome.contextMenus.create({
    id: "saveSocialImage",
    title: "Save image link and caption",
    contexts: ["image"],
    documentUrlPatterns: [
      "*://*.facebook.com/*",
      "*://*.pinterest.com/*"
    ]
  });

  // Text selection context menu
  chrome.contextMenus.create({
    id: "saveTextPost",
    title: "Save as text post",
    contexts: ["selection"],
    documentUrlPatterns: [
      "*://*.facebook.com/*",
      "*://*.pinterest.com/*"
    ]
  });

  categories.forEach(category => {
    // Image submenu items
    chrome.contextMenus.create({
      id: `save_${category}`,
      parentId: "saveSocialImage",
      title: category,
      contexts: ["image"],
      documentUrlPatterns: [
        "*://*.facebook.com/*",
        "*://*.pinterest.com/*"
      ]
    });

    // Text post submenu items
    chrome.contextMenus.create({
      id: `text_${category}`,
      parentId: "saveTextPost",
      title: category,
      contexts: ["selection"],
      documentUrlPatterns: [
        "*://*.facebook.com/*",
        "*://*.pinterest.com/*"
      ]
    });
  });
}

function addCategory(newCategory) {
  if (!categories.includes(newCategory)) {
    categories.push(newCategory);

    // Add image context menu item
    chrome.contextMenus.create({
      id: `save_${newCategory}`,
      parentId: "saveSocialImage",
      title: newCategory,
      contexts: ["image"],
      documentUrlPatterns: [
        "*://*.facebook.com/*",
        "*://*.pinterest.com/*"
      ]
    });

    // Add text post context menu item
    chrome.contextMenus.create({
      id: `text_${newCategory}`,
      parentId: "saveTextPost",
      title: newCategory,
      contexts: ["selection"],
      documentUrlPatterns: [
        "*://*.facebook.com/*",
        "*://*.pinterest.com/*"
      ]
    });

    chrome.storage.local.set({ categories: categories });
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("save_")) {
    // Handle image posts
    const category = info.menuItemId.split("_")[1];
    const imageUrl = info.srcUrl;
    // Clean the caption when saving
    const caption = selectedText.replace(/[\n\r]+/g, ' ').trim();

    chrome.storage.local.get(["savedItems", "counters"], (result) => {
      const savedItems = result.savedItems || {};
      const counters = result.counters || { captionCount: 0, linkCount: 0 };

      if (!savedItems[category]) savedItems[category] = [];
      savedItems[category].push({ imageUrl, caption });

      // Update counters
      if (caption.trim()) counters.captionCount++;
      if (imageUrl) counters.linkCount++;

      // Store the last used category for Ctrl+click feature
      chrome.storage.local.set({
        savedItems,
        counters,
        lastUsedCategory: category
      }, () => {
        updateBadgeText(savedItems);
        const totalCount = getTotalCount(savedItems);
        chrome.tabs.sendMessage(tab.id, {
          action: "showSavedMessage",
          count: totalCount,
          textCount: counters.captionCount,
          linkCount: counters.linkCount
        });
      });
    });
  } else if (info.menuItemId.startsWith("text_")) {
    // Handle text posts
    const category = info.menuItemId.split("_")[1];
    const textContent = info.selectionText || selectedText;

    if (!textContent || !textContent.trim()) {
      chrome.tabs.sendMessage(tab.id, {
        action: "showSavedMessage",
        count: 0,
        textCount: 0,
        linkCount: 0,
        message: "❌ No text selected"
      });
      return;
    }

    chrome.storage.local.get(["savedItems", "counters", "categories"], (result) => {
      const savedItems = result.savedItems || {};
      const counters = result.counters || { captionCount: 0, linkCount: 0 };
      const categories = result.categories || [];

      // Create text post object
      const textPost = {
        id: `text_${Date.now()}`,
        title: textContent.substring(0, 50) + (textContent.length > 50 ? '...' : ''),
        caption: textContent.trim(),
        imageUrl: null, // No image for text posts
        isTextOnly: true, // Flag to identify text-only posts
        category: category,
        timestamp: Date.now(),
        source: 'text_selection',
        fileType: 'text/plain'
      };

      // Add category if it doesn't exist
      if (!categories.includes(category)) {
        categories.push(category);
      }

      // Add to saved items
      if (!savedItems[category]) savedItems[category] = [];
      savedItems[category].push(textPost);

      // Update counters
      counters.captionCount++;

      // Store the last used category for Ctrl+click feature
      chrome.storage.local.set({
        savedItems,
        counters,
        categories,
        lastUsedCategory: category
      }, () => {
        updateBadgeText(savedItems);
        const totalCount = getTotalCount(savedItems);
        chrome.tabs.sendMessage(tab.id, {
          action: "showSavedMessage",
          count: totalCount,
          textCount: counters.captionCount,
          linkCount: counters.linkCount,
          message: `✅ Text post saved to "${category}"`
        });
      });
    });
  }
});

function updateBadgeText(savedItems) {
  const totalCount = getTotalCount(savedItems);
  chrome.action.setBadgeText({ text: totalCount.toString() });
  chrome.action.setBadgeBackgroundColor({ color: "#000000" }); // Black background
  chrome.action.setBadgeTextColor({ color: "#FFFFFF" }); // White text
}

function getTotalCount(savedItems) {
  return Object.values(savedItems).reduce((sum, list) => sum + list.length, 0);
}

// Remove duplicate message listener (already handled at the top)

function removeCategory(category) {
  chrome.contextMenus.remove(`save_${category}`);
  chrome.contextMenus.remove(`text_${category}`);
  categories = categories.filter(cat => cat !== category);
}