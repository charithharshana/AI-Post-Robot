## RoboPost API Knowledge Base for Chrome Extension Development

This document provides all the necessary information to integrate the Robopost API into a JavaScript-based application, such as a Chrome extension.

### 1. API Configuration

- **Base URL**: `https://public-api.robopost.app/v1`
- **Authentication**: All requests must include your API key as a URL query parameter.
  - `?apikey=YOUR_API_KEY`
- **Content-Type**:
  - `multipart/form-data` for file uploads.
  - `application/json` for scheduling posts.
- **Date Format**: All dates must be in **ISO 8601 UTC format** (e.g., `2025-05-30T17:00:00Z`).

### 2. Core Workflow

Scheduling a post with media is a two-step process:

1.  **Upload Media**: Send the image or video file to the `/medias/upload` endpoint. This returns a `storage_object_id`.
2.  **Create Post**: Send a JSON payload to the `/scheduled_posts/` endpoint, referencing the `storage_object_id` received in step 1.

---

### 3. Endpoint: Upload Media

Use this endpoint to upload a single image or video file.

- **Method**: `POST`
- **URL**: `/medias/upload`
- **Request**: `multipart/form-data` with a single field named `file`.

#### JavaScript Example (Using `fetch`)

This function takes a `File` object (e.g., from an `<input type="file">` element) and uploads it.

```javascript
async function uploadMedia(fileObject, apiKey) {
    const uploadUrl = `https://public-api.robopost.app/v1/medias/upload?apikey=${apiKey}`;
    
    const formData = new FormData();
    formData.append('file', fileObject);

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            // response.ok is false if status is 4xx or 5xx
            const errorData = await response.json();
            console.error('Upload failed:', response.status, errorData);
            return null;
        }

        const result = await response.json();
        console.log('Upload successful:', result);
        // Return the critical ID needed for scheduling
        return result.storage_object_id; 

    } catch (error) {
        console.error('Network error during upload:', error);
        return null;
    }
}
```

#### Successful Response (JSON)

```json
{
  "id": "64f20e2c915d2f1970ec8c09",
  "name": "my-image.jpg",
  "extension": "jpg",
  "storage_object_id": "9f73ad62-xxxxx-xxxxx-xxxxx-9556dcb903f4"
}
```

---

### 4. Endpoint: Create Scheduled Post

Use this endpoint to schedule a post with text and media.

- **Method**: `POST`
- **URL**: `/scheduled_posts/`
- **Request Body**: `application/json`

#### JavaScript Example (Using `fetch`)

This function takes a payload object and schedules the post.

```javascript
async function createScheduledPost(payload, apiKey) {
    const scheduleUrl = `https://public-api.robopost.app/v1/scheduled_posts/?apikey=${apiKey}`;

    try {
        const response = await fetch(scheduleUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Scheduling failed:', response.status, errorData);
            return null;
        }
        
        const result = await response.json();
        console.log('Scheduling successful:', result);
        return result;

    } catch (error) {
        console.error('Network error during scheduling:', error);
        return null;
    }
}
```

#### Example Payloads

**a) Post with a pre-uploaded image:**

```javascript
const imagePostPayload = {
    "text": "Check out this amazing image from my extension! 📸",
    "channel_ids": ["my_facebook_channel_id"],
    "schedule_at": "2025-08-15T10:00:00Z",
    "image_object_ids": ["9f73ad62-xxxxx-xxxxx-xxxxx-9556dcb903f4"] // From upload step
};
```

**b) Post with a video from a direct URL (great for large files):**

```javascript
const videoPostPayload = {
    "text": "Watch this awesome video! 🎬",
    "channel_ids": ["my_youtube_channel_id"],
    "schedule_at": "2025-08-15T11:00:00Z",
    "video_url": "https://tmpfiles.org/dl/some_video_id/video.mp4", // URL must be public
    "youtube_settings": {
        "videoTitle": "My Awesome Video Title",
        "videoDescription": "Detailed description for YouTube.",
        "videoPrivacyStatus": "public"
    }
};
```

**c) Post with multiple images from direct URLs:**

```javascript
const multiImagePostPayload = {
    "text": "A gallery of photos!",
    "channel_ids": ["my_instagram_channel_id"],
    "schedule_at": "2025-08-15T12:00:00Z",
    "image_urls": [
        "https://example.com/image1.png",
        "https://example.com/image2.png"
    ]
};
```

---

### 5. API Models & Payloads

#### Main Scheduling Payload (`PublicAPIScheduledPostCreateHTTPPayload`)

| Field | Type | Required? | Description |
| :--- | :--- | :--- | :--- |
| `text` | string | **Yes** | The main caption/text for the post. Can be an empty string. |
| `channel_ids`| Array of strings | **Yes**¹ | Array of channel IDs to publish to. ¹Not required if `is_draft` is `true`. |
| `schedule_at`| string (ISO 8601)| No | The UTC date/time to schedule the post. Defaults to now. |
| `is_draft` | boolean | No | `true` to save as a draft instead of scheduling. Defaults to `false`. |
| **Media (Choose one method)** |
| `image_object_ids`| Array of strings | No | Array of `storage_object_id`s from the upload endpoint for images. |
| `video_object_id`| string | No | A single `storage_object_id` from the upload endpoint for a video. |
| `gif_object_id` | string | No | A single `storage_object_id` from the upload endpoint for a GIF. |
| `image_urls` | Array of strings | No | Alternative: provide direct public URLs to images. The API will download them. |
| `video_url` | string | No | Alternative: provide a direct public URL to a video. |
| `gif_url` | string | No | Alternative: provide a direct public URL to a GIF. |
| **Platform Settings**|
| `facebook_settings`| object | No | See `FacebookSettings` below. |
| `instagram_settings`| object | No | See `InstagramSettings` below. |
| `youtube_settings`| object | No | See `YoutubeSettings` below. |
| *(...and others)* | *(...)* | No | |

#### Platform-Specific Settings (JavaScript Objects)

Include these nested objects in your main payload to customize posts for each platform.

**Facebook:**
```javascript
"facebook_settings": {
    "postType": "POST" // "POST" or "REELS"
}
```

**Instagram:**
```javascript
"instagram_settings": {
    "postType": "POST" // "POST", "REELS", or "STORIES"
}
```

**YouTube (required for video posts to YouTube):**
```javascript
"youtube_settings": {
    "videoTitle": "Your YouTube Video Title",
    "videoDescription": "A longer, detailed description for YouTube.",
    "videoType": "video", // "video" or "short"
    "videoPrivacyStatus": "public" // "public", "private", or "unlisted"
}
```

**Pinterest:**
```javascript
"pinterest_settings": {
    "pinTitle": "My Awesome Pin Title",
    "destinationLink": "https://your-website.com/blog-post"
}
```

---

### 6. Error Handling

Check the HTTP status code of the response to determine success or failure.

| Status Code | Reason | Example JSON Response |
| :--- | :--- | :--- |
| `200 OK` | Success. | *(The scheduled post object(s))* |
| `400 Bad Request` | Invalid payload, such as a missing required field. | `{"msg": "channel_ids is required ... unless the post is a draft."}` |
| `401 / 403` | Unauthorized. Your `apikey` is missing or invalid. | `{"detail": "Not authenticated"}` |
| `409 Conflict`| Account issue, like a frozen subscription. | `{"msg": "ACCOUNT_USAGE_FROZEN", ...}` |
| `504 Gateway Timeout` | The server took too long. Often happens with large file uploads. **Retry is recommended.** | *(HTML error page or timeout)* |

### 7. Best Practices for a Chrome Extension

1.  **Media Handling Strategy**:
    *   **For Images**: Use the `/medias/upload` endpoint directly. It's fast and reliable.
    *   **For Large Videos (>50MB)**: The `/medias/upload` endpoint may time out. The best strategy is to use the `video_url` field. You can upload the video to a temporary file host (like `tmpfiles.org`) from your extension and pass the direct download link to the RoboPost API.
2.  **API Key Security**: **Never hardcode your API key directly into the extension's public code.** Store it in a secure way, ideally fetched from a server you control or require the user to input it in the extension's options page.
3.  **User Experience (UX)**:
    *   Always provide feedback to the user (e.g., "Uploading...", "Scheduling...", "Post scheduled successfully!", "Error: ...").
    *   Schedule posts at least a few minutes in the future to account for processing time.
    *   Consider using `is_draft: true` for testing to avoid cluttering your social media feeds.
4.  **Date/Time**: Use `new Date().toISOString()` to easily get the current time in the required format.

### 8. Complete Workflow Example (JS Function)

This function orchestrates the entire process: it takes a file, uploads it, and then schedules a post using the result.

```javascript
/**
 * A complete function to upload a media file and schedule a post.
 * @param {File} fileObject - The file from an <input type="file">.
 * @param {string} caption - The text for the post.
 * @param {string[]} channelIds - Array of channel IDs.
 * @param {string} scheduleAt - ISO 8601 UTC string.
 * @param {string} apiKey - Your RoboPost API key.
 * @param {object} [platformSettings={}] - Optional platform-specific settings.
 */
async function scheduleMediaPost(fileObject, caption, channelIds, scheduleAt, apiKey, platformSettings = {}) {
    console.log("Step 1: Uploading media...");
    const storageId = await uploadMedia(fileObject, apiKey);

    if (!storageId) {
        console.error("Halting process: Media upload failed.");
        return null;
    }

    console.log(`Step 2: Scheduling post with storage_object_id: ${storageId}`);

    // Determine if it's an image or video based on file type
    const isVideo = fileObject.type.startsWith('video/');
    
    const payload = {
        text: caption,
        channel_ids: channelIds,
        schedule_at: scheduleAt,
        ...platformSettings // Spread in any platform-specific settings
    };

    if (isVideo) {
        payload.video_object_id = storageId;
    } else {
        payload.image_object_ids = [storageId];
    }
    
    const scheduledPost = await createScheduledPost(payload, apiKey);
    
    if (scheduledPost) {
        console.log("Process complete! Post scheduled.");
        return scheduledPost;
    } else {
        console.error("Halting process: Post scheduling failed.");
        return null;
    }
}

// HOW TO USE IT:
// const myFile = document.getElementById('fileInput').files[0];
// const API_KEY = 'your_secret_api_key';
// 
// scheduleMediaPost(
//     myFile,
//     "This post was scheduled from my awesome Chrome Extension!",
//     ["60821c84-b99c-4747-8ccc-782375a84832"], // Example Facebook Channel ID
//     new Date(Date.now() + 10 * 60 * 1000).toISOString(), // Schedule 10 mins from now
//     API_KEY
// );
```