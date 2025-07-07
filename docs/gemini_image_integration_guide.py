"""
GEMINI IMAGE GENERATION/EDITING - INTEGRATION GUIDE
==================================================

Quick reference for integrating Google Gemini 2.0 Flash Preview Image Generation
into any Python application.

REQUIREMENTS:
- requests>=2.31.0
- Pillow>=10.0.0
- Google Gemini API Key

CORE IMPLEMENTATION:
"""

import requests
import base64
import json
from PIL import Image
from io import BytesIO
import os

class GeminiImageProcessor:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent"
    
    def generate_image(self, prompt, save_path=None):
        """Generate new image from text prompt"""
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"]
            }
        }
        
        response = requests.post(
            f"{self.base_url}?key={self.api_key}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            return self._process_response(response.json(), save_path)
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    def edit_image(self, image_path, prompt, save_path=None):
        """Edit existing image with text prompt"""
        # Encode image to base64
        with open(image_path, 'rb') as img_file:
            image_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        # Get MIME type
        ext = os.path.splitext(image_path)[1].lower()
        mime_types = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', 
                     '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'}
        mime_type = mime_types.get(ext, 'image/jpeg')
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": mime_type, "data": image_data}}
                ]
            }],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"]
            }
        }
        
        response = requests.post(
            f"{self.base_url}?key={self.api_key}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            return self._process_response(response.json(), save_path)
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    def _process_response(self, response_data, save_path):
        """Extract and save image from API response"""
        try:
            # Navigate response structure
            candidates = response_data.get('candidates', [])
            if not candidates:
                raise Exception("No candidates in response")
            
            parts = candidates[0].get('content', {}).get('parts', [])
            
            # Find image data
            image_data = None
            for part in parts:
                if 'inlineData' in part:
                    image_data = part['inlineData']['data']
                    break
            
            if not image_data:
                raise Exception("No image data found in response")
            
            # Decode and save image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            
            if save_path:
                image.save(save_path, 'PNG')
                return save_path
            else:
                return image
                
        except Exception as e:
            raise Exception(f"Failed to process response: {e}")

# USAGE EXAMPLES:
"""
# Initialize processor
processor = GeminiImageProcessor("YOUR_API_KEY_HERE")

# Generate new image
result = processor.generate_image(
    "A beautiful sunset over mountains", 
    "sunset.png"
)

# Edit existing image
result = processor.edit_image(
    "input.jpg", 
    "Transform this into a watercolor painting", 
    "output.png"
)
"""

# PREDEFINED PROMPTS (Optional):
PROMPTS = {
    "enhance": "Enhance this image by improving clarity, colors, and overall quality",
    "artistic": "Transform this image into a beautiful artistic painting",
    "vintage": "Apply a vintage filter effect with warm tones",
    "futuristic": "Transform with futuristic, sci-fi aesthetic with neon colors",
    "watercolor": "Transform this into a watercolor painting with soft, flowing colors",
    "sketch": "Convert this image into a pencil sketch drawing",
    "oil_painting": "Transform this into an oil painting with rich textures",
    "cartoon": "Convert this image into a cartoon/animated style"
}

# INTEGRATION EXAMPLE:
"""
def integrate_gemini_images(api_key):
    processor = GeminiImageProcessor(api_key)
    
    # For image generation
    def create_image(prompt, output_path):
        return processor.generate_image(prompt, output_path)
    
    # For image editing
    def edit_image(input_path, style, output_path):
        prompt = PROMPTS.get(style, style)  # Use predefined or custom
        return processor.edit_image(input_path, prompt, output_path)
    
    return create_image, edit_image

# Usage in your application:
create_img, edit_img = integrate_gemini_images("YOUR_API_KEY")
create_img("A cozy coffee shop", "coffee.png")
edit_img("photo.jpg", "artistic", "artistic_photo.png")
"""

# ERROR HANDLING:
"""
try:
    result = processor.generate_image("prompt", "output.png")
    print(f"Success: {result}")
except Exception as e:
    print(f"Error: {e}")
"""

# KEY POINTS:
"""
1. API Endpoint: gemini-2.0-flash-preview-image-generation:generateContent
2. Required Headers: Content-Type: application/json
3. Response Structure: candidates[0].content.parts[].inlineData.data
4. Image Format: Base64 encoded PNG
5. Input Formats: JPG, JPEG, PNG, GIF, WEBP
6. Max Image Size: Recommended < 4MB for input images
7. Rate Limits: Follow Google's API rate limiting guidelines
"""
