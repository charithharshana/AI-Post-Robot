// Advanced Scheduler for AI Post Robot
let savedItems = {};
let categories = [];
let selectedPosts = new Set();
let channelsData = [];
let currentCategory = 'all';
let userEditedTitle = false;
let userEditedCaption = false;
let showTextOnlyFilter = false;
let channelPlatformMappings = {};

// Image Editor Integration
let imageEditorIntegration = null;

// AI Image Editor Integration
let aiImageEditorModule = null;

// Make functions available globally for the image editor integration immediately
// This ensures they're available even before DOM content is loaded
window.getPostById = function(postId) {
  // First, try to find by post.id across all categories (handles AI generated IDs and other unique IDs)
  for (const category in savedItems) {
    const posts = savedItems[category];
    for (let i = 0; i < posts.length; i++) {
      if (posts[i] && posts[i].id === postId) {
        return posts[i];
      }
    }
  }

  // Fallback: Handle old format (category_index) only if it looks like the old format
  if (postId.includes('_') && !postId.startsWith('ai_') && !postId.startsWith('pc_')) {
    const parts = postId.split('_');
    if (parts.length === 2) {
      const [category, index] = parts;
      if (savedItems[category] && savedItems[category][index]) {
        return savedItems[category][index];
      }
    }
  }

  return null;
};

window.clearMessage = function() {
  const messageContainer = document.getElementById('messageContainer');
  if (messageContainer) {
    messageContainer.innerHTML = '';
    messageContainer.style.display = 'none';
  }
};



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

    // Initialize original prompts backup
    if (window.initializeOriginalPrompts) {
      window.initializeOriginalPrompts();
    }

    // Load custom prompts from storage
    if (window.loadCustomPrompts) {
      await window.loadCustomPrompts();
      console.log('✅ Custom prompts loaded');
    }

    // AI Image Editor Module will be initialized on demand
    console.log('🔄 AI Image Editor Module will be loaded when needed');

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

    // Initialize button states
    updateEditButtonState();

    // Update prompt buttons to show custom prompts
    updatePromptButtons();

    console.log('✅ Advanced Scheduler initialized successfully');

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

      // Initialize default categories if none exist
      if (categories.length === 0) {
        categories = ['Facebook', 'Pinterest'];
        chrome.storage.local.set({ categories }, () => {
          console.log('✅ Initialized default categories:', categories);
        });
      }

      loadCategoryTabs();
      loadPosts();
      updateStats();

      resolve();
    });
  });
}

async function loadChannels() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['channelsData', 'channelPlatformMappings'], (result) => {
      channelsData = result.channelsData || [];
      // Store platform mappings for use in displayChannels
      channelPlatformMappings = result.channelPlatformMappings || {};
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

    // Add appropriate icons for different categories
    let icon = '';
    switch (category.toLowerCase()) {
      case 'facebook':
        icon = '📘 ';
        break;
      case 'pinterest':
        icon = '📌 ';
        break;
      case 'my pc':
        icon = '💻 ';
        break;
      case 'ai':
        icon = '🤖 ';
        break;
      case 'csv import':
        icon = '📊 ';
        break;
      case 'text posts':
        icon = '📝 ';
        break;
      default:
        icon = '📂 ';
        break;
    }

    html += `<div class="filter-tab" data-category="${category}">${icon}${category} (${count})</div>`;
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

/**
 * Get image dimensions from data URL
 */
function getImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for dimensions'));
    };
    img.src = dataUrl;
  });
}

/**
 * Get image metadata for display
 */
function getImageMetadata(post) {
  const metadata = [];

  // Handle text-only posts
  if (post.isTextOnly) {
    metadata.push('📝 TEXT POST');

    // Add character count for text posts
    if (post.caption) {
      const charCount = post.caption.length;
      metadata.push(`${charCount} chars`);
    }
  } else {
    // Get dimensions if available
    if (post.dimensions) {
      metadata.push(`${post.dimensions.width} × ${post.dimensions.height}px`);
    }

    // Get file size if available
    if (post.fileSize) {
      const sizeKB = Math.round(post.fileSize / 1024);
      if (sizeKB < 1024) {
        metadata.push(`${sizeKB} KB`);
      } else {
        const sizeMB = (sizeKB / 1024).toFixed(1);
        metadata.push(`${sizeMB} MB`);
      }
    }

    // Get file format
    if (post.fileType) {
      const format = post.fileType.split('/')[1]?.toUpperCase() || 'IMG';
      metadata.push(format);
    }
  }

  // Get timestamp (for both text and media posts)
  if (post.timestamp) {
    const date = new Date(post.timestamp);
    const timeStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    metadata.push(timeStr);
  }

  return metadata.join(' • ');
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

  // Apply text-only filter if enabled
  if (showTextOnlyFilter) {
    allPosts = allPosts.filter(post => post.isTextOnly === true);
  }

  if (allPosts.length === 0) {
    const emptyMessage = showTextOnlyFilter
      ? '📝 No text-only posts found in this category'
      : '📭 No posts found in this category';
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }
  
  let html = '';
  allPosts.forEach((post) => {
    // Use the id that was set in loadSavedData (format: category_index)
    const postIdentifier = post.id;
    const isSelected = selectedPosts.has(postIdentifier);
    const caption = post.caption || 'No caption';
    const truncatedCaption = caption.length > 100 ? caption.substring(0, 100) + '...' : caption;

    // Get image metadata for display
    const metadata = getImageMetadata(post);

    // Handle text-only posts differently
    if (post.isTextOnly) {
      html += `
        <div class="post-card text-only-post ${isSelected ? 'selected' : ''}" data-post-id="${postIdentifier}">
          <div class="text-post-icon">
            <div class="text-icon">📝</div>
            <div class="text-label">TEXT POST</div>
          </div>
          <div class="post-content">
            <div class="post-caption">${truncatedCaption}</div>
            <div class="post-meta">${post.category}</div>
            <div class="post-metadata">${metadata}</div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="post-card ${isSelected ? 'selected' : ''}" data-post-id="${postIdentifier}">
          <img src="${post.imageUrl}" alt="Post image" class="post-image" onerror="this.style.display='none'">
          <div class="post-content">
            <div class="post-caption">${truncatedCaption}</div>
            <div class="post-meta">${post.category}</div>
            <div class="post-metadata">${metadata}</div>
          </div>
        </div>
      `;
    }
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
    // Hide save buttons when no posts are selected
    document.getElementById('saveTitleBtn').style.display = 'none';
    document.getElementById('saveCaptionBtn').style.display = 'none';
    // Reset edit flags when no posts selected
    userEditedTitle = false;
    userEditedCaption = false;
    updateEditButtonState();
    // Update queue mode UI
    updateQueueModeUI();
    return;
  }

  infoContainer.classList.remove('hidden');

  // Update queue mode UI based on selection count
  updateQueueModeUI();

  // Check if media is available for AI toggle
  const mediaData = getSelectedPostMedia();
  const hasMedia = mediaData !== null;

  let html = `<strong>📋 Selected: ${selectedPosts.size} post(s)</strong>`;

  // Add AI toggle if media is available
  if (hasMedia) {
    const isEnabled = localStorage.getItem('aiIncludeMedia') !== 'false'; // Default to true
    const toggleClass = isEnabled ? 'enabled' : 'disabled';
    const toggleIcon = isEnabled ? '🖼️' : '📝';
    const toggleText = isEnabled ? `Include ${mediaData.type} in AI prompts` : `Text-only AI (${mediaData.type} available)`;

    html += `
      <div class="ai-toggle-container ${toggleClass}" id="aiToggleContainer">
        <input type="checkbox" id="aiIncludeMediaToggle" ${isEnabled ? 'checked' : ''}>
        <label for="aiIncludeMediaToggle">${toggleIcon} ${toggleText}</label>
      </div>
    `;
  }

  if (selectedPosts.size > 1) {
    html += '<div class="album-preview">';
    let count = 0;
    selectedPosts.forEach(postId => {
      if (count < 6) { // Show max 6 thumbnails
        const post = window.getPostById(postId);
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

  // Add event listener for the toggle if it exists
  const toggle = document.getElementById('aiIncludeMediaToggle');
  if (toggle) {
    toggle.addEventListener('change', handleAiToggleChange);
  }
  
  // Update caption and title with selected post's data
  if (selectedPosts.size > 0) {
    const firstPost = window.getPostById(Array.from(selectedPosts)[0]);
    if (firstPost) {
      const captionTextarea = document.getElementById('postCaption');
      const titleInput = document.getElementById('postTitle');

      // Always update fields when a single post is selected
      if (selectedPosts.size === 1) {
        // Use overridden values if they exist, otherwise use original values
        // Priority: overridden title > original title > caption as fallback
        const displayTitle = firstPost.titleOverridden ? firstPost.overriddenTitle : (firstPost.title || firstPost.caption);
        const displayCaption = firstPost.captionOverridden ? firstPost.overriddenCaption : firstPost.caption;

        captionTextarea.value = displayCaption || '';
        titleInput.value = displayTitle || '';

        // Reset edit flags since we're loading post data (not user editing)
        userEditedTitle = false;
        userEditedCaption = false;

        // Add visual feedback to show fields were updated
        captionTextarea.style.background = '#e6fffa';
        titleInput.style.background = '#e6fffa';
        setTimeout(() => {
          captionTextarea.style.background = '';
          titleInput.style.background = '';
        }, 1000);

        // Hide save buttons initially since we're loading saved values
        document.getElementById('saveTitleBtn').style.display = 'none';
        document.getElementById('saveCaptionBtn').style.display = 'none';

        // Add visual indicators for overridden values
        updateOverrideIndicators(firstPost);
      } else {
        // For multiple posts, only update if fields are empty to avoid overwriting user edits
        if (!captionTextarea.value.trim()) {
          const displayCaption = firstPost.captionOverridden ? firstPost.overriddenCaption : firstPost.caption;
          captionTextarea.value = displayCaption || '';
        }
        if (!titleInput.value.trim()) {
          const displayTitle = firstPost.titleOverridden ? firstPost.overriddenTitle : firstPost.caption;
          titleInput.value = displayTitle || '';
        }

        // Hide save buttons for multiple selection
        document.getElementById('saveTitleBtn').style.display = 'none';
        document.getElementById('saveCaptionBtn').style.display = 'none';
      }

      // Update character count
      updateCaptionCharCount();
    }
  }

  // Update Edit button state
  updateEditButtonState();
}

// getPostById function is now defined globally at the top of the file

function displayChannels() {
  const channelsList = document.getElementById('channelsList');

  if (channelsData.length === 0) {
    channelsList.innerHTML = '<div style="text-align: center; color: #718096; padding: 10px;">❌ No channels found. Please configure API in settings.</div>';
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

  // Add event listeners to channel checkboxes
  channelsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', updatePlatformSettings);
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

function updatePlatformSettings() {
  const checkedChannels = document.querySelectorAll('#channelsList input[type="checkbox"]:checked');
  const platformSettings = document.getElementById('platformSettings');
  
  // Get unique platforms from selected channels
  const selectedPlatforms = new Set();
  checkedChannels.forEach(checkbox => {
    const platform = checkbox.dataset.platform;
    if (platform) {
      selectedPlatforms.add(platform);
    }
  });

  // Hide all platform settings first
  document.querySelectorAll('.platform-settings').forEach(setting => {
    setting.style.display = 'none';
  });

  // Show platform settings container if any channels are selected
  if (selectedPlatforms.size > 0) {
    platformSettings.style.display = 'block';

    // Show relevant platform settings
    selectedPlatforms.forEach(platform => {
      // Convert platform name to match HTML element IDs (lowercase + 'Settings')
      const settingsElement = document.getElementById(`${platform}Settings`);
      if (settingsElement) {
        settingsElement.style.display = 'block';
      }
    });
  } else {
    platformSettings.style.display = 'none';
  }

  // Handle GMB post type changes
  const gmbPostType = document.getElementById('gmbPostTopicType');
  if (gmbPostType) {
    gmbPostType.addEventListener('change', updateGMBFields);
    updateGMBFields(); // Initialize on load
  }
}

function updateGMBFields() {
  const postType = document.getElementById('gmbPostTopicType').value;
  const offerFields = document.getElementById('gmbOfferFields');
  const eventFields = document.getElementById('gmbEventFields');

  // Hide all conditional fields first
  offerFields.style.display = 'none';
  eventFields.style.display = 'none';

  // Show relevant fields based on post type
  if (postType === 'OFFER') {
    offerFields.style.display = 'block';
  } else if (postType === 'EVENT') {
    eventFields.style.display = 'block';
  }
}

function getPlatformSpecificSettings() {
  const platformSettings = {};

  // Get selected platforms to determine which settings to include
  const checkedChannels = document.querySelectorAll('#channelsList input[type="checkbox"]:checked');

  const selectedPlatforms = new Set();
  checkedChannels.forEach(checkbox => {
    const platform = checkbox.dataset.platform;
    if (platform) {
      selectedPlatforms.add(platform);
    }
  });

  // Pinterest Settings - Smart Integration
  if (selectedPlatforms.has('pinterest')) {
    // Use main post title as pin title
    const mainTitle = document.getElementById('postTitle');
    const pinTitle = mainTitle && mainTitle.value.trim() ? mainTitle.value.trim() : "";

    // Use first link from links editor as destination link
    const firstLinkUrl = getFirstLinkUrl();

    platformSettings.pinterest_settings = {
      pinTitle: pinTitle,
      destinationLink: firstLinkUrl
    };
  }

  // YouTube Settings - Smart Integration
  if (selectedPlatforms.has('youtube')) {
    // Use main post title as video title, main caption as description
    const mainTitle = document.getElementById('postTitle');
    const mainCaption = document.getElementById('postCaption');
    const youtubeVideoType = document.getElementById('youtubeVideoType');
    const youtubePrivacyStatus = document.getElementById('youtubePrivacyStatus');
    const youtubeThumbnailImageObject = document.getElementById('youtubeThumbnailImageObject');

    const youtubeSettings = {
      videoTitle: mainTitle && mainTitle.value.trim() ? mainTitle.value.trim() : "",
      videoDescription: mainCaption && mainCaption.value.trim() ? mainCaption.value.trim() : "",
      videoType: youtubeVideoType ? youtubeVideoType.value : 'video',
      videoPrivacyStatus: youtubePrivacyStatus ? youtubePrivacyStatus.value : 'public',
      videoThumbnailImageObject: null,
      videoThumbnailGroupUuid: null
    };

    // Add optional thumbnail settings
    if (youtubeThumbnailImageObject && youtubeThumbnailImageObject.value.trim()) {
      youtubeSettings.videoThumbnailImageObject = youtubeThumbnailImageObject.value.trim();
    }

    platformSettings.youtube_settings = youtubeSettings;
  }

  // TikTok Settings - Smart Integration
  if (selectedPlatforms.has('tiktok')) {
    // Use main post title as TikTok title
    const mainTitle = document.getElementById('postTitle');
    const tiktokPrivacyLevel = document.getElementById('tiktokPrivacyLevel');
    const tiktokDisableDuet = document.getElementById('tiktokDisableDuet');
    const tiktokDisableComment = document.getElementById('tiktokDisableComment');
    const tiktokDisableStitch = document.getElementById('tiktokDisableStitch');
    const tiktokAutoAddMusic = document.getElementById('tiktokAutoAddMusic');
    const tiktokVideoCoverTimestamp = document.getElementById('tiktokVideoCoverTimestamp');

    const tiktokSettings = {
      title: mainTitle && mainTitle.value.trim() ? mainTitle.value.trim() : "",
      privacyLevel: tiktokPrivacyLevel ? tiktokPrivacyLevel.value : 'PUBLIC_TO_EVERYONE',
      disableDuet: tiktokDisableDuet ? tiktokDisableDuet.checked : false,
      disableComment: tiktokDisableComment ? tiktokDisableComment.checked : false,
      disableStitch: tiktokDisableStitch ? tiktokDisableStitch.checked : false,
      videoCoverTimestampMs: tiktokVideoCoverTimestamp ? parseInt(tiktokVideoCoverTimestamp.value) || 0 : 0,
      videoThumbnailGroupUuid: null,
      autoAddMusic: tiktokAutoAddMusic ? tiktokAutoAddMusic.checked : true
    };

    platformSettings.tiktok_settings = tiktokSettings;
  }

  // WordPress Settings - Smart Integration
  if (selectedPlatforms.has('wordpress')) {
    // Use main post title and caption for WordPress
    const mainTitle = document.getElementById('postTitle');
    const mainCaption = document.getElementById('postCaption');
    const wordpressSlug = document.getElementById('wordpressSlug');
    const wordpressPostType = document.getElementById('wordpressPostType');
    const wordpressCategories = document.getElementById('wordpressCategories');
    const wordpressTags = document.getElementById('wordpressTags');
    const wordpressFeaturedImage = document.getElementById('wordpressFeaturedImage');
    const wordpressParentPage = document.getElementById('wordpressParentPage');

    const wordpressSettings = {
      postTitle: mainTitle && mainTitle.value.trim() ? mainTitle.value.trim() : "",
      postText: mainCaption && mainCaption.value.trim() ? mainCaption.value.trim() : "",
      postSlug: wordpressSlug && wordpressSlug.value.trim() ? wordpressSlug.value.trim() : "",
      postType: wordpressPostType ? wordpressPostType.value : 'POST',
      postCategories: wordpressCategories && wordpressCategories.value.trim() ? wordpressCategories.value.split(',').map(c => c.trim()) : [],
      postTags: wordpressTags && wordpressTags.value.trim() ? wordpressTags.value.split(',').map(t => t.trim()) : [],
      postFeaturedImage: null,
      postParentPage: wordpressParentPage ? parseInt(wordpressParentPage.value) || 0 : 0
    };

    // Add optional featured image
    if (wordpressFeaturedImage && wordpressFeaturedImage.value.trim()) {
      wordpressSettings.postFeaturedImage = wordpressFeaturedImage.value.trim();
    }

    platformSettings.wordpress_settings = wordpressSettings;
  }

  // Facebook Settings
  if (selectedPlatforms.has('facebook')) {
    const facebookPostType = document.getElementById('facebookPostType');
    platformSettings.facebook_settings = {
      postType: facebookPostType ? facebookPostType.value : 'POST'
    };
  }

  // Instagram Settings
  if (selectedPlatforms.has('instagram')) {
    const instagramPostType = document.getElementById('instagramPostType');
    platformSettings.instagram_settings = {
      postType: instagramPostType ? instagramPostType.value : 'POST'
    };
  }

  // Google My Business Settings
  if (selectedPlatforms.has('gmb')) {
    const gmbPostTopicType = document.getElementById('gmbPostTopicType');
    const gmbSettings = {
      postTopicType: gmbPostTopicType ? gmbPostTopicType.value : 'STANDARD'
    };

    // Add CTA button settings
    const gmbCtaButtonType = document.getElementById('gmbCtaButtonType');
    const gmbCtaUrl = document.getElementById('gmbCtaUrl');
    if (gmbCtaButtonType && gmbCtaButtonType.value !== 'ACTION_TYPE_UNSPECIFIED') {
      gmbSettings.ctaButtonActionType = gmbCtaButtonType.value;
      if (gmbCtaUrl && gmbCtaUrl.value.trim()) {
        gmbSettings.ctaUrl = gmbCtaUrl.value.trim();
      }
    }

    // Add offer-specific settings
    if (gmbPostTopicType && gmbPostTopicType.value === 'OFFER') {
      const gmbOfferTitle = document.getElementById('gmbOfferTitle');
      const gmbOfferCouponCode = document.getElementById('gmbOfferCouponCode');
      const gmbOfferRedeemUrl = document.getElementById('gmbOfferRedeemUrl');
      const gmbOfferTerms = document.getElementById('gmbOfferTerms');
      const gmbOfferStartDate = document.getElementById('gmbOfferStartDate');
      const gmbOfferEndDate = document.getElementById('gmbOfferEndDate');

      if (gmbOfferTitle && gmbOfferTitle.value.trim()) {
        gmbSettings.offerTitle = gmbOfferTitle.value.trim();
      }
      if (gmbOfferCouponCode && gmbOfferCouponCode.value.trim()) {
        gmbSettings.offerCouponCode = gmbOfferCouponCode.value.trim();
      }
      if (gmbOfferRedeemUrl && gmbOfferRedeemUrl.value.trim()) {
        gmbSettings.offerRedeemOnlineUrl = gmbOfferRedeemUrl.value.trim();
      }
      if (gmbOfferTerms && gmbOfferTerms.value.trim()) {
        gmbSettings.offerTermsConditions = gmbOfferTerms.value.trim();
      }
      if (gmbOfferStartDate && gmbOfferStartDate.value) {
        gmbSettings.offerStartDt = new Date(gmbOfferStartDate.value).toISOString();
      }
      if (gmbOfferEndDate && gmbOfferEndDate.value) {
        gmbSettings.offerEndDt = new Date(gmbOfferEndDate.value).toISOString();
      }
    }

    // Add event-specific settings
    if (gmbPostTopicType && gmbPostTopicType.value === 'EVENT') {
      const gmbEventTitle = document.getElementById('gmbEventTitle');
      const gmbEventStartDate = document.getElementById('gmbEventStartDate');
      const gmbEventEndDate = document.getElementById('gmbEventEndDate');

      if (gmbEventTitle && gmbEventTitle.value.trim()) {
        gmbSettings.eventTitle = gmbEventTitle.value.trim();
      }
      if (gmbEventStartDate && gmbEventStartDate.value) {
        gmbSettings.eventStartDt = new Date(gmbEventStartDate.value).toISOString();
      }
      if (gmbEventEndDate && gmbEventEndDate.value) {
        gmbSettings.eventEndDt = new Date(gmbEventEndDate.value).toISOString();
      }
    }

    platformSettings.gmb_settings = gmbSettings;
  }

  return platformSettings;
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
  const interval = document.getElementById('postInterval').value || 30;
  const intervalType = document.getElementById('intervalType').value || 'fixed';
  const options = document.getElementById('intervalOptions');

  if (!options) return;

  switch (intervalType) {
    case 'fixed':
      options.innerHTML = `Posts will be scheduled every <strong>${interval}</strong> minutes`;
      break;
    case 'random':
      const minInterval = Math.floor(interval * 0.5);
      const maxInterval = Math.floor(interval * 1.5);
      options.innerHTML = `Posts will be scheduled with random gaps between <strong>${minInterval}</strong> and <strong>${maxInterval}</strong> minutes`;
      break;
    case 'optimal':
      options.innerHTML = `Posts will be scheduled at optimal engagement times (approximately every <strong>${interval}</strong> minutes)`;
      break;
    default:
      options.innerHTML = `Posts will be scheduled every <strong>${interval}</strong> minutes`;
      break;
  }
}

function setQuickSchedule(preset) {
  console.log('setQuickSchedule called with preset:', preset);
  const now = new Date();
  let scheduleTime;

  // Check if it's a modified default preset
  const presetConfig = modifiedDefaultPresets[preset] || defaultPresets[preset];

  if (presetConfig) {
    scheduleTime = new Date(now);

    if (presetConfig.type === 'relative') {
      // Add relative time
      const minutes = (presetConfig.minutes || 0) + (presetConfig.hours || 0) * 60 + (presetConfig.days || 0) * 24 * 60;
      scheduleTime = new Date(now.getTime() + (minutes * 60000));

      // Handle special cases
      if (preset === 'weekend' || presetConfig.days === 'weekend') {
        scheduleTime = new Date(now);
        const daysUntilSaturday = (6 - scheduleTime.getDay()) % 7;
        scheduleTime.setDate(scheduleTime.getDate() + (daysUntilSaturday || 7));
        scheduleTime.setHours(presetConfig.hours || 10, presetConfig.minutes || 0, 0, 0);
      } else if (presetConfig.keepTime) {
        // Keep current time but add days
        scheduleTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
      }
    } else if (presetConfig.type === 'absolute') {
      // Set absolute time
      const [hours, minutes] = (presetConfig.time || '09:00').split(':').map(Number);
      scheduleTime.setHours(hours, minutes, 0, 0);

      // Handle day of week if specified
      if (presetConfig.dayOfWeek !== undefined) {
        const targetDay = presetConfig.dayOfWeek;
        const currentDay = scheduleTime.getDay();
        const daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0 && scheduleTime <= now) {
          scheduleTime.setDate(scheduleTime.getDate() + 7); // Next week
        } else {
          scheduleTime.setDate(scheduleTime.getDate() + daysToAdd);
        }
      }
    }
  } else {
    // Fallback to old logic for unknown presets
    switch (preset) {
      case 'now':
        scheduleTime = new Date(now.getTime() + (5 * 60000));
        break;
      case '1hour':
        scheduleTime = new Date(now.getTime() + (60 * 60000));
        break;
      case 'tomorrow':
        scheduleTime = new Date(now);
        scheduleTime.setDate(scheduleTime.getDate() + 1);
        scheduleTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
        break;
      case 'weekend':
        scheduleTime = new Date(now);
        const daysUntilSaturday = (6 - scheduleTime.getDay()) % 7;
        scheduleTime.setDate(scheduleTime.getDate() + (daysUntilSaturday || 7));
        scheduleTime.setHours(10, 0, 0, 0);
        break;
      default:
        return;
    }
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
  document.getElementById('downloadPostsBtn').addEventListener('click', downloadSelectedPosts);
  document.getElementById('filterTextOnlyBtn').addEventListener('click', toggleTextOnlyFilter);

  // CSV Import buttons
  document.getElementById('csvImportBtn').addEventListener('click', showCsvImport);
  document.getElementById('closeCsvImportBtn').addEventListener('click', hideCsvImport);
  document.getElementById('csvFileInput').addEventListener('change', handleCsvFileSelect);
  document.getElementById('confirmCsvImportBtn').addEventListener('click', confirmCsvImport);
  document.getElementById('cancelCsvImportBtn').addEventListener('click', hideCsvImport);

  // CSV Export button
  document.getElementById('csvExportBtn').addEventListener('click', exportToCsv);



  // Schedule buttons
  document.getElementById('scheduleBtn').addEventListener('click', schedulePosts);
  document.getElementById('publishNowBtn').addEventListener('click', publishNow);
  document.getElementById('uploadPcBtn').addEventListener('click', uploadFromPC);
  document.getElementById('testApiBtn').addEventListener('click', testRoboPostAPI);

  // Image Editor button
  document.getElementById('editImageBtn').addEventListener('click', openImageEditor);

  // AI Image Editor button
  document.getElementById('aiImageEditorBtn').addEventListener('click', openAIImageEditor);

  // Links editor
  document.getElementById('addLinkBtn').addEventListener('click', addLink);

  // Saved links functionality
  document.getElementById('useSavedLinkBtn').addEventListener('click', useSavedLink);
  document.getElementById('manageSavedLinksBtn').addEventListener('click', showSavedLinksDialog);
  document.getElementById('closeSavedLinksBtn').addEventListener('click', hideSavedLinksDialog);
  document.getElementById('addSavedLinkBtn').addEventListener('click', addSavedLink);

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

  // Save buttons for title and caption
  const saveTitleBtn = document.getElementById('saveTitleBtn');
  const saveCaptionBtn = document.getElementById('saveCaptionBtn');
  const postTitle = document.getElementById('postTitle');
  const postCaption = document.getElementById('postCaption');

  if (saveTitleBtn && saveCaptionBtn && postTitle && postCaption) {
    saveTitleBtn.addEventListener('click', saveTitleOverride);
    saveCaptionBtn.addEventListener('click', saveCaptionOverride);

    // Show save buttons when text changes
    postTitle.addEventListener('input', showSaveButtonIfNeeded);
    postCaption.addEventListener('input', showSaveButtonIfNeeded);

    // Track manual edits by user
    postTitle.addEventListener('input', () => { userEditedTitle = true; });
    postCaption.addEventListener('input', () => { userEditedCaption = true; });
  } else {
    console.error('❌ Save button elements not found during setup');
  }

  // Initialize platform settings
  updatePlatformSettings();
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
  document.getElementById('saveCustomPromptBtn').addEventListener('click', saveCustomPromptOnly);

  // Show/hide save button based on prompt name input
  const customPromptNameInput = document.getElementById('customPromptName');
  if (customPromptNameInput) {
    customPromptNameInput.addEventListener('input', toggleSaveButton);
    console.log('✅ Custom prompt name input listener added');
  } else {
    console.error('❌ Custom prompt name input not found');
  }

  // Edit prompt dialog listeners
  document.getElementById('closeEditPromptDialog').addEventListener('click', hideEditPromptDialog);
  document.getElementById('cancelEditPromptBtn').addEventListener('click', hideEditPromptDialog);
  document.getElementById('saveEditPromptBtn').addEventListener('click', saveEditedPrompt);

  // Queue mode listeners
  document.getElementById('stopQueueBtn').addEventListener('click', stopQueueRewrite);
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

// Save/Override functionality for title and caption
async function saveTitleOverride() {
  if (selectedPosts.size !== 1) {
    showMessage('❌ Please select exactly one post to save title override', 'error');
    return;
  }

  const postId = Array.from(selectedPosts)[0];
  const post = window.getPostById(postId);
  if (!post) {
    showMessage('❌ Post not found', 'error');
    return;
  }

  const titleInput = document.getElementById('postTitle');
  const newTitle = titleInput.value.trim();

  try {
    // Preserve original title if it doesn't exist yet
    if (!post.title && !post.titleOverridden) {
      // This is the first time user is setting a title, save it as the original title
      post.title = newTitle;
      console.log('Saved original title for post:', postId, 'Title:', newTitle);
    } else {
      // Save as override since original title already exists
      post.overriddenTitle = newTitle;
      post.titleOverridden = true;
      post.titleOverriddenAt = new Date().toISOString();
      console.log('Saved title override for post:', postId, 'New title:', newTitle);
    }

    // Save to storage
    await savePostData();

    // Visual feedback
    const saveBtn = document.getElementById('saveTitleBtn');
    saveBtn.textContent = '✅ Saved';
    saveBtn.classList.add('saved');

    // Update visual indicators
    updateOverrideIndicators(post);

    setTimeout(() => {
      saveBtn.textContent = '💾 Save';
      saveBtn.classList.remove('saved');
      saveBtn.style.display = 'none';
    }, 2000);

    showMessage('✅ Title override saved successfully!', 'success');
    console.log('Title override saved for post:', postId, 'New title:', newTitle);

  } catch (error) {
    console.error('Failed to save title override:', error);
    showMessage('❌ Failed to save title override', 'error');
  }
}

async function saveCaptionOverride() {
  if (selectedPosts.size !== 1) {
    showMessage('❌ Please select exactly one post to save caption override', 'error');
    return;
  }

  const postId = Array.from(selectedPosts)[0];
  const post = window.getPostById(postId);
  if (!post) {
    showMessage('❌ Post not found', 'error');
    return;
  }

  const captionTextarea = document.getElementById('postCaption');
  const newCaption = captionTextarea.value.trim();

  try {
    // Save the overridden caption
    post.overriddenCaption = newCaption;
    post.captionOverridden = true;
    post.captionOverriddenAt = new Date().toISOString();

    // Save to storage
    await savePostData();

    // Visual feedback
    const saveBtn = document.getElementById('saveCaptionBtn');
    saveBtn.textContent = '✅ Saved';
    saveBtn.classList.add('saved');

    // Update visual indicators
    updateOverrideIndicators(post);

    setTimeout(() => {
      saveBtn.textContent = '💾 Save';
      saveBtn.classList.remove('saved');
      saveBtn.style.display = 'none';
    }, 2000);

    showMessage('✅ Caption override saved successfully!', 'success');
    console.log('Caption override saved for post:', postId, 'New caption:', newCaption);

  } catch (error) {
    console.error('Failed to save caption override:', error);
    showMessage('❌ Failed to save caption override', 'error');
  }
}

function showSaveButtonIfNeeded() {
  if (selectedPosts.size !== 1) return;

  const postId = Array.from(selectedPosts)[0];
  const post = window.getPostById(postId);
  if (!post) return;

  const titleInput = document.getElementById('postTitle');
  const captionTextarea = document.getElementById('postCaption');
  const saveTitleBtn = document.getElementById('saveTitleBtn');
  const saveCaptionBtn = document.getElementById('saveCaptionBtn');

  if (!titleInput || !captionTextarea || !saveTitleBtn || !saveCaptionBtn) {
    console.error('❌ Save button elements not found');
    return;
  }

  // Get the current values that should be displayed (original or overridden)
  // Note: Title defaults to caption value (original behavior)
  const currentTitle = post.titleOverridden ? post.overriddenTitle : post.caption;
  const currentCaption = post.captionOverridden ? post.overriddenCaption : post.caption;

  // Show save button if the input value differs from the current saved value
  const titleChanged = titleInput.value.trim() !== (currentTitle || '').trim();
  const captionChanged = captionTextarea.value.trim() !== (currentCaption || '').trim();

  console.log('🔍 Checking changes:', {
    titleInput: `"${titleInput.value.trim()}"`,
    currentTitle: `"${(currentTitle || '').trim()}"`,
    titleChanged: titleChanged,
    captionInput: `"${captionTextarea.value.trim()}"`,
    currentCaption: `"${(currentCaption || '').trim()}"`,
    captionChanged: captionChanged
  });

  if (titleChanged) {
    saveTitleBtn.style.display = 'inline-block';
    // Add subtle pulse animation to draw attention
    saveTitleBtn.style.animation = 'pulse 0.5s ease-in-out';
    setTimeout(() => {
      saveTitleBtn.style.animation = '';
    }, 500);
    console.log('✅ Showing title save button');
  } else {
    saveTitleBtn.style.display = 'none';
  }

  if (captionChanged) {
    saveCaptionBtn.style.display = 'inline-block';
    // Add subtle pulse animation to draw attention
    saveCaptionBtn.style.animation = 'pulse 0.5s ease-in-out';
    setTimeout(() => {
      saveCaptionBtn.style.animation = '';
    }, 500);
    console.log('✅ Showing caption save button');
  } else {
    saveCaptionBtn.style.display = 'none';
  }
}

function updateOverrideIndicators(post) {
  const titleInput = document.getElementById('postTitle');
  const captionTextarea = document.getElementById('postCaption');

  // Find the correct labels by looking for the ones that contain the text
  const allLabels = document.querySelectorAll('.form-label');
  let actualTitleLabel = null;
  let actualCaptionLabel = null;

  allLabels.forEach(label => {
    if (label.textContent.includes('Post Title')) {
      actualTitleLabel = label;
    } else if (label.textContent.includes('Caption')) {
      actualCaptionLabel = label;
    }
  });

  // Update title indicators
  if (post.titleOverridden) {
    titleInput.classList.add('overridden');
    if (actualTitleLabel) actualTitleLabel.classList.add('has-override');
  } else {
    titleInput.classList.remove('overridden');
    if (actualTitleLabel) actualTitleLabel.classList.remove('has-override');
  }

  // Update caption indicators
  if (post.captionOverridden) {
    captionTextarea.classList.add('overridden');
    if (actualCaptionLabel) actualCaptionLabel.classList.add('has-override');
  } else {
    captionTextarea.classList.remove('overridden');
    if (actualCaptionLabel) actualCaptionLabel.classList.remove('has-override');
  }
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

async function downloadSelectedPosts() {
  if (selectedPosts.size === 0) {
    showMessage('❌ No posts selected for download', 'error');
    return;
  }

  const postsToDownload = Array.from(selectedPosts).map(postId => window.getPostById(postId));
  const mediaPostsToDownload = postsToDownload.filter(post => post && (post.imageUrl || post.videoUrl));

  if (mediaPostsToDownload.length === 0) {
    showMessage('❌ No media posts selected for download', 'error');
    return;
  }

  showMessage(`🔄 Starting download of ${mediaPostsToDownload.length} media file(s)...`, 'info');

  let downloadedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < mediaPostsToDownload.length; i++) {
    const post = mediaPostsToDownload[i];

    // Get the correct download URL based on post type
    let downloadUrl = null;
    let urlType = 'unknown';

    // 1. For PC uploads - use RoboPost storage URL
    if (post.storageId) {
      downloadUrl = `https://api.robopost.app/stored_objects/${post.storageId}/download`;
      urlType = 'RoboPost Storage (Original Quality)';
    }
    // 2. For AI images - use original data URL
    else if (post.originalDataUrl) {
      downloadUrl = post.originalDataUrl;
      urlType = 'AI Generated (Original Quality)';
    }
    // 3. For social media posts - use original URL
    else if (post.originalUrl) {
      downloadUrl = post.originalUrl;
      urlType = 'Social Media (Original Quality)';
    }
    // 4. For videos
    else if (post.videoUrl) {
      downloadUrl = post.videoUrl;
      urlType = 'Video URL';
    }
    // 5. Fallback to image URL (likely thumbnail)
    else if (post.imageUrl) {
      downloadUrl = post.imageUrl;
      urlType = 'Image URL (May be thumbnail)';
    }

    if (!downloadUrl) {
      console.warn(`No download URL found for post ${post.id}`);
      failedCount++;
      continue;
    }

    try {
      // Create a simple filename
      const timestamp = new Date(post.timestamp || Date.now()).toISOString().split('T')[0];
      const postTitle = (post.title || 'post').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
      const isVideo = !!post.videoUrl;
      const extension = isVideo ? 'mp4' : 'jpg';
      const filename = `${timestamp}_${postTitle}.${extension}`;

      console.log(`📥 Downloading post ${i + 1}/${mediaPostsToDownload.length}: ${filename}`);
      console.log(`📥 Source: ${urlType}`);
      console.log(`📥 URL: ${downloadUrl}`);

      // Simple download - just create a link and click it
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      downloadedCount++;

      // Small delay between downloads
      if (i < mediaPostsToDownload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to download media for post ${post.id}:`, error);
      failedCount++;
    }
  }

  if (downloadedCount > 0) {
    showMessage(`✅ Started download of ${downloadedCount} media file(s)${failedCount > 0 ? ` (${failedCount} failed)` : ''}`, 'success');
  } else {
    showMessage(`❌ Failed to download any media files`, 'error');
  }
}



function addLink() {
  const linksEditor = document.getElementById('linksEditor');
  const linkId = Date.now();

  const linkHtml = `
    <div class="link-item" data-link-id="${linkId}" style="display: flex; gap: 5px; margin-bottom: 8px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f7fafc;">
      <div style="flex: 1;">
        <input type="url" placeholder="Enter URL" class="form-input link-url" style="margin-bottom: 5px;" data-link-id="${linkId}">
        <input type="text" placeholder="Link text (optional)" class="form-input link-text">
        <div class="link-preview" style="margin-top: 5px; font-size: 11px; color: #718096;"></div>
      </div>
      <button class="btn btn-secondary remove-link-btn" data-link-id="${linkId}" style="padding: 8px; height: fit-content;">❌</button>
    </div>
  `;

  linksEditor.insertAdjacentHTML('beforeend', linkHtml);

  // Add event listeners for the new link
  const urlInput = linksEditor.querySelector(`[data-link-id="${linkId}"].link-url`);
  const removeBtn = linksEditor.querySelector(`[data-link-id="${linkId}"].remove-link-btn`);

  if (urlInput) {
    urlInput.addEventListener('change', () => updateLinkPreview(linkId));
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => removeLink(linkId));
  }
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

// Saved Links Management
let savedLinks = [];

async function loadSavedLinks() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['savedLinks'], (result) => {
      savedLinks = result.savedLinks || [];
      updateSavedLinksDropdown();
      resolve();
    });
  });
}

function updateSavedLinksDropdown() {
  const dropdown = document.getElementById('savedLinksDropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '<option value="">Select a saved link...</option>';

  savedLinks.forEach((link, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${link.label} (${link.url})`;
    dropdown.appendChild(option);
  });
}

function useSavedLink() {
  const dropdown = document.getElementById('savedLinksDropdown');
  const selectedIndex = dropdown.value;

  if (selectedIndex === '') return;

  const selectedLink = savedLinks[selectedIndex];
  if (selectedLink) {
    // Add the saved link to the current links editor
    addLinkFromSaved(selectedLink.url, selectedLink.label);
  }
}

function addLinkFromSaved(url, label) {
  const linksEditor = document.getElementById('linksEditor');
  const linkId = Date.now();

  const linkHtml = `
    <div class="link-item" data-link-id="${linkId}" style="display: flex; gap: 5px; margin-bottom: 8px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f7fafc;">
      <div style="flex: 1;">
        <input type="url" placeholder="Enter URL" class="form-input link-url" style="margin-bottom: 5px;" data-link-id="${linkId}" value="${url}">
        <input type="text" placeholder="Link text (optional)" class="form-input link-text" value="${label}">
        <div class="link-preview" style="margin-top: 5px; font-size: 11px; color: #718096;"></div>
      </div>
      <button class="btn btn-secondary remove-link-btn" data-link-id="${linkId}" style="padding: 8px; height: fit-content;">❌</button>
    </div>
  `;

  linksEditor.insertAdjacentHTML('beforeend', linkHtml);

  // Add event listeners for the new link
  const urlInput = linksEditor.querySelector(`[data-link-id="${linkId}"].link-url`);
  const removeBtn = linksEditor.querySelector(`[data-link-id="${linkId}"].remove-link-btn`);

  if (urlInput) {
    urlInput.addEventListener('change', () => updateLinkPreview(linkId));
    // Trigger preview update immediately
    updateLinkPreview(linkId);
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => removeLink(linkId));
  }
}

function showSavedLinksDialog() {
  updateSavedLinksList();
  const dialog = document.getElementById('savedLinksDialog');
  dialog.style.display = 'flex';

  // Add click-outside-to-close functionality
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      hideSavedLinksDialog();
    }
  });

  // Add keyboard support (Escape to close)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      hideSavedLinksDialog();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}

function hideSavedLinksDialog() {
  document.getElementById('savedLinksDialog').style.display = 'none';

  // Clear the input fields when closing
  document.getElementById('newLinkLabel').value = '';
  document.getElementById('newLinkUrl').value = '';
}

function updateSavedLinksList() {
  const list = document.getElementById('savedLinksList');
  if (!list) return;

  if (savedLinks.length === 0) {
    list.innerHTML = '<div style="text-align: center; color: #718096; padding: 20px;">No saved links yet</div>';
    return;
  }

  list.innerHTML = '';

  savedLinks.forEach((link, index) => {
    const linkItem = document.createElement('div');
    linkItem.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 5px; background: white;';

    linkItem.innerHTML = `
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #4a5568;">${link.label}</div>
        <div style="font-size: 11px; color: #718096; word-break: break-all;">${link.url}</div>
      </div>
      <button class="btn btn-danger delete-saved-link-btn" data-index="${index}" style="padding: 4px 8px; font-size: 11px;">Delete</button>
    `;

    list.appendChild(linkItem);
  });

  // Add event listeners for delete buttons
  list.querySelectorAll('.delete-saved-link-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deleteSavedLink(index);
    });
  });
}

function addSavedLink() {
  const labelInput = document.getElementById('newLinkLabel');
  const urlInput = document.getElementById('newLinkUrl');

  const label = labelInput.value.trim();
  const url = urlInput.value.trim();

  if (!label || !url) {
    alert('Please enter both label and URL');
    return;
  }

  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    alert('Please enter a valid URL');
    return;
  }

  // Add to saved links
  savedLinks.push({ label, url });

  // Save to storage
  chrome.storage.local.set({ savedLinks }, () => {
    console.log('Saved link added:', { label, url });

    // Clear inputs
    labelInput.value = '';
    urlInput.value = '';

    // Update UI
    updateSavedLinksDropdown();
    updateSavedLinksList();
  });
}

function deleteSavedLink(index) {
  if (confirm('Delete this saved link?')) {
    savedLinks.splice(index, 1);

    // Save to storage
    chrome.storage.local.set({ savedLinks }, () => {
      console.log('Saved link deleted at index:', index);

      // Update UI
      updateSavedLinksDropdown();
      updateSavedLinksList();
    });
  }
}

function getFirstLinkUrl() {
  // Get the first link URL from the links editor for Pinterest destination link
  const firstLinkInput = document.querySelector('#linksEditor .link-url');

  if (firstLinkInput && firstLinkInput.value.trim()) {
    return firstLinkInput.value.trim();
  }
  return "";
}

function showError(message) {
  // Simple error display - in a full implementation, you'd have a proper notification system
  alert(`Error: ${message}`);
}

// Generate video thumbnail from first frame
async function generateVideoThumbnail(videoFile) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      // Set canvas size to video dimensions (or max 400px width)
      const maxWidth = 400;
      const aspectRatio = video.videoHeight / video.videoWidth;
      canvas.width = Math.min(video.videoWidth, maxWidth);
      canvas.height = canvas.width * aspectRatio;

      // Seek to 1 second or 10% of video duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Clean up
        video.src = '';
        URL.revokeObjectURL(video.src);

        resolve(thumbnailDataUrl);
      } catch (error) {
        console.error('Error generating video thumbnail:', error);
        reject(error);
      }
    };

    video.onerror = (error) => {
      console.error('Video loading error:', error);
      reject(new Error('Failed to load video for thumbnail generation'));
    };

    // Load video file
    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
}

// Global variables for multiple file upload
let isUploadingMultipleFiles = false;
let uploadQueue = [];
let currentUploadIndex = 0;

async function uploadFromPC() {
  console.log('📁 Opening file picker for PC upload...');

  // Create file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';
  fileInput.multiple = true; // Allow multiple files

  fileInput.onchange = async function(event) {
    const files = Array.from(event.target.files);
    if (!files || files.length === 0) return;

    console.log(`📁 Selected ${files.length} file(s) for upload`);

    // Set up multiple file upload
    isUploadingMultipleFiles = true;
    uploadQueue = files;
    currentUploadIndex = 0;

    // Add beforeunload listener to warn about refresh during upload
    const beforeUnloadHandler = (e) => {
      if (isUploadingMultipleFiles) {
        e.preventDefault();
        e.returnValue = 'Files are still uploading. Are you sure you want to refresh?';
        return 'Files are still uploading. Are you sure you want to refresh?';
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Start uploading files one by one
    try {
      await uploadFilesSequentially();
    } finally {
      // Clean up
      isUploadingMultipleFiles = false;
      uploadQueue = [];
      currentUploadIndex = 0;
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
  };

  // Trigger file picker
  fileInput.click();
}

async function uploadFilesSequentially() {
  const totalFiles = uploadQueue.length;

  for (let i = 0; i < totalFiles; i++) {
    currentUploadIndex = i;
    const file = uploadQueue[i];

    console.log(`📁 Processing file ${i + 1}/${totalFiles}: ${file.name}`);

    // Update button text to show progress
    const button = document.getElementById('uploadPcBtn');
    if (button) {
      button.textContent = `🔄 Uploading ${i + 1}/${totalFiles}...`;
      button.disabled = true;
    }

    try {
      await uploadSingleFile(file, i + 1, totalFiles);

      // Force refresh the library after each successful upload
      console.log(`✅ File ${i + 1}/${totalFiles} uploaded, refreshing library...`);

      // Reload categories and posts
      loadCategoryTabs();
      loadPosts();
      updateStats();

      // Show individual file success message
      showMessage(`✅ File ${i + 1}/${totalFiles} "${file.name}" uploaded and added to library!`, 'success');

      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Failed to upload file ${i + 1}/${totalFiles}:`, error);
      showError(`Failed to upload file "${file.name}": ${error.message}`);
      // Continue with next file even if one fails
    }
  }

  // Reset button state
  const button = document.getElementById('uploadPcBtn');
  if (button) {
    button.textContent = '📁 Upload from PC';
    button.disabled = false;
  }

  // Show final completion message
  showMessage(`🎉 All done! Uploaded ${totalFiles} file(s) to library!`, 'success');
}

async function uploadSingleFile(file, fileNumber, totalFiles) {
  console.log(`📁 Uploading file ${fileNumber}/${totalFiles}:`, file.name, file.size, 'bytes');

  // Validate file size (50MB limit like Python)
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File is too large (>50MB). Please use a smaller file.');
  }

  if (file.size === 0) {
    throw new Error('File is empty (0 bytes)');
  }

  // Upload to RoboPost media
  console.log(`📤 Uploading file ${fileNumber}/${totalFiles} to RoboPost...`);
  const storageId = await window.roboPostAPI.uploadMedia(file);
  console.log(`✅ File ${fileNumber}/${totalFiles} uploaded, storage_id:`, storageId);

  // Extract filename without extension for title/caption
  const fileName = file.name.replace(/\.[^/.]+$/, "");

  // Generate small preview for storage (compress images to avoid quota issues)
  let previewUrl;
  if (file.type.startsWith('video/')) {
    // Generate video thumbnail for preview
    previewUrl = await generateVideoThumbnail(file);
  } else {
    // For images, create a compressed preview to save storage space
    previewUrl = await createCompressedPreview(file);
  }

  // Get image dimensions if it's an image
  let dimensions = null;
  if (!file.type.startsWith('video/')) {
    try {
      dimensions = await getImageDimensions(previewUrl);
    } catch (error) {
      console.warn('Failed to get image dimensions:', error);
    }
  }

  // Create post object - always save to "My PC" category
  const pcCategory = 'My PC';
  const postId = Date.now().toString() + '_' + fileNumber; // Make unique for multiple files
  const newPost = {
    id: postId,
    title: fileName,
    caption: fileName,
    imageUrl: previewUrl, // Compressed preview
    storageId: storageId, // This is what we use for actual posting
    category: pcCategory,
    timestamp: Date.now(),
    source: 'pc_upload',
    filename: file.name,
    fileType: file.type, // Store original file type for scheduling
    fileSize: file.size, // Store file size
    dimensions: dimensions, // Store image dimensions
    isVideo: file.type.startsWith('video/') // Helper flag for easy checking
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

  // Save to storage with quota management and update counters
  try {
    await savePostData();
  } catch (error) {
    if (error.message.includes('quota')) {
      console.warn('⚠️ Storage quota exceeded, using minimal storage approach');
      // Create minimal post object without large data
      const minimalPost = {
        id: postId,
        title: fileName,
        caption: fileName,
        storageId: storageId, // This is what matters for posting
        category: pcCategory,
        timestamp: Date.now(),
        source: 'pc_upload',
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        isVideo: file.type.startsWith('video/')
      };

      // Replace the post with minimal version
      savedItems[pcCategory][savedItems[pcCategory].length - 1] = minimalPost;

      // Try saving again with minimal data and update counters
      await savePostData();
    } else {
      throw error;
    }
  }

  console.log(`✅ File ${fileNumber}/${totalFiles} "${file.name}" processed and saved to library`);
}

// Helper function to create compressed preview
async function createCompressedPreview(file) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate dimensions for preview (max 200px width/height)
      const maxSize = 200;
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality
    };

    img.onerror = reject;

    const reader = new FileReader();
    reader.onload = () => img.src = reader.result;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
      const posts = Array.from(selectedPosts).map(postId => window.getPostById(postId));
      // Use high-quality images: storageId (PC uploads), originalUrl (social media), or imageUrl (fallback)
      const imageUrls = posts.map(post => {
        if (post.storageId) {
          // For PC uploads, use RoboPost storage URL for original quality
          return `https://api.robopost.app/stored_objects/${post.storageId}/download`;
        } else if (post.originalUrl) {
          // For social media captures, use original URL
          return post.originalUrl;
        } else {
          // Fallback to compressed preview (should be rare)
          console.warn('⚠️ Using compressed preview for album post:', post.id);
          return post.imageUrl;
        }
      });

      // DEBUG: Get platform settings and log them
      const platformSettings = getPlatformSpecificSettings();
      console.log('🔍 DEBUG: Publish now platform settings generated:', JSON.stringify(platformSettings, null, 2));

      const publishOptions = {
        imageUrls: imageUrls,
        caption: caption,
        channelIds: selectedChannels,
        scheduleAt: publishTime,
        title: title,
        platformSettings: platformSettings // Explicitly pass as platformSettings
      };

      console.log('🔍 DEBUG: Complete publish options:', JSON.stringify(publishOptions, null, 2));

      await window.roboPostAPI.scheduleAlbumFromCapture(publishOptions);

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
  const posts = Array.from(selectedPosts).map(postId => window.getPostById(postId));
  // Use high-quality images: storageId (PC uploads), originalUrl (social media), or imageUrl (fallback)
  const imageUrls = posts.map(post => {
    if (post.storageId) {
      // For PC uploads, use RoboPost storage URL for original quality
      return `https://api.robopost.app/stored_objects/${post.storageId}/download`;
    } else if (post.originalUrl) {
      // For social media captures, use original URL
      return post.originalUrl;
    } else {
      // Fallback to compressed preview (should be rare)
      console.warn('⚠️ Using compressed preview for album post:', post.id);
      return post.imageUrl;
    }
  });

  try {
    // DEBUG: Get platform settings and log them
    const platformSettings = getPlatformSpecificSettings();
    console.log('🔍 DEBUG: Album platform settings generated:', JSON.stringify(platformSettings, null, 2));

    const albumOptions = {
      imageUrls: imageUrls,
      caption: caption,
      channelIds: channels,
      scheduleAt: new Date(scheduleDateTime).toISOString(),
      title: title,
      platformSettings: platformSettings // Explicitly pass as platformSettings
    };

    console.log('🔍 DEBUG: Complete album options:', JSON.stringify(albumOptions, null, 2));

    const result = await window.roboPostAPI.scheduleAlbumFromCapture(albumOptions);

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
  const posts = Array.from(selectedPosts).map(postId => window.getPostById(postId));

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
      const platformSettings = getPlatformSpecificSettings();

      // Determine title and caption for this specific post
      // If user manually edited the form fields, use those for all posts
      // Otherwise, use each post's individual title/caption (with overrides)
      let finalTitle, finalCaption;

      if (userEditedTitle && title && title.trim()) {
        // User manually edited the title field - use for all posts
        finalTitle = title.trim();
      } else {
        // Use individual post's title (with override if exists)
        // Priority: overridden title > original title > caption as fallback
        finalTitle = post.titleOverridden ? post.overriddenTitle : (post.title || post.caption);
      }

      if (userEditedCaption && caption && caption.trim()) {
        // User manually edited the caption field - use for all posts
        finalCaption = caption.trim();
      } else {
        // Use individual post's caption (with override if exists)
        finalCaption = post.captionOverridden ? post.overriddenCaption : post.caption;
      }

      console.log(`📝 Post ${i + 1} scheduling details:`, {
        postId: post.id,
        formTitle: title,
        formCaption: caption,
        userEditedTitle: userEditedTitle,
        userEditedCaption: userEditedCaption,
        finalTitle: finalTitle,
        finalCaption: finalCaption,
        postOriginalCaption: post.caption,
        postTitleOverridden: post.titleOverridden,
        postCaptionOverridden: post.captionOverridden
      });

      const scheduleOptions = {
        caption: finalCaption,
        channelIds: channels,
        scheduleAt: scheduleTime.toISOString(),
        title: finalTitle,
        isTextOnly: post.isTextOnly || false,
        platformSettings: platformSettings
      };

      // Set image source - prioritize high-quality options
      if (!post.isTextOnly) {
        if (post.storageId) {
          // Use storageId for original quality (PC uploads, AI images)
          scheduleOptions.storageId = post.storageId;
          scheduleOptions.isVideo = post.isVideo;
          console.log(`📸 Using original quality via storage_id for post ${i + 1}:`, post.storageId);
        } else if (post.originalUrl) {
          // Use original URL for social media captures
          scheduleOptions.imageUrl = post.originalUrl;
          console.log(`📸 Using original URL for post ${i + 1}:`, post.originalUrl);
        } else {
          // Fallback to compressed preview
          scheduleOptions.imageUrl = post.imageUrl;
          console.warn(`⚠️ Using compressed preview for post ${i + 1}:`, post.imageUrl);
        }
      }

      // Handle AI images that need uploading during scheduling
      if (post.needsUpload && post.file) {
        // AI generated image that needs uploading now
        console.log(`📤 Uploading AI generated image for post ${i + 1} during scheduling...`);
        try {
          const uploadedStorageId = await window.roboPostAPI.uploadMedia(post.file);
          scheduleOptions.storageId = uploadedStorageId;
          scheduleOptions.isVideo = post.isVideo || false;

          // Update the post with the new storageId
          post.storageId = uploadedStorageId;
          post.needsUpload = false;

          console.log(`✅ AI image uploaded during scheduling, storage_id: ${uploadedStorageId}`);
        } catch (uploadError) {
          console.warn(`⚠️ Failed to upload AI image for post ${i + 1}:`, uploadError);
          if (uploadError.message && uploadError.message.includes('quota')) {
            console.log(`💾 Quota exceeded for post ${i + 1}, using image URL fallback`);
            // Use imageUrl as fallback (RoboPost can sometimes handle data URLs)
            scheduleOptions.imageUrl = post.imageUrl;
          } else {
            throw uploadError; // Re-throw other errors
          }
        }
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

  // Save updated post data (with new storageIds from uploads)
  await savePostData();
  console.log('✅ Post data saved with updated storage IDs');
}

// Test AI Post Robot API function
async function testRoboPostAPI() {
  // Set loading state
  setButtonLoading('testApiBtn', true);

  try {
    showMessage('Testing AI Post Robot API...', 'info');

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

function clearTestMessage() {
  const messageEl = document.getElementById('testMessage');
  if (messageEl && messageEl.parentNode) {
    messageEl.parentNode.removeChild(messageEl);
  }
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
      'testApiBtn': '🔄 Testing API...',
      'uploadPcBtn': '🔄 Uploading...'
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

// Default Presets functionality
let defaultPresets = {
  now: { name: 'Now', icon: '⚡', type: 'relative', minutes: 5 },
  '1hour': { name: '+1 Hour', icon: '🕐', type: 'relative', hours: 1 },
  tomorrow: { name: 'Tomorrow', icon: '🌅', type: 'relative', days: 1, keepTime: true },
  weekend: { name: 'Weekend', icon: '🎉', type: 'relative', days: 'weekend', hours: 10 }
};

let modifiedDefaultPresets = {};

async function loadCustomPresets() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['customPresets', 'modifiedDefaultPresets'], resolve);
    });
    customPresets = result.customPresets || [];
    modifiedDefaultPresets = result.modifiedDefaultPresets || {};
    renderCustomPresets();
  } catch (error) {
    console.error('Failed to load custom presets:', error);
  }
}

async function saveModifiedDefaultPresets() {
  try {
    await new Promise(resolve => {
      chrome.storage.local.set({ modifiedDefaultPresets }, resolve);
    });
  } catch (error) {
    console.error('Failed to save modified default presets:', error);
  }
}

function renderCustomPresets() {
  const container = document.getElementById('quickPresetButtons');

  // Clear all existing buttons
  container.innerHTML = '';

  // Add default presets with edit functionality
  Object.keys(defaultPresets).forEach(presetKey => {
    const preset = modifiedDefaultPresets[presetKey] || defaultPresets[presetKey];

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.dataset.preset = presetKey;
    button.style.position = 'relative';
    button.style.marginRight = '5px';
    button.innerHTML = `${preset.icon} ${preset.name}`;

    // Add edit button for default presets
    const editBtn = document.createElement('span');
    editBtn.innerHTML = '✏️';
    editBtn.style.cssText = `
      position: absolute;
      top: -6px;
      right: -6px;
      background: #4299e1;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      font-size: 9px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 100;
      border: 1px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      line-height: 1;
    `;

    // Show/hide edit button on hover
    button.addEventListener('mouseenter', () => {
      editBtn.style.display = 'flex';
    });
    button.addEventListener('mouseleave', () => {
      editBtn.style.display = 'none';
    });

    // Handle edit
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditDefaultPresetDialog(presetKey, preset);
    });

    button.appendChild(editBtn);
    container.appendChild(button);
  });

  // Add custom presets
  customPresets.forEach((preset, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.dataset.preset = `custom_${index}`;
    button.dataset.custom = 'true';
    button.style.position = 'relative';
    button.style.marginRight = '5px';
    button.innerHTML = `${preset.icon || '⏰'} ${preset.name}`;

    // Add edit button for custom presets
    const editBtn = document.createElement('span');
    editBtn.innerHTML = '✏️';
    editBtn.style.cssText = `
      position: absolute;
      top: -6px;
      right: 8px;
      background: #4299e1;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      font-size: 9px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 100;
      border: 1px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      line-height: 1;
    `;

    // Add delete button for custom presets
    const deleteBtn = document.createElement('span');
    deleteBtn.innerHTML = '✖';
    deleteBtn.style.cssText = `
      position: absolute;
      top: -6px;
      right: -6px;
      background: #e53e3e;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      font-size: 9px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 100;
      border: 1px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      line-height: 1;
    `;

    // Show/hide buttons on hover
    button.addEventListener('mouseenter', () => {
      editBtn.style.display = 'flex';
      deleteBtn.style.display = 'flex';
    });
    button.addEventListener('mouseleave', () => {
      editBtn.style.display = 'none';
      deleteBtn.style.display = 'none';
    });

    // Handle edit
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditCustomPresetDialog(index, preset);
    });

    // Handle delete
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCustomPreset(index);
    });

    button.appendChild(editBtn);
    button.appendChild(deleteBtn);
    container.appendChild(button);
  });
}

function showEditDefaultPresetDialog(presetKey, preset) {
  // Create or show the edit dialog
  let dialog = document.getElementById('editDefaultPresetDialog');

  if (!dialog) {
    // Create the dialog if it doesn't exist
    dialog = document.createElement('div');
    dialog.id = 'editDefaultPresetDialog';
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3>✏️ Edit Default Preset</h3>
          <button class="btn btn-secondary" id="closeEditDefaultPresetDialog">✖️ Close</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Preset Name</label>
            <input type="text" class="form-input" id="editDefaultPresetName" placeholder="Enter preset name">
          </div>
          <div class="form-group">
            <label class="form-label">Icon (emoji)</label>
            <input type="text" class="form-input" id="editDefaultPresetIcon" placeholder="Enter emoji icon">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-input" id="editDefaultPresetType">
              <option value="relative">Relative Time</option>
              <option value="absolute">Absolute Time</option>
            </select>
          </div>
          <div id="editDefaultPresetOptions">
            <!-- Options will be populated based on type -->
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="saveEditedDefaultPresetBtn">💾 Save Changes</button>
          <button class="btn btn-warning" id="resetDefaultPresetBtn">🔄 Reset to Default</button>
          <button class="btn btn-secondary" id="cancelEditDefaultPresetBtn">❌ Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // Add event listeners
    document.getElementById('closeEditDefaultPresetDialog').addEventListener('click', hideEditDefaultPresetDialog);
    document.getElementById('cancelEditDefaultPresetBtn').addEventListener('click', hideEditDefaultPresetDialog);
    document.getElementById('saveEditedDefaultPresetBtn').addEventListener('click', saveEditedDefaultPreset);
    document.getElementById('resetDefaultPresetBtn').addEventListener('click', resetDefaultPreset);
    document.getElementById('editDefaultPresetType').addEventListener('change', updateEditDefaultPresetOptions);
  }

  // Populate the dialog with current preset data
  document.getElementById('editDefaultPresetName').value = preset.name;
  document.getElementById('editDefaultPresetIcon').value = preset.icon;
  document.getElementById('editDefaultPresetType').value = preset.type || 'relative';

  // Store the preset key for updating
  dialog.dataset.presetKey = presetKey;

  // Update options based on type
  updateEditDefaultPresetOptions();
  populateEditDefaultPresetOptions(preset);

  // Show the dialog
  dialog.style.display = 'flex';
}

function hideEditDefaultPresetDialog() {
  const dialog = document.getElementById('editDefaultPresetDialog');
  if (dialog) {
    dialog.style.display = 'none';
  }
}

function updateEditDefaultPresetOptions() {
  const type = document.getElementById('editDefaultPresetType').value;
  const optionsContainer = document.getElementById('editDefaultPresetOptions');

  if (type === 'relative') {
    optionsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label">Minutes</label>
        <input type="number" class="form-input" id="editDefaultPresetMinutes" min="0" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Hours</label>
        <input type="number" class="form-input" id="editDefaultPresetHours" min="0" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Days</label>
        <input type="number" class="form-input" id="editDefaultPresetDays" min="0" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">
          <input type="checkbox" id="editDefaultPresetKeepTime"> Keep current time
        </label>
      </div>
    `;
  } else {
    optionsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label">Time</label>
        <input type="time" class="form-input" id="editDefaultPresetTime">
      </div>
      <div class="form-group">
        <label class="form-label">Day of Week (optional)</label>
        <select class="form-input" id="editDefaultPresetDayOfWeek">
          <option value="">Any day</option>
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
        </select>
      </div>
    `;
  }
}

function populateEditDefaultPresetOptions(preset) {
  const type = document.getElementById('editDefaultPresetType').value;

  if (type === 'relative') {
    document.getElementById('editDefaultPresetMinutes').value = preset.minutes || 0;
    document.getElementById('editDefaultPresetHours').value = preset.hours || 0;
    document.getElementById('editDefaultPresetDays').value = preset.days === 'weekend' ? 0 : (preset.days || 0);
    document.getElementById('editDefaultPresetKeepTime').checked = preset.keepTime || false;
  } else {
    document.getElementById('editDefaultPresetTime').value = preset.time || '09:00';
    document.getElementById('editDefaultPresetDayOfWeek').value = preset.dayOfWeek || '';
  }
}

async function saveEditedDefaultPreset() {
  const dialog = document.getElementById('editDefaultPresetDialog');
  const presetKey = dialog.dataset.presetKey;

  const name = document.getElementById('editDefaultPresetName').value.trim();
  const icon = document.getElementById('editDefaultPresetIcon').value.trim();
  const type = document.getElementById('editDefaultPresetType').value;

  if (!name || !icon) {
    showMessage('❌ Please fill in both name and icon', 'error');
    return;
  }

  const modifiedPreset = { name, icon, type };

  if (type === 'relative') {
    const minutes = parseInt(document.getElementById('editDefaultPresetMinutes').value) || 0;
    const hours = parseInt(document.getElementById('editDefaultPresetHours').value) || 0;
    const days = parseInt(document.getElementById('editDefaultPresetDays').value) || 0;
    const keepTime = document.getElementById('editDefaultPresetKeepTime').checked;

    modifiedPreset.minutes = minutes;
    modifiedPreset.hours = hours;
    modifiedPreset.days = days;
    modifiedPreset.keepTime = keepTime;
  } else {
    const time = document.getElementById('editDefaultPresetTime').value;
    const dayOfWeek = document.getElementById('editDefaultPresetDayOfWeek').value;

    modifiedPreset.time = time;
    if (dayOfWeek) modifiedPreset.dayOfWeek = parseInt(dayOfWeek);
  }

  // Save the modified preset
  modifiedDefaultPresets[presetKey] = modifiedPreset;
  await saveModifiedDefaultPresets();

  // Update the UI
  renderCustomPresets();
  hideEditDefaultPresetDialog();

  showMessage(`✅ Default preset "${name}" updated successfully!`, 'success');
}

async function resetDefaultPreset() {
  const dialog = document.getElementById('editDefaultPresetDialog');
  const presetKey = dialog.dataset.presetKey;

  if (confirm('Are you sure you want to reset this preset to its default settings?')) {
    // Remove from modified presets
    delete modifiedDefaultPresets[presetKey];
    await saveModifiedDefaultPresets();

    // Update the UI
    renderCustomPresets();
    hideEditDefaultPresetDialog();

    showMessage(`✅ Preset reset to default successfully!`, 'success');
  }
}

function showEditCustomPresetDialog(index, preset) {
  // Populate the existing custom preset dialog with the preset data for editing
  document.getElementById('customPresetName').value = preset.name;
  document.getElementById('customPresetIcon').value = preset.icon || '⏰';
  document.getElementById('customPresetType').value = preset.type || 'relative';

  // Show the appropriate options
  showPresetOptions(preset.type || 'relative');

  // Populate the options based on preset type
  if (preset.type === 'relative') {
    document.getElementById('relativeAmount').value = preset.amount || 1;
    document.getElementById('relativeUnit').value = preset.unit || 'hours';
  } else if (preset.type === 'absolute') {
    document.getElementById('absoluteTime').value = preset.time || '09:00';
  } else if (preset.type === 'next_day') {
    document.getElementById('nextDayWeekday').value = preset.weekday || 1;
    document.getElementById('nextDayTime').value = preset.time || '09:00';
  }

  // Store the index for updating
  const dialog = document.getElementById('customPresetDialog');
  dialog.dataset.editingIndex = index;

  // Change the save button text
  const saveBtn = document.getElementById('saveCustomPresetBtn');
  saveBtn.textContent = '💾 Update Preset';

  // Show the dialog
  dialog.style.display = 'flex';
}

function showCustomPresetDialog() {
  // Reset the dialog for creating a new preset
  document.getElementById('customPresetName').value = '';
  document.getElementById('customPresetIcon').value = '⏰';
  document.getElementById('customPresetType').value = 'relative';
  document.getElementById('relativeAmount').value = 1;
  document.getElementById('relativeUnit').value = 'hours';

  // Show relative options by default
  showPresetOptions('relative');

  // Clear editing index
  const dialog = document.getElementById('customPresetDialog');
  delete dialog.dataset.editingIndex;

  // Reset save button text
  const saveBtn = document.getElementById('saveCustomPresetBtn');
  saveBtn.textContent = '💾 Save Preset';

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
  let optionId;
  switch (type) {
    case 'relative':
      optionId = 'relativeTimeOptions';
      break;
    case 'absolute':
      optionId = 'absoluteTimeOptions';
      break;
    case 'next_day':
      optionId = 'nextDayOptions';
      break;
    default:
      optionId = 'relativeTimeOptions';
  }

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

  // Check if we're editing an existing preset
  const dialog = document.getElementById('customPresetDialog');
  const editingIndex = dialog.dataset.editingIndex;

  if (editingIndex !== undefined) {
    // Update existing preset
    const index = parseInt(editingIndex);
    customPresets[index] = preset;

    try {
      await new Promise(resolve => {
        chrome.storage.local.set({ customPresets }, resolve);
      });

      renderCustomPresets();
      hideCustomPresetDialog();
      showMessage(`✅ Custom preset "${name}" updated successfully!`, 'success');
    } catch (error) {
      showMessage(`❌ Failed to update preset: ${error.message}`, 'error');
    }
  } else {
    // Create new preset
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

    // Save to storage and update counters
    await savePostData();

    // Refresh the UI
    await loadSavedData();

    showMessage(`✅ Successfully imported ${importedCount} posts`, 'success');
    hideCsvImport();

  } catch (error) {
    showMessage(`❌ Import failed: ${error.message}`, 'error');
  }
}

// CSV Export functionality
async function exportToCsv() {
  try {
    // Get current saved items
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['savedItems', 'categories'], resolve);
    });

    const savedItems = result.savedItems || {};
    const categories = result.categories || [];

    // Collect all posts from all categories
    const allPosts = [];
    Object.keys(savedItems).forEach(category => {
      savedItems[category].forEach(post => {
        allPosts.push({ ...post, category });
      });
    });

    if (allPosts.length === 0) {
      showMessage('❌ No posts to export', 'error');
      return;
    }

    // Create CSV content with latest titles and captions
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "imageUrl,caption,title,category,source,timestamp,isVideo,fileType\n";

    allPosts.forEach(post => {
      // Use overridden values if they exist (after rewriting), otherwise use original
      const finalTitle = post.titleOverridden ? post.overriddenTitle : (post.title || '');
      const finalCaption = post.captionOverridden ? post.overriddenCaption : (post.caption || '');

      // Get the proper download URL (same logic as download function)
      let exportUrl = '';
      if (post.storageId) {
        exportUrl = `https://api.robopost.app/stored_objects/${post.storageId}/download`;
      } else if (post.originalDataUrl) {
        exportUrl = post.originalDataUrl;
      } else if (post.originalUrl) {
        exportUrl = post.originalUrl;
      } else if (post.videoUrl) {
        exportUrl = post.videoUrl;
      } else if (post.imageUrl) {
        exportUrl = post.imageUrl;
      }

      // Clean the text to handle CSV formatting
      const cleanTitle = finalTitle.replace(/[\n\r]+/g, ' ').replace(/"/g, '""');
      const cleanCaption = finalCaption.replace(/[\n\r]+/g, ' ').replace(/"/g, '""');
      const cleanCategory = (post.category || '').replace(/"/g, '""');
      const cleanSource = (post.source || '').replace(/"/g, '""');
      const cleanFileType = (post.fileType || '').replace(/"/g, '""');

      // Format timestamp
      const timestamp = post.timestamp ? new Date(post.timestamp).toISOString() : '';

      csvContent += `"${exportUrl}","${cleanCaption}","${cleanTitle}","${cleanCategory}","${cleanSource}","${timestamp}","${post.isVideo || false}","${cleanFileType}"\n`;
    });

    // Create and download the file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    link.setAttribute("download", `ai-post-robot-export-${dateStr}-${timeStr}.csv`);

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showMessage(`✅ Successfully exported ${allPosts.length} posts to CSV`, 'success');

    console.log('📤 CSV Export completed:', {
      totalPosts: allPosts.length,
      categories: categories.length,
      filename: `ai-post-robot-export-${dateStr}-${timeStr}.csv`
    });

  } catch (error) {
    console.error('❌ CSV Export failed:', error);
    showMessage(`❌ Export failed: ${error.message}`, 'error');
  }
}

// AI Toggle Handler
function handleAiToggleChange(event) {
  const isEnabled = event.target.checked;
  localStorage.setItem('aiIncludeMedia', isEnabled.toString());

  // Update the toggle container appearance
  const container = document.getElementById('aiToggleContainer');
  const label = container.querySelector('label');
  const mediaData = getSelectedPostMedia();

  if (isEnabled) {
    container.className = 'ai-toggle-container enabled';
    label.textContent = `🖼️ Include ${mediaData.type} in AI prompts`;
  } else {
    container.className = 'ai-toggle-container disabled';
    label.textContent = `📝 Text-only AI (${mediaData.type} available)`;
  }
}

// Media Detection and Helper Functions
function getSelectedPostMedia() {
  // Get the first selected post (for multimodal AI)
  if (selectedPosts.size > 0) {
    const firstPostId = Array.from(selectedPosts)[0];
    const post = window.getPostById(firstPostId);
    if (post && post.imageUrl) {
      return {
        url: post.originalDataUrl || post.imageUrl, // Use original data for AI, fallback to preview
        type: getMediaType(post.originalDataUrl || post.imageUrl),
        filename: post.filename || 'media'
      };
    }
  }
  return null;
}

// Check if user wants to include media in AI prompts
function shouldIncludeMediaInAI() {
  const mediaData = getSelectedPostMedia();
  if (!mediaData) return false;

  // Check user preference from toggle
  const userPreference = localStorage.getItem('aiIncludeMedia');
  return userPreference !== 'false'; // Default to true if not set
}

function getMediaType(url) {
  if (!url) return 'unknown';

  const extension = url.split('.').pop().toLowerCase();
  const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  if (videoExtensions.includes(extension)) {
    return 'video';
  } else if (imageExtensions.includes(extension)) {
    return 'image';
  }
  return 'image'; // Default to image
}

// AI Rewrite Functionality with Multimodal Support
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
  const promptType = button.dataset.prompt; // 'make engaging title', 'shorten caption', etc.

  if (promptType === 'custom') {
    showCustomPromptDialog(target);
    return;
  }

  // Check if multiple posts are selected (queue mode)
  if (selectedPosts.size > 1) {
    await startQueueRewrite(target, promptType);
    return;
  }

  // Get the current text
  const textElement = target === 'title'
    ? document.getElementById('postTitle')
    : document.getElementById('postCaption');

  const currentText = textElement.value.trim();

  // Check if user wants to include media in AI prompts
  const isMultimodal = shouldIncludeMediaInAI();
  const mediaData = isMultimodal ? getSelectedPostMedia() : null;

  // Allow empty text if we have media and multimodal is enabled
  if (!currentText && !mediaData) {
    showMessage(`❌ Please enter some ${target} text first or select an image/video with the toggle enabled`, 'error');
    return;
  }

  // Check if Gemini API is available
  if (!window.geminiAPI) {
    showMessage('❌ Gemini AI not available. Please check your settings.', 'error');
    return;
  }

  // Find the matching prompt using improved matching logic
  const promptData = getPromptData(target, promptType.toLowerCase());

  if (!promptData) {
    console.error(`Prompt not found: target="${target}", promptType="${promptType}"`);
    console.error('Available prompts:', window.geminiRewritePrompts[target]?.map(p => p.name));
    showMessage('❌ Prompt not found. Please try refreshing the page.', 'error');
    return;
  }

  // Media data already retrieved above for validation

  // Show loading state with appropriate feedback
  const originalText = button.textContent;

  // Enhanced loading indicators based on content type
  if (isMultimodal && mediaData) {
    if (mediaData.type === 'video') {
      button.textContent = '🔄🎥 Processing video...';
      showMessage('🎥 Processing video with enhanced AI optimization...', 'info');
    } else {
      button.textContent = '🔄🖼️ Processing image...';
      showMessage('🖼️ Processing image with AI...', 'info');
    }
  } else {
    button.textContent = '🔄 Processing...';
  }

  button.disabled = true;
  button.classList.add('loading');

  try {
    let rewrittenText;

    if (isMultimodal) {
      // Use multimodal API with image/video
      console.log(`🖼️ Using multimodal AI with ${mediaData.type}:`, mediaData.filename);

      // If no text provided, use a default prompt for generating from image
      const textToProcess = currentText || `[Generate ${target} from this image/video]`;

      rewrittenText = await window.geminiAPI.rewriteTextWithMedia(
        textToProcess,
        promptData.prompt,
        mediaData.url
      );

      const action = currentText ? 'rewritten' : 'generated';
      showMessage(`✅ ${target.charAt(0).toUpperCase() + target.slice(1)} ${action} with ${mediaData.type} context!`, 'success');
    } else {
      // Fall back to text-only API
      console.log('📝 Using text-only AI (no media selected)');
      rewrittenText = await window.geminiAPI.rewriteText(currentText, promptData.prompt);

      showMessage(`✅ ${target.charAt(0).toUpperCase() + target.slice(1)} rewritten! Click the 💾 Save button to keep it.`, 'success');
    }

    // Update the text field
    textElement.value = rewrittenText.trim();

    // Update character count if it's the caption
    if (target === 'caption') {
      updateCaptionCharCount();
    }

    // Show save buttons immediately after AI generation
    showSaveButtonIfNeeded();

    // Show success feedback
    textElement.style.background = isMultimodal ? '#e6fff0' : '#e6fffa';
    setTimeout(() => {
      textElement.style.background = '';
    }, 2000);

  } catch (error) {
    console.error('Rewrite error:', error);

    // Enhanced error handling with better user guidance
    let errorMessage = error.message;
    let suggestion = '';
    let actionable = true;

    // Video-specific error handling
    if (error.message.includes('Video processing failed after') && error.message.includes('attempts')) {
      suggestion = ' 🎥 Enhanced video processing failed. The video may be too complex or in an unsupported format. Try: 1) Using a shorter video clip, 2) Converting to MP4 format, 3) Reducing file size, or 4) Using text-only generation.';
      actionable = true;
    } else if (error.message.includes('Video processing failed')) {
      suggestion = ' 🎥 Video processing encountered an issue. The system automatically tried multiple approaches. You can: 1) Try again (sometimes works on retry), 2) Use a different video, or 3) Switch to text-only mode.';
      actionable = true;
    } else if (error.message.includes('Request timeout')) {
      suggestion = ' ⏱️ The request took too long to process. This can happen with large videos. Try: 1) Using a smaller video file, 2) Trying again, or 3) Using text-only generation.';
      actionable = true;
    } else if (error.message.includes('Media file is too large')) {
      suggestion = ' 📁 File size exceeds the 20MB limit. Please compress your video/image or use a smaller file.';
      actionable = true;
    } else if (error.message.includes('Auto-switching') || error.message.includes('video-optimized')) {
      suggestion = ' 🔄 The system automatically optimized settings for your content. If this error persists, try using text-only mode or a different media file.';
      actionable = true;
    } else if (error.message.includes('Multimodal generation failed')) {
      suggestion = ' 💡 Image/video processing failed. The system has automatically switched to the best available model. Try again or use text-only mode.';
      actionable = true;
    } else if (error.message.includes('No content generated')) {
      suggestion = ' 💡 The AI couldn\'t generate content. This is automatically handled with optimized models. Try: 1) Simplifying your prompt, 2) Using different media, or 3) Text-only mode.';
      actionable = true;
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      suggestion = ' 💡 Rate limit reached. Please wait a moment and try again, or add more API keys in Settings.';
      actionable = true;
    } else if (error.message.includes('Both multimodal and text-only generation failed')) {
      suggestion = ' ⚠️ All generation methods failed. Please check your API keys in Settings or try again later.';
      actionable = false;
    } else if (error.message.includes('API Error')) {
      suggestion = ' 🔑 API error occurred. Please check your Gemini API keys in Settings.';
      actionable = false;
    } else {
      suggestion = ' 💡 An unexpected error occurred. Try again or use text-only mode if the issue persists.';
      actionable = true;
    }

    // Show appropriate message based on whether the error is actionable
    const messageType = actionable ? 'error' : 'error';
    showMessage(`❌ ${actionable ? 'Processing failed' : 'System error'}: ${errorMessage}${suggestion}`, messageType);
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
  document.getElementById('customPromptName').value = '';

  // Reset button visibility
  toggleSaveButton();

  // Show dialog
  dialog.style.display = 'flex';
}

function hideCustomPromptDialog() {
  const dialog = document.getElementById('customPromptDialog');
  dialog.style.display = 'none';
}

function toggleSaveButton() {
  const nameInput = document.getElementById('customPromptName');
  const saveBtn = document.getElementById('saveCustomPromptBtn');
  const applyBtn = document.getElementById('applyCustomPromptBtn');

  if (!nameInput || !saveBtn || !applyBtn) {
    console.error('❌ Toggle save button: Missing elements', {
      nameInput: !!nameInput,
      saveBtn: !!saveBtn,
      applyBtn: !!applyBtn
    });
    return;
  }

  const hasName = nameInput.value.trim().length > 0;
  console.log('🔄 Toggle save button:', { hasName, value: nameInput.value });

  if (hasName) {
    saveBtn.style.display = 'inline-block';
    applyBtn.textContent = '✨ Apply Rewrite';
    console.log('✅ Save button shown');
  } else {
    saveBtn.style.display = 'none';
    applyBtn.textContent = '✨ Apply Rewrite';
    console.log('ℹ️ Save button hidden');
  }
}

function showEditPromptDialog(target, promptType) {
  const dialog = document.getElementById('editPromptDialog');
  const targetSelect = document.getElementById('editPromptTarget');
  const promptTextarea = document.getElementById('editPromptText');
  const promptNameInput = document.getElementById('editPromptName');

  // Find the current prompt using improved matching logic
  const promptData = getPromptData(target, promptType.toLowerCase());

  if (!promptData) {
    console.error(`Edit prompt not found: target="${target}", promptType="${promptType}"`);
    console.error('Available prompts:', window.geminiRewritePrompts[target]?.map(p => p.name));
    showMessage('❌ Prompt not found. Please try refreshing the page.', 'error');
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

  // Find and update the prompt using improved matching logic
  const promptIndex = window.geminiRewritePrompts[target]?.findIndex(p => {
    const normalizedPromptName = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedSearchTerm = originalPromptType.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalizedPromptName === normalizedSearchTerm;
  });

  if (promptIndex !== -1) {
    const originalPrompt = window.geminiRewritePrompts[target][promptIndex];

    // Store the original name if this is the first modification
    if (!originalPrompt.originalName && !originalPrompt.modified) {
      originalPrompt.originalName = originalPrompt.name;
    }

    originalPrompt.prompt = newPrompt;
    originalPrompt.name = newName;
    originalPrompt.modified = true;

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
  updatePromptButtonsForTarget('title');
  updatePromptButtonsForTarget('caption');
}

function updatePromptButtonsForTarget(target) {
  const containerId = target === 'title' ? 'titleRewriteButtons' : 'captionRewriteButtons';
  const container = document.getElementById(containerId);

  if (!container) return;

  // Remove existing custom prompt buttons (but keep default ones and the "Custom" button)
  const existingCustomButtons = container.querySelectorAll('.custom-prompt-button');
  existingCustomButtons.forEach(button => button.remove());

  // Get the "Custom" button to insert new buttons before it
  const customButton = container.querySelector('[data-prompt="custom"]');

  // Update existing default buttons
  const defaultButtons = container.querySelectorAll('.btn-ai:not([data-prompt="custom"]):not(.custom-prompt-button)');
  defaultButtons.forEach((button, index) => {
    if (window.geminiRewritePrompts[target] && window.geminiRewritePrompts[target][index]) {
      const prompt = window.geminiRewritePrompts[target][index];
      button.textContent = `${prompt.icon || '🎯'} ${prompt.name}`;
      button.setAttribute('data-prompt', prompt.name.toLowerCase());
    }
  });

  // Add custom prompt buttons
  if (window.geminiRewritePrompts[target]) {
    const customPrompts = window.geminiRewritePrompts[target].filter(p => p.custom);

    customPrompts.forEach(prompt => {
      // Create button group for custom prompts (with delete button)
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'prompt-button-group custom-prompt-button';

      // Create main button
      const button = document.createElement('button');
      button.className = 'btn btn-small btn-ai';
      button.setAttribute('data-target', target);
      button.setAttribute('data-prompt', prompt.name.toLowerCase());
      button.textContent = `${prompt.icon || '🎯'} ${prompt.name}`;
      button.addEventListener('click', handleRewriteClick);

      // Create edit button
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-small edit-custom-prompt-btn';
      editButton.setAttribute('data-target', target);
      editButton.setAttribute('data-prompt', prompt.name.toLowerCase());
      editButton.textContent = '✏️';
      editButton.title = 'Edit custom prompt';
      editButton.addEventListener('click', editCustomPrompt);

      // Create delete button
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-small delete-custom-prompt-btn';
      deleteButton.setAttribute('data-target', target);
      deleteButton.setAttribute('data-prompt', prompt.name.toLowerCase());
      deleteButton.textContent = '🗑️';
      deleteButton.title = 'Delete custom prompt';
      deleteButton.addEventListener('click', deleteCustomPrompt);

      buttonGroup.appendChild(button);
      buttonGroup.appendChild(editButton);
      buttonGroup.appendChild(deleteButton);

      // Insert before the "Custom" button
      if (customButton) {
        container.insertBefore(buttonGroup, customButton);
      } else {
        container.appendChild(buttonGroup);
      }
    });
  }
}

function deleteCustomPrompt(event) {
  event.stopPropagation();

  const target = event.target.getAttribute('data-target');
  const promptName = event.target.getAttribute('data-prompt');

  if (confirm(`Are you sure you want to delete the custom prompt "${promptName}"?`)) {
    // Find and remove the custom prompt
    if (window.geminiRewritePrompts[target]) {
      window.geminiRewritePrompts[target] = window.geminiRewritePrompts[target].filter(p =>
        !(p.custom && p.name.toLowerCase() === promptName.toLowerCase())
      );

      // Save to storage
      const customPrompts = {
        title: window.geminiRewritePrompts.title.filter(p => p.custom || p.modified),
        caption: window.geminiRewritePrompts.caption.filter(p => p.custom || p.modified)
      };

      window.saveCustomPrompts(customPrompts);

      // Update the UI
      updatePromptButtons();

      showMessage(`✅ Custom prompt "${promptName}" deleted successfully!`, 'success');
    }
  }
}

function editCustomPrompt(event) {
  event.stopPropagation();

  const target = event.target.getAttribute('data-target');
  const promptName = event.target.getAttribute('data-prompt');

  // Find the custom prompt
  if (window.geminiRewritePrompts[target]) {
    const prompt = window.geminiRewritePrompts[target].find(p =>
      p.custom && p.name.toLowerCase() === promptName.toLowerCase()
    );

    if (prompt) {
      showEditCustomPromptDialog(target, prompt);
    } else {
      showMessage('❌ Custom prompt not found', 'error');
    }
  }
}

function showEditCustomPromptDialog(target, prompt) {
  // Create or show the edit dialog
  let dialog = document.getElementById('editCustomPromptDialog');

  if (!dialog) {
    // Create the dialog if it doesn't exist
    dialog = document.createElement('div');
    dialog.id = 'editCustomPromptDialog';
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3>✏️ Edit Custom Prompt</h3>
          <button class="btn btn-secondary" id="closeEditCustomPromptDialog">✖️ Close</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Target</label>
            <select class="form-input" id="editCustomPromptTarget" disabled>
              <option value="title">Title</option>
              <option value="caption">Caption</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prompt Name</label>
            <input type="text" class="form-input" id="editCustomPromptName" placeholder="Enter prompt name">
          </div>
          <div class="form-group">
            <label class="form-label">Prompt Text</label>
            <textarea class="form-input" id="editCustomPromptText" rows="4" placeholder="Enter your custom prompt"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Icon (optional)</label>
            <input type="text" class="form-input" id="editCustomPromptIcon" placeholder="Enter emoji icon (e.g., 🎯)">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="saveEditedCustomPromptBtn">💾 Save Changes</button>
          <button class="btn btn-secondary" id="cancelEditCustomPromptBtn">❌ Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // Add event listeners
    document.getElementById('closeEditCustomPromptDialog').addEventListener('click', hideEditCustomPromptDialog);
    document.getElementById('cancelEditCustomPromptBtn').addEventListener('click', hideEditCustomPromptDialog);
    document.getElementById('saveEditedCustomPromptBtn').addEventListener('click', saveEditedCustomPrompt);
  }

  // Populate the dialog with current prompt data
  document.getElementById('editCustomPromptTarget').value = target;
  document.getElementById('editCustomPromptName').value = prompt.name;
  document.getElementById('editCustomPromptText').value = prompt.prompt;
  document.getElementById('editCustomPromptIcon').value = prompt.icon || '🎯';

  // Store the original prompt data for updating
  dialog.dataset.originalTarget = target;
  dialog.dataset.originalName = prompt.name.toLowerCase();

  // Show the dialog
  dialog.style.display = 'flex';
}

function hideEditCustomPromptDialog() {
  const dialog = document.getElementById('editCustomPromptDialog');
  if (dialog) {
    dialog.style.display = 'none';
  }
}

async function saveEditedCustomPrompt() {
  const dialog = document.getElementById('editCustomPromptDialog');
  const target = dialog.dataset.originalTarget;
  const originalName = dialog.dataset.originalName;

  const newName = document.getElementById('editCustomPromptName').value.trim();
  const newPromptText = document.getElementById('editCustomPromptText').value.trim();
  const newIcon = document.getElementById('editCustomPromptIcon').value.trim() || '🎯';

  if (!newName || !newPromptText) {
    showMessage('❌ Please fill in both name and prompt text', 'error');
    return;
  }

  try {
    // Find and update the custom prompt
    if (window.geminiRewritePrompts[target]) {
      const promptIndex = window.geminiRewritePrompts[target].findIndex(p =>
        p.custom && p.name.toLowerCase() === originalName
      );

      if (promptIndex !== -1) {
        // Update the prompt
        window.geminiRewritePrompts[target][promptIndex] = {
          ...window.geminiRewritePrompts[target][promptIndex],
          name: newName,
          prompt: newPromptText,
          icon: newIcon
        };

        // Save to storage
        const customPrompts = {
          title: window.geminiRewritePrompts.title.filter(p => p.custom || p.modified),
          caption: window.geminiRewritePrompts.caption.filter(p => p.custom || p.modified)
        };

        window.saveCustomPrompts(customPrompts);

        // Update the UI
        updatePromptButtons();

        // Hide the dialog
        hideEditCustomPromptDialog();

        showMessage(`✅ Custom prompt "${newName}" updated successfully!`, 'success');
      } else {
        showMessage('❌ Custom prompt not found', 'error');
      }
    }
  } catch (error) {
    console.error('Failed to save edited custom prompt:', error);
    showMessage('❌ Failed to save changes', 'error');
  }
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

  // Check if user wants to include media in AI prompts
  const isMultimodal = shouldIncludeMediaInAI();
  const mediaData = isMultimodal ? getSelectedPostMedia() : null;

  // Allow empty text if we have media and multimodal is enabled
  if (!currentText && !mediaData) {
    showMessage(`❌ Please enter some ${target} text first or select an image/video with the toggle enabled`, 'error');
    return;
  }

  // Check if Gemini API is available
  if (!window.geminiAPI) {
    showMessage('❌ Gemini AI not available. Please check your settings.', 'error');
    return;
  }

  // Media data already retrieved above for validation

  const button = document.getElementById('applyCustomPromptBtn');
  const originalText = button.textContent;
  button.textContent = isMultimodal ? '🔄🖼️ Processing...' : '🔄 Processing...';
  button.disabled = true;

  try {
    let rewrittenText;

    if (isMultimodal) {
      // Use multimodal API with image/video
      console.log(`🖼️ Using custom multimodal AI with ${mediaData.type}:`, mediaData.filename);

      // If no text provided, use a default prompt for generating from image
      const textToProcess = currentText || `[Generate ${target} from this image/video]`;

      rewrittenText = await window.geminiAPI.rewriteTextWithMedia(
        textToProcess,
        promptText,
        mediaData.url
      );

      const action = currentText ? 'rewritten' : 'generated';
      showMessage(`✅ ${target.charAt(0).toUpperCase() + target.slice(1)} ${action} with custom prompt and ${mediaData.type} context!`, 'success');
    } else {
      // Fall back to text-only API
      console.log('📝 Using custom text-only AI (no media selected)');
      rewrittenText = await window.geminiAPI.rewriteText(currentText, promptText);

      showMessage(`✅ ${target.charAt(0).toUpperCase() + target.slice(1)} rewritten! Click the 💾 Save button to keep it.`, 'success');
    }

    // Update the text field
    textElement.value = rewrittenText.trim();

    // Update character count if it's the caption
    if (target === 'caption') {
      updateCaptionCharCount();
    }

    // Show save buttons immediately after AI generation
    showSaveButtonIfNeeded();

    // Show success feedback
    textElement.style.background = isMultimodal ? '#e6fff0' : '#e6fffa';
    setTimeout(() => {
      textElement.style.background = '';
    }, 2000);

    // Hide dialog
    hideCustomPromptDialog();

  } catch (error) {
    console.error('Custom rewrite error:', error);

    // Enhanced error handling with better user guidance (same as main rewrite function)
    let errorMessage = error.message;
    let suggestion = '';
    let actionable = true;

    // Video-specific error handling
    if (error.message.includes('Video processing failed after') && error.message.includes('attempts')) {
      suggestion = ' 🎥 Enhanced video processing failed. The video may be too complex or in an unsupported format. Try: 1) Using a shorter video clip, 2) Converting to MP4 format, 3) Reducing file size, or 4) Using text-only generation.';
      actionable = true;
    } else if (error.message.includes('Video processing failed')) {
      suggestion = ' 🎥 Video processing encountered an issue. The system automatically tried multiple approaches. You can: 1) Try again (sometimes works on retry), 2) Use a different video, or 3) Switch to text-only mode.';
      actionable = true;
    } else if (error.message.includes('Request timeout')) {
      suggestion = ' ⏱️ The request took too long to process. This can happen with large videos. Try: 1) Using a smaller video file, 2) Trying again, or 3) Using text-only generation.';
      actionable = true;
    } else if (error.message.includes('Media file is too large')) {
      suggestion = ' 📁 File size exceeds the 20MB limit. Please compress your video/image or use a smaller file.';
      actionable = true;
    } else if (error.message.includes('Auto-switching') || error.message.includes('video-optimized')) {
      suggestion = ' 🔄 The system automatically optimized settings for your content. If this error persists, try using text-only mode or a different media file.';
      actionable = true;
    } else if (error.message.includes('Multimodal generation failed')) {
      suggestion = ' 💡 Image/video processing failed. The system has automatically switched to the best available model. Try again or use text-only mode.';
      actionable = true;
    } else if (error.message.includes('No content generated')) {
      suggestion = ' 💡 The AI couldn\'t generate content. This is automatically handled with optimized models. Try: 1) Simplifying your prompt, 2) Using different media, or 3) Text-only mode.';
      actionable = true;
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      suggestion = ' 💡 Rate limit reached. Please wait a moment and try again, or add more API keys in Settings.';
      actionable = true;
    } else if (error.message.includes('Both multimodal and text-only generation failed')) {
      suggestion = ' ⚠️ All generation methods failed. Please check your API keys in Settings or try again later.';
      actionable = false;
    } else if (error.message.includes('API Error')) {
      suggestion = ' 🔑 API error occurred. Please check your Gemini API keys in Settings.';
      actionable = false;
    } else {
      suggestion = ' 💡 An unexpected error occurred. Try again or use text-only mode if the issue persists.';
      actionable = true;
    }

    // Show appropriate message based on whether the error is actionable
    const messageType = actionable ? 'error' : 'error';
    showMessage(`❌ Custom prompt ${actionable ? 'failed' : 'error'}: ${errorMessage}${suggestion}`, messageType);
  } finally {
    // Reset button state
    button.textContent = originalText;
    button.disabled = false;
  }
}

async function saveCustomPromptOnly() {
  const promptText = document.getElementById('customPromptText').value.trim();
  const promptName = document.getElementById('customPromptName').value.trim();
  const target = document.getElementById('customPromptTarget').value;

  if (!promptText) {
    showMessage('❌ Please enter a custom prompt', 'error');
    return;
  }

  if (!promptName) {
    showMessage('❌ Please enter a prompt name to save', 'error');
    return;
  }

  try {
    // Create the custom prompt object
    const customPrompt = {
      name: promptName,
      icon: '🎯',
      prompt: promptText,
      custom: true,
      requiresImage: target === 'caption' // Captions can use images, titles typically don't
    };

    // Add to the appropriate array
    if (!window.geminiRewritePrompts[target]) {
      window.geminiRewritePrompts[target] = [];
    }
    window.geminiRewritePrompts[target].push(customPrompt);

    // Save to storage
    const customPrompts = {
      title: window.geminiRewritePrompts.title.filter(p => p.custom || p.modified),
      caption: window.geminiRewritePrompts.caption.filter(p => p.custom || p.modified)
    };

    console.log('💾 Saving custom prompts:', customPrompts);
    window.saveCustomPrompts(customPrompts);

    showMessage(`✅ Custom prompt "${promptName}" saved successfully!`, 'success');

    // Update the prompt buttons to show the new custom prompt
    updatePromptButtons();

    // Close the dialog after successful save
    hideCustomPromptDialog();

  } catch (error) {
    console.error('Error saving custom prompt:', error);
    showMessage('❌ Failed to save custom prompt', 'error');
  }
}

async function saveAndApplyCustomPrompt() {
  const promptText = document.getElementById('customPromptText').value.trim();
  const promptName = document.getElementById('customPromptName').value.trim();
  const target = document.getElementById('customPromptTarget').value;

  if (!promptText) {
    showMessage('❌ Please enter a custom prompt', 'error');
    return;
  }

  if (!promptName) {
    showMessage('❌ Please enter a prompt name to save', 'error');
    return;
  }

  try {
    // Create the custom prompt object
    const customPrompt = {
      name: promptName,
      icon: '🎯',
      prompt: promptText,
      custom: true,
      requiresImage: target === 'caption' // Captions can use images, titles typically don't
    };

    // Add to the appropriate array
    if (!window.geminiRewritePrompts[target]) {
      window.geminiRewritePrompts[target] = [];
    }
    window.geminiRewritePrompts[target].push(customPrompt);

    // Save to storage
    const customPrompts = {
      title: window.geminiRewritePrompts.title.filter(p => p.custom || p.modified),
      caption: window.geminiRewritePrompts.caption.filter(p => p.custom || p.modified)
    };

    console.log('💾 Saving custom prompts:', customPrompts);
    window.saveCustomPrompts(customPrompts);

    showMessage(`✅ Custom prompt "${promptName}" saved successfully!`, 'success');

    // Update the prompt buttons to show the new custom prompt
    updatePromptButtons();

    // Now apply the prompt
    await applyCustomPrompt();

    // Close the dialog after successful save and apply
    hideCustomPromptDialog();

  } catch (error) {
    console.error('Error saving custom prompt:', error);
    showMessage('❌ Failed to save custom prompt', 'error');
  }
}

// Debug function to show prompt structure (for development/testing)
window.showPromptExample = function() {
  const selectedPost = selectedPosts.size > 0 ? window.getPostById(Array.from(selectedPosts)[0]) : null;
  const sampleText = "This is a sample title text";
  const sampleInstruction = "Based on this image/video and text, create a short, engaging title in the same language as the text. Provide only one option:";

  if (selectedPost && selectedPost.imageUrl) {
    const example = window.geminiAPI.getPromptExample(sampleText, sampleInstruction, selectedPost.imageUrl);
    console.log('🔍 PROMPT EXAMPLE FOR SELECTED POST:');
    console.log('📝 Text-only prompt:', example.textOnlyPrompt);
    console.log('🖼️ Multimodal prompt structure:', example.multimodalPrompt);

    // Show in a modal for easy viewing
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
      align-items: center; justify-content: center; padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white; padding: 20px; border-radius: 8px;
      max-width: 80%; max-height: 80%; overflow: auto;
      font-family: monospace; font-size: 12px;
    `;

    content.innerHTML = `
      <h3>🔍 Prompt Structure Example</h3>
      <h4>📝 Text-only prompt:</h4>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${example.textOnlyPrompt}</pre>

      <h4>🖼️ Multimodal API structure:</h4>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${JSON.stringify(example.multimodalPrompt?.apiStructure, null, 2)}</pre>

      <p><strong>Note:</strong> The actual base64 image data is included in the API request but truncated here for readability.</p>

      <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 10px; padding: 8px 16px;">Close</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    return example;
  } else {
    console.log('❌ Please select a post with an image first');
    alert('Please select a post with an image first to see the prompt example');
    return null;
  }
};



// Image Editor Integration Functions
function updateEditButtonState() {
  const editBtn = document.getElementById('editImageBtn');
  const aiEditBtn = document.getElementById('aiImageEditorBtn');

  if (!editBtn || !aiEditBtn) return;

  // Initialize image editor integration if not already done
  if (!imageEditorIntegration) {
    imageEditorIntegration = new window.ImageEditorIntegration();
  }

  // Update regular image editor button
  const canEditResult = imageEditorIntegration.canEditImage(selectedPosts);
  if (canEditResult.canEdit) {
    editBtn.disabled = false;
    editBtn.title = 'Edit the selected image';
  } else {
    editBtn.disabled = true;
    editBtn.title = canEditResult.reason || 'Cannot edit image';
  }

  // AI Image+ button should ALWAYS be enabled and clickable
  // This is critical - the button must work on first click without requiring post selection
  aiEditBtn.disabled = false;

  // Set appropriate tooltip based on selection state
  if (selectedPosts.size === 0) {
    aiEditBtn.title = '🤖 Create new image with AI Image+';
  } else {
    aiEditBtn.title = '🤖 Create/edit image with AI Image+';
  }

  // Update download button state
  const downloadBtn = document.getElementById('downloadPostsBtn');
  if (downloadBtn) {
    const selectedPostsArray = Array.from(selectedPosts).map(postId => window.getPostById(postId));
    const hasMediaPosts = selectedPostsArray.some(post => post && (post.imageUrl || post.videoUrl));

    if (selectedPosts.size === 0) {
      downloadBtn.disabled = true;
      downloadBtn.title = 'Select posts to download';
    } else if (!hasMediaPosts) {
      downloadBtn.disabled = true;
      downloadBtn.title = 'No media posts selected for download';
    } else {
      downloadBtn.disabled = false;
      const mediaCount = selectedPostsArray.filter(post => post && (post.imageUrl || post.videoUrl)).length;
      downloadBtn.title = `Download ${mediaCount} media file(s)`;
    }
  }
}

async function openImageEditor() {
  if (!imageEditorIntegration) {
    imageEditorIntegration = new window.ImageEditorIntegration();
  }

  const canEditResult = imageEditorIntegration.canEditImage(selectedPosts);

  if (!canEditResult.canEdit) {
    showMessage(`❌ ${canEditResult.reason}`, 'error');
    return;
  }

  const post = canEditResult.post;

  // Get the first selected post ID (which should be in category_index format)
  const selectedPostId = Array.from(selectedPosts)[0];

  try {
    console.log('🔄 Opening editor for post:', {
      selectedPostId: selectedPostId,
      postId: post.id,
      imageUrl: post.imageUrl
    });

    await imageEditorIntegration.openEditor(
      selectedPostId, // Use the selected post ID (category_index format)
      post.imageUrl,
      async (postId, editedImageDataUrl) => {
        // Handle saving the edited image
        await handleEditedImageSave(postId, editedImageDataUrl);
      }
    );

  } catch (error) {
    console.error('Failed to open image editor:', error);
    showMessage('❌ Failed to open image editor. Please try again.', 'error');
  }
}

async function openAIImageEditor() {
  console.log('🔄 AI Image+ button clicked');

  // Ensure data is loaded first
  if (Object.keys(savedItems).length === 0) {
    console.log('🔄 Loading data before opening AI Image Editor...');
    await loadSavedData();
  }

  // Ensure AI Image Editor Module is properly initialized
  if (!aiImageEditorModule) {
    if (window.AIImageEditorModule) {
      aiImageEditorModule = new window.AIImageEditorModule();
      console.log('🔄 AI Image Editor Module initialized on demand');
    } else {
      console.error('❌ AIImageEditorModule not available');
      showMessage('❌ AI Image Editor not available. Please refresh the page.', 'error');
      return;
    }
  }

  // Initialize the module if not already done
  if (!aiImageEditorModule.isInitialized) {
    try {
      await aiImageEditorModule.init();
      console.log('✅ AI Image Editor Module initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Image Editor Module:', error);
      showMessage('❌ Failed to initialize AI Image Editor. Please check your Gemini API settings.', 'error');
      return;
    }
  }

  const canUseResult = aiImageEditorModule.canUseAIEditor(selectedPosts);

  // AI Image Editor should always work - no restrictions
  console.log('🔄 AI Image+ can always be used:', canUseResult);

  try {
    console.log('🔄 Opening AI Image Editor...', {
      selectedPosts: Array.from(selectedPosts),
      mode: canUseResult.mode
    });

    await aiImageEditorModule.openAIEditor(
      selectedPosts,
      async (postId, generatedImageDataUrl, metadata = {}) => {
        // Handle saving the generated/edited image with metadata
        await handleAIGeneratedImageSave(postId, generatedImageDataUrl, metadata);
      }
    );

  } catch (error) {
    console.error('Failed to open AI Image Editor:', error);
    showMessage('❌ Failed to open AI Image Editor. Please try again.', 'error');
  }
}

/**
 * Delete a post by its ID (used when replacing with AI generated image)
 * Uses the same logic as deleteSelectedPosts but for a single post
 */
async function deletePostById(postId) {
  try {
    console.log('🗑️ DELETEPOSTBYID CALLED WITH:', postId);

    // Get current saved items and counters (same as deleteSelectedPosts)
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['savedItems', 'counters'], resolve);
    });

    const savedItems = result.savedItems || {};
    const counters = result.counters || { captionCount: 0, linkCount: 0 };
    let deletedPost = null;

    console.log('🔍 AVAILABLE CATEGORIES:', Object.keys(savedItems));
    console.log('🔍 POST ID FORMAT CHECK:', {
      postId: postId,
      includesUnderscore: postId.includes('_'),
      startsWithAI: postId.startsWith('ai_'),
      startsWithPC: postId.startsWith('pc_')
    });

    // Handle old format (category_index) - this is what we get from selectedPosts
    if (postId.includes('_') && !postId.startsWith('ai_') && !postId.startsWith('pc_')) {
      const parts = postId.split('_');
      console.log('🔍 SPLIT PARTS:', parts);

      if (parts.length === 2) {
        const [category, index] = parts;
        const indexNum = parseInt(index);

        console.log('🔍 LOOKING FOR:', {
          category: category,
          index: indexNum,
          categoryExists: !!savedItems[category],
          categoryLength: savedItems[category] ? savedItems[category].length : 0,
          postExists: savedItems[category] && savedItems[category][indexNum]
        });

        if (savedItems[category] && savedItems[category][indexNum]) {
          deletedPost = savedItems[category][indexNum];
          console.log('🔍 FOUND POST TO DELETE:', {
            title: deletedPost.title || deletedPost.caption,
            id: deletedPost.id
          });

          // Update counters (same logic as deleteSelectedPosts)
          if (deletedPost.caption && deletedPost.caption.trim()) {
            counters.captionCount = Math.max(0, counters.captionCount - 1);
          }
          if (deletedPost.imageUrl) {
            counters.linkCount = Math.max(0, counters.linkCount - 1);
          }

          // Remove the post
          savedItems[category].splice(indexNum, 1);
          console.log(`✅ REMOVED POST FROM ${category} CATEGORY, NEW LENGTH:`, savedItems[category].length);

          // Remove empty categories (same as deleteSelectedPosts)
          if (savedItems[category].length === 0) {
            delete savedItems[category];
            console.log(`🗑️ REMOVED EMPTY ${category} CATEGORY`);
          }
        } else {
          console.error('❌ POST NOT FOUND AT EXPECTED LOCATION:', {
            category: category,
            index: indexNum,
            categoryExists: !!savedItems[category],
            categoryContents: savedItems[category] ? savedItems[category].map((p, i) => `${i}: ${p.title || p.caption}`) : 'N/A'
          });
        }
      }
    } else {
      // Handle new format (post.id) - search through all categories
      for (const category in savedItems) {
        const posts = savedItems[category];
        for (let i = 0; i < posts.length; i++) {
          if (posts[i] && posts[i].id === postId) {
            deletedPost = posts[i];

            // Update counters
            if (deletedPost.caption && deletedPost.caption.trim()) {
              counters.captionCount = Math.max(0, counters.captionCount - 1);
            }
            if (deletedPost.imageUrl) {
              counters.linkCount = Math.max(0, counters.linkCount - 1);
            }

            // Remove the post
            posts.splice(i, 1);
            console.log(`✅ Deleted post from ${category} category`);

            // Remove empty categories
            if (posts.length === 0) {
              delete savedItems[category];
              console.log(`🗑️ Removed empty ${category} category`);
            }
            break;
          }
        }
        if (deletedPost) break;
      }
    }

    if (!deletedPost) {
      console.error('❌ POST NOT FOUND FOR DELETION:', postId);
      console.log('🔍 FULL SAVEDITEM DUMP:', JSON.stringify(savedItems, null, 2));
      return false;
    }

    // Update categories list (same as deleteSelectedPosts)
    const categories = Object.keys(savedItems);
    console.log('🔍 UPDATED CATEGORIES LIST:', categories);

    // Save updated items, categories, and counters (same as deleteSelectedPosts)
    console.log('💾 SAVING UPDATED DATA TO STORAGE...');
    await new Promise(resolve => {
      chrome.storage.local.set({ savedItems, categories, counters }, resolve);
    });
    console.log('✅ DATA SAVED TO STORAGE');

    console.log('✅ ORIGINAL POST DELETED SUCCESSFULLY:', {
      postId: postId,
      postTitle: deletedPost.title || deletedPost.caption,
      finalCategoryCount: Object.keys(savedItems).length
    });

    return true;

  } catch (error) {
    console.error('❌ Failed to delete original post:', error);
    throw error;
  }
}

/**
 * Move a post from its original category to the AI category
 */
async function movePostToAICategory(post, originalCategory) {
  try {
    console.log('🔄 Moving post to AI category:', {
      postId: post.id,
      from: originalCategory,
      to: 'AI'
    });

    // Get current saved data
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['savedItems', 'categories'], resolve);
    });

    const savedItems = result.savedItems || {};
    const categories = result.categories || [];

    // Find and remove post from original category
    if (savedItems[originalCategory]) {
      const postIndex = savedItems[originalCategory].findIndex(p => p.id === post.id);
      if (postIndex !== -1) {
        // Remove from original category
        savedItems[originalCategory].splice(postIndex, 1);
        console.log(`✅ Removed post from ${originalCategory} category`);

        // Clean up empty categories
        if (savedItems[originalCategory].length === 0) {
          delete savedItems[originalCategory];
          const categoryIndex = categories.indexOf(originalCategory);
          if (categoryIndex !== -1) {
            categories.splice(categoryIndex, 1);
          }
          console.log(`🗑️ Removed empty ${originalCategory} category`);
        }
      }
    }

    // Add to AI category
    const aiCategory = 'AI';
    if (!savedItems[aiCategory]) {
      savedItems[aiCategory] = [];
    }

    // Update post category
    post.category = aiCategory;

    // Add to AI category
    savedItems[aiCategory].push(post);

    // Add AI category to categories list if not present
    if (!categories.includes(aiCategory)) {
      categories.push(aiCategory);
    }

    // Save updated data
    await new Promise(resolve => {
      chrome.storage.local.set({ savedItems, categories }, resolve);
    });

    console.log('✅ Post successfully moved to AI category');

  } catch (error) {
    console.error('❌ Failed to move post to AI category:', error);
    throw error;
  }
}

async function handleAIGeneratedImageSave(postId, generatedImageDataUrl, metadata = {}) {
  try {
    console.log('🔄 Saving AI generated image...', {
      postId: postId,
      hasImageData: !!generatedImageDataUrl,
      isPermanent: metadata.isPermanent,
      deleteOriginalPostId: metadata.deleteOriginalPostId
    });

    let dataUrl, storageId, file, fileName, needsUpload = false;

    // Check if this is from AI editor with local storage approach
    if (metadata.isPermanent) {
      // Use the data from AI editor (saved locally, will upload during scheduling)
      dataUrl = generatedImageDataUrl;
      storageId = metadata.storageId; // Will be null for new approach
      file = metadata.file;
      fileName = metadata.fileName;
      needsUpload = metadata.needsUpload || false;

      if (needsUpload) {
        console.log('💾 Using local storage from AI editor (will upload during scheduling)');
      } else {
        console.log('✅ Using permanent storage from AI editor, storage_id:', storageId);
      }
    } else {
      // Legacy path: save locally (no upload)
      console.log('🔄 Saving image locally (will upload during scheduling)...');

      // Convert data URL to blob for saving
      const response = await fetch(generatedImageDataUrl);
      const blob = await response.blob();

      // Create a file name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fileName = `ai-generated-${timestamp}.png`;

      // Create a File object
      file = new File([blob], fileName, { type: 'image/png' });

      // No upload here - save locally and upload during scheduling
      console.log('💾 AI image saved locally (will upload to RoboPost during scheduling)');
      storageId = null;
      needsUpload = true;

      // Generate data URL for preview
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Handle delete original post request
    let originalDeleted = false;
    if (metadata.deleteOriginalPostId) {
      console.log('🗑️ ATTEMPTING TO DELETE ORIGINAL POST:', metadata.deleteOriginalPostId);
      console.log('🔍 Current savedItems before deletion:', Object.keys(savedItems).map(cat => `${cat}: ${savedItems[cat].length} posts`));

      originalDeleted = await deletePostById(metadata.deleteOriginalPostId);

      if (originalDeleted) {
        console.log('✅ ORIGINAL POST DELETED SUCCESSFULLY');
        // Force reload the data to ensure UI reflects the deletion
        const reloadResult = await new Promise(resolve => {
          chrome.storage.local.get(['savedItems', 'categories'], resolve);
        });
        savedItems = reloadResult.savedItems || {};
        categories = reloadResult.categories || [];
        console.log('🔍 Current savedItems after deletion:', Object.keys(savedItems).map(cat => `${cat}: ${savedItems[cat].length} posts`));
      } else {
        console.error('❌ FAILED TO DELETE ORIGINAL POST');
      }
    }

    // Always create new post in AI category (no more overriding)
    {
      // Create new post with AI generated image
      console.log('🆕 Creating new post with AI generated image');
      const title = metadata.title || 'AI Generated Image';
      const caption = metadata.caption || 'Generated with AI Image Editor';
      const suffix = metadata.total > 1 ? ` (${metadata.index}/${metadata.total})` : '';

      // Get image dimensions for AI generated image
      let dimensions = null;
      try {
        dimensions = await getImageDimensions(dataUrl);
      } catch (error) {
        console.warn('Failed to get AI image dimensions:', error);
      }

      // Determine category - use "AI" for AI-generated images
      const aiCategory = currentCategory === 'all' ? 'AI' : currentCategory;

      const newPost = {
        id: `ai_${Date.now()}_${metadata.index || 1}`,
        title: title + suffix,
        caption: caption,
        imageUrl: dataUrl,
        originalDataUrl: dataUrl,
        storageId: storageId, // null for new approach
        file: file,
        fileName: fileName,
        category: aiCategory,
        isVideo: false,
        timestamp: Date.now(), // Use timestamp for consistency
        source: 'ai_generated',
        fileType: 'image/png',
        fileSize: file ? file.size : null, // Store file size if available
        dimensions: dimensions, // Store image dimensions
        needsUpload: needsUpload // Flag for scheduling upload
      };

      // Add to savedItems array
      if (!savedItems[newPost.category]) {
        savedItems[newPost.category] = [];
      }
      savedItems[newPost.category].push(newPost);

      // Update categories array
      if (!categories.includes(newPost.category)) {
        categories.push(newPost.category);
      }

      // Save updated data to storage (handle quota gracefully)
      try {
        console.log('💾 Saving AI generated post to storage:', {
          postId: newPost.id,
          category: newPost.category,
          title: newPost.title,
          hasLargeImage: newPost.imageUrl?.length > 100000
        });
        await savePostData();
        console.log('✅ AI generated post saved to storage successfully');
      } catch (storageError) {
        console.error('❌ Storage error when saving AI generated post:', storageError);

        // If quota exceeded, try to save with minimal data
        if (storageError.message && storageError.message.includes('quota')) {
          try {
            console.log('🔄 Attempting to save with minimal data due to quota...');

            // Remove large data URLs but keep essential info
            const minimalPost = { ...newPost };
            if (minimalPost.imageUrl?.startsWith('data:')) {
              minimalPost.imageUrl = null; // Will use storageId for display
            }
            if (minimalPost.originalDataUrl) {
              minimalPost.originalDataUrl = null;
            }

            // Replace the post in savedItems
            const categoryPosts = savedItems[newPost.category];
            const postIndex = categoryPosts.findIndex(p => p.id === newPost.id);
            if (postIndex !== -1) {
              categoryPosts[postIndex] = minimalPost;
            }

            await savePostData();
            console.log('✅ Minimal post data saved successfully after quota cleanup');

            showMessage(`⚠️ Storage limit reached. Post ${metadata.index || ''}/${metadata.total || ''} saved with reduced data.`, 'warning');
          } catch (minimalSaveError) {
            console.error('❌ Failed to save even minimal data:', minimalSaveError);
            // Continue without failing - post is still created in memory
          }
        }
      }

      // Force complete UI refresh to reflect deletion and new post
      console.log('🔄 FORCING COMPLETE UI REFRESH...');
      await loadSavedData(); // This reloads categories, posts, and stats
      loadCategoryTabs(); // Force reload category tabs with updated counts
      loadPosts(); // Force reload posts display
      updateStats(); // Force update statistics
      console.log('✅ UI REFRESH COMPLETE');

      let baseMessage;
      if (originalDeleted) {
        baseMessage = metadata.total > 1
          ? `Original deleted & Post ${metadata.index}/${metadata.total} created: ${title}`
          : 'Original post deleted & new AI post created!';
      } else {
        baseMessage = metadata.total > 1
          ? `Post ${metadata.index}/${metadata.total} created: ${title}`
          : 'New AI post created (original kept)!';
      }

      const message = needsUpload
        ? `✅ ${baseMessage} (Will upload to cloud during scheduling)`
        : `✅ ${baseMessage}`;
      showMessage(message, 'success');

      console.log('✅ New post created with AI generated image:', newPost.id);
    }

    // Clear any existing messages after a delay
    setTimeout(() => {
      if (window.clearMessage && typeof window.clearMessage === 'function') {
        window.clearMessage();
      }
    }, 3000);

  } catch (error) {
    console.error('❌ Failed to save AI generated image:', error);

    // Handle quota errors gracefully
    if (error.message && error.message.includes('quota')) {
      const message = metadata.total > 1
        ? `⚠️ Quota limit reached. Post ${metadata.index}/${metadata.total} saved locally (image may not sync to cloud)`
        : '⚠️ Quota limit reached. Image saved locally (may not sync to cloud)';
      showMessage(message, 'warning');
    } else {
      showMessage(`❌ Failed to save AI generated image: ${error.message}`, 'error');
    }
  }
}

async function handleEditedImageSave(postId, editedImageDataUrl) {
  try {
    showMessage('💾 Saving edited image...', 'info');

    // Find the post and update its image URL
    const post = window.getPostById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // Update the post's image URL with the edited image data
    post.imageUrl = editedImageDataUrl;
    post.isEdited = true; // Mark as edited
    post.editedAt = new Date().toISOString();

    // Save the updated post data
    await savePostData();

    // Refresh the posts display to show the updated image
    await loadSavedData();

    showMessage('✅ Image saved successfully!', 'success');

  } catch (error) {
    console.error('Failed to save edited image:', error);
    showMessage('❌ Failed to save edited image. Please try again.', 'error');
  }
}

async function updateCounters() {
  // Recalculate counters based on current savedItems
  const allPosts = Object.values(savedItems).flat();
  const counters = {
    captionCount: allPosts.filter(post => post.caption && post.caption.trim().length > 0).length,
    linkCount: allPosts.filter(post => post.imageUrl || post.videoUrl || post.originalUrl).length
  };

  return new Promise((resolve) => {
    chrome.storage.local.set({ counters }, resolve);
  });
}

async function savePostData() {
  // Save the updated posts data to storage with quota management
  const dataToSave = {
    savedItems: savedItems,
    categories: categories
  };

  return new Promise(async (resolve, reject) => {
    try {
      // Update counters first
      await updateCounters();

      // First, try to save normally
      chrome.storage.local.set(dataToSave, async () => {
        if (chrome.runtime.lastError) {
          // Check if it's a quota error
          if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('quota')) {
            console.warn('⚠️ Storage quota exceeded, attempting cleanup...');

            try {
              // Attempt to free up space and retry
              await handleStorageQuotaExceeded();

              // Retry saving after cleanup
              chrome.storage.local.set(dataToSave, () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  console.log('✅ Data saved successfully after cleanup');
                  resolve();
                }
              });
            } catch (cleanupError) {
              console.error('❌ Failed to cleanup storage:', cleanupError);
              reject(chrome.runtime.lastError);
            }
          } else {
            reject(chrome.runtime.lastError);
          }
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Handle storage quota exceeded by cleaning up old data
 */
async function handleStorageQuotaExceeded() {
  console.log('🧹 Starting storage cleanup due to quota exceeded...');

  try {
    // Get current storage usage
    const storageInfo = await new Promise(resolve => {
      chrome.storage.local.getBytesInUse(null, resolve);
    });
    console.log(`📊 Current storage usage: ${storageInfo} bytes`);

    // Get all data to analyze
    const allData = await new Promise(resolve => {
      chrome.storage.local.get(null, resolve);
    });

    let cleanedUp = false;

    // Strategy 1: Remove old AI generated images that are already uploaded
    if (allData.savedItems) {
      for (const category in allData.savedItems) {
        const posts = allData.savedItems[category];
        for (let i = posts.length - 1; i >= 0; i--) {
          const post = posts[i];

          // Remove posts that have storageId (already uploaded) and are AI generated
          if (post.source === 'ai_generated' && post.storageId && !post.needsUpload) {
            // Keep only essential data, remove large data URLs
            if (post.originalDataUrl || post.imageUrl?.startsWith('data:')) {
              console.log(`🗑️ Cleaning up uploaded AI image: ${post.fileName || 'unnamed'}`);
              post.originalDataUrl = null;
              if (post.imageUrl?.startsWith('data:')) {
                post.imageUrl = null; // Will use storageId for display
              }
              cleanedUp = true;
            }
          }

          // Remove very old posts (older than 30 days) that are AI generated
          if (post.source === 'ai_generated' && post.createdAt) {
            const postDate = new Date(post.createdAt);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            if (postDate < thirtyDaysAgo) {
              console.log(`🗑️ Removing old AI generated post: ${post.fileName || 'unnamed'}`);
              posts.splice(i, 1);
              cleanedUp = true;
            }
          }
        }
      }
    }

    // Strategy 2: Clean up other unnecessary data
    const keysToClean = ['tempData', 'cachedImages', 'oldLogs'];
    for (const key of keysToClean) {
      if (allData[key]) {
        console.log(`🗑️ Removing ${key} from storage`);
        await new Promise(resolve => {
          chrome.storage.local.remove([key], resolve);
        });
        cleanedUp = true;
      }
    }

    if (cleanedUp) {
      // Save the cleaned data
      await new Promise(resolve => {
        chrome.storage.local.set({ savedItems: allData.savedItems, categories: allData.categories }, resolve);
      });

      const newStorageInfo = await new Promise(resolve => {
        chrome.storage.local.getBytesInUse(null, resolve);
      });
      console.log(`✅ Storage cleanup completed. Usage: ${storageInfo} → ${newStorageInfo} bytes`);
    } else {
      console.log('ℹ️ No cleanup was possible');
    }

  } catch (error) {
    console.error('❌ Storage cleanup failed:', error);
    throw error;
  }
}

// Global functions are now defined at the top of the file

// Test function for save/override functionality
window.testSaveFeature = async function() {
  console.log('🧪 Testing save/override feature...');

  // Create test data if no posts exist
  if (Object.keys(savedItems).length === 0) {
    console.log('📝 Creating test data...');

    const testPost = {
      id: 'test_' + Date.now(),
      title: 'Test Image',
      caption: 'This is a test caption for testing the save feature',
      imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+VGVzdCBJbWFnZTwvdGV4dD48L3N2Zz4=',
      category: 'Test',
      timestamp: Date.now(),
      source: 'test'
    };

    savedItems['Test'] = [testPost];
    categories = ['Test'];

    // Save to storage
    await new Promise(resolve => {
      chrome.storage.local.set({ savedItems, categories }, resolve);
    });

    // Refresh UI
    await loadSavedData();

    console.log('✅ Test data created');
  }

  console.log('📋 Instructions:');
  console.log('1. Select a post from the list');
  console.log('2. Edit the title or caption');
  console.log('3. Save buttons should appear automatically');
  console.log('4. Click save to override the values');
  console.log('5. Select another post and come back - your saved values should load');
};

// Debug function to refresh context menu
window.debugRefreshContextMenu = function() {
  console.log('🔄 Refreshing context menu...');
  chrome.runtime.sendMessage({ action: "refreshContextMenu" }, (response) => {
    if (response && response.success) {
      console.log('✅ Context menu refreshed successfully');
    } else {
      console.error('❌ Failed to refresh context menu');
    }
  });
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Load custom presets first
  await loadCustomPresets();

  // Load saved data (posts) - this replaces the undefined loadCapturedPosts
  await loadSavedData();

  // Load saved links
  await loadSavedLinks();

  // setupEventListeners(); // Already called in initializeAdvancedScheduler()
  setupRewriteButtonListeners();
  updateCaptionCharCount();
  updateTimezoneInfo();

  // Initialize image editor integration
  try {
    imageEditorIntegration = new window.ImageEditorIntegration();
    console.log('✅ Image Editor Integration ready');
  } catch (error) {
    console.warn('⚠️ Image Editor Integration not available:', error);
  }

  // Initialize AI image editor module (will be initialized on demand)
  console.log('🔄 AI Image Editor Module will be initialized when needed');
});

// Queue-based Rewrite Functionality
let queueRewriteInProgress = false;
let queueRewriteAborted = false;
let currentQueueOperation = null;

// Queue rewrite for multiple posts using existing prompts
async function startQueueRewrite(target, promptType) {
  if (selectedPosts.size < 2) {
    // For single post, use existing functionality
    return handleRewriteClick({ target: { dataset: { target, prompt: promptType } } });
  }

  if (queueRewriteInProgress) {
    showMessage('❌ Queue rewrite already in progress', 'error');
    return;
  }

  // Ensure Gemini API is available
  if (!window.geminiAPI) {
    showMessage('❌ AI rewrite service not available. Please check your API configuration.', 'error');
    return;
  }

  // Get the prompt data
  const promptData = getPromptData(target, promptType);
  if (!promptData) {
    showMessage('❌ Invalid prompt configuration', 'error');
    return;
  }

  // Initialize queue processing
  queueRewriteInProgress = true;
  queueRewriteAborted = false;
  currentQueueOperation = { target, promptType, promptData };

  const postsArray = Array.from(selectedPosts);
  const totalPosts = postsArray.length;
  let completedPosts = 0;
  let successCount = 0;
  let errorCount = 0;

  // Show queue mode UI
  showQueueModeIndicator(true, target, promptData.name);
  updateQueueProgress(0, totalPosts);

  showMessage(`🔄 Starting queue rewrite: ${promptData.name} for ${totalPosts} posts`, 'info');

  try {
    for (let i = 0; i < postsArray.length; i++) {
      if (queueRewriteAborted) {
        showMessage('⏹️ Queue rewrite stopped by user', 'info');
        break;
      }

      const postId = postsArray[i];
      const post = window.getPostById(postId);

      if (!post) {
        console.error(`Post ${i + 1}: Post not found`);
        errorCount++;
        completedPosts++;
        updateQueueProgress(completedPosts, totalPosts);
        continue;
      }

      try {
        // Get current text based on target
        const currentText = getCurrentTextForPost(post, target);

        if (!currentText.trim()) {
          console.log(`Post ${i + 1}: Skipped ${target} (empty)`);
          completedPosts++;
          updateQueueProgress(completedPosts, totalPosts);
          continue;
        }

        // Rewrite the text
        const rewrittenText = await rewriteWithMedia(currentText, promptData.prompt, post.imageUrl);

        // Save the rewritten text
        if (target === 'title') {
          post.overriddenTitle = rewrittenText.trim();
          post.titleOverridden = true;
          post.titleOverriddenAt = new Date().toISOString();
        } else {
          post.overriddenCaption = rewrittenText.trim();
          post.captionOverridden = true;
          post.captionOverriddenAt = new Date().toISOString();
        }

        // Save immediately to prevent data loss
        await savePostData();

        successCount++;
        console.log(`Post ${i + 1}: ${target} rewritten successfully`);

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Post ${i + 1}: Failed to rewrite ${target} - ${error.message}`);
        errorCount++;
      }

      completedPosts++;
      updateQueueProgress(completedPosts, totalPosts);
    }

    // Final summary
    if (!queueRewriteAborted) {
      const summary = `✅ Queue rewrite completed! ${successCount} successful, ${errorCount} errors`;
      showMessage(summary, successCount > errorCount ? 'success' : 'warning');

      // Refresh the UI to show updated content if single post selected
      if (selectedPosts.size === 1) {
        updateSelectedPostsInfo();
      }
    }

  } catch (error) {
    console.error('Queue rewrite failed:', error);
    showMessage('❌ Queue rewrite operation failed', 'error');
  } finally {
    queueRewriteInProgress = false;
    currentQueueOperation = null;
    showQueueModeIndicator(false);
  }
}

function getCurrentTextForPost(post, target) {
  if (target === 'title') {
    // Priority order for title text:
    // 1. User's overridden title (if exists)
    // 2. Original title from post (if exists)
    // 3. Caption as fallback (only if no title exists)
    if (post.titleOverridden && post.overriddenTitle) {
      return post.overriddenTitle;
    } else if (post.title) {
      return post.title;
    } else {
      return post.caption || '';
    }
  } else {
    return post.captionOverridden ? post.overriddenCaption : (post.caption || '');
  }
}

function getPromptData(target, promptType) {
  const prompts = window.geminiRewritePrompts;
  if (!prompts || !prompts[target]) return null;

  // Normalize both the search term and prompt names for comparison
  const normalizedSearchTerm = promptType.toLowerCase().replace(/\s+/g, ' ').trim();

  return prompts[target].find(p => {
    const normalizedPromptName = p.name.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalizedPromptName === normalizedSearchTerm;
  });
}

function stopQueueRewrite() {
  queueRewriteAborted = true;
  showMessage('⏹️ Stopping queue rewrite...', 'info');
}

// Queue Mode UI Functions
function updateQueueModeUI() {
  const titleButtons = document.getElementById('titleRewriteButtons');
  const captionButtons = document.getElementById('captionRewriteButtons');

  if (selectedPosts.size > 1) {
    // Enable queue mode
    if (titleButtons) titleButtons.classList.add('queue-mode');
    if (captionButtons) captionButtons.classList.add('queue-mode');
  } else {
    // Disable queue mode
    if (titleButtons) titleButtons.classList.remove('queue-mode');
    if (captionButtons) captionButtons.classList.remove('queue-mode');
  }
}

function showQueueModeIndicator(show, target = '', promptName = '') {
  const indicator = document.getElementById('queueModeIndicator');
  if (!indicator) return;

  if (show) {
    indicator.classList.add('active');
    indicator.querySelector('span').textContent = `🔄 Queue Rewrite: ${promptName} (${target})`;
  } else {
    indicator.classList.remove('active');
  }
}

function updateQueueProgress(completed, total) {
  const progressFill = document.getElementById('queueProgressFill');
  const progressText = document.getElementById('queueProgressText');

  if (progressFill && progressText) {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${completed}/${total}`;
  }
}

async function rewriteWithMedia(originalText, instruction, mediaUrl, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try multimodal rewrite if media is available
      if (mediaUrl && window.geminiAPI.rewriteTextWithMedia) {
        return await window.geminiAPI.rewriteTextWithMedia(originalText, instruction, mediaUrl);
      } else {
        // Fall back to text-only rewrite
        return await window.geminiAPI.rewriteText(originalText, instruction);
      }
    } catch (error) {
      lastError = error;
      console.error(`Rewrite attempt ${attempt} failed:`, error);

      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5 seconds
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries failed, throw the last error
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Text-only filter functionality
function toggleTextOnlyFilter() {
  const button = document.getElementById('filterTextOnlyBtn');
  showTextOnlyFilter = !showTextOnlyFilter;

  if (showTextOnlyFilter) {
    button.classList.remove('btn-secondary');
    button.classList.add('btn-success');
    button.textContent = '📝 Text Only ✓';
    button.title = 'Show all posts';
  } else {
    button.classList.remove('btn-success');
    button.classList.add('btn-secondary');
    button.textContent = '📝 Text Only';
    button.title = 'Show only text posts';
  }

  // Reload posts with filter applied
  loadPosts();
}
