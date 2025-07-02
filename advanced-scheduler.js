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
    
    // Load saved data
    await loadSavedData();
    
    // Load channels
    await loadChannels();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load default settings
    await loadDefaultSettings();
    
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
    card.addEventListener('click', () => {
      const postId = card.dataset.postId;
      togglePostSelection(postId, card);
    });
  });
  
  updateStats();
}

function togglePostSelection(postId, cardElement) {
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
  
  // Update caption with first selected post's caption
  if (selectedPosts.size > 0) {
    const firstPost = getPostById(Array.from(selectedPosts)[0]);
    if (firstPost) {
      const captionTextarea = document.getElementById('postCaption');
      const titleInput = document.getElementById('postTitle');

      // Only update if fields are empty to avoid overwriting user edits
      if (!captionTextarea.value.trim()) {
        captionTextarea.value = firstPost.caption || '';
      }
      if (!titleInput.value.trim()) {
        titleInput.value = firstPost.caption || '';
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

  const localTime = new Date(scheduleTime.getTime() - scheduleTime.getTimezoneOffset() * 60000);
  document.getElementById('scheduleDateTime').value = localTime.toISOString().slice(0, 16);
  updateTimezoneInfo();
}

function setupEventListeners() {
  // Selection buttons
  document.getElementById('selectAllBtn').addEventListener('click', selectAllPosts);
  document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);
  document.getElementById('createAlbumBtn').addEventListener('click', createAlbum);

  // Schedule buttons
  document.getElementById('scheduleBtn').addEventListener('click', schedulePosts);
  document.getElementById('publishNowBtn').addEventListener('click', publishNow);
  document.getElementById('viewQueueBtn').addEventListener('click', viewScheduleQueue);
  document.getElementById('testApiBtn').addEventListener('click', testRoboPostAPI);

  // Links editor
  document.getElementById('addLinkBtn').addEventListener('click', addLink);

  // Caption editor enhancements
  const captionTextarea = document.getElementById('postCaption');
  captionTextarea.addEventListener('input', updateCaptionCharCount);
  captionTextarea.addEventListener('input', autoResizeTextarea);

  // Title sync
  document.getElementById('postTitle').addEventListener('input', syncTitleToCaption);
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

async function viewScheduleQueue() {
  try {
    const scheduledPosts = await window.roboPostAPI.getScheduledPosts();

    if (scheduledPosts.length === 0) {
      alert('📭 No posts in the schedule queue');
      return;
    }

    // Create a simple queue viewer
    let queueHtml = `
      <div style="max-width: 600px; max-height: 400px; overflow-y: auto; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <h3 style="margin: 0 0 15px 0; color: #667eea;">📋 Scheduled Posts Queue</h3>
        <div style="display: grid; gap: 10px;">
    `;

    scheduledPosts.forEach((post, index) => {
      const scheduleDate = new Date(post.schedule_at).toLocaleString();
      const channels = post.channels ? post.channels.map(c => c.name).join(', ') : 'Unknown channels';

      queueHtml += `
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #f7fafc;">
          <div style="font-weight: 600; margin-bottom: 5px;">${post.text || 'No caption'}</div>
          <div style="font-size: 12px; color: #718096;">
            📅 ${scheduleDate}<br>
            📺 ${channels}<br>
            🖼️ ${post.image_object_ids ? post.image_object_ids.length : 0} image(s)
          </div>
          <button onclick="cancelPost('${post.id}')" style="margin-top: 8px; padding: 4px 8px; background: #f56565; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">❌ Cancel</button>
        </div>
      `;
    });

    queueHtml += `
        </div>
        <div style="text-align: center; margin-top: 15px;">
          <button onclick="closeQueueViewer()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
        </div>
      </div>
    `;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'queueOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    overlay.innerHTML = queueHtml;

    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeQueueViewer();
      }
    });

  } catch (error) {
    showError(`Failed to load schedule queue: ${error.message}`);
  }
}

function closeQueueViewer() {
  const overlay = document.getElementById('queueOverlay');
  if (overlay) {
    overlay.remove();
  }
}

async function cancelPost(postId) {
  if (!confirm('Are you sure you want to cancel this scheduled post?')) {
    return;
  }

  try {
    await window.roboPostAPI.cancelScheduledPost(postId);
    alert('✅ Post cancelled successfully');
    closeQueueViewer();
    // Optionally refresh the queue view
    setTimeout(() => viewScheduleQueue(), 500);
  } catch (error) {
    showError(`Failed to cancel post: ${error.message}`);
  }
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

    alert('Posts scheduled successfully!');
    clearSelection();

  } catch (error) {
    console.error('Scheduling error:', error);
    showError(`Failed to schedule posts: ${error.message}`);
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

      alert('Album published successfully!');
    } else {
      // Publish individual posts with 1-minute intervals to avoid spam
      await scheduleIndividualPosts(selectedChannels, publishTime, 1, caption, title);
      alert('Posts published successfully!');
    }

    clearSelection();

  } catch (error) {
    console.error('Publishing error:', error);
    showError(`Failed to publish posts: ${error.message}`);
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
      await window.roboPostAPI.schedulePostFromCapture({
        imageUrl: post.imageUrl,
        caption: caption || post.caption,
        channelIds: channels,
        scheduleAt: scheduleTime.toISOString(),
        title: title
      });

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
  try {
    showMessage('Testing RoboPost API...', 'info');

    const result = await window.roboPostAPI.testScheduling();

    if (result.success) {
      showMessage('✅ API test successful! Check console for details.', 'success');
      console.log('🎉 API Test Result:', result);
    } else {
      showMessage(`❌ API test failed: ${result.error}`, 'error');
      console.error('❌ API Test Failed:', result);
    }
  } catch (error) {
    showMessage(`❌ API test error: ${error.message}`, 'error');
    console.error('❌ API Test Error:', error);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  loadCapturedPosts();
  setupEventListeners();
  updateCaptionCharCount();
  updateTimezoneInfo();
});
