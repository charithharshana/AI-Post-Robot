// Schedule page functionality for AI Post Robot
let savedItems = {};
let categories = [];
let selectedItems = [];

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
  document.getElementById('testApiBtn').addEventListener('click', testRoboPostAPI);
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

async function loadDefaultSettings() {
  // Load settings from storage
  chrome.storage.local.get(['defaultChannels', 'defaultDelay'], (result) => {
    // Set default channels from storage
    if (result.defaultChannels) {
      document.getElementById('channelIds').value = result.defaultChannels;
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
    showMessage('configMessage', 'Please enter at least one channel ID', 'error');
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
  const channelText = document.getElementById('channelIds').value.trim();
  return channelText ? channelText.split('\n').map(id => id.trim()).filter(id => id) : [];
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
  const messageEl = document.createElement('div');
  messageEl.className = `status-message status-${type}`;
  messageEl.textContent = message;
  messageEl.style.display = 'block';
  
  container.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
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

// Test RoboPost API functionality with comprehensive debugging
async function testRoboPostAPI() {
  try {
    showMessage('configMessage', '🧪 Testing RoboPost API with comprehensive debugging...', 'info');

    // Ensure RoboPost API is available
    if (!window.roboPostAPI) {
      throw new Error('RoboPost API not loaded. Please refresh the page.');
    }

    // Ensure API is initialized
    const isInitialized = await window.roboPostAPI.initialize();
    if (!isInitialized) {
      throw new Error('RoboPost API key not configured. Please go to Settings and configure your API key.');
    }

    // Get channel IDs from form
    const channelIds = getChannelIds();
    if (channelIds.length === 0) {
      throw new Error('Please enter at least one channel ID first');
    }

    console.log('🧪 Starting comprehensive API test...');
    console.log('🔑 API Key:', window.roboPostAPI.apiKey ? `${window.roboPostAPI.apiKey.substring(0, 8)}...` : 'Not set');
    console.log('📺 Channel IDs:', channelIds);

    // Test 1: API Connection
    console.log('\n📡 Test 1: API Connection...');
    try {
      await window.roboPostAPI.testConnection();
      console.log('✅ API connection successful');
      showMessage('configMessage', '✅ Step 1: API connection successful', 'success');
    } catch (connectionError) {
      console.error('❌ API connection failed:', connectionError);
      throw new Error(`API connection failed: ${connectionError.message}`);
    }

    // Test 2: Direct scheduling test with existing storage ID
    console.log('\n📅 Test 2: Direct scheduling test...');
    showMessage('configMessage', '🔄 Step 2: Testing direct scheduling...', 'info');

    const testStorageId = 'df6d61f0-146a-4ee9-8b1e-8632db029f66'; // From your error

    const directPayload = {
      text: '🧪 Direct test post from Schedule Posts interface',
      channel_ids: channelIds,
      schedule_at: new Date(Date.now() + 5 * 60000).toISOString(),
      image_object_ids: [testStorageId]
    };

    console.log('📋 Direct payload:', JSON.stringify(directPayload, null, 2));

    try {
      const directResult = await window.roboPostAPI.createScheduledPost(directPayload);
      console.log('✅ Direct scheduling successful:', directResult);

      if (directResult.scheduled_posts && directResult.scheduled_posts[0]) {
        showMessage('configMessage', `✅ SUCCESS! Direct test passed! Post ID: ${directResult.scheduled_posts[0].id}`, 'success');
        return; // Success, no need to continue
      } else {
        throw new Error('Invalid response format from direct scheduling');
      }
    } catch (directError) {
      console.error('❌ Direct scheduling failed:', directError);
      showMessage('configMessage', `❌ Step 2 failed: ${directError.message}`, 'error');

      // Continue to test 3 to see if it's a payload issue
    }

    // Test 3: Full flow test (upload + schedule)
    console.log('\n🔄 Test 3: Full flow test (upload + schedule)...');
    showMessage('configMessage', '🔄 Step 3: Testing full flow...', 'info');

    const testData = {
      imageUrl: 'https://scontent-sin6-1.xx.fbcdn.net/v/t39.30808-6/514718061_1177501651084210_5672228014284257460_n.jpg?_nc_cat=1&ccb=1-7&_nc_sid=127cfc&_nc_ohc=_8fVSDUB77YQ7kNvwHDHb0d&_nc_oc=Adn1Sh98GWW39aXckFVQkhrMcwQdBAQf1ZYF6BdirVlQAsQrEcKtsFm8eHgAcnhdIRA&_nc_zt=23&_nc_ht=scontent-sin6-1.xx&_nc_gid=vaecvlTdRAktfFlL80kabA&oh=00_AfNip3FyoAQbPLQZSIwyoM-iwfrlkxKjdluergKWzY87mw&oe=686988C8',
      caption: 'ශ්‍රීලංකන් ගුවන් සේවා සමාගමේ හිටපු සභාපති නිශාන්ත වික්‍රමසිංහ ලබන 15 වැනිදා දක්වා යළි රිමාන්ඩ්.',
      channelIds: channelIds,
      scheduleAt: new Date(Date.now() + 5 * 60000).toISOString(),
      title: 'Test Post from Extension'
    };

    console.log('🧪 Testing full flow with real Facebook data:', testData);

    const result = await window.roboPostAPI.schedulePostFromCapture(testData);

    showMessage('configMessage', `✅ Full flow SUCCESS! Post scheduled with ID: ${result.postId}`, 'success');
    console.log('🎉 Full flow test result:', result);

  } catch (error) {
    console.error('❌ Test failed:', error);
    showMessage('configMessage', `❌ Test failed: ${error.message}`, 'error');
  }
}


