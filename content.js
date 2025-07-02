// Enhanced content capture for AI Post Robot
let captureSettings = {
  autoCapture: true,
  captionMaxLength: 280
};

// Load capture settings
chrome.storage.local.get(['autoCapture', 'captionMaxLength'], (result) => {
  captureSettings.autoCapture = result.autoCapture !== false;
  captureSettings.captionMaxLength = result.captionMaxLength || 280;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showSavedMessage") {
    showSimpleMessage(`✅ Content Captured! Total: ${request.count} | Captions: ${request.textCount} | Links: ${request.linkCount}`);
  } else if (request.action === "updateCaptureSettings") {
    captureSettings = { ...captureSettings, ...request.settings };
  }
});

function showSimpleMessage(text) {
  // Remove any existing messages
  const existingMessages = document.querySelectorAll('.ai-post-robot-message');
  existingMessages.forEach(msg => msg.remove());

  const messageDiv = document.createElement('div');
  messageDiv.className = 'ai-post-robot-message';
  messageDiv.textContent = text;

  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #48bb78;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
  `;

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 2000);
}

// Enhanced selection change listener with caption length limit
document.addEventListener("selectionchange", () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    const processedText = processCaption(selectedText);
    chrome.runtime.sendMessage({ action: "updateSelectedText", text: processedText });


  }
});

// Process and clean caption text
function processCaption(text) {
  if (!text) return '';

  // Remove excessive whitespace and line breaks
  let processed = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Truncate if too long
  if (processed.length > captureSettings.captionMaxLength) {
    processed = processed.substring(0, captureSettings.captionMaxLength - 3) + '...';
  }

  return processed;
}

// Enhanced platform-specific caption detection
function initializePlatformSpecificDetection() {
  const hostname = window.location.hostname;
  let lastCapturedCaption = '';

  const observer = new MutationObserver(() => {
    if (!captureSettings.autoCapture) return;

    let caption = '';
    let platform = '';

    if (hostname.includes('pinterest.com')) {
      platform = 'Pinterest';
      const pinDescription = document.querySelector('[data-test-id="pin-description"]');
      if (pinDescription) {
        caption = pinDescription.textContent.trim();
      }
    }
    else if (hostname.includes('instagram.com')) {
      platform = 'Instagram';
      const postCaption = document.querySelector('h1[class*="x1lliihq"]');
      if (postCaption) {
        caption = postCaption.textContent.trim();
      }
    }
    else if (hostname.includes('threads.net')) {
      platform = 'Threads';
      const threadText = document.querySelector('div[class*="x1lliihq"]');
      if (threadText) {
        caption = threadText.textContent.trim();
      }
    }
    else if (hostname.includes('reddit.com')) {
      platform = 'Reddit';
      const postTitle = document.querySelector('h1[data-test-id="post-title"]');
      const postText = document.querySelector('div[data-test-id="post-content"]');
      if (postTitle) {
        caption = postTitle.textContent.trim();
        if (postText) {
          caption += ' - ' + postText.textContent.trim();
        }
      }
    }
    else if (hostname.includes('facebook.com')) {
      platform = 'Facebook';
      // Enhanced Facebook detection
      const postText = document.querySelector('[data-testid="post_message"]') ||
                      document.querySelector('[data-ad-preview="message"]') ||
                      document.querySelector('div[dir="auto"][style*="text-align"]');
      if (postText) {
        caption = postText.textContent.trim();
      }
    }

    if (caption && caption !== lastCapturedCaption) {
      lastCapturedCaption = caption;
      const processedCaption = processCaption(caption);
      chrome.runtime.sendMessage({ action: "updateSelectedText", text: processedCaption });


    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// Initialize platform-specific detection
initializePlatformSpecificDetection();

// Additional helper function to get the most relevant caption based on clicked element
function getNearestCaption(element) {
  const hostname = window.location.hostname;
  let caption = '';

  if (hostname.includes('instagram.com')) {
    const article = element.closest('article');
    if (article) {
      const captionEl = article.querySelector('h1[class*="x1lliihq"]');
      if (captionEl) caption = captionEl.textContent.trim();
    }
  }
  else if (hostname.includes('threads.net')) {
    const thread = element.closest('article');
    if (thread) {
      const textEl = thread.querySelector('div[class*="x1lliihq"]');
      if (textEl) caption = textEl.textContent.trim();
    }
  }
  else if (hostname.includes('reddit.com')) {
    const post = element.closest('article');
    if (post) {
      const titleEl = post.querySelector('h1[data-test-id="post-title"]');
      const textEl = post.querySelector('div[data-test-id="post-content"]');
      if (titleEl) {
        caption = titleEl.textContent.trim();
        if (textEl) caption += ' - ' + textEl.textContent.trim();
      }
    }
  }

  return caption;
}

// Enhanced image interaction detection
let imageHoverTimeout;
let lastHoveredImage = null;

// Add enhanced click listener for better caption detection
document.addEventListener('mousedown', (e) => {
  if (e.button === 2) { // Right click
    const nearestCaption = getNearestCaption(e.target);
    if (nearestCaption) {
      const processedCaption = processCaption(nearestCaption);
      chrome.runtime.sendMessage({ action: "updateSelectedText", text: processedCaption });


    }
  }
});

// Add image hover detection for preview
document.addEventListener('mouseover', (e) => {
  if (e.target.tagName === 'IMG' && captureSettings.autoCapture) {
    clearTimeout(imageHoverTimeout);

    imageHoverTimeout = setTimeout(() => {
      if (e.target === lastHoveredImage) return;
      lastHoveredImage = e.target;

      const nearestCaption = getNearestCaption(e.target);
      if (nearestCaption) {
        const processedCaption = processCaption(nearestCaption);
        chrome.runtime.sendMessage({ action: "updateSelectedText", text: processedCaption });

        // Show hover preview
        showImagePreview(e.target, processedCaption);
      }
    }, 500); // 500ms delay for hover
  }
});

document.addEventListener('mouseout', (e) => {
  if (e.target.tagName === 'IMG') {
    clearTimeout(imageHoverTimeout);
    hideImagePreview();
  }
});

// Show image preview overlay
function showImagePreview(imgElement, caption) {
  // Remove existing preview
  hideImagePreview();

  if (!caption || caption.length < 10) return; // Only show for meaningful captions

  const preview = document.createElement('div');
  preview.id = 'ai-post-robot-preview';
  preview.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    max-width: 200px;
    z-index: 9999;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  preview.textContent = caption.length > 100 ? caption.substring(0, 100) + '...' : caption;

  // Position near the image
  const rect = imgElement.getBoundingClientRect();
  preview.style.left = (rect.left + window.scrollX) + 'px';
  preview.style.top = (rect.bottom + window.scrollY + 5) + 'px';

  document.body.appendChild(preview);
}

function hideImagePreview() {
  const preview = document.getElementById('ai-post-robot-preview');
  if (preview) {
    preview.remove();
  }
}