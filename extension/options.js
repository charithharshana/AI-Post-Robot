// Options page functionality for AI Post Robot
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  setupEventListeners();
  initializeGeminiUI();
});

function setupEventListeners() {
  // API Configuration
  document.getElementById('testApiBtn').addEventListener('click', testApiConnection);
  document.getElementById('diagnosticsBtn').addEventListener('click', runDiagnostics);
  document.getElementById('saveApiBtn').addEventListener('click', saveApiKey);

  // Gemini API Configuration
  document.getElementById('saveGeminiBtn').addEventListener('click', saveGeminiSettings);
  document.getElementById('addModelBtn').addEventListener('click', addCustomModel);
  document.getElementById('removeModelBtn').addEventListener('click', removeCustomModel);
  document.getElementById('setFavoriteBtn').addEventListener('click', setFavoriteModel);
  document.getElementById('toggleApiKeysBtn').addEventListener('click', toggleApiKeysVisibility);

  // Scheduling Settings
  document.getElementById('saveSchedulingBtn').addEventListener('click', saveSchedulingSettings);

  // Quick Capture Settings
  document.getElementById('saveQuickCaptureBtn').addEventListener('click', saveQuickCaptureSettings);

  // Data Management
  document.getElementById('exportDataBtn').addEventListener('click', exportAllData);
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
}

function loadSettings() {
  chrome.storage.local.get([
    'robopostApiKey',
    'geminiApiKeys',
    'geminiModel',
    'geminiImageModel',
    'defaultDelay',
    'defaultChannels',
    'defaultTimezone',
    'channelsData',
    'enableCtrlClick'
  ], (result) => {
    // API Settings
    if (result.robopostApiKey) {
      document.getElementById('apiKey').value = result.robopostApiKey;
      updateApiStatus(true);
      loadChannelsList(result.channelsData, result.defaultChannels);
    }

    // Gemini API Settings
    if (result.geminiApiKeys) {
      document.getElementById('geminiApiKeys').value = result.geminiApiKeys;
      updateGeminiApiStatus(true);
    }
    document.getElementById('geminiModel').value = result.geminiModel || 'gemini-2.5-flash-lite-preview-06-17';
    document.getElementById('geminiImageModel').value = result.geminiImageModel || 'gemini-2.5-flash-image-preview';

    // Scheduling Settings
    document.getElementById('defaultDelay').value = result.defaultDelay || 10;
    document.getElementById('defaultTimezone').value = result.defaultTimezone || 'auto';

    // Quick Capture Settings
    document.getElementById('enableCtrlClick').checked = result.enableCtrlClick !== false;
  });
}

async function testApiConnection() {
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    showButtonMessage('testApiBtn', '❌ Enter API key first', '🔍 Test Connection');
    return;
  }

  const testBtn = document.getElementById('testApiBtn');
  const originalText = testBtn.textContent;
  testBtn.textContent = '🔄 Testing...';
  testBtn.disabled = true;

  try {
    // Test API connection and get channels
    const response = await fetch(`https://public-api.robopost.app/v1/channels?apikey=${apiKey}`);

    if (response.ok) {
      const channelsData = await response.json();
      updateApiStatus(true);

      // Store channel data and display channels
      if (channelsData && channelsData.length > 0) {
        // Auto-save the API key and channels data
        chrome.storage.local.set({
          robopostApiKey: apiKey,
          channelsData: channelsData,
          defaultChannels: '' // Reset default channels selection
        }, () => {
          loadChannelsList(channelsData, '');
          showButtonMessage('testApiBtn', `✅ Connected! Found ${channelsData.length} channels`, originalText);
        });
      } else {
        chrome.storage.local.set({
          robopostApiKey: apiKey,
          channelsData: [],
          defaultChannels: ''
        }, () => {
          loadChannelsList([], '');
          showButtonMessage('testApiBtn', '✅ Connected! No channels found', originalText);
        });
      }
    } else {
      updateApiStatus(false);
      showButtonMessage('testApiBtn', `❌ Connection Failed: ${response.status}`, originalText);
    }
  } catch (error) {
    updateApiStatus(false);
    showButtonMessage('testApiBtn', `❌ Connection Error`, originalText);
  }

  testBtn.disabled = false;
}

async function runDiagnostics() {
  const diagnosticsBtn = document.getElementById('diagnosticsBtn');
  const diagnosticsResult = document.getElementById('diagnosticsResult');
  const originalText = diagnosticsBtn.textContent;

  diagnosticsBtn.textContent = '🔄 Running diagnostics...';
  diagnosticsBtn.disabled = true;
  diagnosticsResult.style.display = 'none';

  try {
    // Check if RoboPostAPI is available
    if (typeof RoboPostAPI === 'undefined') {
      throw new Error('RoboPostAPI is not defined. Please refresh the page and try again.');
    }

    // Initialize RoboPost API
    const roboPostAPI = new RoboPostAPI();
    await roboPostAPI.initialize();

    // Run diagnostics
    const diagnostics = await roboPostAPI.runDiagnostics();

    // Format results
    let resultText = `🔧 DIAGNOSTIC REPORT\n`;
    resultText += `Timestamp: ${diagnostics.timestamp}\n`;
    resultText += `API Key: ${diagnostics.apiKey}\n`;
    resultText += `Base URL: ${diagnostics.baseUrl}\n\n`;

    resultText += `TEST RESULTS:\n`;
    diagnostics.tests.forEach((test, index) => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      resultText += `${index + 1}. ${test.name}: ${status} ${test.status}\n`;
      resultText += `   ${test.message}\n\n`;
    });

    // Show results
    diagnosticsResult.textContent = resultText;
    diagnosticsResult.className = 'status-message status-info';
    diagnosticsResult.style.display = 'block';

    diagnosticsBtn.textContent = '✅ Diagnostics Complete';
    setTimeout(() => {
      diagnosticsBtn.textContent = originalText;
    }, 3000);

  } catch (error) {
    diagnosticsResult.textContent = `❌ Diagnostics failed: ${error.message}`;
    diagnosticsResult.className = 'status-message status-error';
    diagnosticsResult.style.display = 'block';

    diagnosticsBtn.textContent = '❌ Diagnostics Failed';
    setTimeout(() => {
      diagnosticsBtn.textContent = originalText;
    }, 3000);
  }

  diagnosticsBtn.disabled = false;
}

function saveApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    showButtonMessage('saveApiBtn', '❌ Enter API key first', '💾 Save API Key');
    return;
  }

  chrome.storage.local.set({ robopostApiKey: apiKey }, () => {
    showButtonMessage('saveApiBtn', '✅ API key saved!', '💾 Save API Key');
    updateApiStatus(true);
  });
}

function saveSchedulingSettings() {
  const defaultDelay = parseInt(document.getElementById('defaultDelay').value) || 10;
  const defaultTimezone = document.getElementById('defaultTimezone').value;

  // Get selected channels
  const selectedChannels = [];
  const checkboxes = document.querySelectorAll('.channel-item input[type="checkbox"]:checked');
  checkboxes.forEach(checkbox => {
    selectedChannels.push(checkbox.value);
  });

  chrome.storage.local.set({
    defaultDelay: defaultDelay,
    defaultTimezone: defaultTimezone,
    defaultChannels: selectedChannels.join('\n')
  }, () => {
    showButtonMessage('saveSchedulingBtn', '✅ Settings saved!', '💾 Save Scheduling Settings');
  });
}

function saveQuickCaptureSettings() {
  const enableCtrlClick = document.getElementById('enableCtrlClick').checked;

  chrome.storage.local.set({
    enableCtrlClick: enableCtrlClick
  }, () => {
    showButtonMessage('saveQuickCaptureBtn', '✅ Quick Capture settings saved!', '💾 Save Quick Capture Settings');

    // Notify all content scripts about the setting change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: "updateQuickCaptureSettings",
          settings: { enableCtrlClick: enableCtrlClick }
        }).catch(() => {
          // Ignore errors for tabs that don't have content scripts
        });
      });
    });
  });
}

function loadChannelsList(channelsData, defaultChannels) {
  const channelsList = document.getElementById('channelsList');

  if (!channelsData || channelsData.length === 0) {
    channelsList.innerHTML = '<div class="loading-channels">❌ No channels found. Please check your API connection.</div>';
    return;
  }

  const selectedChannelIds = defaultChannels ? defaultChannels.split('\n').map(id => id.trim()) : [];

  // Load saved platform mappings
  chrome.storage.local.get(['channelPlatformMappings'], (result) => {
    const platformMappings = result.channelPlatformMappings || {};

    let html = '';
    channelsData.forEach(channel => {
      const isSelected = selectedChannelIds.includes(channel.id);

      // Use saved platform mapping or detect platform
      const savedPlatform = platformMappings[channel.id];
      const detectedPlatform = savedPlatform || detectPlatform(channel);
      const platformIcon = getPlatformIcon(detectedPlatform);

      html += `
        <div class="channel-item ${isSelected ? 'selected' : ''}">
          <div class="channel-header">
            <input type="checkbox" value="${channel.id}" ${isSelected ? 'checked' : ''}>
            <div class="channel-info">
              <div class="channel-name">${platformIcon} ${(channel.name || channel.username || 'Unnamed').substring(0, 15)}${(channel.name || channel.username || 'Unnamed').length > 15 ? '...' : ''}</div>
              <div class="channel-platform">${channel.id.substring(0, 8)}...</div>
            </div>
          </div>
          <select class="platform-selector" data-channel-id="${channel.id}">
            <option value="facebook" ${detectedPlatform === 'facebook' ? 'selected' : ''}>📘 Facebook</option>
            <option value="instagram" ${detectedPlatform === 'instagram' ? 'selected' : ''}>📷 Instagram</option>
            <option value="pinterest" ${detectedPlatform === 'pinterest' ? 'selected' : ''}>📌 Pinterest</option>
            <option value="youtube" ${detectedPlatform === 'youtube' ? 'selected' : ''}>📺 YouTube</option>
            <option value="tiktok" ${detectedPlatform === 'tiktok' ? 'selected' : ''}>🎵 TikTok</option>
            <option value="twitter" ${detectedPlatform === 'twitter' ? 'selected' : ''}>🐦 Twitter/X</option>
            <option value="linkedin" ${detectedPlatform === 'linkedin' ? 'selected' : ''}>💼 LinkedIn</option>
            <option value="threads" ${detectedPlatform === 'threads' ? 'selected' : ''}>🧵 Threads</option>
            <option value="telegram" ${detectedPlatform === 'telegram' ? 'selected' : ''}>✈️ Telegram</option>
            <option value="bluesky" ${detectedPlatform === 'bluesky' ? 'selected' : ''}>🦋 Bluesky</option>
            <option value="wordpress" ${detectedPlatform === 'wordpress' ? 'selected' : ''}>📝 WordPress</option>
            <option value="gmb" ${detectedPlatform === 'gmb' ? 'selected' : ''}>🏢 Google My Business</option>
            <option value="unknown" ${detectedPlatform === 'unknown' ? 'selected' : ''}>❓ Other Platform</option>
          </select>
        </div>
      `;
    });

    channelsList.innerHTML = html;

    // Add event listeners for platform selectors
    document.querySelectorAll('.platform-selector').forEach(selector => {
      selector.addEventListener('change', savePlatformMapping);
    });

  // Add event listeners for checkboxes to update visual selection
  document.querySelectorAll('.channel-item input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const channelItem = e.target.closest('.channel-item');
      if (e.target.checked) {
        channelItem.classList.add('selected');
      } else {
        channelItem.classList.remove('selected');
      }
    });
  });
  });
}

function detectPlatform(channel) {
  // Try multiple ways to detect the platform
  if (channel.platform) {
    return channel.platform;
  }

  // Check channel name or username for platform indicators
  const name = (channel.name || channel.username || '').toLowerCase();
  const url = (channel.url || '').toLowerCase();

  // Platform detection based on name patterns
  if (name.includes('facebook') || url.includes('facebook.com')) {
    return 'facebook';
  }
  if (name.includes('instagram') || url.includes('instagram.com')) {
    return 'instagram';
  }
  if (name.includes('twitter') || url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  if (name.includes('linkedin') || url.includes('linkedin.com')) {
    return 'linkedin';
  }
  if (name.includes('pinterest') || url.includes('pinterest.com')) {
    return 'pinterest';
  }
  if (name.includes('youtube') || url.includes('youtube.com')) {
    return 'youtube';
  }
  if (name.includes('tiktok') || url.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (name.includes('threads') || url.includes('threads.net')) {
    return 'threads';
  }
  if (name.includes('telegram') || url.includes('telegram.org') || url.includes('t.me')) {
    return 'telegram';
  }
  if (name.includes('bluesky') || url.includes('bsky.app') || url.includes('bluesky.social')) {
    return 'bluesky';
  }
  if (name.includes('wordpress') || url.includes('wordpress.com') || url.includes('wp.com')) {
    return 'wordpress';
  }
  if (name.includes('gmb') || name.includes('google my business') || name.includes('google business') || name.includes('mybusiness')) {
    return 'gmb';
  }

  // Check channel type or other properties
  if (channel.type) {
    return channel.type.toLowerCase();
  }

  // Default fallback
  return 'unknown';
}

function getPlatformIcon(platform) {
  const icons = {
    'facebook': '📘',
    'instagram': '📷',
    'pinterest': '📌',
    'youtube': '📺',
    'tiktok': '🎵',
    'twitter': '🐦',
    'linkedin': '💼',
    'threads': '🧵',
    'telegram': '✈️',
    'bluesky': '🦋',
    'wordpress': '📝',
    'gmb': '🏢',
    'unknown': '❓'
  };
  return icons[platform?.toLowerCase()] || '📱';
}

function savePlatformMapping(event) {
  const channelId = event.target.dataset.channelId;
  const platform = event.target.value;

  // Load existing mappings
  chrome.storage.local.get(['channelPlatformMappings'], (result) => {
    const mappings = result.channelPlatformMappings || {};
    mappings[channelId] = platform;

    // Save updated mappings
    chrome.storage.local.set({ channelPlatformMappings: mappings }, () => {
      console.log(`Platform mapping saved: ${channelId} -> ${platform}`);

      // Update the icon in the UI
      const channelItem = event.target.closest('.channel-item');
      const channelName = channelItem.querySelector('.channel-name');
      const icon = getPlatformIcon(platform);
      const nameText = channelName.textContent.replace(/^[📘📷📌📺🎵🐦💼🧵✈️🦋📝🏢❓📱]\s*/, '');
      channelName.textContent = `${icon} ${nameText}`;
    });
  });
}



function exportAllData() {
  chrome.storage.local.get(['savedItems', 'categories'], (result) => {
    const savedItems = result.savedItems || {};
    const categories = result.categories || [];
    
    const allItems = Object.values(savedItems).flat();
    
    if (allItems.length === 0) {
      showButtonMessage('exportDataBtn', '❌ No data to export', '📤 Export All Data');
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Category,Image URL,Caption,Date Captured\n";
    
    Object.keys(savedItems).forEach(category => {
      savedItems[category].forEach(item => {
        const cleanedCaption = item.caption
          ? item.caption.replace(/[\n\r]+/g, ' ').replace(/,/g, ' ')
          : "";

        // Get the proper download URL (same logic as download function)
        let exportUrl = '';
        if (item.storageId) {
          exportUrl = `https://api.robopost.app/stored_objects/${item.storageId}/download`;
        } else if (item.originalDataUrl) {
          exportUrl = item.originalDataUrl;
        } else if (item.originalUrl) {
          exportUrl = item.originalUrl;
        } else if (item.videoUrl) {
          exportUrl = item.videoUrl;
        } else if (item.imageUrl) {
          exportUrl = item.imageUrl;
        }

        csvContent += `${category},"${exportUrl}","${cleanedCaption}","${new Date().toISOString()}"\n`;
      });
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ai-post-robot-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showButtonMessage('exportDataBtn', '✅ Data exported!', '📤 Export All Data');
  });
}

function clearAllData() {
  if (confirm('Are you sure you want to clear ALL captured content? This action cannot be undone.')) {
    chrome.storage.local.set({
      savedItems: {},
      counters: { captionCount: 0, linkCount: 0 }
    }, () => {
      chrome.action.setBadgeText({ text: "0" });
      chrome.action.setBadgeBackgroundColor({ color: "#000000" });
      chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
      showButtonMessage('clearDataBtn', '✅ All data cleared!', '🗑️ Clear All Data');
    });
  }
}

function updateApiStatus(connected) {
  const statusEl = document.getElementById('apiStatus');
  if (connected) {
    statusEl.className = 'api-status api-connected';
    statusEl.textContent = '✅ API Connected';
  } else {
    statusEl.className = 'api-status api-disconnected';
    statusEl.textContent = '❌ API Not Connected';
  }
}

function showButtonMessage(buttonId, message, originalText) {
  const button = document.getElementById(buttonId);
  const originalButtonText = originalText || button.textContent;

  button.textContent = message;

  setTimeout(() => {
    button.textContent = originalButtonText;
  }, 3000);
}

// Gemini API Functions
function initializeGeminiUI() {
  // Hide API keys by default for security
  const textarea = document.getElementById('geminiApiKeys');
  const button = document.getElementById('toggleApiKeysBtn');

  textarea.classList.add('hidden-keys');
  button.textContent = '👁️';
  button.title = 'Show API Keys';

  // Auto-refresh models on load
  refreshGeminiModels();
}

function toggleApiKeysVisibility() {
  const textarea = document.getElementById('geminiApiKeys');
  const button = document.getElementById('toggleApiKeysBtn');

  if (textarea.classList.contains('hidden-keys')) {
    textarea.classList.remove('hidden-keys');
    button.textContent = '🙈';
    button.title = 'Hide API Keys';
  } else {
    textarea.classList.add('hidden-keys');
    button.textContent = '👁️';
    button.title = 'Show API Keys';
  }
}



async function refreshGeminiModels() {
  try {
    // Load custom models from storage
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['customGeminiModels', 'favoriteGeminiModel'], resolve);
    });

    // Default models (excluding image generation models)
    let models = [
      { value: 'gemini-2.5-pro', name: 'gemini-2.5-pro' },
      { value: 'gemini-2.5-flash', name: 'gemini-2.5-flash' },
      { value: 'gemini-2.5-flash-preview-04-17', name: 'gemini-2.5-flash-preview-04-17' },
      { value: 'gemini-2.5-flash-lite-preview-06-17', name: 'gemini-2.5-flash-lite-preview-06-17' }
    ];

    // Filter out image generation models that shouldn't be in text generation list
    const imageModelsToExclude = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-preview-image-generation',
      'gemini-2.5-flash-image-preview'
    ];

    // Add custom models if any (excluding image generation models)
    if (result.customGeminiModels) {
      const customModels = result.customGeminiModels
        .filter(modelId => !imageModelsToExclude.includes(modelId))
        .map(modelId => ({
          value: modelId,
          name: modelId,
          custom: true
        }));
      models = [...models, ...customModels];
    }

    // Mark favorite model
    const favoriteModel = result.favoriteGeminiModel || 'gemini-2.5-flash-lite-preview-06-17';
    models = models.map(model => ({
      ...model,
      name: model.value === favoriteModel ? `⭐ ${model.name} (Favorite)` : model.name,
      favorite: model.value === favoriteModel
    }));

    const modelSelect = document.getElementById('geminiModel');
    const currentValue = modelSelect.value;

    modelSelect.innerHTML = '';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.name;
      if (model.favorite) option.selected = true;
      modelSelect.appendChild(option);
    });

    // Restore previous selection if it exists
    if (currentValue && modelSelect.querySelector(`option[value="${currentValue}"]`)) {
      modelSelect.value = currentValue;
    }

    console.log(`Models refreshed: ${models.length} models available`);
  } catch (error) {
    console.error('Error refreshing models:', error);
  }
}

function saveGeminiSettings() {
  const apiKeys = document.getElementById('geminiApiKeys').value.trim();
  const model = document.getElementById('geminiModel').value;
  const imageModel = document.getElementById('geminiImageModel').value;

  if (!apiKeys) {
    showMessage('geminiMessage', '❌ Please enter at least one API key before saving', 'error');
    return;
  }

  chrome.storage.local.set({
    geminiApiKeys: apiKeys,
    geminiModel: model,
    geminiImageModel: imageModel,
    favoriteGeminiModel: model // Save current selection as favorite
  }, () => {
    showMessage('geminiMessage', '✅ Settings saved successfully! Gemini AI is now ready to use in the Advanced Scheduler.', 'success');

    // Update API status
    updateGeminiApiStatus(true);

    // Refresh models to update favorite marking
    refreshGeminiModels();
  });
}

// Model Management Functions
function addCustomModel() {
  const modelId = prompt('Enter the Gemini model ID:');
  if (!modelId || !modelId.trim()) return;

  const trimmedModelId = modelId.trim();

  chrome.storage.local.get(['customGeminiModels'], (result) => {
    const customModels = result.customGeminiModels || [];

    if (customModels.includes(trimmedModelId)) {
      showMessage('geminiMessage', '❌ Model already exists', 'error');
      return;
    }

    customModels.push(trimmedModelId);

    chrome.storage.local.set({ customGeminiModels: customModels }, () => {
      showMessage('geminiMessage', `✅ Model "${trimmedModelId}" added successfully`, 'success');
      refreshGeminiModels();
    });
  });
}

function removeCustomModel() {
  const modelSelect = document.getElementById('geminiModel');
  const selectedModel = modelSelect.value;

  if (!selectedModel) {
    showMessage('geminiMessage', '❌ Please select a model to remove', 'error');
    return;
  }

  // Don't allow removing default models or image generation models
  const protectedModels = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.5-flash-image-preview'
  ];

  if (defaultModels.includes(selectedModel)) {
    showMessage('geminiMessage', '❌ Cannot remove default models', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to remove the model "${selectedModel}"?`)) {
    return;
  }

  chrome.storage.local.get(['customGeminiModels'], (result) => {
    const customModels = result.customGeminiModels || [];
    const updatedModels = customModels.filter(model => model !== selectedModel);

    chrome.storage.local.set({ customGeminiModels: updatedModels }, () => {
      showMessage('geminiMessage', `✅ Model "${selectedModel}" removed successfully`, 'success');
      refreshGeminiModels();
    });
  });
}

function setFavoriteModel() {
  const modelSelect = document.getElementById('geminiModel');
  const selectedModel = modelSelect.value;

  if (!selectedModel) {
    showMessage('geminiMessage', '❌ Please select a model to set as favorite', 'error');
    return;
  }

  chrome.storage.local.set({ favoriteGeminiModel: selectedModel }, () => {
    showMessage('geminiMessage', `✅ "${selectedModel}" set as favorite model`, 'success');
    refreshGeminiModels();
  });
}

function updateGeminiApiStatus(connected) {
  const statusEl = document.getElementById('geminiApiStatus');
  if (connected) {
    statusEl.className = 'api-status api-connected';
    statusEl.textContent = '✅ Gemini AI Connected';
  } else {
    statusEl.className = 'api-status api-disconnected';
    statusEl.textContent = '❌ Gemini AI Not Connected';
  }
}

function showMessage(elementId, message, type) {
  const messageEl = document.getElementById(elementId);
  messageEl.textContent = message;
  messageEl.className = `status-message status-${type}`;
  messageEl.style.display = 'block';

  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

// Add settings button functionality to popup
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSettings') {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
  });
}
