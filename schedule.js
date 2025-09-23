// Schedule page functionality for AI Post Robot
let savedItems = {};
let categories = [];
let selectedItems = [];
let channelsData = [];
let channelPlatformMappings = {};

document.addEventListener('DOMContentLoaded', function() {
  initializeSchedulePage();
});

async function initializeSchedulePage() {
  try {
    // Ensure RoboPost API is available
    if (!window.roboPostAPI) {
      throw new Error('RoboPost API not loaded. Please refresh the page.');
    }

    // Initialize RoboPost API
    await window.roboPostAPI.initialize();

    // Load saved data
    await loadSavedData();

    // Load channels data
    await loadChannels();

    // Setup event listeners
    setupEventListeners();

    // Load default settings
    await loadDefaultSettings();

    // Show configuration section
    showSection('configSection');

  } catch (error) {
    console.error('Schedule page initialization error:', error);
    showMessage('configMessage', `Initialization error: ${error.message}`, 'error');
    showSection('configSection');
  }
}

function setupEventListeners() {
  document.getElementById('previewBtn').addEventListener('click', previewSchedule);
  document.getElementById('scheduleBtn').addEventListener('click', startScheduling);
  document.getElementById('cancelBtn').addEventListener('click', () => window.close());
  document.getElementById('confirmScheduleBtn').addEventListener('click', confirmScheduling);
  document.getElementById('backToConfigBtn').addEventListener('click', () => showSection('configSection'));
  document.getElementById('doneBtn').addEventListener('click', () => window.close());
  document.getElementById('scheduleMoreBtn').addEventListener('click', resetToConfig);
}

async function loadSavedData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['savedItems', 'categories'], (result) => {
      savedItems = result.savedItems || {};
      categories = result.categories || [];
      
      // Populate category dropdown
      const categorySelect = document.getElementById('selectedCategory');
      categorySelect.innerHTML = '<option value="">Select a category</option>';
      
      categories.forEach(category => {
        const count = savedItems[category] ? savedItems[category].length : 0;
        if (count > 0) {
          const option = document.createElement('option');
          option.value = category;
          option.textContent = `${category} (${count} items)`;
          categorySelect.appendChild(option);
        }
      });
      
      resolve();
    });
  });
}

async function loadChannels() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['channelsData', 'channelPlatformMappings'], (result) => {
      channelsData = result.channelsData || [];
      channelPlatformMappings = result.channelPlatformMappings || {};
      displayChannels();
      resolve();
    });
  });
}

function displayChannels() {
  const channelsList = document.getElementById('channelsList');

  if (channelsData.length === 0) {
    channelsList.innerHTML = '<div class="loading">❌ No channels found. Please configure API in settings.</div>';
    return;
  }

  // Use stored platform mappings
  const platformMappings = channelPlatformMappings || {};

  let html = '';
  channelsData.forEach(channel => {
    // Use saved platform mapping or detect platform
    const savedPlatform = platformMappings[channel.id];
    const detectedPlatform = savedPlatform || detectPlatform(channel);
    const platformIcon = getPlatformIcon(detectedPlatform);
    html += `
      <div class="channel-option">
        <input type="checkbox" value="${channel.id}" id="channel_${channel.id}" data-platform="${detectedPlatform.toLowerCase()}">
        <label for="channel_${channel.id}">${platformIcon} ${channel.name || channel.username || 'Unnamed'}</label>
      </div>
    `;
  });

  channelsList.innerHTML = html;
}

function detectPlatform(channel) {
  // Try multiple ways to detect the platform
  if (channel.platform) {
    return channel.platform;
  }

  // Check channel name or username for platform indicators
  const name = (channel.name || channel.username || '').toLowerCase();
  const url = (channel.url || '').toLowerCase();

  // Platform detection based on name patterns - Only RoboPost API supported platforms
  if (name.includes('facebook') || url.includes('facebook.com')) {
    return 'facebook';
  }
  if (name.includes('instagram') || url.includes('instagram.com')) {
    return 'instagram';
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
  if (name.includes('wordpress') || url.includes('wordpress.com') || url.includes('wp.com')) {
    return 'wordpress';
  }
  if (name.includes('gmb') || name.includes('google my business') || name.includes('google business') || name.includes('mybusiness')) {
    return 'gmb';
  }

  // Check channel type or other properties
  if (channel.type) {
    const type = channel.type.toLowerCase();
    // Map common type names to our platform identifiers
    if (type.includes('facebook')) return 'facebook';
    if (type.includes('instagram')) return 'instagram';
    if (type.includes('pinterest')) return 'pinterest';
    if (type.includes('youtube')) return 'youtube';
    if (type.includes('tiktok')) return 'tiktok';
    if (type.includes('wordpress')) return 'wordpress';
    if (type.includes('gmb') || type.includes('google')) return 'gmb';
    return type;
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
    'wordpress': '📝',
    'gmb': '🏢',
    'unknown': '📱'
  };
  return icons[platform?.toLowerCase()] || '📱';
}

async function loadDefaultSettings() {
  // Load settings from storage
  chrome.storage.local.get(['defaultChannels', 'defaultDelay'], (result) => {
    // Set default channels from storage
    if (result.defaultChannels) {
      const defaultChannelIds = result.defaultChannels.split('\n').map(id => id.trim()).filter(id => id);
      // Check the corresponding checkboxes
      defaultChannelIds.forEach(channelId => {
        const checkbox = document.getElementById(`channel_${channelId}`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }

    // Set default start time (current time + default delay)
    const delayMinutes = result.defaultDelay || 10;
    const defaultTime = new Date(Date.now() + (delayMinutes * 60000));
    const localTime = new Date(defaultTime.getTime() - defaultTime.getTimezoneOffset() * 60000);
    document.getElementById('startTime').value = localTime.toISOString().slice(0, 16);
  });
}

function previewSchedule() {
  const category = document.getElementById('selectedCategory').value;
  const channelIds = getChannelIds();
  const startTime = new Date(document.getElementById('startTime').value);
  const interval = parseInt(document.getElementById('interval').value);
  
  if (!category) {
    showMessage('configMessage', 'Please select a category', 'error');
    return;
  }
  
  if (channelIds.length === 0) {
    showMessage('configMessage', 'Please enter at least one channel ID', 'error');
    return;
  }
  
  if (!startTime || startTime < new Date()) {
    showMessage('configMessage', 'Please select a future start time', 'error');
    return;
  }
  
  selectedItems = savedItems[category] || [];
  
  if (selectedItems.length === 0) {
    showMessage('configMessage', 'No items found in selected category', 'error');
    return;
  }
  
  // Generate preview
  generatePreview(selectedItems, startTime, interval);
  showSection('previewSection');
}

function generatePreview(items, startTime, interval) {
  const previewList = document.getElementById('previewList');
  previewList.innerHTML = '';
  
  items.forEach((item, index) => {
    const scheduleTime = new Date(startTime.getTime() + (index * interval * 60000));
    
    const previewItem = document.createElement('div');
    previewItem.className = 'item-preview';
    
    previewItem.innerHTML = `
      <img src="${item.imageUrl}" alt="Preview" onerror="this.style.display='none'">
      <div class="caption">${item.caption || 'No caption'}</div>
      <div style="margin-left: 10px; font-size: 12px; color: #666;">
        ${scheduleTime.toLocaleString()}
      </div>
    `;
    
    previewList.appendChild(previewItem);
  });
}

async function startScheduling() {
  const category = document.getElementById('selectedCategory').value;
  
  if (!category) {
    showMessage('configMessage', 'Please select a category', 'error');
    return;
  }
  
  selectedItems = savedItems[category] || [];
  
  if (selectedItems.length === 0) {
    showMessage('configMessage', 'No items found in selected category', 'error');
    return;
  }
  
  await confirmScheduling();
}

async function confirmScheduling() {
  const channelIds = getChannelIds();
  const startTime = new Date(document.getElementById('startTime').value);
  const interval = parseInt(document.getElementById('interval').value);
  
  if (channelIds.length === 0) {
    showMessage('configMessage', 'Please select at least one channel', 'error');
    return;
  }
  
  showSection('progressSection');

  try {
    // Ensure RoboPost API is available
    if (!window.roboPostAPI) {
      throw new Error('RoboPost API not loaded. Please refresh the page and try again.');
    }

    // Ensure API is initialized
    const isInitialized = await window.roboPostAPI.initialize();
    if (!isInitialized) {
      throw new Error('RoboPost API key not configured. Please go to Settings and configure your API key.');
    }

    // Test API connection first
    showMessage('progressSection', '🔄 Testing API connection...', 'info');
    try {
      await window.roboPostAPI.testConnection();
      showMessage('progressSection', '✅ API connection successful. Starting to schedule posts...', 'success');
    } catch (connectionError) {
      console.error('API connection test failed:', connectionError);
      throw new Error(`API connection failed: ${connectionError.message}`);
    }

    const results = await window.roboPostAPI.bulkSchedulePosts(selectedItems, {
      channelIds: channelIds,
      startTime: startTime,
      intervalMinutes: interval
    });

    displayResults(results);

  } catch (error) {
    console.error('Scheduling error:', error);
    showMessage('progressSection', `Scheduling failed: ${error.message}`, 'error');
  }
}

function displayResults(results) {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  // Update summary
  const summaryEl = document.getElementById('resultsSummary');
  summaryEl.innerHTML = `
    <div style="display: flex; justify-content: space-around; text-align: center; margin: 20px 0;">
      <div>
        <div style="font-size: 24px; color: #48bb78; font-weight: bold;">${successful}</div>
        <div>Successful</div>
      </div>
      <div>
        <div style="font-size: 24px; color: #f56565; font-weight: bold;">${failed}</div>
        <div>Failed</div>
      </div>
      <div>
        <div style="font-size: 24px; color: #667eea; font-weight: bold;">${results.length}</div>
        <div>Total</div>
      </div>
    </div>
  `;
  
  // Update details
  const detailsEl = document.getElementById('resultsDetails');
  detailsEl.innerHTML = '';
  
  results.forEach((result, index) => {
    const detailItem = document.createElement('div');
    detailItem.style.cssText = `
      padding: 10px;
      margin: 5px 0;
      border-radius: 6px;
      border-left: 4px solid ${result.success ? '#48bb78' : '#f56565'};
      background: ${result.success ? '#f0fff4' : '#fff5f5'};
    `;
    
    detailItem.innerHTML = `
      <div style="font-weight: 600; color: ${result.success ? '#22543d' : '#742a2a'};">
        ${result.success ? '✅' : '❌'} Post ${index + 1}
      </div>
      <div style="font-size: 12px; color: #666; margin-top: 5px;">
        ${result.success ? 'Scheduled successfully' : result.error}
      </div>
    `;
    
    detailsEl.appendChild(detailItem);
  });
  
  showSection('resultsSection');
  
  // Clear the scheduled category if all posts were successful
  if (failed === 0) {
    clearScheduledCategory();
  }
}

function clearScheduledCategory() {
  const category = document.getElementById('selectedCategory').value;
  
  chrome.storage.local.get(['savedItems', 'counters'], (result) => {
    const savedItems = result.savedItems || {};
    const counters = result.counters || { captionCount: 0, linkCount: 0 };
    
    // Remove the scheduled category
    delete savedItems[category];
    
    // Recalculate counters
    const remainingItems = Object.values(savedItems).flat();
    const newCounters = {
      captionCount: remainingItems.filter(item => item.caption && item.caption.trim().length > 0).length,
      linkCount: remainingItems.filter(item => item.imageUrl).length
    };
    
    chrome.storage.local.set({ savedItems, counters: newCounters }, () => {
      // Update badge with black background and white text
      const totalCount = Object.values(savedItems).reduce((sum, list) => sum + list.length, 0);
      chrome.action.setBadgeText({ text: totalCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#000000" });
      chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
    });
  });
}

function getChannelIds() {
  const selectedChannels = [];
  document.querySelectorAll('#channelsList input:checked').forEach(checkbox => {
    selectedChannels.push(checkbox.value);
  });
  return selectedChannels;
}

function showSection(sectionId) {
  // Hide all sections
  const sections = ['loadingSection', 'configSection', 'previewSection', 'progressSection', 'resultsSection'];
  sections.forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  
  // Show target section
  document.getElementById(sectionId).classList.remove('hidden');
}

function showMessage(containerId, message, type) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('❌ Message container not found:', containerId);
    return;
  }

  // Clear existing messages in the container
  container.innerHTML = '';

  const messageEl = document.createElement('div');
  messageEl.className = `status-message status-${type}`;
  messageEl.textContent = message;
  messageEl.style.display = 'block';

  container.appendChild(messageEl);

  console.log(`📢 Message displayed: ${message} (type: ${type})`);

  setTimeout(() => {
    if (messageEl && messageEl.parentNode) {
      messageEl.remove();
    }
  }, 5000);
}

function resetToConfig() {
  // Reset form
  document.getElementById('selectedCategory').value = '';
  selectedItems = [];

  // Reload data and show config
  loadSavedData();
  showSection('configSection');
}

// Helper function to manage button loading states (kept for other buttons)
function setButtonLoading(buttonId, isLoading, originalText = null) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (isLoading) {
    // Store original text if not provided
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    // Set loading state
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';

    // Add loading spinner and text based on button type
    const loadingTexts = {
      'scheduleBtn': '🔄 Scheduling...',
      'previewBtn': '🔄 Loading Preview...'
    };

    button.textContent = loadingTexts[buttonId] || '🔄 Loading...';
  } else {
    // Reset button state
    button.disabled = false;
    button.style.opacity = '';
    button.style.cursor = '';
    button.textContent = originalText || button.dataset.originalText || button.textContent;

    // Clean up stored original text
    if (button.dataset.originalText) {
      delete button.dataset.originalText;
    }
  }
}


