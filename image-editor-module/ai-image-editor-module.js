/**
 * AI Image Editor Module
 * Integrates Google Gemini native image model for creating/editing images
 * Features: Chatbox interface, predefined prompts, custom prompts, save to content library
 */

class AIImageEditorModule {
  constructor() {
    this.isInitialized = false;
    this.currentPostId = null;
    this.currentImageUrl = null;
    this.onSaveCallback = null;
    this.geminiAPI = null;
    this.chatHistory = [];
    this.defaultPrompts = this.getDefaultPrompts();
    this.predefinedPrompts = this.defaultPrompts;
    this.customPrompts = [];

    // Load custom prompts and modified default prompts from storage
    this.loadCustomPrompts();
    this.loadDefaultPrompts();
  }

  /**
   * Initialize the AI Image Editor
   */
  async init() {
    try {
      console.log('🔄 Initializing AI Image Editor Module...');
      
      // Initialize Gemini API
      if (window.geminiAPI) {
        this.geminiAPI = window.geminiAPI;
        await this.geminiAPI.initialize();
      } else {
        throw new Error('Gemini API not available');
      }

      this.isInitialized = true;
      console.log('✅ AI Image Editor Module initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI Image Editor Module:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Check if AI image editor can be used for the selected posts
   */
  canUseAIEditor(selectedPosts) {
    // Can work with or without selected posts
    if (!selectedPosts || selectedPosts.size === 0) {
      return { canUse: true, mode: 'create', reason: 'Create new image with AI' };
    }

    if (selectedPosts.size === 1) {
      const postId = Array.from(selectedPosts)[0];
      console.log('🔍 AI Editor checking post ID:', postId);
      const post = this.getPostById(postId);
      console.log('🔍 AI Editor found post:', post ? 'YES' : 'NO', post?.id, post?.category);

      if (!post) {
        console.warn('⚠️ AI Editor: Selected post not found for ID:', postId);
        // Instead of failing, allow creation mode when post is not found
        // This handles the case where data might not be loaded yet
        return { canUse: true, mode: 'create', reason: 'Create new image with AI (post data not available)' };
      }

      if (post.imageUrl && !this.isVideoUrl(post.imageUrl)) {
        return { canUse: true, mode: 'edit', post: post, reason: 'Edit existing image with AI' };
      } else if (post.imageUrl && this.isVideoUrl(post.imageUrl)) {
        return { canUse: false, reason: 'Video editing with AI is not supported' };
      } else {
        return { canUse: true, mode: 'create', post: post, reason: 'Create new image for this post' };
      }
    }

    return { canUse: false, reason: 'Please select at most one post for AI image editing' };
  }

  /**
   * Basic check if URL is a video
   */
  isVideoUrl(url) {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Get post by ID (connected to main app's post management)
   */
  getPostById(postId) {
    if (typeof window.getPostById === 'function') {
      return window.getPostById(postId);
    }
    return null;
  }

  /**
   * Get default predefined prompts
   */
  getDefaultPrompts() {
    return {
      create: [
        // Creative Storytelling & Narrative
        {
          id: 'fairy_tale_storyboard',
          name: 'Visual Storyboard for Classic Fairy Tale',
          icon: '📚',
          prompt: 'Create a visual storyboard for the story of \'Cinderella\' in a whimsical, Disney-like animation style, ensuring Cinderella\'s character design is consistent. The storyboard should illustrate key moments including: Cinderella in rags dreaming by the fireplace; the Fairy Godmother\'s magical transformation; Cinderella dancing with the Prince at the ball; her frantic escape at midnight leaving a slipper; and the Prince finding her with the glass slipper.',
          category: 'storytelling',
          multipleImages: true
        },
        {
          id: 'day_in_life_character',
          name: 'Day in the Life of Fictional Character',
          icon: '🚀',
          prompt: 'Generate a visual series showing \'a day in the life\' of a sci-fi space merchant on a bustling alien planet, maintaining a consistent \'Blade Runner\' aesthetic. Illustrate the progression of their day, including: opening their market stall at dawn; haggling with an alien customer over exotic goods; navigating a crowded, neon-lit street at dusk; and counting their earnings by candlelight inside their spaceship.',
          category: 'storytelling',
          multipleImages: true
        },
        {
          id: 'poem_story_illustration',
          name: 'Illustrate Short Original Poem or Story',
          icon: '🎭',
          prompt: 'Create a visual story in a soft watercolor style based on the theme \'The Lost Compass.\' The series should show: a young adventurer discovering an old, ornate brass compass in a forest; the adventurer looking lost as the compass needle spins wildly under a stormy sky; and the adventurer smiling, having realized the compass points not north, but towards a hidden, glowing waterfall.',
          category: 'storytelling',
          multipleImages: true
        },
        {
          id: 'historical_timeline',
          name: 'Historical Event Timeline',
          icon: '🚀',
          prompt: 'Create a photorealistic visual timeline of the first moon landing. The series should depict the key stages of the mission, including: the Apollo 11 Saturn V rocket launching from Earth; the Lunar Module \'Eagle\' descending towards the moon\'s surface; Neil Armstrong\'s historic first step on the moon; and the astronauts planting the American flag on the lunar surface.',
          category: 'storytelling',
          multipleImages: true
        },
        {
          id: 'mythological_life_cycle',
          name: 'Mythological Creature Life Cycle',
          icon: '🔥',
          prompt: 'Generate the life cycle of a mythical Phoenix in a vibrant, digital painting style. The visual sequence should include: a nest of embers with a glowing, magical egg at its center; a small fledgling Phoenix chick made of flame and ash; the majestic adult Phoenix in full flight with fiery wings; and the old Phoenix turning to ash as a new egg forms, beginning the cycle anew.',
          category: 'storytelling',
          multipleImages: true
        },

        // How-To & Step-by-Step Guides
        {
          id: 'visual_recipe',
          name: 'Step-by-Step Visual Recipe',
          icon: '👩‍🍳',
          prompt: 'Generate a step-by-step visual recipe for making blueberry muffins. The style should be high-quality, top-down photography in a bright kitchen. Create a clear instruction and a corresponding photo for each key action, including: all ingredients arranged neatly; hands whisking the dry ingredients; folding fresh blueberries into the batter; portioning the batter into a muffin tin; and the final golden-brown muffins cooling on a wire rack.',
          category: 'howto',
          multipleImages: true
        },
        {
          id: 'diy_craft_guide',
          name: 'DIY Craft or Project Guide',
          icon: '🌱',
          prompt: 'Generate a visual guide on how to create a small, potted succulent arrangement, using clean, well-lit photography. The guide should include images for the key steps: laying out the supplies (pot, soil, succulents); filling the pot with soil; carefully planting each succulent; and the final, beautiful arrangement sitting on a sunny windowsill.',
          category: 'howto',
          multipleImages: true
        },
        {
          id: 'fitness_yoga_sequence',
          name: 'Fitness or Yoga Sequence',
          icon: '🧘‍♀️',
          prompt: 'Create a visual guide for a \'Beginner\'s Yoga Flow.\' The model and background should be consistent, showing a person in athletic wear in a calming studio. Generate clean illustrations for the main poses in the sequence, such as: Mountain Pose, Forward Fold, Warrior II Pose, and Child\'s Pose.',
          category: 'howto',
          multipleImages: true
        },
        {
          id: 'makeup_tutorial',
          name: 'Step-by-Step Makeup Tutorial',
          icon: '💄',
          prompt: 'Generate a close-up visual tutorial for a \'classic smokey eye,\' ensuring the model\'s face and eye shape remain identical throughout. The tutorial should include images for each major step: applying a neutral base shadow; blending a darker shadow into the crease; applying black eyeliner to the lash line; and the final, completed look with mascara.',
          category: 'howto',
          multipleImages: true
        },
        {
          id: 'tech_unboxing',
          name: 'Tech Product Unboxing Sequence',
          icon: '📱',
          prompt: 'Create a professional product photography sequence showing the unboxing of a new smartphone. The series should visually narrate the experience, including: the sealed, minimalist product box on a table; hands lifting the lid to reveal the phone; the phone being lifted out with accessories underneath; and the phone turned on, displaying its welcome screen.',
          category: 'howto',
          multipleImages: true
        },

        // Progression & Transformation
        {
          id: 'four_seasons',
          name: 'Location Through Four Seasons',
          icon: '🍂',
          prompt: 'Generate a visual series showing the transformation of a charming stone bridge over a creek through the four seasons. The camera angle and bridge must remain identical. The series should include scenes for: Spring, with budding trees; Summer, with lush green foliage; Autumn, with vibrant red and orange leaves; and Winter, with the scene covered in snow.',
          category: 'progression',
          multipleImages: true
        },
        {
          id: 'home_renovation',
          name: 'Home Renovation Before/During/After',
          icon: '🏠',
          prompt: 'Generate a visual series of a living room renovation, keeping the room\'s structure consistent. The series should show: the \'Before\' state with dated furniture and decor; the \'During\' state, empty and under construction; and the \'After\' state as a modern, fully furnished Scandinavian-style living room.',
          category: 'progression',
          multipleImages: true
        },
        {
          id: 'plant_growth',
          name: 'Plant Growth from Seed to Fruit',
          icon: '🍅',
          prompt: 'Generate a visual progression of a tomato plant\'s growth, from start to finish. Include images of: a tiny sprout emerging from soil; a young, leafy plant; the mature plant with small yellow flowers; and the same plant bearing several ripe, red tomatoes.',
          category: 'progression',
          multipleImages: true
        },
        {
          id: 'day_to_night_cityscape',
          name: 'Day to Night Cityscape Transformation',
          icon: '🌃',
          prompt: 'Generate a visual set of the same city skyline view, showing its transformation from day to night. Include a daytime image with a bright blue sky and clear details, and a nighttime image of the same skyline illuminated by millions of city lights, with light trails from traffic below.',
          category: 'progression',
          multipleImages: true
        },
        {
          id: 'character_aging',
          name: 'Character Aging Over Time',
          icon: '👴',
          prompt: 'Create a series of realistic portraits showing the same character aging, ensuring key facial features remain consistent. The portraits should depict the person as a curious child, a confident young adult, a thoughtful middle-aged person, and a wise elderly person.',
          category: 'progression',
          multipleImages: true
        },

        // Product & Design Showcase
        {
          id: 'product_multiple_angles',
          name: 'Product from Multiple Angles',
          icon: '👟',
          prompt: 'Generate a complete product showcase of a new, high-tech running shoe using clean studio photography on a white background. The showcase should include: a side profile view, a top-down view, and a three-quarter view to highlight the shoe\'s design and sole.',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'outfit_different_occasions',
          name: 'Style One Outfit for Different Occasions',
          icon: '👔',
          prompt: 'Generate a fashion lookbook showing how to style a single classic white button-down shirt for different occasions, using a consistent model. The lookbook should include styles for: a professional \'Work\' look, a relaxed \'Casual\' look, and a chic \'Evening\' look.',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'room_different_styles',
          name: 'Room in Different Interior Design Styles',
          icon: '🛋️',
          prompt: 'Generate a set of images showing the same living room decorated in different styles, keeping the room\'s architecture unchanged. The set should include the room designed in a \'Minimalist\' style, a \'Bohemian\' style, and an \'Industrial\' style.',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'logo_design_process',
          name: 'Logo Design Process from Sketch to Final',
          icon: '☕',
          prompt: 'Create a visual series showing the design process for a coffee shop logo called \'The Daily Grind.\' The series should include: a page of initial pencil sketches with various concepts; a refined, clean vector version of the chosen logo in black and white; and the final, full-color logo applied to a mockup of a coffee cup.',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'brand_identity_kit',
          name: 'Complete Brand Identity Kit',
          icon: '🧼',
          prompt: 'Generate a brand identity kit for a luxury soap company named \'Solis,\' with an elegant, minimalist style. The kit should include visuals of: the primary logo design, the brand\'s color palette, a business card mockup, and a product packaging mockup.',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'car_restoration',
          name: 'Car Restoration Sequence',
          icon: '🚗',
          prompt: 'Generate a visual series showing the complete restoration of a classic 1967 Ford Mustang. Include images of: the car as a rusty barn find; the car mid-restoration in a workshop with primer paint; and the fully restored car with a glossy cherry-red paint job and gleaming chrome.',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'cocktail_recipe',
          name: 'Cocktail Recipe Step-by-Step',
          icon: '🍹',
          prompt: 'Create a visual guide to making a \'Classic Mojito\' in a stylish bar setting. The guide should feature images for the key steps: muddling fresh mint and lime; filling the glass with crushed ice; pouring the rum and soda water; and the final, beautifully garnished mojito.',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'planet_exploration',
          name: 'Fictional Planet Exploration Log',
          icon: '🌍',
          prompt: 'Create a cinematic \'Captain\'s Log\' from the exploration of a fictional jungle planet. The visual log should include: an astronaut\'s first-person view of the dense, alien jungle; the astronaut taking a sample from a giant, bioluminescent mushroom; a wide shot of a breathtaking alien waterfall; and the astronaut looking at two moons in the planet\'s night sky.',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'app_icon_set',
          name: 'Themed App Icon Set',
          icon: '☀️',
          prompt: 'Generate a cohesive set of app icons for a weather app, using a clean, modern \'glassmorphism\' style. The set should include icons for all major weather conditions, such as: \'Sunny,\' \'Cloudy,\' \'Rainy,\' and \'Stormy.\'',
          category: 'product',
          multipleImages: true
        },
        {
          id: 'character_expressions',
          name: 'Character Expression Sheet',
          icon: '😊',
          prompt: 'Generate a character expression sheet for an anime-style female character with pink hair, keeping her design perfectly consistent. The sheet should include portraits showing different emotions, such as: happy, sad, angry, and shy.',
          category: 'product',
          multipleImages: true
        }
      ],

      edit: [
        {
          id: 'change_background',
          name: 'Change the Entire Background',
          icon: '🌅',
          prompt: 'Using this photo of a person or object, change the background to a completely new environment, seamlessly blending the lighting and perspective. Example: Change the background to a beautiful, serene beach at sunset, matching the lighting on the subject to the warm, golden light of the new background.',
          category: 'transformation',
          multipleImages: false
        },
        {
          id: 'modify_interior_design',
          name: 'Modify Interior Design Style',
          icon: '🏠',
          prompt: 'Take this photo of a room and transform its style while keeping the original window placement and core architecture. Example: Transform the style into \'modern industrial\' with exposed brick on one wall, a dark leather sofa, metal light fixtures, and polished concrete floors.',
          category: 'design',
          multipleImages: false
        },
        {
          id: 'alter_time_season',
          name: 'Alter Time of Day or Season',
          icon: '🌙',
          prompt: 'Change the entire mood and atmosphere by changing the environmental conditions. Example: Transform this daytime park scene into a magical nighttime setting with a dark, clear sky showing the Milky Way and warm glowing park lamps.',
          category: 'transformation',
          multipleImages: false
        },
        {
          id: 'restore_change_object',
          name: 'Restore or Change an Object',
          icon: '🔧',
          prompt: 'Restore a worn-out item to its former glory or give it a completely new look. Example: Take this rusty, old bicycle and restore it with a glossy, cherry-red paint job, gleaming chrome handlebars, and brand-new tires, looking like it\'s in a photography studio.',
          category: 'restoration',
          multipleImages: false
        },
        {
          id: 'change_expression',
          name: 'Change Expression or Features',
          icon: '😊',
          prompt: 'Make subtle or significant changes to a person\'s face while keeping their identity intact. Example: Change this person\'s neutral expression to a joyful, genuine laugh, including realistic details like crinkles around the eyes.',
          category: 'portrait',
          multipleImages: false
        },
        {
          id: 'apply_artistic_style',
          name: 'Apply New Artistic Style',
          icon: '🎨',
          prompt: 'Transform this photograph into a painting in a famous artistic style. Example: Transform this city street into a painting in the style of Vincent van Gogh with swirling, thick brushstrokes and a vibrant, expressive color palette, similar to \'The Starry Night\'.',
          category: 'artistic',
          multipleImages: false
        },
        {
          id: 'colorize_bw_photo',
          name: 'Colorize Black and White Photo',
          icon: '🌈',
          prompt: 'Intelligently add realistic and historically appropriate color to this monochrome image. Example: Colorize this black and white historical photograph of a 1950s street scene, paying close attention to creating realistic colors for the vintage cars, clothing, and storefronts.',
          category: 'restoration',
          multipleImages: false
        },
        {
          id: 'remove_replace_object',
          name: 'Remove or Replace Object/Person',
          icon: '🚫',
          prompt: 'Cleanly remove distracting elements or swap an object for another, intelligently filling in the background. Example: In this vacation photo at the Eiffel Tower, remove all the other people and tourists from the background, leaving only the main subjects and the scenery.',
          category: 'editing',
          multipleImages: false
        },
        {
          id: 'expand_image_outpaint',
          name: 'Expand the Image (Outpainting)',
          icon: '🔍',
          prompt: '\'Zoom out\' of this existing photo, creatively generating the surrounding environment that was outside the original frame. Example: Take this close-up portrait and expand it to show the full body, revealing they are sitting on a park bench, holding a book on a sunny afternoon.',
          category: 'expansion',
          multipleImages: false
        },
        {
          id: 'change_character_outfit',
          name: 'Change Character\'s Outfit',
          icon: '👔',
          prompt: 'Change what a person is wearing without altering the person, their pose, or the background. Example: Change this person\'s business suit to a rugged, brown leather jacket, a simple grey t-shirt, and dark jeans, keeping the pose and background exactly the same.',
          category: 'fashion',
          multipleImages: false
        }
      ]
    };
  }

  /**
   * Load custom prompts from storage
   */
  async loadCustomPrompts() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['aiImageEditorCustomPrompts'], (result) => {
        if (result.aiImageEditorCustomPrompts) {
          this.customPrompts = result.aiImageEditorCustomPrompts;
          console.log('✅ Loaded custom prompts:', this.customPrompts.length);
        } else {
          console.log('ℹ️ No custom prompts found in storage');
        }
        resolve();
      });
    });
  }

  /**
   * Save custom prompts to storage
   */
  saveCustomPrompts() {
    chrome.storage.local.set({ aiImageEditorCustomPrompts: this.customPrompts }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to save custom prompts:', chrome.runtime.lastError);
      } else {
        console.log('✅ Custom prompts saved:', this.customPrompts.length);
      }
    });
  }

  /**
   * Load default prompts from storage (if modified)
   */
  async loadDefaultPrompts() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['aiImageEditorDefaultPrompts'], (result) => {
        if (result.aiImageEditorDefaultPrompts) {
          this.predefinedPrompts = result.aiImageEditorDefaultPrompts;
        }
        resolve();
      });
    });
  }

  /**
   * Save default prompts to storage
   */
  saveDefaultPrompts() {
    chrome.storage.local.set({ aiImageEditorDefaultPrompts: this.predefinedPrompts });
  }

  /**
   * Reset default prompts to original values
   */
  resetDefaultPrompts() {
    this.predefinedPrompts = this.getDefaultPrompts();
    this.saveDefaultPrompts();
  }

  /**
   * Add custom prompt
   */
  addCustomPrompt(prompt) {
    const customPrompt = {
      id: `custom_${Date.now()}`,
      name: prompt.name,
      icon: prompt.icon || '🎯',
      prompt: prompt.prompt,
      category: 'custom',
      isCustom: true,
      requiresImage: prompt.requiresImage || false
    };

    this.customPrompts.push(customPrompt);
    this.saveCustomPrompts();
    console.log('✅ Custom prompt added:', customPrompt);
    return customPrompt;
  }

  /**
   * Remove custom prompt
   */
  removeCustomPrompt(promptId) {
    this.customPrompts = this.customPrompts.filter(p => p.id !== promptId);
    this.saveCustomPrompts();
  }

  /**
   * Edit default prompt
   */
  editDefaultPrompt(promptId, updatedPrompt) {
    // Find and update the prompt in both create and edit arrays
    ['create', 'edit'].forEach(mode => {
      const promptIndex = this.predefinedPrompts[mode].findIndex(p => p.id === promptId);
      if (promptIndex !== -1) {
        this.predefinedPrompts[mode][promptIndex] = {
          ...this.predefinedPrompts[mode][promptIndex],
          ...updatedPrompt
        };
      }
    });
    this.saveDefaultPrompts();
  }

  /**
   * Get all prompts for a specific mode
   */
  getPromptsForMode(mode) {
    const predefined = this.predefinedPrompts[mode] || [];
    const custom = this.customPrompts.filter(p => 
      mode === 'create' ? !p.requiresImage : p.requiresImage !== false
    );
    return [...predefined, ...custom];
  }

  /**
   * Open the AI Image Editor
   */
  async openAIEditor(selectedPosts, onSaveCallback) {
    console.log('🔄 Opening AI Image Editor...');

    if (!this.isInitialized) {
      await this.init();
    }

    const canUseResult = this.canUseAIEditor(selectedPosts);
    if (!canUseResult.canUse) {
      throw new Error(canUseResult.reason);
    }

    // For replace functionality, we need to use the selectedPosts ID format (category_index)
    // instead of the post.id, because the save callback expects this format
    const selectedPostId = selectedPosts && selectedPosts.size === 1 ? Array.from(selectedPosts)[0] : null;

    this.currentPostId = selectedPostId; // Use the selected post ID format for replace functionality
    this.currentPost = canUseResult.post || null;
    this.currentImageUrl = canUseResult.post ? canUseResult.post.imageUrl : null;

    console.log('🔍 AI Editor opened with:', {
      selectedPostId: selectedPostId,
      currentPostId: this.currentPostId,
      hasPost: !!this.currentPost,
      mode: canUseResult.mode,
      replaceEnabled: !!this.currentPostId
    });
    this.onSaveCallback = onSaveCallback;
    this.chatHistory = [];

    try {
      // Create AI editor modal
      this.createAIEditorModal(canUseResult.mode);
      
      console.log('✅ AI Image Editor opened successfully');
    } catch (error) {
      console.error('❌ Failed to open AI Image Editor:', error);
      await this.closeAIEditor();
      throw error;
    }
  }

  /**
   * Create the AI Image Editor modal
   */
  createAIEditorModal(mode) {
    // Remove existing modal if any
    this.removeAIEditorModal();

    // Add styles
    const style = document.createElement('style');
    style.id = 'ai-image-editor-styles';
    style.textContent = this.getAIEditorStyles();
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.id = 'ai-image-editor-modal';
    modal.className = 'ai-image-editor-modal';
    modal.innerHTML = this.getAIEditorHTML(mode);

    document.body.appendChild(modal);

    // Setup event listeners
    this.setupAIEditorListeners(mode);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Initialize the interface
    this.initializeAIEditorInterface(mode);
  }

  /**
   * Get AI Editor HTML structure
   */
  getAIEditorHTML(mode) {
    const modeTitle = mode === 'create' ? '🤖 AI Image+ Editor' : '🤖 AI Image+ Editor';
    const currentImageSection = mode === 'edit' && this.currentImageUrl ? `
      <div class="current-image-section">
        <div class="current-image-header">
          <h4>Current Image:</h4>
          <label class="image-attach-checkbox">
            <input type="checkbox" id="attachImageCheckbox" checked>
            <span class="checkmark">✓</span>
            <span class="checkbox-label">Attach to prompt</span>
          </label>
        </div>
        <img src="${this.currentImageUrl}" alt="Current image" class="current-image-preview">
        <div class="image-attach-info">
          <small>✓ Checked: Edit this image | ✗ Unchecked: Generate new image</small>
        </div>
      </div>
    ` : '';

    // Context inclusion section (for both create and edit modes when there's a current post)
    const contextSection = this.currentPost ? `
      <div class="context-inclusion-section">
        <div class="context-header">
          <h4>📝 Post Context:</h4>
        </div>
        <div class="context-options">
          <label class="context-checkbox">
            <input type="checkbox" id="includeTitleCheckbox" checked>
            <span class="checkmark">✓</span>
            <span class="checkbox-label">Include title in prompt</span>
          </label>
          <label class="context-checkbox">
            <input type="checkbox" id="includeCaptionCheckbox" checked>
            <span class="checkmark">✓</span>
            <span class="checkbox-label">Include caption in prompt</span>
          </label>
        </div>
        <div class="context-preview">
          ${this.currentPost.title ? `<div class="context-item"><strong>Title:</strong> ${this.currentPost.title}</div>` : ''}
          ${this.currentPost.caption ? `<div class="context-item"><strong>Caption:</strong> ${this.currentPost.caption}</div>` : ''}
        </div>
      </div>
    ` : '';

    return `
      <div class="ai-editor-overlay">
        <div class="ai-editor-container">
          <div class="ai-editor-header">
            <h3>${modeTitle}</h3>
            <button id="ai-editor-close" class="btn btn-secondary">✖️ Close</button>
          </div>
          <div class="ai-editor-main">
            <div class="ai-editor-sidebar">
              <div class="prompts-panel">
                <div class="prompts-header">
                  <span class="prompts-title">💡 Quick Prompts</span>
                  <button id="add-custom-prompt-btn" class="btn-compact btn-add">+ Add Custom</button>
                </div>
                <div id="prompts-list" class="prompts-list">
                  <!-- Prompts will be populated here -->
                </div>
              </div>
              ${currentImageSection}
              ${contextSection}
            </div>
            <div class="ai-editor-content">
              <div class="chat-container">
                <div id="chat-history" class="chat-history">
                  <div class="welcome-message">
                    <div class="ai-message">
                      <div class="message-content">
                        👋 Welcome to AI Image ${mode === 'create' ? 'Creator' : 'Editor'}!<br>
                        ${mode === 'create' ? 
                          'Describe the image you want to create, or use one of the quick prompts on the left.' : 
                          'Describe how you want to edit your image, or use one of the quick prompts on the left.'
                        }
                      </div>
                    </div>
                  </div>
                </div>
                <div class="chat-input-container">
                  <div id="attached-files" class="attached-files" style="display: none;"></div>

                  <!-- Image Generation Parameters Panel -->
                  <div id="parameters-panel" class="parameters-panel" style="display: none;">
                    <div class="parameters-header">
                      <span class="parameters-title">🎨 Image Parameters</span>
                      <button id="close-parameters-btn" class="btn-compact">✕</button>
                    </div>
                    <div class="parameters-content">
                      <div class="parameter-categories">
                        <!-- Clean parameter structure without fake resolution claims -->
                        <div class="parameter-category">
                          <div class="category-header" data-category="composition">
                            <span class="category-icon">📐</span>
                            <span class="category-title">Composition & Framing</span>
                            <span class="category-toggle">▼</span>
                          </div>
                          <div class="category-content" data-category="composition" style="display: none;">
                            <div class="parameter-group">
                              <div class="group-title">Aspect Ratio / Orientation</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="16:9 aspect ratio">16:9</button>
                                <button class="param-btn" data-param="9:16 aspect ratio">9:16</button>
                                <button class="param-btn" data-param="1:1 aspect ratio">1:1</button>
                                <button class="param-btn" data-param="4:3 aspect ratio">4:3</button>
                                <button class="param-btn" data-param="vertical image">Vertical</button>
                                <button class="param-btn" data-param="horizontal image">Horizontal</button>
                                <button class="param-btn" data-param="cinematic widescreen">Cinematic</button>
                                <button class="param-btn" data-param="square format">Square</button>
                              </div>
                            </div>
                            <div class="parameter-group">
                              <div class="group-title">Shot Type</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="close-up shot">Close-up</button>
                                <button class="param-btn" data-param="extreme close-up shot">Extreme Close-up</button>
                                <button class="param-btn" data-param="medium shot">Medium</button>
                                <button class="param-btn" data-param="full-body shot">Full-body</button>
                                <button class="param-btn" data-param="wide shot">Wide</button>
                                <button class="param-btn" data-param="extreme wide shot">Extreme Wide</button>
                                <button class="param-btn" data-param="macro shot">Macro</button>
                              </div>
                            </div>
                            <div class="parameter-group">
                              <div class="group-title">Camera Angle</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="eye-level shot">Eye-level</button>
                                <button class="param-btn" data-param="low-angle shot">Low-angle</button>
                                <button class="param-btn" data-param="high-angle shot">High-angle</button>
                                <button class="param-btn" data-param="bird's-eye view">Bird's-eye</button>
                                <button class="param-btn" data-param="worm's-eye view">Worm's-eye</button>
                                <button class="param-btn" data-param="dutch angle">Dutch angle</button>
                                <button class="param-btn" data-param="over-the-shoulder shot">Over-shoulder</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- MEDIUM PRIORITY: Lighting -->
                        <div class="parameter-category">
                          <div class="category-header" data-category="lighting">
                            <span class="category-icon">💡</span>
                            <span class="category-title">Lighting & Atmosphere</span>
                            <span class="category-toggle">▼</span>
                          </div>
                          <div class="category-content" data-category="lighting" style="display: none;">
                            <div class="parameter-group">
                              <div class="group-title">Lighting Style & Quality</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="cinematic lighting">Cinematic</button>
                                <button class="param-btn" data-param="studio lighting">Studio</button>
                                <button class="param-btn" data-param="natural lighting">Natural</button>
                                <button class="param-btn" data-param="golden hour lighting">Golden Hour</button>
                                <button class="param-btn" data-param="soft light">Soft</button>
                                <button class="param-btn" data-param="dramatic lighting">Dramatic</button>
                                <button class="param-btn" data-param="volumetric lighting">Volumetric</button>
                                <button class="param-btn" data-param="rim lighting">Rim</button>
                              </div>
                            </div>
                            <div class="parameter-group">
                              <div class="group-title">Time of Day</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="blue hour">Blue Hour</button>
                                <button class="param-btn" data-param="sunrise">Sunrise</button>
                                <button class="param-btn" data-param="sunset">Sunset</button>
                                <button class="param-btn" data-param="midday sun">Midday</button>
                                <button class="param-btn" data-param="night">Night</button>
                                <button class="param-btn" data-param="overcast">Overcast</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- LOWER PRIORITY: Camera & Lens Settings -->
                        <div class="parameter-category">
                          <div class="category-header" data-category="camera">
                            <span class="category-icon">📷</span>
                            <span class="category-title">Camera & Lens Settings</span>
                            <span class="category-toggle">▼</span>
                          </div>
                          <div class="category-content" data-category="camera" style="display: none;">
                            <div class="parameter-group">
                              <div class="group-title">Lens Type</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="telephoto lens">Telephoto</button>
                                <button class="param-btn" data-param="wide-angle lens">Wide-angle</button>
                                <button class="param-btn" data-param="macro lens">Macro</button>
                                <button class="param-btn" data-param="fisheye lens">Fisheye</button>
                                <button class="param-btn" data-param="50mm prime lens">50mm Prime</button>
                                <button class="param-btn" data-param="85mm prime lens">85mm Prime</button>
                              </div>
                            </div>
                            <div class="parameter-group">
                              <div class="group-title">Aperture / Depth of Field</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="shallow depth of field">Shallow DOF</button>
                                <button class="param-btn" data-param="deep depth of field">Deep DOF</button>
                                <button class="param-btn" data-param="bokeh">Bokeh</button>
                                <button class="param-btn" data-param="blurry background">Blurry BG</button>
                                <button class="param-btn" data-param="everything in focus">All in Focus</button>
                                <button class="param-btn" data-param="f/1.8 aperture">f/1.8</button>
                                <button class="param-btn" data-param="f/16 aperture">f/16</button>
                              </div>
                            </div>
                            <div class="parameter-group">
                              <div class="group-title">Shutter Speed / Motion</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="long exposure">Long Exposure</button>
                                <button class="param-btn" data-param="high-speed shutter">High-speed</button>
                                <button class="param-btn" data-param="motion blur">Motion Blur</button>
                                <button class="param-btn" data-param="light trails">Light Trails</button>
                                <button class="param-btn" data-param="freeze action">Freeze Action</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- LOWEST PRIORITY: Style & Aesthetics -->
                        <div class="parameter-category">
                          <div class="category-header" data-category="style">
                            <span class="category-icon">🎨</span>
                            <span class="category-title">Style & Aesthetics (Advanced)</span>
                            <span class="category-toggle">▼</span>
                          </div>
                          <div class="category-content" data-category="style" style="display: none;">
                            <div class="parameter-group">
                              <div class="group-title">Artistic Style / Medium</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="digital painting">Digital Painting</button>
                                <button class="param-btn" data-param="illustration">Illustration</button>
                                <button class="param-btn" data-param="3D render">3D Render</button>
                                <button class="param-btn" data-param="octane render">Octane Render</button>
                                <button class="param-btn" data-param="unreal engine">Unreal Engine</button>
                                <button class="param-btn" data-param="watercolor painting">Watercolor</button>
                                <button class="param-btn" data-param="oil painting">Oil Painting</button>
                                <button class="param-btn" data-param="charcoal sketch">Charcoal</button>
                                <button class="param-btn" data-param="pencil drawing">Pencil Drawing</button>
                                <button class="param-btn" data-param="line art">Line Art</button>
                              </div>
                            </div>
                            <div class="parameter-group">
                              <div class="group-title">Film Type & Photography Style</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="35mm film photo">35mm Film</button>
                                <button class="param-btn" data-param="kodachrome photo">Kodachrome</button>
                                <button class="param-btn" data-param="polaroid photo">Polaroid</button>
                                <button class="param-btn" data-param="black and white">B&W</button>
                                <button class="param-btn" data-param="monochrome">Monochrome</button>
                                <button class="param-btn" data-param="vintage photo">Vintage</button>
                              </div>
                            </div>
                            <div class="parameter-group">
                              <div class="group-title">Art Movements & Genres</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="impressionism">Impressionism</button>
                                <button class="param-btn" data-param="surrealism">Surrealism</button>
                                <button class="param-btn" data-param="cyberpunk">Cyberpunk</button>
                                <button class="param-btn" data-param="steampunk">Steampunk</button>
                                <button class="param-btn" data-param="art deco">Art Deco</button>
                                <button class="param-btn" data-param="minimalist">Minimalist</button>
                                <button class="param-btn" data-param="abstract">Abstract</button>
                                <button class="param-btn" data-param="fantasy">Fantasy</button>
                                <button class="param-btn" data-param="sci-fi">Sci-fi</button>
                              </div>
                            </div>
                            <div class="parameter-group">
                              <div class="group-title">Specific Artist Styles</div>
                              <div class="parameter-buttons">
                                <button class="param-btn" data-param="in the style of Ansel Adams">Ansel Adams</button>
                                <button class="param-btn" data-param="in the style of Studio Ghibli">Studio Ghibli</button>
                                <button class="param-btn" data-param="in the style of Tim Burton">Tim Burton</button>
                                <button class="param-btn" data-param="in the style of Van Gogh">Van Gogh</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="chat-input-wrapper">
                    <textarea id="chat-input" placeholder="Describe your image or editing request..." rows="3"></textarea>
                    <div class="chat-input-actions">
                      <button id="parameters-btn" class="btn btn-secondary btn-compact" title="Image Parameters">
                        🎨 Parameters
                      </button>
                      <button id="attach-file-btn" class="btn btn-secondary btn-compact" title="Attach file">
                        📎 Attach
                      </button>
                      <button id="send-prompt-btn" class="btn btn-primary">
                        <span class="btn-text">Send</span>
                        <span class="btn-loading" style="display: none;">⏳</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div id="result-preview" class="result-preview" style="display: none;">
                <div class="preview-header">
                  <h4>Generated Result:</h4>
                  <div class="preview-actions">
                    <div class="save-options">
                      <div class="save-preference-toggle">
                        <label class="toggle-option ${this.currentPostId ? 'active' : 'disabled'}" data-option="replace">
                          <input type="radio" name="saveOption" value="replace" ${this.currentPostId ? 'checked' : ''} ${!this.currentPostId ? 'disabled' : ''}>
                          <span class="toggle-text">🗑️ Delete Original & Save New</span>
                        </label>
                        <label class="toggle-option ${!this.currentPostId ? 'active' : ''}" data-option="new">
                          <input type="radio" name="saveOption" value="new" ${!this.currentPostId ? 'checked' : ''}>
                          <span class="toggle-text">➕ Keep Original & Save New</span>
                        </label>
                      </div>
                      <button id="save-result-btn" class="btn btn-success">💾 Save</button>
                    </div>
                    <button id="try-again-btn" class="btn btn-secondary">🔄 Try Again</button>
                  </div>
                </div>
                <div class="preview-content">
                  <img id="result-image" alt="Generated result">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get AI Editor CSS styles
   */
  getAIEditorStyles() {
    return `
      .ai-image-editor-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .ai-editor-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .ai-editor-container {
        background: white;
        border-radius: 12px;
        width: 95%;
        height: 90%;
        max-width: 1400px;
        max-height: 900px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }

      .ai-editor-header {
        padding: 20px 25px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        flex-shrink: 0;
      }

      .ai-editor-header h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }

      .ai-editor-main {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .ai-editor-sidebar {
        width: 300px;
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
        padding: 20px;
        overflow-y: auto;
        flex-shrink: 0;
      }

      .ai-editor-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* Prompts Panel */
      .prompts-panel {
        margin-bottom: 25px;
      }

      .prompts-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .prompts-title {
        font-size: 16px;
        font-weight: 600;
        color: #374151;
      }

      .ai-image-editor-modal .btn-compact {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .ai-image-editor-modal .btn-add {
        color: #059669;
        border-color: #059669;
      }

      .ai-image-editor-modal .btn-add:hover {
        background: #ecfdf5;
        transform: translateY(-1px);
      }

      .prompts-list {
        display: grid;
        gap: 6px;
        grid-template-columns: 1fr;
      }

      .prompt-item {
        padding: 6px 8px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        transition: all 0.15s ease;
        position: relative;
        font-size: 12px;
        margin-bottom: 2px;
        cursor: pointer;
      }

      .prompt-item:hover {
        border-color: #667eea;
        background: #f8faff;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.12);
      }

      .prompt-item.custom {
        border-left: 4px solid #f59e0b;
      }

      .prompt-item.default {
        border-left: 4px solid #10b981;
      }

      .prompt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        padding: 2px 0;
      }

      .prompt-actions {
        display: flex;
        gap: 2px;
      }

      .prompt-name {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
        color: #374151;
        font-size: 11px;
        flex: 1;
      }

      .prompt-icon {
        font-size: 12px;
        min-width: 16px;
      }

      .prompt-title {
        flex: 1;
      }

      .expand-indicator {
        font-size: 8px;
        color: #9ca3af;
        transition: transform 0.2s ease;
        margin-left: auto;
        margin-right: 8px;
      }

      .prompt-item.expanded .expand-indicator {
        transform: rotate(180deg);
      }

      .prompt-description {
        font-size: 10px;
        color: #6b7280;
        line-height: 1.3;
        margin-top: 4px;
        padding-left: 22px;
        display: none;
        border-top: 1px solid #f3f4f6;
        padding-top: 6px;
        margin-top: 6px;
      }

      .prompt-item.expanded .prompt-description {
        display: block;
      }

      .prompt-delete, .prompt-edit, .prompt-expand {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        border-radius: 3px;
        opacity: 0.7;
        transition: all 0.2s;
        font-size: 10px;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .prompt-delete {
        color: #dc2626;
      }

      .prompt-edit {
        color: #0ea5e9;
      }

      .prompt-expand {
        color: #6b7280;
      }

      .prompt-item:hover .prompt-delete,
      .prompt-item:hover .prompt-edit,
      .prompt-item:hover .prompt-expand {
        opacity: 1;
      }

      .prompt-delete:hover {
        background: #fee2e2;
      }

      .prompt-edit:hover {
        background: #e0f2fe;
      }

      .prompt-expand:hover {
        background: #f3f4f6;
      }
      }

      /* Current Image Section */
      .current-image-section {
        background: white;
        border-radius: 8px;
        padding: 15px;
        border: 1px solid #e2e8f0;
      }

      .current-image-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .current-image-section h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .image-attach-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 12px;
        color: #6b7280;
      }

      .image-attach-checkbox input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .checkbox-label {
        user-select: none;
      }

      .image-attach-info {
        margin-top: 8px;
        padding: 6px 8px;
        background: #f0f9ff;
        border-radius: 4px;
        border-left: 3px solid #0ea5e9;
      }

      .image-attach-info small {
        color: #0369a1;
        font-size: 11px;
      }

      .current-image-preview {
        width: 100%;
        max-height: 200px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }

      /* Context Inclusion Section */
      .context-inclusion-section {
        background: #f8fafc;
        border-radius: 8px;
        padding: 15px;
        border: 1px solid #e2e8f0;
        margin-bottom: 20px;
      }

      .context-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .context-inclusion-section h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .context-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;
      }

      .context-checkbox {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 12px;
        color: #6b7280;
      }

      .context-checkbox input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .context-preview {
        background: white;
        border-radius: 4px;
        padding: 8px;
        border: 1px solid #e2e8f0;
        font-size: 11px;
        max-height: 120px;
        overflow-y: auto;
      }

      .context-item {
        margin-bottom: 4px;
        color: #374151;
        word-wrap: break-word;
        word-break: break-word;
        overflow-wrap: break-word;
        line-height: 1.4;
      }

      .context-item:last-child {
        margin-bottom: 0;
      }

      .context-item strong {
        color: #1f2937;
        display: inline-block;
        margin-right: 4px;
        min-width: fit-content;
      }

      /* Chat Container */
      .chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .chat-history {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #fafbfc;
      }

      .welcome-message {
        margin-bottom: 20px;
      }

      .chat-message {
        margin-bottom: 20px;
        display: flex;
        gap: 12px;
      }

      .user-message {
        justify-content: flex-end;
      }

      .ai-message {
        justify-content: flex-start;
      }

      .message-content {
        max-width: 70%;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.5;
      }

      .user-message .message-content {
        background: #667eea;
        color: white;
        border-bottom-right-radius: 4px;
      }

      .ai-message .message-content {
        background: white;
        color: #374151;
        border: 1px solid #e2e8f0;
        border-bottom-left-radius: 4px;
      }

      .message-timestamp {
        font-size: 11px;
        color: #9ca3af;
        margin-top: 4px;
      }

      /* Chat Input */
      .chat-input-container {
        border-top: 1px solid #e2e8f0;
        background: white;
        padding: 20px;
        flex-shrink: 0;
      }

      /* Parameters Panel */
      .parameters-panel {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 15px;
        max-height: 300px;
        overflow-y: auto;
      }

      .parameters-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 15px;
        background: #667eea;
        color: white;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
        font-size: 14px;
      }

      .parameters-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .parameters-content {
        padding: 15px;
      }

      .parameter-categories {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .parameter-category {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: white;
      }

      .category-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        cursor: pointer;
        background: #f8fafc;
        border-radius: 6px 6px 0 0;
        font-weight: 500;
        font-size: 13px;
        transition: background-color 0.2s;
      }

      .category-header:hover {
        background: #f1f5f9;
      }

      .category-header .category-icon {
        margin-right: 8px;
      }

      .category-title {
        flex: 1;
      }

      .category-toggle {
        font-size: 12px;
        transition: transform 0.2s;
      }

      .category-header.collapsed .category-toggle {
        transform: rotate(-90deg);
      }

      .category-content {
        padding: 12px;
        border-top: 1px solid #e2e8f0;
      }

      .parameter-group {
        margin-bottom: 15px;
      }

      .parameter-group:last-child {
        margin-bottom: 0;
      }

      .group-title {
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #e2e8f0;
      }

      .parameter-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .param-btn {
        background: #f8fafc;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        color: #374151;
        font-weight: 500;
      }

      .param-btn:hover {
        background: #667eea;
        color: white;
        border-color: #667eea;
      }

      .param-btn:active {
        transform: scale(0.98);
      }

      .chat-input-wrapper {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }

      .chat-input-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .attached-files {
        padding: 10px;
        background: #f8fafc;
        border-radius: 6px;
        margin-bottom: 10px;
        border: 1px solid #e2e8f0;
      }

      .attached-file {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        background: white;
        border-radius: 4px;
        border: 1px solid #d1d5db;
        margin-bottom: 6px;
      }

      .attached-file:last-child {
        margin-bottom: 0;
      }

      .attached-file img {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 4px;
      }

      .attached-file-info {
        flex: 1;
        font-size: 12px;
      }

      .attached-file-name {
        font-weight: 500;
        color: #374151;
      }

      .attached-file-size {
        color: #6b7280;
      }

      .remove-attachment {
        background: none;
        border: none;
        color: #dc2626;
        cursor: pointer;
        padding: 2px;
        border-radius: 2px;
        font-size: 12px;
      }

      .remove-attachment:hover {
        background: #fee2e2;
      }

      #chat-input {
        flex: 1;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 12px;
        font-size: 14px;
        resize: vertical;
        min-height: 44px;
        max-height: 120px;
        font-family: inherit;
        transition: border-color 0.2s;
      }

      #chat-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      #send-prompt-btn {
        padding: 12px 20px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 80px;
      }

      #send-prompt-btn:hover:not(:disabled) {
        background: #5a67d8;
        transform: translateY(-1px);
      }

      #send-prompt-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      /* Result Preview */
      .result-preview {
        border-top: 1px solid #e2e8f0;
        background: white;
        flex-shrink: 0;
      }

      .preview-header {
        padding: 15px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
      }

      .preview-header h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #374151;
      }

      .preview-actions {
        display: flex;
        gap: 15px;
        align-items: center;
      }

      .save-options {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .save-preference-toggle {
        display: flex;
        background: #f1f5f9;
        border-radius: 6px;
        padding: 2px;
        gap: 2px;
      }

      .toggle-option {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 11px;
        font-weight: 500;
      }

      .toggle-option input[type="radio"] {
        display: none;
      }

      .toggle-option.active,
      .toggle-option:has(input:checked) {
        background: white;
        color: #059669;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .toggle-option:not(.active):not(:has(input:checked)) {
        color: #6b7280;
      }

      .toggle-option:has(input:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .toggle-text {
        user-select: none;
      }

      .preview-content {
        padding: 20px;
        text-align: center;
        max-height: 300px;
        overflow-y: auto;
      }

      .multiple-results {
        text-align: left;
      }

      .results-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin-top: 10px;
      }

      .result-item {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
        background: white;
      }

      .result-info {
        padding: 8px;
      }

      .result-title {
        font-size: 11px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 2px;
        line-height: 1.2;
      }

      .result-caption {
        font-size: 10px;
        color: #6b7280;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #result-image {
        max-width: 100%;
        max-height: 250px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      /* Button Styles - Scoped to AI Image Editor Modal */
      .ai-image-editor-modal .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .ai-image-editor-modal .btn-primary {
        background: #667eea;
        color: white;
      }

      .ai-image-editor-modal .btn-primary:hover {
        background: #5a67d8;
        transform: translateY(-1px);
      }

      .ai-image-editor-modal .btn-success {
        background: #10b981;
        color: white;
      }

      .ai-image-editor-modal .btn-success:hover {
        background: #059669;
        transform: translateY(-1px);
      }

      .ai-image-editor-modal .btn-secondary {
        background: #6b7280;
        color: white;
      }

      .ai-image-editor-modal .btn-secondary:hover {
        background: #4b5563;
        transform: translateY(-1px);
      }

      /* Loading States - Scoped to AI Image Editor Modal */
      .ai-image-editor-modal .loading {
        opacity: 0.6;
        pointer-events: none;
      }

      .ai-image-editor-modal .btn-loading {
        animation: ai-editor-spin 1s linear infinite;
      }

      @keyframes ai-editor-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .ai-editor-container {
          width: 100%;
          height: 100%;
          border-radius: 0;
        }

        .ai-editor-main {
          flex-direction: column;
        }

        .ai-editor-sidebar {
          width: 100%;
          max-height: 200px;
        }

        .prompts-list {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
      }
    `;
  }

  /**
   * Setup AI Editor event listeners
   */
  setupAIEditorListeners(mode) {
    // Close button
    document.getElementById('ai-editor-close').addEventListener('click', () => {
      this.closeAIEditor();
    });

    // Close on overlay click
    document.querySelector('.ai-editor-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeAIEditor();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Send prompt button
    document.getElementById('send-prompt-btn').addEventListener('click', () => {
      this.sendPrompt();
    });

    // Attach file button
    document.getElementById('attach-file-btn').addEventListener('click', () => {
      this.showFileAttachDialog();
    });

    // Chat input enter key
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendPrompt();
      }
    });

    // Add custom prompt button
    document.getElementById('add-custom-prompt-btn').addEventListener('click', () => {
      this.showAddCustomPromptDialog(mode);
    });

    // Parameters panel button
    document.getElementById('parameters-btn').addEventListener('click', () => {
      this.toggleParametersPanel();
    });

    // Close parameters panel button
    document.getElementById('close-parameters-btn').addEventListener('click', () => {
      this.hideParametersPanel();
    });

    // Save result button
    document.getElementById('save-result-btn').addEventListener('click', () => {
      this.saveResultToLibrary();
    });

    // Radio button event listeners for save options
    document.querySelectorAll('input[name="saveOption"]').forEach(radio => {
      radio.addEventListener('change', () => {
        // Update active state for labels
        document.querySelectorAll('.toggle-option').forEach(label => {
          label.classList.remove('active');
        });
        if (radio.checked && !radio.disabled) {
          radio.closest('.toggle-option').classList.add('active');
        }
      });
    });

    // Try again button
    document.getElementById('try-again-btn').addEventListener('click', () => {
      this.hideResultPreview();
    });
  }

  /**
   * Initialize AI Editor interface
   */
  initializeAIEditorInterface(mode) {
    this.populatePromptsList(mode);
    this.setupParametersPanel();
    document.getElementById('chat-input').focus();
  }

  /**
   * Setup parameters panel functionality
   */
  setupParametersPanel() {
    // Category toggle functionality
    document.querySelectorAll('.category-header').forEach(header => {
      header.addEventListener('click', () => {
        const category = header.dataset.category;
        const content = document.querySelector(`.category-content[data-category="${category}"]`);
        const toggle = header.querySelector('.category-toggle');

        if (content.style.display === 'none') {
          content.style.display = 'block';
          toggle.textContent = '▼';
          header.classList.remove('collapsed');
        } else {
          content.style.display = 'none';
          toggle.textContent = '▶';
          header.classList.add('collapsed');
        }
      });
    });

    // Parameter button click functionality
    document.querySelectorAll('.param-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const param = btn.dataset.param;
        this.addParameterToPrompt(param);
      });
    });
  }

  /**
   * Toggle parameters panel visibility
   */
  toggleParametersPanel() {
    const panel = document.getElementById('parameters-panel');
    if (panel.style.display === 'none') {
      this.showParametersPanel();
    } else {
      this.hideParametersPanel();
    }
  }

  /**
   * Show parameters panel
   */
  showParametersPanel() {
    const panel = document.getElementById('parameters-panel');
    panel.style.display = 'block';
  }

  /**
   * Hide parameters panel
   */
  hideParametersPanel() {
    const panel = document.getElementById('parameters-panel');
    panel.style.display = 'none';
  }

  /**
   * Add parameter to chat input
   */
  addParameterToPrompt(parameter) {
    const chatInput = document.getElementById('chat-input');
    const currentValue = chatInput.value.trim();

    if (currentValue) {
      // Add parameter with comma separation
      chatInput.value = currentValue + ', ' + parameter;
    } else {
      // Add parameter as first item
      chatInput.value = parameter;
    }

    // Focus back to input and move cursor to end
    chatInput.focus();
    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);

    // Visual feedback
    const btn = document.querySelector(`[data-param="${parameter}"]`);
    if (btn) {
      btn.style.background = '#10b981';
      btn.style.color = 'white';
      btn.style.borderColor = '#10b981';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 300);
    }
  }

  /**
   * Populate prompts list
   */
  populatePromptsList(mode) {
    const promptsList = document.getElementById('prompts-list');
    const prompts = this.getPromptsForMode(mode);

    if (prompts.length === 0) {
      promptsList.innerHTML = '<p style="color: #6b7280; font-size: 12px; text-align: center; padding: 20px;">No prompts available</p>';
      return;
    }

    promptsList.innerHTML = prompts.map(prompt => `
      <div class="prompt-item ${prompt.isCustom ? 'custom' : 'default'}" data-prompt-id="${prompt.id}">
        <div class="prompt-header">
          <div class="prompt-name">
            <span class="prompt-icon">${prompt.icon}</span>
            <span class="prompt-title">${prompt.name}</span>
            <span class="expand-indicator">▼</span>
          </div>
          <div class="prompt-actions">
            ${!prompt.isCustom ? `<button class="prompt-edit" data-prompt-id="${prompt.id}" title="Edit default prompt">✏️</button>` : ''}
            ${prompt.isCustom ? `<button class="prompt-delete" data-prompt-id="${prompt.id}" title="Delete custom prompt">🗑️</button>` : ''}
            <button class="prompt-expand" data-prompt-id="${prompt.id}" title="View details">👁️</button>
          </div>
        </div>
        <div class="prompt-description">${prompt.prompt}</div>
      </div>
    `).join('');

    // Add event listeners for prompt items (clicking anywhere uses the prompt)
    promptsList.querySelectorAll('.prompt-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons
        if (e.target.closest('.prompt-actions')) {
          return;
        }
        const promptId = item.dataset.promptId;
        this.usePrompt(promptId);
      });
    });

    // Add event listeners for expand buttons
    promptsList.querySelectorAll('.prompt-expand').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptItem = btn.closest('.prompt-item');
        promptItem.classList.toggle('expanded');
      });
    });

    // Add event listeners for delete buttons
    promptsList.querySelectorAll('.prompt-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        this.deleteCustomPrompt(promptId);
      });
    });

    // Add event listeners for edit buttons (default prompts)
    promptsList.querySelectorAll('.prompt-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptId = btn.dataset.promptId;
        this.showEditDefaultPromptDialog(promptId);
      });
    });
  }

  /**
   * Use a predefined prompt
   */
  usePrompt(promptId) {
    const allPrompts = [...this.predefinedPrompts.create, ...this.predefinedPrompts.edit, ...this.customPrompts];
    const prompt = allPrompts.find(p => p.id === promptId);

    if (prompt) {
      document.getElementById('chat-input').value = prompt.prompt;
      document.getElementById('chat-input').focus();
    }
  }

  /**
   * Delete custom prompt
   */
  deleteCustomPrompt(promptId) {
    if (confirm('Are you sure you want to delete this custom prompt?')) {
      this.removeCustomPrompt(promptId);

      // Refresh the prompts list
      const mode = this.currentImageUrl ? 'edit' : 'create';
      this.populatePromptsList(mode);
    }
  }

  /**
   * Show add custom prompt dialog
   */
  showAddCustomPromptDialog(mode) {
    const name = prompt('Enter a name for your custom prompt:');
    if (!name) return;

    const promptText = prompt('Enter your custom prompt:');
    if (!promptText) return;

    const icon = prompt('Enter an emoji icon (optional):') || '🎯';

    const customPrompt = {
      name: name.trim(),
      prompt: promptText.trim(),
      icon: icon.trim(),
      requiresImage: mode === 'edit'
    };

    this.addCustomPrompt(customPrompt);
    this.populatePromptsList(mode);
  }

  /**
   * Show edit default prompt dialog
   */
  showEditDefaultPromptDialog(promptId) {
    // Find the prompt in both create and edit arrays
    let currentPrompt = null;
    ['create', 'edit'].forEach(mode => {
      const found = this.predefinedPrompts[mode].find(p => p.id === promptId);
      if (found) currentPrompt = found;
    });

    if (!currentPrompt) return;

    const name = prompt('Edit prompt name:', currentPrompt.name);
    if (name === null) return; // User cancelled

    const promptText = prompt('Edit prompt text:', currentPrompt.prompt);
    if (promptText === null) return; // User cancelled

    const icon = prompt('Edit emoji icon:', currentPrompt.icon);
    if (icon === null) return; // User cancelled

    const updatedPrompt = {
      name: name.trim() || currentPrompt.name,
      prompt: promptText.trim() || currentPrompt.prompt,
      icon: icon.trim() || currentPrompt.icon
    };

    this.editDefaultPrompt(promptId, updatedPrompt);

    // Refresh the prompts list
    const mode = this.currentImageUrl ? 'edit' : 'create';
    this.populatePromptsList(mode);
  }

  /**
   * Send prompt to Gemini API
   */
  async sendPrompt() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-prompt-btn');
    const prompt = chatInput.value.trim();

    if (!prompt) return;

    // Disable input and show loading
    chatInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.querySelector('.btn-text').style.display = 'none';
    sendBtn.querySelector('.btn-loading').style.display = 'inline';

    // Check if image should be attached (for editing mode) - define outside try block
    const attachImageCheckbox = document.getElementById('attachImageCheckbox');
    const shouldAttachImage = attachImageCheckbox ? attachImageCheckbox.checked : false;
    const shouldEditImage = this.currentImageUrl && shouldAttachImage;

    try {
      // Add user message to chat
      this.addChatMessage('user', prompt);
      chatInput.value = '';

      // Build enhanced prompt with context
      let enhancedPrompt = prompt;

      // Add current post context if available and checkboxes are checked
      if (this.currentPost) {
        const contextParts = [];

        // Check if title should be included
        const includeTitleCheckbox = document.getElementById('includeTitleCheckbox');
        if (includeTitleCheckbox && includeTitleCheckbox.checked && this.currentPost.title && this.currentPost.title.trim()) {
          contextParts.push(`Title: "${this.currentPost.title}"`);
        }

        // Check if caption should be included
        const includeCaptionCheckbox = document.getElementById('includeCaptionCheckbox');
        if (includeCaptionCheckbox && includeCaptionCheckbox.checked && this.currentPost.caption && this.currentPost.caption.trim()) {
          contextParts.push(`Caption: "${this.currentPost.caption}"`);
        }

        if (contextParts.length > 0) {
          const contextPrefix = shouldEditImage ? 'Context for editing' : 'Context for new image';
          enhancedPrompt = `${contextPrefix} - ${contextParts.join(', ')}\n\nRequest: ${prompt}`;
        }
      }

      // Add attached files context
      if (this.attachedFiles && this.attachedFiles.length > 0) {
        const fileNames = this.attachedFiles.map(f => f.name).join(', ');
        enhancedPrompt += `\n\nAttached files: ${fileNames}`;
      }

      // Generate/edit image using Gemini API
      let result;
      if (shouldEditImage) {
        // Edit existing image
        result = await this.editImageWithGemini(this.currentImageUrl, enhancedPrompt, this.attachedFiles);
      } else {
        // Check if this is a multi-image prompt
        const isMultiImagePrompt = enhancedPrompt.toLowerCase().includes('step-by-step') ||
                                   enhancedPrompt.toLowerCase().includes('storyboard') ||
                                   enhancedPrompt.toLowerCase().includes('each step') ||
                                   enhancedPrompt.toLowerCase().includes('series') ||
                                   enhancedPrompt.toLowerCase().includes('sequence') ||
                                   enhancedPrompt.toLowerCase().includes('timeline') ||
                                   enhancedPrompt.toLowerCase().includes('progression') ||
                                   enhancedPrompt.toLowerCase().includes('multiple') ||
                                   enhancedPrompt.toLowerCase().includes('visual guide') ||
                                   enhancedPrompt.toLowerCase().includes('tutorial') ||
                                   enhancedPrompt.toLowerCase().includes('process') ||
                                   enhancedPrompt.toLowerCase().includes('stages') ||
                                   enhancedPrompt.toLowerCase().includes('phases') ||
                                   enhancedPrompt.toLowerCase().includes('life cycle') ||
                                   enhancedPrompt.toLowerCase().includes('transformation') ||
                                   enhancedPrompt.toLowerCase().includes('evolution') ||
                                   enhancedPrompt.toLowerCase().includes('showcase') ||
                                   enhancedPrompt.toLowerCase().includes('collection') ||
                                   enhancedPrompt.toLowerCase().includes('set of') ||
                                   enhancedPrompt.toLowerCase().includes('different') && (
                                     enhancedPrompt.toLowerCase().includes('angles') ||
                                     enhancedPrompt.toLowerCase().includes('styles') ||
                                     enhancedPrompt.toLowerCase().includes('occasions') ||
                                     enhancedPrompt.toLowerCase().includes('seasons') ||
                                     enhancedPrompt.toLowerCase().includes('expressions')
                                   );

        if (isMultiImagePrompt) {
          // Create multiple images with separate API calls
          result = await this.createMultipleImagesWithGemini(enhancedPrompt, this.attachedFiles);
        } else {
          // Create single image
          result = await this.createImageWithGemini(enhancedPrompt, this.attachedFiles);
        }
      }

      // Add AI response to chat with text content
      const actionText = shouldEditImage ? 'edited' : 'created';
      let chatMessage = `✅ Image ${actionText} successfully!`;

      // Include text content from AI response if available
      if (result) {
        let textContent = '';
        if (Array.isArray(result)) {
          // Multiple results
          textContent = result.map(r => r.caption).filter(c => c && c !== 'AI Generated Image').join('\n\n');
        } else {
          // Single result
          textContent = result.caption && result.caption !== 'AI Generated Image' ? result.caption : '';
        }

        if (textContent) {
          chatMessage += `\n\n📝 **AI Response:**\n${textContent}`;
        }
      }

      this.addChatMessage('ai', chatMessage);

      // Show result preview
      this.showResultPreview(result);

    } catch (error) {
      console.error('❌ Failed to process image:', error);
      const actionText = shouldEditImage ? 'edit' : 'create';
      this.addChatMessage('ai', `❌ Sorry, I couldn't ${actionText} the image. Error: ${error.message}`);
    } finally {
      // Re-enable input
      chatInput.disabled = false;
      sendBtn.disabled = false;
      sendBtn.querySelector('.btn-text').style.display = 'inline';
      sendBtn.querySelector('.btn-loading').style.display = 'none';
      chatInput.focus();
    }
  }

  /**
   * Create new image using Gemini API
   */
  async createImageWithGemini(prompt, attachedFiles = [], showProgress = true) {
    if (!this.geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    try {
      // Check if this is a multi-image prompt
      const isMultiImagePrompt = prompt.toLowerCase().includes('step-by-step') ||
                                 prompt.toLowerCase().includes('storyboard') ||
                                 prompt.toLowerCase().includes('each step') ||
                                 prompt.toLowerCase().includes('series') ||
                                 prompt.toLowerCase().includes('sequence') ||
                                 prompt.toLowerCase().includes('timeline') ||
                                 prompt.toLowerCase().includes('progression') ||
                                 prompt.toLowerCase().includes('multiple') ||
                                 prompt.toLowerCase().includes('visual guide') ||
                                 prompt.toLowerCase().includes('tutorial') ||
                                 prompt.toLowerCase().includes('process') ||
                                 prompt.toLowerCase().includes('stages') ||
                                 prompt.toLowerCase().includes('phases') ||
                                 prompt.toLowerCase().includes('life cycle') ||
                                 prompt.toLowerCase().includes('transformation') ||
                                 prompt.toLowerCase().includes('evolution') ||
                                 prompt.toLowerCase().includes('showcase') ||
                                 prompt.toLowerCase().includes('collection') ||
                                 prompt.toLowerCase().includes('set of') ||
                                 prompt.toLowerCase().includes('different') && (
                                   prompt.toLowerCase().includes('angles') ||
                                   prompt.toLowerCase().includes('styles') ||
                                   prompt.toLowerCase().includes('occasions') ||
                                   prompt.toLowerCase().includes('seasons') ||
                                   prompt.toLowerCase().includes('expressions')
                                 );

      // Add progress message first (only if showProgress is true)
      let progressMessageId = null;
      if (showProgress) {
        progressMessageId = this.addChatMessage('ai', '🎨 Initializing image generation...');
      }

      // Enhance prompt with high-resolution quality parameters for better results
      let enhancedPrompt = prompt;

      // Always add high-resolution quality parameters for better results
      const qualityEnhancements = [];

      // Add resolution enhancement if not present
      if (!enhancedPrompt.toLowerCase().includes('8k') &&
          !enhancedPrompt.toLowerCase().includes('4k') &&
          !enhancedPrompt.toLowerCase().includes('high resolution')) {
        qualityEnhancements.push('high resolution');
      }

      // Add quality enhancement if not present
      if (!enhancedPrompt.toLowerCase().includes('quality') &&
          !enhancedPrompt.toLowerCase().includes('detailed')) {
        qualityEnhancements.push('high quality', 'ultra-detailed');
      }

      // Add sharpness enhancement if not present
      if (!enhancedPrompt.toLowerCase().includes('sharp') &&
          !enhancedPrompt.toLowerCase().includes('crisp')) {
        qualityEnhancements.push('sharp details', 'crisp');
      }

      // Add professional quality if not present
      if (!enhancedPrompt.toLowerCase().includes('professional') &&
          !enhancedPrompt.toLowerCase().includes('masterpiece')) {
        qualityEnhancements.push('professional quality');
      }

      // Append quality enhancements
      if (qualityEnhancements.length > 0) {
        enhancedPrompt += ', ' + qualityEnhancements.join(', ');
      }

      // Build content parts with enhanced text and attached files
      const contentParts = [{ text: enhancedPrompt }];

      // Process attached files like "upload from PC" - convert to permanent storage first
      if (attachedFiles && attachedFiles.length > 0) {
        if (showProgress && progressMessageId) {
          this.updateChatMessage(progressMessageId, '📤 Processing attached files...');
        }

        for (const attachedFile of attachedFiles) {
          try {
            // Convert attached file to permanent storage like PC upload
            console.log('🔄 Converting attached file to permanent storage:', attachedFile.name);
            const permanentData = await this.convertToPermanentStorage(attachedFile.dataUrl, `attached-${attachedFile.name}`);

            // Use the original full-resolution data URL for Gemini API (not the optimized thumbnail)
            const imageData = await this.imageUrlToBase64(permanentData.originalDataUrl || permanentData.dataUrl);
            const mimeType = attachedFile.file.type || 'image/jpeg';

            contentParts.push({
              inlineData: {
                mimeType: mimeType,
                data: imageData
              }
            });

            console.log('✅ Attached file processed and stored permanently:', attachedFile.name);
          } catch (error) {
            console.warn('Failed to process attached file:', attachedFile.name, error);
            // Add error message to chat
            this.addChatMessage('ai', `⚠️ Failed to process attached file "${attachedFile.name}": ${error.message}`);
          }
        }
      }

      // Use the image generation model with proper response modalities and high-quality settings
      const payload = {
        contents: [{
          parts: contentParts
        }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"], // Required for image generation model
          candidateCount: 1, // Image generation model only supports 1 candidate
          maxOutputTokens: isMultiImagePrompt ? 8192 : 4096,
          temperature: 0.7
        }
      };

      // Update progress message for image generation (only if showProgress)
      let progressInterval = null;
      if (showProgress && progressMessageId) {
        this.updateChatMessage(progressMessageId, '🎨 Starting image generation...');

        // Simulate streaming progress updates
        const streamingSteps = [
          '🎨 Analyzing your prompt...',
          '🖼️ Generating visual concepts...',
          '✨ Refining image details...',
          '🎯 Finalizing your image...'
        ];

        let currentStep = 0;
        progressInterval = setInterval(() => {
          if (currentStep < streamingSteps.length) {
            this.updateChatMessage(progressMessageId, streamingSteps[currentStep]);
            currentStep++;
          }
        }, 1000);
      }

      try {
        // Use regular generateContent endpoint (image generation doesn't support streaming)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiAPI.imageModel}:generateContent?key=${this.geminiAPI.getNextApiKey()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );

        // Clear progress interval
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        if (showProgress && progressMessageId) {
          this.updateChatMessage(progressMessageId, '🔄 Processing generated content...');
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        // Remove progress message
        if (showProgress && progressMessageId) {
          this.removeChatMessage(progressMessageId);
        }

        return this.processGeminiImageResponse(data);

      } catch (error) {
        // Clear progress interval on error
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        throw error;
      }

    } catch (error) {
      console.error('Failed to create image with Gemini:', error);
      throw error;
    }
  }

  /**
   * Create multiple images using separate API calls (for step-by-step, storyboard, etc.)
   */
  async createMultipleImagesWithGemini(prompt, attachedFiles = []) {
    try {
      // Add progress message
      const progressMessageId = this.addChatMessage('ai', '🎨 Creating multiple images...');

      // First, ask AI to break down the prompt into individual steps
      const breakdownPrompt = `Break down this request into separate, specific image generation prompts. Determine the optimal number of images needed (typically 3-8 images depending on complexity). Each should be a complete, standalone instruction for generating one image. Return only the prompts, numbered sequentially, one per line:\n\n${prompt}`;

      this.updateChatMessage(progressMessageId, '🧠 Planning image sequence...');

      // Small delay before making API call to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the breakdown using text-only model first
      const breakdownResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiAPI.getNextApiKey()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: breakdownPrompt }] }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
          })
        }
      );

      if (!breakdownResponse.ok) {
        const errorText = await breakdownResponse.text();
        console.error('❌ Breakdown API error:', breakdownResponse.status, errorText);

        // If it's a 503 or rate limit error, fall back to single image generation
        if (breakdownResponse.status === 503 || breakdownResponse.status === 429) {
          console.log('⚠️ API rate limited, falling back to single image generation');
          this.updateChatMessage(progressMessageId, '⚠️ API rate limited, generating single image instead...');

          // Remove progress message and fall back to single image
          this.removeChatMessage(progressMessageId);
          return await this.createImageWithGemini(prompt, attachedFiles);
        }

        throw new Error(`Failed to get prompt breakdown: ${breakdownResponse.status} - ${errorText}`);
      }

      const breakdownData = await breakdownResponse.json();
      const breakdownText = breakdownData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!breakdownText) {
        console.warn('⚠️ No breakdown text received, falling back to single image');
        this.removeChatMessage(progressMessageId);
        return await this.createImageWithGemini(prompt, attachedFiles);
      }

      // Extract individual prompts (no limit - let AI decide)
      const individualPrompts = breakdownText.split('\n')
        .filter(line => line.trim() && /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());

      console.log(`🎯 Extracted ${individualPrompts.length} individual prompts:`, individualPrompts);

      if (individualPrompts.length === 0) {
        console.warn('⚠️ Could not extract individual prompts, falling back to single image');
        this.removeChatMessage(progressMessageId);
        return await this.createImageWithGemini(prompt, attachedFiles);
      }

      // Limit the number of images to avoid rate limiting (max 6 images)
      if (individualPrompts.length > 6) {
        console.log(`⚠️ Too many prompts (${individualPrompts.length}), limiting to 6 to avoid rate limits`);
        individualPrompts.splice(6);
      }

      // Generate each image
      const results = [];
      for (let i = 0; i < individualPrompts.length; i++) {
        this.updateChatMessage(progressMessageId, `🎨 Generating image ${i + 1}/${individualPrompts.length}...`);

        try {
          const singleResult = await this.createImageWithGemini(individualPrompts[i], attachedFiles, false); // false = don't show individual progress
          if (singleResult) {
            const uniqueResult = {
              ...singleResult,
              title: `Step ${i + 1}: ${individualPrompts[i].substring(0, 50)}...`,
              caption: individualPrompts[i] // Use the specific prompt as caption for each image
            };
            results.push(uniqueResult);
            console.log(`✅ Image ${i + 1} generated with unique caption:`, uniqueResult.caption);
          }
        } catch (error) {
          console.warn(`Failed to generate image ${i + 1}:`, error);
          // Continue with other images
        }

        // Longer delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Remove progress message
      this.removeChatMessage(progressMessageId);

      if (results.length === 0) {
        throw new Error('Failed to generate any images');
      }

      return results;

    } catch (error) {
      console.error('Failed to create multiple images:', error);
      throw error;
    }
  }

  /**
   * Edit existing image using Gemini API
   */
  async editImageWithGemini(imageUrl, prompt, attachedFiles = []) {
    if (!this.geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    try {
      // Convert main image to base64
      const imageData = await this.imageUrlToBase64(imageUrl);
      const mimeType = this.getMimeType(imageUrl);

      // Enhance prompt with high-resolution quality parameters for better editing results
      let enhancedPrompt = prompt;

      // Always add high-resolution quality parameters for better results
      const qualityEnhancements = [];

      // Add resolution enhancement if not present
      if (!enhancedPrompt.toLowerCase().includes('8k') &&
          !enhancedPrompt.toLowerCase().includes('4k') &&
          !enhancedPrompt.toLowerCase().includes('high resolution')) {
        qualityEnhancements.push('high resolution');
      }

      // Add quality enhancement if not present
      if (!enhancedPrompt.toLowerCase().includes('quality') &&
          !enhancedPrompt.toLowerCase().includes('detailed')) {
        qualityEnhancements.push('high quality', 'ultra-detailed');
      }

      // Add sharpness enhancement if not present
      if (!enhancedPrompt.toLowerCase().includes('sharp') &&
          !enhancedPrompt.toLowerCase().includes('crisp')) {
        qualityEnhancements.push('sharp details', 'crisp');
      }

      // Add professional quality if not present
      if (!enhancedPrompt.toLowerCase().includes('professional') &&
          !enhancedPrompt.toLowerCase().includes('masterpiece')) {
        qualityEnhancements.push('professional quality');
      }

      // Append quality enhancements
      if (qualityEnhancements.length > 0) {
        enhancedPrompt += ', ' + qualityEnhancements.join(', ');
      }

      // Build content parts with enhanced text, main image, and attached files
      const contentParts = [
        { text: enhancedPrompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: imageData
          }
        }
      ];

      // Add attached files as additional reference images (convert to permanent storage first)
      if (attachedFiles && attachedFiles.length > 0) {
        console.log('🔄 Processing attached files for image editing...');

        for (const attachedFile of attachedFiles) {
          try {
            // Convert attached file to permanent storage like PC upload
            const permanentData = await this.convertToPermanentStorage(attachedFile.dataUrl, `attached-edit-${attachedFile.name}`);

            // Use the original full-resolution data URL for Gemini API (not the optimized thumbnail)
            const attachedImageData = await this.imageUrlToBase64(permanentData.originalDataUrl || permanentData.dataUrl);
            const attachedMimeType = attachedFile.file.type || 'image/jpeg';

            contentParts.push({
              inlineData: {
                mimeType: attachedMimeType,
                data: attachedImageData
              }
            });

            console.log('✅ Attached file processed for editing:', attachedFile.name);
          } catch (error) {
            console.warn('Failed to process attached file for editing:', attachedFile.name, error);
          }
        }
      }

      const payload = {
        contents: [{
          parts: contentParts
        }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"], // Required for image generation model
          candidateCount: 1,
          maxOutputTokens: 4096,
          temperature: 0.7
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiAPI.imageModel}:generateContent?key=${this.geminiAPI.getNextApiKey()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return this.processGeminiImageResponse(data);

    } catch (error) {
      console.error('Failed to edit image with Gemini:', error);
      throw error;
    }
  }

  /**
   * Process Gemini API image response
   */
  processGeminiImageResponse(responseData) {
    try {
      console.log('🔍 Processing Gemini response:', JSON.stringify(responseData, null, 2));

      const candidates = responseData.candidates;
      if (!candidates || candidates.length === 0) {
        console.error('❌ No candidates in response:', responseData);
        throw new Error('No candidates in response');
      }

      const results = [];

      // Process all candidates for multiple images
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        console.log(`🔍 Processing candidate ${i + 1}:`, JSON.stringify(candidate, null, 2));

        const parts = candidate.content?.parts;
        if (!parts) {
          console.warn(`⚠️ No parts in candidate ${i + 1}`);
          continue;
        }

        let imageData = null;
        let textContent = '';

        // Extract both image and text data
        for (let j = 0; j < parts.length; j++) {
          const part = parts[j];
          console.log(`🔍 Processing part ${j + 1}:`, Object.keys(part));

          // Handle different possible formats for image data
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            console.log('✅ Found image data in inlineData.data');
          } else if (part.inline_data && part.inline_data.data) {
            imageData = part.inline_data.data;
            console.log('✅ Found image data in inline_data.data');
          } else if (part.image && part.image.data) {
            imageData = part.image.data;
            console.log('✅ Found image data in image.data');
          } else if (part.data) {
            imageData = part.data;
            console.log('✅ Found image data in data');
          } else if (part.text) {
            textContent += part.text + ' ';
            console.log('✅ Found text content');
          } else {
            console.warn('⚠️ Unknown part format:', part);
          }
        }

        if (imageData) {
          console.log('✅ Adding result with image data');
          results.push({
            imageUrl: `data:image/png;base64,${imageData}`,
            caption: textContent.trim() || 'AI Generated Image',
            title: this.generateTitleFromText(textContent.trim()) || 'AI Generated'
          });
        } else {
          console.warn(`⚠️ No image data found in candidate ${i + 1}`);
        }
      }

      console.log(`🔍 Total results found: ${results.length}`);

      if (results.length === 0) {
        console.error('❌ No image data found in any candidate');
        throw new Error('No image data found in response');
      }

      // Return single result or multiple results
      return results.length === 1 ? results[0] : results;

    } catch (error) {
      console.error('❌ Failed to process Gemini response:', error);
      console.error('❌ Response data:', JSON.stringify(responseData, null, 2));
      throw new Error(`Failed to process response: ${error.message}`);
    }
  }

  /**
   * Generate a title from text content
   */
  generateTitleFromText(text) {
    if (!text) return '';

    // Take first sentence or first 50 characters
    const firstSentence = text.split('.')[0];
    if (firstSentence.length <= 50) {
      return firstSentence;
    }

    return text.substring(0, 47) + '...';
  }

  /**
   * Convert image URL to base64
   */
  async imageUrlToBase64(imageUrl) {
    return new Promise((resolve, reject) => {
      if (imageUrl.startsWith('data:')) {
        // Already a data URL, extract base64 part
        const base64Data = imageUrl.split(',')[1];
        resolve(base64Data);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const base64Data = dataUrl.split(',')[1];
          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
    });
  }

  /**
   * Get image dimensions from data URL
   */
  getImageDimensions(dataUrl) {
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
   * Get MIME type from URL
   */
  getMimeType(url) {
    if (url.startsWith('data:')) {
      const mimeMatch = url.match(/^data:([^;]+)/);
      return mimeMatch ? mimeMatch[1] : 'image/jpeg';
    }

    const extension = url.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[extension] || 'image/jpeg';
  }

  /**
   * Convert File object to base64
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Extract base64 data (remove data:image/...;base64, prefix)
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Add message to chat history
   */
  addChatMessage(type, content) {
    const chatHistory = document.getElementById('chat-history');
    const messageDiv = document.createElement('div');
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    messageDiv.id = messageId;
    messageDiv.className = `chat-message ${type}-message`;

    const timestamp = new Date().toLocaleTimeString();
    messageDiv.innerHTML = `
      <div class="message-content">
        ${content}
        <div class="message-timestamp">${timestamp}</div>
      </div>
    `;

    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Store in chat history
    this.chatHistory.push({
      type,
      content,
      timestamp: new Date().toISOString()
    });

    return messageId;
  }

  /**
   * Update existing chat message
   */
  updateChatMessage(messageId, newContent) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      const messageContent = messageElement.querySelector('.message-content');
      const timestamp = messageElement.querySelector('.message-timestamp');
      if (messageContent && timestamp) {
        messageContent.innerHTML = `${newContent}${timestamp.outerHTML}`;
      }
    }
  }

  /**
   * Remove chat message
   */
  removeChatMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.remove();
    }
  }

  /**
   * Show result preview
   */
  showResultPreview(result) {
    const resultPreview = document.getElementById('result-preview');
    const previewContent = resultPreview.querySelector('.preview-content');

    // Handle single or multiple results
    const results = Array.isArray(result) ? result : [result];

    // Store results for saving
    this.currentResults = results;
    this.currentResult = results[0]; // Keep backward compatibility

    // Create preview HTML for multiple images
    let previewHTML = '';

    if (results.length === 1) {
      // Single image preview
      const singleResult = results[0];
      const imageUrl = typeof singleResult === 'string' ? singleResult : singleResult.imageUrl;
      previewHTML = `<img id="result-image" src="${imageUrl}" alt="Generated result" style="max-width: 100%; border-radius: 6px;">`;
    } else {
      // Multiple images preview
      previewHTML = `
        <div class="multiple-results">
          <h5 style="margin: 0 0 10px 0; font-size: 14px; color: #374151;">Generated ${results.length} images:</h5>
          <div class="results-grid">
            ${results.map((res, index) => `
              <div class="result-item">
                <img src="${res.imageUrl}" alt="Generated result ${index + 1}" style="width: 100%; border-radius: 4px;">
                <div class="result-info">
                  <div class="result-title">${res.title}</div>
                  <div class="result-caption">${res.caption}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    previewContent.innerHTML = previewHTML;
    resultPreview.style.display = 'block';

    // Update save button text for multiple results
    const saveBtn = document.getElementById('save-result-btn');
    if (results.length > 1) {
      saveBtn.textContent = `💾 Save All (${results.length})`;
    } else {
      saveBtn.textContent = '💾 Save';
    }
  }

  /**
   * Hide result preview
   */
  hideResultPreview() {
    const resultPreview = document.getElementById('result-preview');
    resultPreview.style.display = 'none';
    this.currentResult = null;
  }

  /**
   * Save result to content library
   */
  async saveResultToLibrary() {
    if (!this.currentResult) {
      alert('No result to save');
      return;
    }

    // Get selected save option from toggle
    const selectedOption = document.querySelector('input[name="saveOption"]:checked');
    if (!selectedOption) {
      alert('Please select a save option');
      return;
    }

    if (selectedOption.value === 'replace') {
      // Delete original and save new approach
      this.saveNewAndDeleteOriginal();
    } else {
      // Keep original and save new approach
      this.saveAsNewPost();
    }
  }

  /**
   * Show save options dialog
   */
  showSaveOptionsDialog() {
    const hasCurrentPost = this.currentPostId !== null;

    let message = '🤖 How would you like to save this AI generated image?\n\n';
    let options = [];

    if (hasCurrentPost) {
      message += '1️⃣ Replace current post image\n';
      message += '2️⃣ Create new post\n\n';
      message += 'Choose option (1 or 2):';
      options = ['1', '2'];
    } else {
      message += 'This will create a new post in your library.\n\n';
      message += 'Continue? (y/n):';
      options = ['y', 'yes', 'n', 'no'];
    }

    const choice = prompt(message);

    if (!choice) return; // User cancelled

    const normalizedChoice = choice.toLowerCase().trim();

    if (hasCurrentPost) {
      if (normalizedChoice === '1') {
        this.saveToCurrentPost();
      } else if (normalizedChoice === '2') {
        this.saveAsNewPost();
      } else {
        alert('Invalid choice. Please try again.');
      }
    } else {
      if (['y', 'yes'].includes(normalizedChoice)) {
        this.saveAsNewPost();
      } else if (['n', 'no'].includes(normalizedChoice)) {
        return; // User chose not to save
      } else {
        alert('Invalid choice. Please try again.');
      }
    }
  }

  /**
   * Save new post and delete original
   */
  async saveNewAndDeleteOriginal() {
    try {
      const saveBtn = document.getElementById('save-result-btn');
      if (!saveBtn) {
        console.error('Save button not found');
        return;
      }

      const originalText = saveBtn.textContent;
      saveBtn.textContent = '⏳ Deleting original & saving new...';
      saveBtn.disabled = true;

      // For multiple results, only save the first one
      const resultToSave = this.currentResults && this.currentResults.length > 0 ? this.currentResults[0] : this.currentResult;
      const imageUrl = typeof resultToSave === 'string' ? resultToSave : resultToSave.imageUrl;

      // Convert to permanent storage like "upload from PC"
      const permanentImageData = await this.convertToPermanentStorage(imageUrl, 'ai-generated-replacement');

      // Get image dimensions
      let dimensions = null;
      try {
        dimensions = await this.getImageDimensions(permanentImageData.dataUrl);
      } catch (error) {
        console.warn('Failed to get AI image dimensions:', error);
      }

      // Call the save callback with special flag to delete original and save new
      if (this.onSaveCallback) {
        await this.onSaveCallback(null, permanentImageData.dataUrl, {
          storageId: permanentImageData.storageId,
          file: permanentImageData.file,
          fileName: permanentImageData.fileName,
          source: 'ai_generated',
          dimensions: dimensions,
          isPermanent: true,
          deleteOriginalPostId: this.currentPostId, // Flag to delete original post
          title: 'AI Generated Image',
          caption: 'Generated with AI Image Editor'
        });
      }

      // Show success message
      this.addChatMessage('ai', '✅ Original post deleted and new AI post created successfully! You can continue creating more images or close the editor manually.');

      // Reset save button after successful save
      this.resetSaveButton();

    } catch (error) {
      console.error('Failed to delete original and save new:', error);
      this.addChatMessage('ai', `❌ Failed to save image: ${error.message}`);
      this.resetSaveButton();
    }
  }

  /**
   * Save as new post
   */
  async saveAsNewPost() {
    try {
      const saveBtn = document.getElementById('save-result-btn');
      if (!saveBtn) {
        console.error('Save button not found');
        return;
      }

      const originalText = saveBtn.textContent;
      const results = this.currentResults || [this.currentResult];

      saveBtn.textContent = `⏳ Creating ${results.length} post${results.length > 1 ? 's' : ''}...`;
      saveBtn.disabled = true;

      // Save each result as a separate post with permanent storage
      if (this.onSaveCallback) {
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const imageUrl = typeof result === 'string' ? result : result.imageUrl;
          const title = typeof result === 'object' ? result.title : `AI Generated Image ${i + 1}`;
          const caption = typeof result === 'object' ? result.caption : 'Generated with AI Image Editor';

          // Convert to permanent storage like "upload from PC"
          const permanentImageData = await this.convertToPermanentStorage(imageUrl, `ai-generated-${i + 1}`);

          // Get image dimensions
          let dimensions = null;
          try {
            dimensions = await this.getImageDimensions(permanentImageData.dataUrl);
          } catch (error) {
            console.warn('Failed to get AI image dimensions:', error);
          }

          console.log(`💾 Saving image ${i + 1}/${results.length} with unique caption:`, caption);

          // Pass additional metadata for multiple images with permanent storage
          console.log(`🔄 Calling save callback for new post ${i + 1}/${results.length}:`, {
            title,
            caption,
            postId: null,
            isPermanent: true
          });

          await this.onSaveCallback(null, permanentImageData.dataUrl, {
            title,
            caption,
            index: i + 1,
            total: results.length,
            storageId: permanentImageData.storageId,
            file: permanentImageData.file,
            fileName: permanentImageData.fileName,
            source: 'ai_generated',
            dimensions: dimensions,
            isPermanent: true
          });
        }
      }

      // Show success message
      const message = results.length > 1
        ? `✅ ${results.length} new posts created with AI generated images! You can continue creating more images or close the editor manually.`
        : '✅ New post created with AI generated image! You can continue creating more images or close the editor manually.';
      this.addChatMessage('ai', message);

      // Reset save button after successful save
      this.resetSaveButton();

    } catch (error) {
      console.error('Failed to create new post:', error);
      this.addChatMessage('ai', `❌ Failed to save image: ${error.message}`);
      this.resetSaveButton();
    }
  }

  /**
   * Reset save button to original state
   */
  resetSaveButton() {
    const saveBtn = document.getElementById('save-result-btn');
    if (saveBtn) {
      saveBtn.textContent = '💾 Save';
      saveBtn.disabled = false;
    }
  }

  /**
   * Convert temporary image URL to RoboPost media storage (upload immediately)
   */
  async convertToPermanentStorage(imageUrl, baseName = 'ai-generated') {
    try {
      console.log('🔄 Uploading AI image to RoboPost media storage:', imageUrl);

      // Convert data URL to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create a file name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${baseName}-${timestamp}.png`;

      // Create a File object
      const file = new File([blob], fileName, { type: 'image/png' });

      // Upload to RoboPost immediately
      if (window.roboPostAPI && window.roboPostAPI.uploadMedia) {
        console.log('📤 Uploading to RoboPost media storage...');

        const uploadResult = await window.roboPostAPI.uploadMedia(file);

        if (uploadResult) {
          console.log('✅ AI image uploaded to RoboPost successfully:', uploadResult);

          // For multiple images, use a smaller data URL to save storage space
          let optimizedDataUrl = imageUrl;
          if (blob.size > 100000) { // If larger than 100KB, create a smaller version for storage
            try {
              optimizedDataUrl = await this.createOptimizedDataUrl(imageUrl, 300, 300);
              console.log('📦 Created optimized data URL for storage');
            } catch (optimizeError) {
              console.warn('⚠️ Failed to optimize image, using original:', optimizeError);
            }
          }

          return {
            dataUrl: optimizedDataUrl, // Use optimized version for storage
            originalDataUrl: imageUrl, // Keep original for immediate display
            storageId: uploadResult, // uploadResult is the storage_object_id string directly
            file: file,
            fileName: fileName,
            fileType: 'image/png',
            isVideo: false,
            needsUpload: false // Already uploaded!
          };
        } else {
          throw new Error('Upload failed - no storage ID received');
        }
      } else {
        // Fallback: save locally if RoboPost API not available
        console.warn('⚠️ RoboPost API not available, saving locally');

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        return {
          dataUrl,
          storageId: null,
          file,
          fileName,
          fileType: 'image/png',
          isVideo: false,
          needsUpload: true // Will upload during scheduling
        };
      }

    } catch (error) {
      console.error('❌ Failed to upload AI image to RoboPost:', error);

      // Fallback: save locally
      try {
        console.log('🔄 Falling back to local storage...');

        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${baseName}-${timestamp}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        return {
          dataUrl,
          storageId: null,
          file,
          fileName,
          fileType: 'image/png',
          isVideo: false,
          needsUpload: true
        };
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        throw new Error(`Failed to save image: ${error.message}`);
      }
    }
  }

  /**
   * Show file attachment dialog
   */
  showFileAttachDialog() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = false;

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          alert('File is too large (>10MB). Please use a smaller file.');
          return;
        }

        // Create data URL for preview
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Add to attached files
        this.addAttachedFile(file, dataUrl);

      } catch (error) {
        console.error('Failed to attach file:', error);
        alert(`Failed to attach file: ${error.message}`);
      }
    };

    fileInput.click();
  }

  /**
   * Add attached file to the UI
   */
  addAttachedFile(file, dataUrl) {
    const attachedFilesContainer = document.getElementById('attached-files');

    // Initialize attached files array if not exists
    if (!this.attachedFiles) {
      this.attachedFiles = [];
    }

    // Add to array
    const attachedFile = {
      file: file,
      dataUrl: dataUrl,
      name: file.name,
      size: file.size,
      id: Date.now()
    };
    this.attachedFiles.push(attachedFile);

    // Update UI
    this.updateAttachedFilesUI();
  }

  /**
   * Update attached files UI
   */
  updateAttachedFilesUI() {
    const attachedFilesContainer = document.getElementById('attached-files');

    if (!this.attachedFiles || this.attachedFiles.length === 0) {
      attachedFilesContainer.style.display = 'none';
      return;
    }

    attachedFilesContainer.style.display = 'block';
    attachedFilesContainer.innerHTML = this.attachedFiles.map(file => `
      <div class="attached-file" data-file-id="${file.id}">
        <img src="${file.dataUrl}" alt="${file.name}">
        <div class="attached-file-info">
          <div class="attached-file-name">${file.name}</div>
          <div class="attached-file-size">${(file.size / 1024).toFixed(1)} KB</div>
        </div>
        <button class="remove-attachment" data-file-id="${file.id}">
          ✕
        </button>
      </div>
    `).join('');

    // Add event listeners for remove buttons (CSP-compliant)
    attachedFilesContainer.querySelectorAll('.remove-attachment').forEach(button => {
      button.addEventListener('click', (e) => {
        const fileId = parseInt(e.target.dataset.fileId);
        this.removeAttachedFile(fileId);
      });
    });
  }

  /**
   * Remove attached file
   */
  removeAttachedFile(fileId) {
    if (!this.attachedFiles) return;

    this.attachedFiles = this.attachedFiles.filter(file => file.id !== fileId);
    this.updateAttachedFilesUI();
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.closeAIEditor();
    }
  }

  /**
   * Close AI Editor
   */
  async closeAIEditor() {
    try {
      // Remove modal
      this.removeAIEditorModal();

      // Reset state
      this.currentPostId = null;
      this.currentImageUrl = null;
      this.onSaveCallback = null;
      this.chatHistory = [];
      this.currentResult = null;

      // Restore body scroll
      document.body.style.overflow = '';

      // Remove keyboard listener
      document.removeEventListener('keydown', this.handleKeyDown.bind(this));

      console.log('✅ AI Image Editor closed');
    } catch (error) {
      console.error('Error closing AI Image Editor:', error);
    }
  }

  /**
   * Remove AI Editor modal
   */
  removeAIEditorModal() {
    const modal = document.getElementById('ai-image-editor-modal');
    if (modal) {
      modal.remove();
    }

    const styles = document.getElementById('ai-image-editor-styles');
    if (styles) {
      styles.remove();
    }
  }

  /**
   * Create an optimized (smaller) data URL for storage to save space
   */
  async createOptimizedDataUrl(originalDataUrl, maxWidth = 300, maxHeight = 300, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw the resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to data URL with compression
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(optimizedDataUrl);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = originalDataUrl;
    });
  }
}

// Make AIImageEditorModule available globally
window.AIImageEditorModule = AIImageEditorModule;
