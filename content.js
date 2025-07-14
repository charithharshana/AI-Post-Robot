// Enhanced content capture for AI Post Robot
let captureSettings = {
  autoCapture: true,
  captionMaxLength: -1, // No limit - capture full captions
  enableCtrlClick: true
};

// Load capture settings
chrome.storage.local.get(['autoCapture', 'captionMaxLength', 'enableCtrlClick'], (result) => {
  captureSettings.autoCapture = result.autoCapture !== false;
  captureSettings.captionMaxLength = result.captionMaxLength || -1; // Default to no limit
  captureSettings.enableCtrlClick = result.enableCtrlClick !== false;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showSavedMessage") {
    const message = request.message || `✅ Content Captured! Total: ${request.count} | Captions: ${request.textCount} | Links: ${request.linkCount}`;
    showSimpleMessage(message);
  } else if (request.action === "updateCaptureSettings") {
    captureSettings = { ...captureSettings, ...request.settings };
  } else if (request.action === "updateQuickCaptureSettings") {
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

// Enhanced selection change listener - no caption length limit by default
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

  // Only truncate if captionMaxLength is set and > 0
  if (captureSettings.captionMaxLength > 0 && processed.length > captureSettings.captionMaxLength) {
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

  // Only Facebook and Pinterest are supported now
  // Facebook caption detection can be added here if needed

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

// Add Ctrl+click listener for quick save functionality
document.addEventListener('click', (e) => {
  // Check if Ctrl+click on an image and the feature is enabled
  if (e.ctrlKey && e.target.tagName === 'IMG' && captureSettings.enableCtrlClick) {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Stop event bubbling

    const imageUrl = e.target.src;
    if (!imageUrl) return;

    // Get the nearest caption for this image
    const nearestCaption = getNearestCaption(e.target);
    const processedCaption = processCaption(nearestCaption);

    // Send message to background script to save with last used category
    chrome.runtime.sendMessage({
      action: "ctrlClickSave",
      imageUrl: imageUrl,
      caption: processedCaption
    });

    // Show visual feedback
    showCtrlClickFeedback(e.target);
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

// Show visual feedback for Ctrl+click save
function showCtrlClickFeedback(imgElement) {
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: absolute;
    background: #48bb78;
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 10001;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    animation: ctrlClickPulse 0.6s ease-out;
  `;

  feedback.textContent = '✅ Quick Saved!';

  // Position near the image
  const rect = imgElement.getBoundingClientRect();
  feedback.style.left = (rect.left + window.scrollX + rect.width/2 - 50) + 'px';
  feedback.style.top = (rect.top + window.scrollY + rect.height/2 - 15) + 'px';

  // Add animation keyframes if not already added
  if (!document.getElementById('ctrl-click-styles')) {
    const style = document.createElement('style');
    style.id = 'ctrl-click-styles';
    style.textContent = `
      @keyframes ctrlClickPulse {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(feedback);

  // Remove after animation
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.remove();
    }
  }, 1500);
}