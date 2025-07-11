# AI Image Parameters Guide

## Overview
The AI Image+ Editor now includes a comprehensive set of clickable image generation parameters that can be easily added to prompts. This feature enhances the user experience by providing quick access to professional photography and artistic terms.

## Features Added

### 1. Parameters Panel
- **Location**: Below the chat input area in AI Image+ Editor
- **Toggle Button**: 🎨 Parameters button next to the Attach button
- **Collapsible Interface**: Organized into expandable categories

### 2. Parameter Categories

#### 📐 Composition & Framing
**Aspect Ratio / Orientation:**
- 16:9, 9:16, 1:1, 4:3 aspect ratios
- Vertical, Horizontal, Cinematic, Square formats

**Shot Type:**
- Close-up, Extreme close-up, Medium, Full-body
- Wide, Extreme wide, Macro shots

**Camera Angle:**
- Eye-level, Low-angle, High-angle
- Bird's-eye, Worm's-eye, Dutch angle, Over-shoulder

#### 📷 Camera & Lens Settings
**Lens Type:**
- Telephoto, Wide-angle, Macro, Fisheye
- 50mm Prime, 85mm Prime lenses

**Aperture / Depth of Field:**
- Shallow/Deep depth of field, Bokeh
- Blurry background, All in focus
- f/1.8, f/16 aperture settings

**Shutter Speed / Motion:**
- Long exposure, High-speed shutter
- Motion blur, Light trails, Freeze action

#### 💡 Lighting
**Lighting Style & Quality:**
- Cinematic, Studio, Rim, Soft, Hard
- Dramatic, Volumetric, Backlit
- High-key, Low-key, Neon lighting

**Time of Day / Natural Light:**
- Golden hour, Blue hour, Midday
- Overcast, Sunrise, Sunset, Night

#### 🎨 Style & Aesthetics
**Level of Realism / Quality:**
- Photorealistic, Hyperrealistic, Ultra-detailed
- 8K resolution, UHD, Cinematic photo

**Artistic Style / Medium:**
- Digital painting, Illustration, 3D render
- Octane render, Unreal Engine
- Watercolor, Oil painting, Charcoal, Pencil, Line art

**Film Type & Photography Style:**
- 35mm film, Kodachrome, Polaroid
- Black and white, Monochrome, Vintage

**Art Movements & Genres:**
- Impressionism, Surrealism, Cyberpunk
- Steampunk, Art Deco, Minimalist
- Abstract, Fantasy, Sci-fi

**Specific Artist Styles:**
- Ansel Adams, Studio Ghibli
- Tim Burton, Van Gogh

## How to Use

### 1. Opening Parameters Panel
1. Click the 🎨 Parameters button in the chat input area
2. The panel will expand showing all parameter categories
3. Click the ✕ button to close the panel

### 2. Adding Parameters to Prompts
1. Click any parameter button to add it to your prompt
2. Parameters are automatically added with comma separation
3. Visual feedback shows when a parameter is added (green highlight)
4. Continue adding multiple parameters as needed

### 3. Category Navigation
1. Click category headers to expand/collapse sections
2. ▼ indicates expanded, ▶ indicates collapsed
3. Categories remember their state during the session

### 4. Parameter Combination
- Parameters can be combined freely
- Example: "16:9 aspect ratio, cinematic lighting, photorealistic, golden hour"
- The system automatically handles comma separation

## UI Improvements

### Context Preview Fix
- **Issue Fixed**: Post title and caption text overflow
- **Solution**: Added proper text wrapping and scrollable container
- **Features**:
  - `word-wrap: break-word` for long words
  - `max-height: 120px` with `overflow-y: auto`
  - Full title and caption display (no truncation)
  - Proper line height and spacing

### Responsive Design
- Parameters panel adapts to different screen sizes
- Compact button layout for efficient space usage
- Scrollable content areas prevent layout breaking

## Technical Implementation

### CSS Classes Added
- `.parameters-panel` - Main container
- `.parameters-header` - Header with title and close button
- `.parameter-categories` - Categories container
- `.parameter-category` - Individual category
- `.category-header` - Clickable category header
- `.category-content` - Collapsible content area
- `.parameter-group` - Parameter group within category
- `.group-title` - Group title styling
- `.parameter-buttons` - Button container
- `.param-btn` - Individual parameter button

### JavaScript Methods Added
- `setupParametersPanel()` - Initialize panel functionality
- `toggleParametersPanel()` - Show/hide panel
- `showParametersPanel()` - Display panel
- `hideParametersPanel()` - Hide panel
- `addParameterToPrompt(parameter)` - Add parameter to input

### Event Listeners
- Parameters button click handler
- Close panel button handler
- Category toggle handlers
- Parameter button click handlers

## Benefits

1. **Improved User Experience**: Quick access to professional terms
2. **Consistency**: Standardized parameter terminology
3. **Efficiency**: No need to remember complex photography terms
4. **Visual Feedback**: Clear indication when parameters are added
5. **Organization**: Logical categorization of parameters
6. **Flexibility**: Easy to add/remove parameters from prompts

## Future Enhancements

1. **Custom Parameters**: Allow users to add custom parameter sets
2. **Parameter Presets**: Save frequently used parameter combinations
3. **Search Functionality**: Search within parameters
4. **Parameter Descriptions**: Tooltips explaining each parameter
5. **Recent Parameters**: Quick access to recently used parameters

## Troubleshooting

### Parameters Not Appearing
- Ensure the AI Image+ Editor is properly loaded
- Check browser console for JavaScript errors
- Verify the parameters panel is not hidden

### UI Layout Issues
- Clear browser cache and reload
- Check for CSS conflicts with other extensions
- Ensure proper viewport settings

### Parameter Addition Issues
- Verify chat input field is accessible
- Check for JavaScript errors in console
- Ensure proper event listener setup

## Support

For issues or feature requests related to the AI Image Parameters:
1. Check the browser console for errors
2. Verify all files are properly loaded
3. Test with the provided test file: `test-ai-image-parameters.html`
4. Report issues with specific parameter categories or buttons
