// Advanced Scheduler for AI Post Robot
let savedItems = {};
let categories = [];
let selectedPosts = new Set();
let channelsData = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', function() {
  initializeAdvancedScheduler();
});

async function initializeAdvancedScheduler() {
  try {
    // Initialize RoboPost API
    await window.roboPostAPI.initialize();

    // Initialize Gemini API
    if (window.geminiAPI) {
      await window.geminiAPI.initialize();
    }

    // Load saved data
    await loadSavedData();

    // Load channels
    await loadChannels();

    // Setup event listeners
    setupEventListeners();

    // Load default settings
    await loadDefaultSettings();

    // Load custom presets
    await loadCustomPresets();

  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Initialization error: ${error.message}`);
  }
}

async function loadSavedData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['savedItems', 'categories'], (result) => {
      savedItems = result.savedItems || {};
      categories = result.categories || [];
      
      loadCategoryTabs();
      loadPosts();
      updateStats();
      
      resolve();
    });
  });
}

async function loadChannels() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['channelsData'], (result) => {
      channelsData = result.channelsData || [];
      displayChannels();
      resolve();
    });
  });
}

function loadCategoryTabs() {
  const tabsContainer = document.getElementById('categoryTabs');
  let html = '<div class="filter-tab active" data-category="all">📁 All Posts</div>';
  
  categories.forEach(category => {
    const count = savedItems[category] ? savedItems[category].length : 0;
    html += `<div class="filter-tab" data-category="${category}">${category} (${count})</div>`;
  });
  
  tabsContainer.innerHTML = html;
  
  // Add click listeners
  tabsContainer.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabsContainer.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Load posts for category
      currentCategory = tab.dataset.category;
      loadPosts();
    });
  });
}

function loadPosts() {
  const container = document.getElementById('postsContainer');
  let allPosts = [];
  
  if (currentCategory === 'all') {
    // Get all posts from all categories
    Object.keys(savedItems).forEach(category => {
      savedItems[category].forEach((post, index) => {
        allPosts.push({
          ...post,
          category: category,
          index: index,
          id: `${category}_${index}`
        });
      });
    });
  } else {
    // Get posts from specific category
    if (savedItems[currentCategory]) {
      savedItems[currentCategory].forEach((post, index) => {
        allPosts.push({
          ...post,
          category: currentCategory,
          index: index,
          id: `${currentCategory}_${index}`
        });
      });
    }
  }
  
  if (allPosts.length === 0) {
    container.innerHTML = '<div class="empty-state">📭 No posts found in this category</div>';
    return;
  }
  
  let html = '';
  allPosts.forEach(post => {
    const isSelected = selectedPosts.has(post.id);
    const caption = post.caption || 'No caption';
    const truncatedCaption = caption.length > 100 ? caption.substring(0, 100) + '...' : caption;
    
    html += `
      <div class="post-card ${isSelected ? 'selected' : ''}" data-post-id="${post.id}">
        <img src="${post.imageUrl}" alt="Post image" class="post-image" onerror="this.style.display='none'">
        <div class="post-content">
          <div class="post-caption">${truncatedCaption}</div>
          <div class="post-meta">${post.category}</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Add click listeners to post cards
  container.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', (event) => {
      const postId = card.dataset.postId;
      togglePostSelection(postId, card, event);
    });
  });
  
  updateStats();
}

function togglePostSelection(postId, cardElement, event) {
  // If Ctrl key is not pressed, clear all previous selections first
  if (!event.ctrlKey && !event.metaKey) {
    // Clear all previous selections
    selectedPosts.forEach(selectedId => {
      const selectedCard = document.querySelector(`[data-post-id="${selectedId}"]`);
      if (selectedCard) {
        selectedCard.classList.remove('selected');
      }
    });
    selectedPosts.clear();
  }

  // Toggle the clicked post
  if (selectedPosts.has(postId)) {
    selectedPosts.delete(postId);
    cardElement.classList.remove('selected');
  } else {
    selectedPosts.add(postId);
    cardElement.classList.add('selected');
  }

  updateSelectedPostsInfo();
  updateStats();
}

function updateSelectedPostsInfo() {
  const infoContainer = document.getElementById('selectedPostsInfo');
  
  if (selectedPosts.size === 0) {
    infoContainer.classList.add('hidden');
    return;
  }
  
  infoContainer.classList.remove('hidden');
  
  let html = `<strong>📋 Selected: ${selectedPosts.size} post(s)</strong>`;
  
  if (selectedPosts.size > 1) {
    html += '<div class="album-preview">';
    let count = 0;
    selectedPosts.forEach(postId => {
      if (count < 6) { // Show max 6 thumbnails
        const post = getPostById(postId);
        if (post) {
          html += `<img src="${post.imageUrl}" alt="Thumb" class="album-thumb">`;
        }
      }
      count++;
    });
    if (selectedPosts.size > 6) {
      html += `<div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #e2e8f0; border-radius: 4px; font-size: 10px;">+${selectedPosts.size - 6}</div>`;
    }
    html += '</div>';
  }
  
  infoContainer.innerHTML = html;
  
  // Update caption and title with selected post's data
  if (selectedPosts.size > 0) {
    const firstPost = getPostById(Array.from(selectedPosts)[0]);
    if (firstPost) {
      const captionTextarea = document.getElementById('postCaption');
      const titleInput = document.getElementById('postTitle');

      // Always update fields when a single post is selected
      if (selectedPosts.size === 1) {
        captionTextarea.value = firstPost.caption || '';
        titleInput.value = firstPost.caption || '';

        // Add visual feedback to show fields were updated
        captionTextarea.style.background = '#e6fffa';
        titleInput.style.background = '#e6fffa';
        setTimeout(() => {
          captionTextarea.style.background = '';
          titleInput.style.background = '';
        }, 1000);
      } else {
        // For multiple posts, only update if fields are empty to avoid overwriting user edits
        if (!captionTextarea.value.trim()) {
          captionTextarea.value = firstPost.caption || '';
        }
        if (!titleInput.value.trim()) {
          titleInput.value = firstPost.caption || '';
        }
      }

      // Update character count
      updateCaptionCharCount();
    }
  }
}

function getPostById(postId) {
  const [category, index] = postId.split('_');
  if (savedItems[category] && savedItems[category][index]) {
    return savedItems[category][index];
  }
  return null;
}

function displayChannels() {
  const channelsList = document.getElementById('channelsList');
  
  if (channelsData.length === 0) {
    channelsList.innerHTML = '<div style="text-align: center; color: #718096; padding: 10px;">❌ No channels found. Please configure API in settings.</div>';
    return;
  }
  
  let html = '';
  channelsData.forEach(channel => {
    const platformIcon = getPlatformIcon(channel.platform);
    html += `
      <div class="channel-option">
        <input type="checkbox" value="${channel.id}" id="channel_${channel.id}">
        <label for="channel_${channel.id}">${platformIcon} ${channel.name || channel.username || 'Unnamed'}</label>
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

function updateStats() {
  const totalPosts = Object.values(savedItems).reduce((sum, posts) => sum + posts.length, 0);
  document.getElementById('postsCount').textContent = `${totalPosts} posts`;
  document.getElementById('selectedCount').textContent = `${selectedPosts.size} selected`;
}

async function loadDefaultSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['defaultDelay', 'defaultChannels', 'defaultTimezone'], (result) => {
      // Set default timezone
      const timezone = result.defaultTimezone || 'auto';
      document.getElementById('timezoneSelect').value = timezone;

      // Set default schedule time
      const delayMinutes = result.defaultDelay || 10;
      setScheduleTime(delayMinutes);

      // Set default channels
      if (result.defaultChannels) {
        const defaultChannelIds = result.defaultChannels.split('\n').map(id => id.trim());
        defaultChannelIds.forEach(channelId => {
          const checkbox = document.querySelector(`input[value="${channelId}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      }

      // Setup timezone and interval listeners
      setupSchedulingListeners();
      updateTimezoneInfo();
      updateIntervalDisplay();

      resolve();
    });
  });
}

function setupSchedulingListeners() {
  // Timezone change listener
  document.getElementById('timezoneSelect').addEventListener('change', updateTimezoneInfo);

  // Interval change listeners
  document.getElementById('postInterval').addEventListener('input', updateIntervalDisplay);
  document.getElementById('intervalType').addEventListener('change', updateIntervalDisplay);
}

function setScheduleTime(delayMinutes) {
  const now = new Date();
  const scheduleTime = new Date(now.getTime() + (delayMinutes * 60000));
  const localTime = new Date(scheduleTime.getTime() - scheduleTime.getTimezoneOffset() * 60000);
  document.getElementById('scheduleDateTime').value = localTime.toISOString().slice(0, 16);
  updateTimezoneInfo();
}

function updateTimezoneInfo() {
  const timezoneSelect = document.getElementById('timezoneSelect');
  const timezoneInfo = document.getElementById('timezoneInfo');
  const selectedTimezone = timezoneSelect.value;

  if (selectedTimezone === 'auto') {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    timezoneInfo.textContent = `Using browser timezone: ${browserTimezone}`;
  } else {
    timezoneInfo.textContent = `Using timezone: ${selectedTimezone}`;
  }
}

function updateIntervalDisplay() {
  const interval = document.getElementById('postInterval').value;
  const intervalType = document.getElementById('intervalType').value;
  const display = document.getElementById('intervalDisplay');
  const options = document.getElementById('intervalOptions');

  display.textContent = interval;

  switch (intervalType) {
    case 'fixed':
      options.innerHTML = `Posts will be scheduled every <span id="intervalDisplay">${interval}</span> minutes`;
      break;
    case 'random':
      options.innerHTML = `Posts will be scheduled with random gaps between ${Math.floor(interval * 0.5)} and ${Math.floor(interval * 1.5)} minutes`;
      break;
    case 'optimal':
      options.innerHTML = `Posts will be scheduled at optimal engagement times (approximately every ${interval} minutes)`;
      break;
  }
}

function setQuickSchedule(preset) {
  console.log('setQuickSchedule called with preset:', preset);
  const now = new Date();
  let scheduleTime;

  switch (preset) {
    case 'now':
      scheduleTime = new Date(now.getTime() + (5 * 60000)); // 5 minutes from now
      break;
    case '1hour':
      scheduleTime = new Date(now.getTime() + (60 * 60000)); // 1 hour from now
      break;
    case 'tomorrow':
      scheduleTime = new Date(now);
      scheduleTime.setDate(scheduleTime.getDate() + 1);
      scheduleTime.setHours(9, 0, 0, 0); // 9 AM tomorrow
      break;
    case 'weekend':
      scheduleTime = new Date(now);
      const daysUntilSaturday = (6 - scheduleTime.getDay()) % 7;
      scheduleTime.setDate(scheduleTime.getDate() + (daysUntilSaturday || 7));
      scheduleTime.setHours(10, 0, 0, 0); // 10 AM Saturday
      break;
    default:
      return;
  }

  // Ensure the input field exists before setting value
  const scheduleInput = document.getElementById('scheduleDateTime');
  if (scheduleInput) {
    // Format datetime for datetime-local input (YYYY-MM-DDTHH:MM)
    const year = scheduleTime.getFullYear();
    const month = String(scheduleTime.getMonth() + 1).padStart(2, '0');
    const day = String(scheduleTime.getDate()).padStart(2, '0');
    const hours = String(scheduleTime.getHours()).padStart(2, '0');
    const minutes = String(scheduleTime.getMinutes()).padStart(2, '0');

    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    scheduleInput.value = formattedDateTime;

    // Add visual feedback to show the preset was applied
    scheduleInput.style.background = '#e6fffa';
    scheduleInput.style.border = '2px solid #38b2ac';
    setTimeout(() => {
      scheduleInput.style.background = '';
      scheduleInput.style.border = '';
    }, 1500);

    updateTimezoneInfo();

    // Show a brief confirmation message with actual time
    const timeString = scheduleTime.toLocaleString();
    showMessage(`⏰ Schedule set to ${timeString}`, 'success');

    console.log(`Quick schedule preset '${preset}' applied: ${formattedDateTime} (${timeString})`);
  } else {
    console.error('Schedule input field not found');
  }
}

function setupEventListeners() {
  // Selection buttons
  document.getElementById('selectAllBtn').addEventListener('click', selectAllPosts);
  document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);
  document.getElementById('createAlbumBtn').addEventListener('click', createAlbum);
  document.getElementById('deletePostsBtn').addEventListener('click', deleteSelectedPosts);

  // CSV Import buttons
  document.getElementById('csvImportBtn').addEventListener('click', showCsvImport);
  document.getElementById('closeCsvImportBtn').addEventListener('click', hideCsvImport);
  document.getElementById('csvFileInput').addEventListener('change', handleCsvFileSelect);
  document.getElementById('confirmCsvImportBtn').addEventListener('click', confirmCsvImport);
  document.getElementById('cancelCsvImportBtn').addEventListener('click', hideCsvImport);

  // Schedule buttons
  document.getElementById('scheduleBtn').addEventListener('click', schedulePosts);
  document.getElementById('publishNowBtn').addEventListener('click', publishNow);
  document.getElementById('uploadPcBtn').addEventListener('click', uploadFromPC);
  document.getElementById('testApiBtn').addEventListener('click', testRoboPostAPI);

  // Links editor
  document.getElementById('addLinkBtn').addEventListener('click', addLink);

  // Caption editor enhancements
  const captionTextarea = document.getElementById('postCaption');
  captionTextarea.addEventListener('input', updateCaptionCharCount);
  captionTextarea.addEventListener('input', autoResizeTextarea);

  // Title sync
  document.getElementById('postTitle').addEventListener('input', syncTitleToCaption);

  // Quick Schedule Presets
  document.getElementById('quickPresetButtons').addEventListener('click', (e) => {
    if (e.target.dataset.preset) {
      console.log('Preset clicked:', e.target.dataset.preset);
      const preset = e.target.dataset.preset;

      if (preset.startsWith('custom_')) {
        const index = parseInt(preset.split('_')[1]);
        executeCustomPreset(index);
      } else {
        setQuickSchedule(preset);
      }
    }
  });

  // Custom preset management
  document.getElementById('addCustomPresetBtn').addEventListener('click', showCustomPresetDialog);

  // AI Rewrite buttons
  setupRewriteButtonListeners();
}

function setupRewriteButtonListeners() {
  // Add event listeners for all rewrite buttons
  document.querySelectorAll('.btn-ai').forEach(button => {
    button.addEventListener('click', handleRewriteClick);
  });

  // Add event listeners for edit prompt buttons
  document.querySelectorAll('.edit-prompt-btn').forEach(button => {
    button.addEventListener('click', handleRewriteClick);
  });

  // Custom prompt dialog listeners
  document.getElementById('closeCustomPromptDialog').addEventListener('click', hideCustomPromptDialog);
  document.getElementById('cancelCustomPromptBtn').addEventListener('click', hideCustomPromptDialog);
  document.getElementById('applyCustomPromptBtn').addEventListener('click', applyCustomPrompt);

  // Edit prompt dialog listeners
  document.getElementById('closeEditPromptDialog').addEventListener('click', hideEditPromptDialog);
  document.getElementById('cancelEditPromptBtn').addEventListener('click', hideEditPromptDialog);
  document.getElementById('saveEditPromptBtn').addEventListener('click', saveEditedPrompt);
}

function updateCaptionCharCount() {
  const captionTextarea = document.getElementById('postCaption');
  const charCount = captionTextarea.value.length;

  // Create or update character count display
  let charCountDisplay = document.getElementById('captionCharCount');
  if (!charCountDisplay) {
    charCountDisplay = document.createElement('div');
    charCountDisplay.id = 'captionCharCount';
    charCountDisplay.style.cssText = 'font-size: 11px; color: #718096; text-align: right; margin-top: 2px;';
    captionTextarea.parentNode.appendChild(charCountDisplay);
  }

  const maxChars = 2200; // Common social media limit
  const isOverLimit = charCount > maxChars;

  charCountDisplay.textContent = `${charCount}/${maxChars} characters`;
  charCountDisplay.style.color = isOverLimit ? '#f56565' : '#718096';

  if (isOverLimit) {
    captionTextarea.style.borderColor = '#f56565';
  } else {
    captionTextarea.style.borderColor = '#e2e8f0';
  }
}

function autoResizeTextarea() {
  const textarea = document.getElementById('postCaption');
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function syncTitleToCaption() {
  // Optional: sync title changes to caption if user wants
  // This could be made configurable
}

function selectAllPosts() {
  document.querySelectorAll('.post-card').forEach(card => {
    const postId = card.dataset.postId;
    selectedPosts.add(postId);
    card.classList.add('selected');
  });
  updateSelectedPostsInfo();
  updateStats();
}

function clearSelection() {
  selectedPosts.clear();
  document.querySelectorAll('.post-card').forEach(card => {
    card.classList.remove('selected');
  });
  updateSelectedPostsInfo();
  updateStats();
}

async function deleteSelectedPosts() {
  if (selectedPosts.size === 0) {
    showMessage('❌ No posts selected for deletion', 'error');
    return;
  }

  // Confirm deletion
  const confirmMessage = `Are you sure you want to delete ${selectedPosts.size} selected post(s)? This action cannot be undone.`;
  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    // Get current saved items and counters
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['savedItems', 'counters'], resolve);
    });

    const savedItems = result.savedItems || {};
    const counters = result.counters || { captionCount: 0, linkCount: 0 };
    let deletedCount = 0;

    // Track posts to delete for counter updates
    const postsToDelete = [];

    // Collect posts to delete
    selectedPosts.forEach(postId => {
      const [category, index] = postId.split('_');
      const indexNum = parseInt(index);

      if (savedItems[category] && savedItems[category][indexNum]) {
        postsToDelete.push(savedItems[category][indexNum]);
        // Mark for deletion (we'll filter these out)
        savedItems[category][indexNum] = null;
        deletedCount++;
      }
    });

    // Update counters by subtracting deleted posts
    postsToDelete.forEach(post => {
      if (post.caption && post.caption.trim()) {
        counters.captionCount = Math.max(0, counters.captionCount - 1);
      }
      if (post.imageUrl) {
        counters.linkCount = Math.max(0, counters.linkCount - 1);
      }
    });

    // Remove null entries and reindex
    Object.keys(savedItems).forEach(category => {
      savedItems[category] = savedItems[category].filter(post => post !== null);

      // Remove empty categories
      if (savedItems[category].length === 0) {
        delete savedItems[category];
      }
    });

    // Update categories list
    const categories = Object.keys(savedItems);

    // Save updated items, categories, and counters
    await new Promise(resolve => {
      chrome.storage.local.set({ savedItems, categories, counters }, resolve);
    });

    // Update extension badge
    const totalCount = Object.values(savedItems).reduce((sum, posts) => sum + posts.length, 0);
    chrome.action.setBadgeText({ text: totalCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: "#000000" });
    chrome.action.setBadgeTextColor({ color: "#FFFFFF" });

    // Clear selection and reload
    clearSelection();
    await loadSavedData();

    showMessage(`✅ Successfully deleted ${deletedCount} post(s)`, 'success');

  } catch (error) {
    console.error('Delete posts error:', error);
    showMessage(`❌ Failed to delete posts: ${error.message}`, 'error');
  }
}

function createAlbum() {
  if (selectedPosts.size < 2) {
    alert('Please select at least 2 posts to create an album');
    return;
  }
  
  // Enable album mode
  document.querySelector('input[value="album"]').checked = true;
  updateSelectedPostsInfo();
}

function addLink() {
  const linksEditor = document.getElementById('linksEditor');
  const linkId = Date.now();

  const linkHtml = `
    <div class="link-item" data-link-id="${linkId}" style="display: flex; gap: 5px; margin-bottom: 8px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f7fafc;">
      <div style="flex: 1;">
        <input type="url" placeholder="Enter URL" class="form-input link-url" style="margin-bottom: 5px;" onchange="updateLinkPreview(${linkId})">
        <input type="text" placeholder="Link text (optional)" class="form-input link-text">
        <div class="link-preview" style="margin-top: 5px; font-size: 11px; color: #718096;"></div>
      </div>
      <button class="btn btn-secondary" onclick="removeLink(${linkId})" style="padding: 8px; height: fit-content;">❌</button>
    </div>
  `;

  linksEditor.insertAdjacentHTML('beforeend', linkHtml);
}

function updateLinkPreview(linkId) {
  const linkItem = document.querySelector(`[data-link-id="${linkId}"]`);
  const urlInput = linkItem.querySelector('.link-url');
  const preview = linkItem.querySelector('.link-preview');

  const url = urlInput.value.trim();
  if (url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

      preview.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px;">
          <img src="${favicon}" alt="" style="width: 16px; height: 16px;" onerror="this.style.display='none'">
          <span>🔗 ${domain}</span>
        </div>
      `;
    } catch (e) {
      preview.innerHTML = '<span style="color: #f56565;">❌ Invalid URL</span>';
    }
  } else {
    preview.innerHTML = '';
  }
}

function removeLink(linkId) {
  const linkElement = document.querySelector(`[data-link-id="${linkId}"]`);
  if (linkElement) {
    linkElement.remove();
  }
}

function showError(message) {
  // Simple error display - in a full implementation, you'd have a proper notification system
  alert(`Error: ${message}`);
}

async function uploadFromPC() {
  console.log('📁 Opening file picker for PC upload...');

  // Create file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';
  fileInput.multiple = false;

  fileInput.onchange = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 Selected file:', file.name, file.size, 'bytes');

    // Set loading state
    setButtonLoading('uploadPcBtn', true);

    try {
      // Validate file size (50MB limit like Python)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File is too large (>50MB). Please use a smaller file.');
      }

      if (file.size === 0) {
        throw new Error('File is empty (0 bytes)');
      }

      // Upload to RoboPost media
      console.log('📤 Uploading file to RoboPost...');
      const storageId = await window.roboPostAPI.uploadMedia(file);
      console.log('✅ File uploaded, storage_id:', storageId);

      // Extract filename without extension for title/caption
      const fileName = file.name.replace(/\.[^/.]+$/, "");

      // Create post object - always save to "My PC" category
      const pcCategory = 'My PC';
      const postId = Date.now().toString();
      const newPost = {
        id: postId,
        title: fileName,
        caption: fileName,
        imageUrl: URL.createObjectURL(file), // For preview
        storageId: storageId,
        category: pcCategory,
        timestamp: Date.now(),
        source: 'pc_upload',
        filename: file.name
      };

      // Ensure "My PC" category exists in categories list
      if (!categories.includes(pcCategory)) {
        categories.push(pcCategory);
      }

      // Add to saved items in "My PC" category
      if (!savedItems[pcCategory]) {
        savedItems[pcCategory] = [];
      }
      savedItems[pcCategory].push(newPost);

      // Save to storage (include both savedItems and categories)
      await new Promise(resolve => {
        chrome.storage.local.set({ savedItems, categories }, resolve);
      });

      // Refresh the UI
      await loadSavedData();

      showMessage(`✅ File "${file.name}" uploaded successfully and added to library!`, 'success');

    } catch (error) {
      console.error('❌ PC upload failed:', error);
      showError(`Failed to upload file: ${error.message}`);
    } finally {
      // Reset loading state
      setButtonLoading('uploadPcBtn', false);
    }
  };

  // Trigger file picker
  fileInput.click();
}

async function schedulePosts() {
  if (selectedPosts.size === 0) {
    alert('Please select at least one post to schedule');
    return;
  }

  // Get selected channels
  const selectedChannels = [];
  document.querySelectorAll('#channelsList input:checked').forEach(checkbox => {
    selectedChannels.push(checkbox.value);
  });

  if (selectedChannels.length === 0) {
    alert('Please select at least one channel');
    return;
  }

  const scheduleDateTime = document.getElementById('scheduleDateTime').value;
  if (!scheduleDateTime) {
    alert('Please select a schedule date and time');
    return;
  }

  const publishType = document.querySelector('input[name="publishType"]:checked').value;
  const postInterval = parseInt(document.getElementById('postInterval').value) || 30;
  const caption = document.getElementById('postCaption').value;
  const title = document.getElementById('postTitle').value;

  // Set loading state
  setButtonLoading('scheduleBtn', true);

  try {
    // Ensure API is initialized
    const isInitialized = await window.roboPostAPI.initialize();
    if (!isInitialized) {
      throw new Error('RoboPost API key not configured. Please go to Settings and configure your API key.');
    }

    // Test API connection first
    try {
      await window.roboPostAPI.testConnection();
      console.log('✅ API connection successful');
    } catch (connectionError) {
      throw new Error(`API connection failed: ${connectionError.message}`);
    }

    if (publishType === 'album' && selectedPosts.size > 1) {
      await scheduleAsAlbum(selectedChannels, scheduleDateTime, caption, title);
    } else {
      await scheduleIndividualPosts(selectedChannels, scheduleDateTime, postInterval, caption, title);
    }

    showMessage('✅ Posts scheduled successfully!', 'success');
    clearSelection();

  } catch (error) {
    console.error('Scheduling error:', error);
    showError(`Failed to schedule posts: ${error.message}`);
  } finally {
    // Reset loading state
    setButtonLoading('scheduleBtn', false);
  }
}

async function publishNow() {
  if (selectedPosts.size === 0) {
    alert('Please select at least one post to publish');
    return;
  }

  // Get selected channels
  const selectedChannels = [];
  document.querySelectorAll('#channelsList input:checked').forEach(checkbox => {
    selectedChannels.push(checkbox.value);
  });

  if (selectedChannels.length === 0) {
    alert('Please select at least one channel');
    return;
  }

  const publishType = document.querySelector('input[name="publishType"]:checked').value;
  const caption = document.getElementById('postCaption').value;
  const title = document.getElementById('postTitle').value;

  // Set immediate publish time (30 seconds from now to allow processing)
  const now = new Date();
  const publishTime = new Date(now.getTime() + 30000).toISOString();

  // Set loading state
  setButtonLoading('publishNowBtn', true);

  try {
    // Ensure API is initialized
    const isInitialized = await window.roboPostAPI.initialize();
    if (!isInitialized) {
      throw new Error('RoboPost API key not configured. Please go to Settings and configure your API key.');
    }

    // Test API connection first
    try {
      await window.roboPostAPI.testConnection();
      console.log('✅ API connection successful');
    } catch (connectionError) {
      throw new Error(`API connection failed: ${connectionError.message}`);
    }

    if (publishType === 'album' && selectedPosts.size > 1) {
      const posts = Array.from(selectedPosts).map(postId => getPostById(postId));
      const imageUrls = posts.map(post => post.imageUrl);

      await window.roboPostAPI.scheduleAlbumFromCapture({
        imageUrls: imageUrls,
        caption: caption,
        channelIds: selectedChannels,
        scheduleAt: publishTime,
        title: title
      });

      showMessage('✅ Album published successfully!', 'success');
    } else {
      // Publish individual posts with 1-minute intervals to avoid spam
      await scheduleIndividualPosts(selectedChannels, publishTime, 1, caption, title);
      showMessage('✅ Posts published successfully!', 'success');
    }

    clearSelection();

  } catch (error) {
    console.error('Publishing error:', error);
    showError(`Failed to publish posts: ${error.message}`);
  } finally {
    // Reset loading state
    setButtonLoading('publishNowBtn', false);
  }
}

async function scheduleAsAlbum(channels, scheduleDateTime, caption, title) {
  const posts = Array.from(selectedPosts).map(postId => getPostById(postId));
  const imageUrls = posts.map(post => post.imageUrl);

  try {
    const result = await window.roboPostAPI.scheduleAlbumFromCapture({
      imageUrls: imageUrls,
      caption: caption,
      channelIds: channels,
      scheduleAt: new Date(scheduleDateTime).toISOString(),
      title: title
    });

    console.log('Album scheduled successfully:', result);
    return result;

  } catch (error) {
    console.error('Failed to schedule album:', error);
    throw error;
  }
}

async function scheduleIndividualPosts(channels, scheduleDateTime, interval, caption, title) {
  const startTime = new Date(scheduleDateTime);
  const intervalType = document.getElementById('intervalType').value;
  const posts = Array.from(selectedPosts).map(postId => getPostById(postId));

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    let scheduleTime;

    // Calculate schedule time based on interval type
    switch (intervalType) {
      case 'fixed':
        scheduleTime = new Date(startTime.getTime() + (i * interval * 60000));
        break;
      case 'random':
        const minInterval = Math.floor(interval * 0.5);
        const maxInterval = Math.floor(interval * 1.5);
        const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval;
        scheduleTime = new Date(startTime.getTime() + (i * randomInterval * 60000));
        break;
      case 'optimal':
        // Use optimal posting times (simplified - in reality you'd use analytics data)
        const optimalHours = [9, 12, 15, 18, 21]; // Peak engagement hours
        const baseTime = new Date(startTime);
        const dayOffset = Math.floor(i / optimalHours.length);
        const hourIndex = i % optimalHours.length;

        scheduleTime = new Date(baseTime);
        scheduleTime.setDate(scheduleTime.getDate() + dayOffset);
        scheduleTime.setHours(optimalHours[hourIndex], 0, 0, 0);
        break;
      default:
        scheduleTime = new Date(startTime.getTime() + (i * interval * 60000));
    }

    try {
      const scheduleOptions = {
        imageUrl: post.imageUrl,
        caption: caption || post.caption,
        channelIds: channels,
        scheduleAt: scheduleTime.toISOString(),
        title: title
      };

      // If post has storageId (from PC upload), use it directly
      if (post.storageId) {
        scheduleOptions.storageId = post.storageId;
        console.log(`Using existing storage_id for post ${i + 1}:`, post.storageId);
      }

      await window.roboPostAPI.schedulePostFromCapture(scheduleOptions);

      console.log(`Post ${i + 1} scheduled for ${scheduleTime}`);

      // Add delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Failed to schedule post ${i + 1}:`, error);
      throw error;
    }
  }
}

// Test RoboPost API function
async function testRoboPostAPI() {
  // Set loading state
  setButtonLoading('testApiBtn', true);

  try {
    showMessage('Testing RoboPost API...', 'info');

    const result = await window.roboPostAPI.testScheduling();

    if (result.success) {
      showMessage('✅ API test successful! Draft post created (not published to social media). Check console for details.', 'success');
      console.log('🎉 API Test Result:', result);
    } else {
      showMessage(`❌ API test failed: ${result.error}`, 'error');
      console.error('❌ API Test Failed:', result);
    }
  } catch (error) {
    showMessage(`❌ API test error: ${error.message}`, 'error');
    console.error('❌ API Test Error:', error);
  } finally {
    // Reset loading state
    setButtonLoading('testApiBtn', false);
  }
}

function showMessage(message, type = 'info') {
  // Create or update message element
  let messageEl = document.getElementById('testMessage');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'testMessage';
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
    `;
    document.body.appendChild(messageEl);
  }

  // Set message and style based on type
  messageEl.textContent = message;
  switch (type) {
    case 'success':
      messageEl.style.background = '#10b981';
      break;
    case 'error':
      messageEl.style.background = '#ef4444';
      break;
    default:
      messageEl.style.background = '#3b82f6';
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (messageEl && messageEl.parentNode) {
      messageEl.parentNode.removeChild(messageEl);
    }
  }, 5000);
}

// Helper function to manage button loading states
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
      'publishNowBtn': '🔄 Publishing...',
      'viewQueueBtn': '🔄 Loading Queue...',
      'testApiBtn': '🔄 Testing API...'
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

// Custom Presets functionality
let customPresets = [];

async function loadCustomPresets() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['customPresets'], resolve);
    });
    customPresets = result.customPresets || [];
    renderCustomPresets();
  } catch (error) {
    console.error('Failed to load custom presets:', error);
  }
}

function renderCustomPresets() {
  const container = document.getElementById('quickPresetButtons');

  // Remove existing custom presets
  container.querySelectorAll('[data-custom="true"]').forEach(btn => btn.remove());

  // Add custom presets
  customPresets.forEach((preset, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.dataset.preset = `custom_${index}`;
    button.dataset.custom = 'true';
    button.innerHTML = `${preset.icon || '⏰'} ${preset.name}`;
    button.style.position = 'relative';

    // Add delete button
    const deleteBtn = document.createElement('span');
    deleteBtn.innerHTML = '✖';
    deleteBtn.className = 'preset-delete-btn';
    deleteBtn.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      background: #e53e3e;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      font-size: 10px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
    `;

    button.appendChild(deleteBtn);

    // Show delete button on hover
    button.addEventListener('mouseenter', () => {
      deleteBtn.style.display = 'flex';
    });
    button.addEventListener('mouseleave', () => {
      deleteBtn.style.display = 'none';
    });

    // Handle delete
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCustomPreset(index);
    });

    container.appendChild(button);
  });
}

function showCustomPresetDialog() {
  document.getElementById('customPresetDialog').style.display = 'flex';

  // Reset form
  document.getElementById('customPresetName').value = '';
  document.getElementById('customPresetIcon').value = '';
  document.getElementById('customPresetType').value = 'relative';
  showPresetOptions('relative');

  // Setup event listeners for the dialog
  setupCustomPresetDialogListeners();
}

function setupCustomPresetDialogListeners() {
  // Close dialog
  document.getElementById('closeCustomPresetDialog').onclick = hideCustomPresetDialog;
  document.getElementById('cancelCustomPresetBtn').onclick = hideCustomPresetDialog;

  // Save preset
  document.getElementById('saveCustomPresetBtn').onclick = saveCustomPreset;

  // Type change
  document.getElementById('customPresetType').onchange = (e) => {
    showPresetOptions(e.target.value);
  };
}

function hideCustomPresetDialog() {
  document.getElementById('customPresetDialog').style.display = 'none';
}

function showPresetOptions(type) {
  // Hide all options
  document.querySelectorAll('.preset-options').forEach(el => {
    el.style.display = 'none';
  });

  // Show selected option
  const optionId = type + (type === 'relative' ? 'TimeOptions' : type === 'absolute' ? 'TimeOptions' : 'Options');
  const element = document.getElementById(optionId);
  if (element) {
    element.style.display = 'block';
  }
}

async function saveCustomPreset() {
  const name = document.getElementById('customPresetName').value.trim();
  const icon = document.getElementById('customPresetIcon').value.trim();
  const type = document.getElementById('customPresetType').value;

  if (!name) {
    showMessage('❌ Please enter a preset name', 'error');
    return;
  }

  const preset = {
    name: name,
    icon: icon || '⏰',
    type: type
  };

  // Get type-specific settings
  switch (type) {
    case 'relative':
      preset.amount = parseInt(document.getElementById('relativeAmount').value) || 30;
      preset.unit = document.getElementById('relativeUnit').value;
      break;
    case 'absolute':
      preset.time = document.getElementById('absoluteTime').value;
      preset.dateOffset = parseInt(document.getElementById('absoluteDateOffset').value) || 0;
      break;
    case 'next_day':
      preset.weekday = parseInt(document.getElementById('nextDayWeekday').value);
      preset.time = document.getElementById('nextDayTime').value;
      break;
  }

  // Save to storage
  customPresets.push(preset);

  try {
    await new Promise(resolve => {
      chrome.storage.local.set({ customPresets }, resolve);
    });

    renderCustomPresets();
    hideCustomPresetDialog();
    showMessage(`✅ Custom preset "${name}" created successfully!`, 'success');
  } catch (error) {
    showMessage(`❌ Failed to save preset: ${error.message}`, 'error');
  }
}

async function deleteCustomPreset(index) {
  if (!confirm(`Delete preset "${customPresets[index].name}"?`)) {
    return;
  }

  customPresets.splice(index, 1);

  try {
    await new Promise(resolve => {
      chrome.storage.local.set({ customPresets }, resolve);
    });

    renderCustomPresets();
    showMessage('✅ Preset deleted successfully!', 'success');
  } catch (error) {
    showMessage(`❌ Failed to delete preset: ${error.message}`, 'error');
  }
}

function executeCustomPreset(index) {
  const preset = customPresets[index];
  if (!preset) return;

  const now = new Date();
  let scheduleTime;

  switch (preset.type) {
    case 'relative':
      const multiplier = preset.unit === 'minutes' ? 60000 :
                        preset.unit === 'hours' ? 3600000 :
                        86400000; // days
      scheduleTime = new Date(now.getTime() + (preset.amount * multiplier));
      break;

    case 'absolute':
      scheduleTime = new Date(now);
      scheduleTime.setDate(scheduleTime.getDate() + preset.dateOffset);
      const [hours, minutes] = preset.time.split(':');
      scheduleTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      break;

    case 'next_day':
      scheduleTime = new Date(now);
      const daysUntilTarget = (preset.weekday - scheduleTime.getDay() + 7) % 7;
      if (daysUntilTarget === 0) {
        // If it's the same day, schedule for next week
        scheduleTime.setDate(scheduleTime.getDate() + 7);
      } else {
        scheduleTime.setDate(scheduleTime.getDate() + daysUntilTarget);
      }
      const [nextHours, nextMinutes] = preset.time.split(':');
      scheduleTime.setHours(parseInt(nextHours), parseInt(nextMinutes), 0, 0);
      break;
  }

  if (scheduleTime) {
    // Update the schedule input
    const scheduleInput = document.getElementById('scheduleDateTime');
    if (scheduleInput) {
      const year = scheduleTime.getFullYear();
      const month = String(scheduleTime.getMonth() + 1).padStart(2, '0');
      const day = String(scheduleTime.getDate()).padStart(2, '0');
      const hours = String(scheduleTime.getHours()).padStart(2, '0');
      const minutes = String(scheduleTime.getMinutes()).padStart(2, '0');

      const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      scheduleInput.value = formattedDateTime;

      // Visual feedback
      scheduleInput.style.background = '#e6fffa';
      scheduleInput.style.border = '2px solid #38b2ac';
      setTimeout(() => {
        scheduleInput.style.background = '';
        scheduleInput.style.border = '';
      }, 1500);

      const timeString = scheduleTime.toLocaleString();
      showMessage(`⏰ ${preset.name} preset applied: ${timeString}`, 'success');
    }
  }
}

// CSV Import functionality
let csvData = [];

function showCsvImport() {
  document.getElementById('csvImportSection').style.display = 'block';
  document.getElementById('csvPreview').style.display = 'none';
  document.getElementById('csvFileInput').value = '';
  csvData = [];
}

function hideCsvImport() {
  document.getElementById('csvImportSection').style.display = 'none';
  document.getElementById('csvPreview').style.display = 'none';
  document.getElementById('csvFileInput').value = '';
  csvData = [];
}

function handleCsvFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.csv')) {
    showMessage('❌ Please select a CSV file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const csvText = e.target.result;
      csvData = parseCsv(csvText);

      if (csvData.length === 0) {
        showMessage('❌ CSV file is empty or invalid', 'error');
        return;
      }

      showCsvPreview(csvData);
    } catch (error) {
      showMessage(`❌ Error reading CSV: ${error.message}`, 'error');
    }
  };

  reader.readAsText(file);
}

function parseCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const data = [];

  // Skip header row if it exists
  const startIndex = lines[0].toLowerCase().includes('imageurl') || lines[0].toLowerCase().includes('caption') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles basic cases)
    const columns = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));

    if (columns.length >= 2) {
      data.push({
        imageUrl: columns[0] || '',
        caption: columns[1] || '',
        title: columns[2] || columns[1] || '', // Use caption as title if title not provided
        category: columns[3] || 'CSV Import'
      });
    }
  }

  return data;
}

function showCsvPreview(data) {
  const previewContainer = document.getElementById('csvPreview');
  const previewContent = document.getElementById('csvPreviewContent');

  // Show first 5 rows for preview
  const previewData = data.slice(0, 5);

  let tableHtml = `
    <table class="csv-preview-table">
      <thead>
        <tr>
          <th>Image URL</th>
          <th>Caption</th>
          <th>Title</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
  `;

  previewData.forEach(row => {
    const truncatedUrl = row.imageUrl.length > 30 ? row.imageUrl.substring(0, 30) + '...' : row.imageUrl;
    const truncatedCaption = row.caption.length > 40 ? row.caption.substring(0, 40) + '...' : row.caption;
    const truncatedTitle = row.title.length > 30 ? row.title.substring(0, 30) + '...' : row.title;

    tableHtml += `
      <tr>
        <td>${truncatedUrl}</td>
        <td>${truncatedCaption}</td>
        <td>${truncatedTitle}</td>
        <td>${row.category}</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
    <p style="margin-top: 10px; font-size: 11px; color: #718096;">
      Total rows to import: ${data.length}
    </p>
  `;

  previewContent.innerHTML = tableHtml;
  previewContainer.style.display = 'block';
}

async function confirmCsvImport() {
  if (csvData.length === 0) {
    showMessage('❌ No data to import', 'error');
    return;
  }

  try {
    // Get current saved items
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['savedItems', 'categories'], resolve);
    });

    const savedItems = result.savedItems || {};
    const categories = result.categories || [];

    let importedCount = 0;

    // Process each CSV row
    csvData.forEach(row => {
      if (!row.imageUrl || !row.caption) return; // Skip invalid rows

      const category = row.category || 'CSV Import';

      // Add category if it doesn't exist
      if (!categories.includes(category)) {
        categories.push(category);
      }

      // Add post to category
      if (!savedItems[category]) {
        savedItems[category] = [];
      }

      savedItems[category].push({
        imageUrl: row.imageUrl,
        caption: row.caption,
        title: row.title
      });

      importedCount++;
    });

    // Save to storage
    await new Promise(resolve => {
      chrome.storage.local.set({ savedItems, categories }, resolve);
    });

    // Refresh the UI
    await loadSavedData();

    showMessage(`✅ Successfully imported ${importedCount} posts`, 'success');
    hideCsvImport();

  } catch (error) {
    showMessage(`❌ Import failed: ${error.message}`, 'error');
  }
}

// AI Rewrite Functionality
async function handleRewriteClick(event) {
  const button = event.target;

  // Check if this is an edit button
  if (button.classList.contains('edit-prompt-btn')) {
    const target = button.dataset.target;
    const promptType = button.dataset.prompt;
    showEditPromptDialog(target, promptType);
    return;
  }

  const target = button.dataset.target; // 'title' or 'caption'
  const promptType = button.dataset.prompt; // 'engaging', 'shorten', etc.

  if (promptType === 'custom') {
    showCustomPromptDialog(target);
    return;
  }

  // Get the current text
  const textElement = target === 'title'
    ? document.getElementById('postTitle')
    : document.getElementById('postCaption');

  const currentText = textElement.value.trim();

  if (!currentText) {
    showMessage(`❌ Please enter some ${target} text first`, 'error');
    return;
  }

  // Check if Gemini API is available
  if (!window.geminiAPI) {
    showMessage('❌ Gemini AI not available. Please check your settings.', 'error');
    return;
  }

  // Find the matching prompt
  const promptData = window.geminiRewritePrompts[target]?.find(p =>
    p.name.toLowerCase() === promptType.toLowerCase()
  );

  if (!promptData) {
    showMessage('❌ Prompt not found', 'error');
    return;
  }

  // Show loading state
  const originalText = button.textContent;
  button.textContent = '🔄';
  button.disabled = true;
  button.classList.add('loading');

  try {
    // Call Gemini API to rewrite the text
    const rewrittenText = await window.geminiAPI.rewriteText(currentText, promptData.prompt);

    // Update the text field
    textElement.value = rewrittenText.trim();

    // Update character count if it's the caption
    if (target === 'caption') {
      updateCaptionCharCount();
    }

    // Show success feedback
    textElement.style.background = '#e6fffa';
    setTimeout(() => {
      textElement.style.background = '';
    }, 2000);

    showMessage(`✅ ${target.charAt(0).toUpperCase() + target.slice(1)} rewritten successfully!`, 'success');

  } catch (error) {
    console.error('Rewrite error:', error);
    showMessage(`❌ Rewrite failed: ${error.message}`, 'error');
  } finally {
    // Reset button state
    button.textContent = originalText;
    button.disabled = false;
    button.classList.remove('loading');
  }
}

function showCustomPromptDialog(target) {
  const dialog = document.getElementById('customPromptDialog');
  const targetSelect = document.getElementById('customPromptTarget');

  // Set the target
  targetSelect.value = target;

  // Clear previous input
  document.getElementById('customPromptText').value = '';

  // Show dialog
  dialog.style.display = 'flex';
}

function hideCustomPromptDialog() {
  const dialog = document.getElementById('customPromptDialog');
  dialog.style.display = 'none';
}

function showEditPromptDialog(target, promptType) {
  const dialog = document.getElementById('editPromptDialog');
  const targetSelect = document.getElementById('editPromptTarget');
  const promptTextarea = document.getElementById('editPromptText');
  const promptNameInput = document.getElementById('editPromptName');

  // Find the current prompt
  const promptData = window.geminiRewritePrompts[target]?.find(p =>
    p.name.toLowerCase() === promptType.toLowerCase()
  );

  if (!promptData) {
    showMessage('❌ Prompt not found', 'error');
    return;
  }

  // Set the values
  targetSelect.value = target;
  promptTextarea.value = promptData.prompt;
  promptNameInput.value = promptData.name;

  // Store the original prompt type for updating
  dialog.dataset.originalPromptType = promptType;
  dialog.dataset.target = target;

  // Show dialog
  dialog.style.display = 'flex';
}

function hideEditPromptDialog() {
  const dialog = document.getElementById('editPromptDialog');
  dialog.style.display = 'none';
}

async function saveEditedPrompt() {
  const dialog = document.getElementById('editPromptDialog');
  const target = dialog.dataset.target;
  const originalPromptType = dialog.dataset.originalPromptType;
  const newPrompt = document.getElementById('editPromptText').value.trim();
  const newName = document.getElementById('editPromptName').value.trim();

  if (!newPrompt || !newName) {
    showMessage('❌ Please enter both prompt name and text', 'error');
    return;
  }

  // Find and update the prompt
  const promptIndex = window.geminiRewritePrompts[target]?.findIndex(p =>
    p.name.toLowerCase() === originalPromptType.toLowerCase()
  );

  if (promptIndex !== -1) {
    window.geminiRewritePrompts[target][promptIndex].prompt = newPrompt;
    window.geminiRewritePrompts[target][promptIndex].name = newName;
    window.geminiRewritePrompts[target][promptIndex].modified = true;

    // Save to storage
    const customPrompts = {
      title: window.geminiRewritePrompts.title.filter(p => p.custom || p.modified),
      caption: window.geminiRewritePrompts.caption.filter(p => p.custom || p.modified)
    };

    window.saveCustomPrompts(customPrompts);

    showMessage(`✅ Prompt "${newName}" updated successfully!`, 'success');

    // Update the button text if name changed
    updatePromptButtons();

    hideEditPromptDialog();
  } else {
    showMessage('❌ Failed to update prompt', 'error');
  }
}

function updatePromptButtons() {
  // Update title buttons
  const titleButtons = document.querySelectorAll('#titleRewriteButtons .btn-ai:not([data-prompt="custom"])');
  titleButtons.forEach((button, index) => {
    if (window.geminiRewritePrompts.title[index]) {
      const prompt = window.geminiRewritePrompts.title[index];
      button.textContent = `${prompt.icon} ${prompt.name}`;
    }
  });

  // Update caption buttons
  const captionButtons = document.querySelectorAll('#captionRewriteButtons .btn-ai:not([data-prompt="custom"])');
  captionButtons.forEach((button, index) => {
    if (window.geminiRewritePrompts.caption[index]) {
      const prompt = window.geminiRewritePrompts.caption[index];
      button.textContent = `${prompt.icon} ${prompt.name}`;
    }
  });
}

async function applyCustomPrompt() {
  const promptText = document.getElementById('customPromptText').value.trim();
  const target = document.getElementById('customPromptTarget').value;

  if (!promptText) {
    showMessage('❌ Please enter a custom prompt', 'error');
    return;
  }

  // Get the current text
  const textElement = target === 'title'
    ? document.getElementById('postTitle')
    : document.getElementById('postCaption');

  const currentText = textElement.value.trim();

  if (!currentText) {
    showMessage(`❌ Please enter some ${target} text first`, 'error');
    return;
  }

  // Check if Gemini API is available
  if (!window.geminiAPI) {
    showMessage('❌ Gemini AI not available. Please check your settings.', 'error');
    return;
  }

  const button = document.getElementById('applyCustomPromptBtn');
  const originalText = button.textContent;
  button.textContent = '🔄 Processing...';
  button.disabled = true;

  try {
    // Call Gemini API to rewrite the text
    const rewrittenText = await window.geminiAPI.rewriteText(currentText, promptText);

    // Update the text field
    textElement.value = rewrittenText.trim();

    // Update character count if it's the caption
    if (target === 'caption') {
      updateCaptionCharCount();
    }

    // Show success feedback
    textElement.style.background = '#e6fffa';
    setTimeout(() => {
      textElement.style.background = '';
    }, 2000);

    showMessage(`✅ ${target.charAt(0).toUpperCase() + target.slice(1)} rewritten successfully!`, 'success');

    // Hide dialog
    hideCustomPromptDialog();

  } catch (error) {
    console.error('Custom rewrite error:', error);
    showMessage(`❌ Rewrite failed: ${error.message}`, 'error');
  } finally {
    // Reset button state
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Load custom prompts first
  await window.loadCustomPrompts();

  loadCapturedPosts();
  setupEventListeners();
  setupRewriteButtonListeners();
  updateCaptionCharCount();
  updateTimezoneInfo();
});
