document.addEventListener('DOMContentLoaded', function() {
  updateCounts();
  updateUrlList();
  setupEventListeners();

  // Listen for storage changes to update popup dynamically
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.savedItems || changes.counters)) {
      console.log('📊 Storage changed, refreshing popup...');
      updateCounts();
      updateUrlList();
    }
  });
});

function setupEventListeners() {
  document.getElementById('schedulePostsBtn').addEventListener('click', openScheduler);
  document.getElementById('resetBtn').addEventListener('click', resetAllContent);
  document.getElementById('addCategoryBtn').addEventListener('click', addNewCategory);
  document.getElementById('addUrlBtn').addEventListener('click', addNewUrl);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);

  // Add advanced scheduler button if it exists
  const advancedSchedulerBtn = document.getElementById('advancedSchedulerBtn');
  if (advancedSchedulerBtn) {
    advancedSchedulerBtn.addEventListener('click', openAdvancedScheduler);
  }
}

function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
}

function openScheduler() {
  chrome.tabs.create({ url: chrome.runtime.getURL('schedule.html') });
}

function openAdvancedScheduler() {
  chrome.tabs.create({ url: chrome.runtime.getURL('advanced-scheduler.html') });
}

// Add these new functions
function updateUrlList() {
  chrome.storage.local.get("enabledUrls", (result) => {
    const urls = result.enabledUrls || [];
    const urlList = document.getElementById('urlList');
    urlList.innerHTML = '';

    urls.forEach((url, index) => {
      const urlDiv = document.createElement('div');
      urlDiv.style.cssText = `
        margin: 5px 0;
        padding: 8px;
        background: #edf2f7;
        border-radius: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
      `;

      // Clean up URL display
      const displayUrl = url.replace(/^\*:\/\/\*\./, '').replace(/\/\*$/, '');

      urlDiv.innerHTML = `
        <span style="color: #4a5568; flex: 1;">${displayUrl}</span>
        <button id="removeUrl_${index}" style="background: #f56565; padding: 4px 8px; font-size: 11px;">❌</button>
      `;
      urlList.appendChild(urlDiv);

      document.getElementById(`removeUrl_${index}`).addEventListener('click', () => removeUrl(url));
    });
  });
}

function addNewUrl() {
  const urlInput = document.getElementById('newUrl');
  const newUrl = urlInput.value.trim();
  
  if (newUrl) {
    chrome.runtime.sendMessage({ 
      action: "addUrl", 
      url: newUrl 
    });
    urlInput.value = '';
    setTimeout(updateUrlList, 100);
  }
}

function removeUrl(url) {
  chrome.runtime.sendMessage({ 
    action: "removeUrl", 
    url: url 
  });
  setTimeout(updateUrlList, 100);
}

function updateCounts() {
  chrome.storage.local.get(["savedItems", "categories", "counters"], (result) => {
    const savedItems = result.savedItems || {};
    const categories = result.categories || [];
    const counters = result.counters || { captionCount: 0, linkCount: 0 };
    let totalCount = 0;
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';

    // Show recent posts first (last 5 posts across all categories)
    const allPosts = [];
    Object.keys(savedItems).forEach(category => {
      savedItems[category].forEach(post => {
        allPosts.push({ ...post, category });
      });
    });

    // Sort by timestamp (newest first) and take last 5
    const recentPosts = allPosts
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 5);

    if (recentPosts.length > 0) {
      const recentDiv = document.createElement('div');
      recentDiv.style.cssText = `
        margin: 8px 0;
        padding: 12px;
        background: #e6fffa;
        border-radius: 8px;
        border-left: 4px solid #38b2ac;
      `;

      let recentHtml = '<div style="font-weight: 600; color: #2d3748; margin-bottom: 8px;">🕒 Recent Posts</div>';

      recentPosts.forEach(post => {
        const timeAgo = getTimeAgo(post.timestamp);
        const caption = (post.caption || post.title || 'No caption').substring(0, 40);
        const source = post.source === 'ctrl_click' ? '🖱️ Ctrl+Click' :
                      post.source === 'pc_upload' ? '💻 PC Upload' :
                      post.source === 'ai_generated' ? '🤖 AI Generated' :
                      '📋 Context Menu';

        recentHtml += `
          <div style="margin: 4px 0; padding: 6px; background: white; border-radius: 4px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 500; color: #667eea;">${post.category}</span>
              <span style="color: #718096;">${timeAgo}</span>
            </div>
            <div style="color: #4a5568; margin-top: 2px;">${caption}${caption.length >= 40 ? '...' : ''}</div>
            <div style="color: #a0aec0; font-size: 10px; margin-top: 2px;">${source}</div>
          </div>
        `;
      });

      recentDiv.innerHTML = recentHtml;
      categoryList.appendChild(recentDiv);
    }

    // Show category summaries
    categories.forEach(category => {
      const count = savedItems[category] ? savedItems[category].length : 0;
      totalCount += count;

      const categoryDiv = document.createElement('div');
      categoryDiv.style.cssText = `
        margin: 8px 0;
        padding: 12px;
        background: #f7fafc;
        border-radius: 8px;
        border-left: 4px solid #667eea;
      `;

      categoryDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600; color: #4a5568;">${category}</span>
          <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${count}</span>
        </div>
        <div style="display: flex; gap: 5px;">
          <button id="export_${category}" style="flex: 1; padding: 6px; font-size: 12px; background: #48bb78;">📤 Export</button>
          <button id="reset_${category}" style="flex: 1; padding: 6px; font-size: 12px; background: #ed8936;">🔄 Reset</button>
          <button id="remove_${category}" style="flex: 1; padding: 6px; font-size: 12px; background: #f56565;">🗑️ Remove</button>
        </div>
      `;
      categoryList.appendChild(categoryDiv);

      document.getElementById(`export_${category}`).addEventListener('click', () => exportAll(category));
      document.getElementById(`reset_${category}`).addEventListener('click', () => resetCategory(category));
      document.getElementById(`remove_${category}`).addEventListener('click', () => removeCategory(category));
    });

    // Update statistics display
    const totalCountEl = document.getElementById('totalCount');
    totalCountEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>📊 Total Items:</span>
        <strong>${totalCount}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>📝 Captions:</span>
        <strong>${counters.captionCount}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>🔗 Links:</span>
        <strong>${counters.linkCount}</strong>
      </div>
    `;

  });
}

function getTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function exportAll(category) {
  // Only allow category-specific exports, not all exports
  if (!category) {
    alert("Please use individual category export buttons.");
    return;
  }

  chrome.storage.local.get("savedItems", (result) => {
    const savedItems = result.savedItems || {};
    const items = savedItems[category] || [];

    if (items.length === 0) {
      alert("No items to export in this category.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Image URL,Caption,Type\n";
    items.forEach(item => {
      // Remove line breaks and commas from the caption
      const cleanedCaption = item.caption
        ? item.caption.replace(/[\n\r]+/g, ' ').replace(/,/g, ' ')
        : "";

      // Get the proper download URL (same logic as download function)
      let exportUrl = '[TEXT POST]';
      if (!item.isTextOnly) {
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
      }

      const postType = item.isTextOnly ? 'TEXT' : 'MEDIA';
      csvContent += `${exportUrl},${cleanedCaption},${postType}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${category}_items.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Remove exported items from storage
    delete savedItems[category];

    // Recalculate counters based on remaining items
    const remainingItems = Object.values(savedItems).flat();
    const counters = {
      captionCount: remainingItems.filter(item => item.caption && item.caption.trim().length > 0).length,
      linkCount: remainingItems.filter(item => item.imageUrl).length
    };

    // Update both savedItems and counters
    chrome.storage.local.set({ savedItems, counters }, () => {
      updateCounts();
      chrome.action.setBadgeText({ text: getTotalCount(savedItems).toString() });
    });
  });
}

function resetAllContent() {
  if (confirm("Are you sure you want to reset all captured content? This will clear all saved items and cannot be undone.")) {
    chrome.storage.local.set({
      savedItems: {},
      counters: { captionCount: 0, linkCount: 0 }
    }, () => {
      updateCounts();
      chrome.action.setBadgeText({ text: "0" });
      alert("All content has been reset successfully.");
    });
  }
}

function resetCategory(category) {
  if (confirm(`Are you sure you want to reset all items in the "${category}" category? This will clear all saved items in this category and cannot be undone.`)) {
    chrome.storage.local.get("savedItems", (result) => {
      let savedItems = result.savedItems || {};

      // Clear the specific category
      savedItems[category] = [];

      // Recalculate counters based on remaining items
      const remainingItems = Object.values(savedItems).flat();
      const counters = {
        captionCount: remainingItems.filter(item => item.caption && item.caption.trim().length > 0).length,
        linkCount: remainingItems.filter(item => item.imageUrl).length
      };

      // Update storage
      chrome.storage.local.set({ savedItems, counters }, () => {
        updateCounts();
        chrome.action.setBadgeText({ text: getTotalCount(savedItems).toString() });
        alert(`"${category}" category has been reset successfully.`);
      });
    });
  }
}

function addNewCategory() {
  const newCategory = document.getElementById('newCategory').value.trim();
  if (newCategory) {
    chrome.runtime.sendMessage({ action: "addCategory", category: newCategory }, () => {
      document.getElementById('newCategory').value = '';
      updateCounts();
    });
  }
}

function removeCategory(category) {
  if (confirm(`Are you sure you want to remove the category "${category}" and all its saved items?`)) {
    chrome.storage.local.get(["savedItems", "categories"], (result) => {
      let savedItems = result.savedItems || {};
      let categories = result.categories || [];

      // Remove the category from savedItems
      delete savedItems[category];

      // Remove the category from the categories list
      categories = categories.filter(cat => cat !== category);

      // Recalculate counters based on remaining items
      const remainingItems = Object.values(savedItems).flat();
      const counters = {
        captionCount: remainingItems.filter(item => item.caption && item.caption.trim().length > 0).length,
        linkCount: remainingItems.filter(item => item.imageUrl).length
      };

      // Update storage
      chrome.storage.local.set({ savedItems, categories, counters }, () => {
        // Send message to background script to remove context menu item
        chrome.runtime.sendMessage({ action: "removeCategory", category: category }, () => {
          updateCounts();
          chrome.action.setBadgeText({ text: getTotalCount(savedItems).toString() });
        });
      });
    });
  }
}

function getTotalCount(savedItems) {
  return Object.values(savedItems).reduce((sum, list) => sum + list.length, 0);
}

