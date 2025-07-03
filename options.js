// Options page functionality for AI Post Robot
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  // API Configuration
  document.getElementById('testApiBtn').addEventListener('click', testApiConnection);
  document.getElementById('diagnosticsBtn').addEventListener('click', runDiagnostics);
  document.getElementById('saveApiBtn').addEventListener('click', saveApiKey);

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

  let html = '';
  channelsData.forEach(channel => {
    const isSelected = selectedChannelIds.includes(channel.id);
    const platformIcon = getPlatformIcon(channel.platform);

    html += `
      <div class="channel-item">
        <input type="checkbox" value="${channel.id}" ${isSelected ? 'checked' : ''}>
        <div class="channel-info">
          <div class="channel-name">${platformIcon} ${channel.name || channel.username || 'Unnamed Channel'}</div>
          <div class="channel-platform">${channel.platform} • ID: ${channel.id}</div>
        </div>
      </div>
    `;
  });

  channelsList.innerHTML = html;
}

function getPlatformIcon(platform) {
  const icons = {
    'facebook': '📘',
    'instagram': '📷',
    'twitter': '🐦',
    'linkedin': '💼',
    'pinterest': '📌',
    'youtube': '📺',
    'tiktok': '🎵',
    'threads': '🧵'
  };
  return icons[platform?.toLowerCase()] || '📱';
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
        csvContent += `${category},"${item.imageUrl}","${cleanedCaption}","${new Date().toISOString()}"\n`;
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

// Add settings button functionality to popup
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSettings') {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
  });
}
