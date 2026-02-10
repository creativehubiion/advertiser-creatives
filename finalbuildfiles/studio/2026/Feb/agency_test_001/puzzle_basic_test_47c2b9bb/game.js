/**
 * PICTURE PUZZLE GAME
 * Sliding puzzle game with configurable settings
 * Based on classic 3x3 sliding puzzle mechanics
 */

// ========================================
// TRACKING MANAGER
// ========================================
const TrackingManager = {
  firePixels(urls) {
    if (!urls || !Array.isArray(urls)) return;
    urls.forEach(url => {
      if (url && url.trim()) {
        const img = new Image();
        img.src = url;
      }
    });
  },

  trackImpression() {
    console.log('[Tracking] Impression tracked');
    const config = window.GAME_CONFIG;
    this.firePixels(config.tracking?.events?.impression?.urls);
  },

  trackPlayableStart() {
    console.log('[Tracking] Playable start tracked');
    const config = window.GAME_CONFIG;
    this.firePixels(config.tracking?.events?.playableStart?.urls);
  },

  trackPlayableComplete() {
    console.log('[Tracking] Playable complete tracked');
    const config = window.GAME_CONFIG;
    this.firePixels(config.tracking?.events?.playableComplete?.urls);
  },

  trackPlayableTimeout() {
    console.log('[Tracking] Playable timeout tracked');
    const config = window.GAME_CONFIG;
    this.firePixels(config.tracking?.events?.playableTimeout?.urls);
  },

  trackClick() {
    console.log('[Tracking] CTA click tracked');
    const config = window.GAME_CONFIG;
    this.firePixels(config.tracking?.events?.click?.urls);
  }
};

window.TrackingManager = TrackingManager;

// ========================================
// PUZZLE STATE CONSTANTS
// ========================================
const PuzzleState = {
  ALLOW_CLICK: 0,
  TWEENING: 1
};

// ========================================
// PRELOADER SCENE
// ========================================
class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preloader' });
    this.pendingBase64 = []; // Track base64 assets to load
  }

  // Helper to check if a string is a data URI
  isDataUri(str) {
    return str && typeof str === 'string' && str.startsWith('data:');
  }

  // Load an asset - handles both URLs and data URIs
  loadAsset(key, asset) {
    if (!asset) return;

    if (this.isDataUri(asset)) {
      // Data URIs need special handling - we'll load them after preload
      console.log(`[Preloader] Queuing base64 asset: ${key}`);
      this.pendingBase64.push({ key, data: asset });
    } else {
      // Regular URL - use normal loader
      console.log(`[Preloader] Loading asset from URL: ${key}`);
      this.load.image(key, asset);
    }
  }

  preload() {
    const config = window.GAME_CONFIG;
    const customAssets = window.customAssets || {};
    console.log('[Preloader] Custom assets available:', Object.keys(customAssets));

    // Reset pending base64 assets
    this.pendingBase64 = [];

    // Create loading bar
    const centerX = config.canvas.width / 2;
    const centerY = config.canvas.height / 2;
    const barWidth = config.loadingBar?.width || 250;
    const barHeight = config.loadingBar?.height || 20;

    const bgColor = Phaser.Display.Color.HexStringToColor(
      config.loadingBar?.backgroundColor || '#333333'
    ).color;
    const fillColor = Phaser.Display.Color.HexStringToColor(
      config.loadingBar?.fillColor || '#FF6600'
    ).color;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(bgColor, 1);
    progressBox.fillRect(centerX - barWidth / 2, centerY - barHeight / 2, barWidth, barHeight);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(fillColor, 1);
      progressBar.fillRect(
        centerX - barWidth / 2,
        centerY - barHeight / 2,
        barWidth * value,
        barHeight
      );
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // Load assets
    const assets = config.assets;

    // Logo
    if (!this.textures.exists('logo')) {
      const logoAsset = customAssets.logo || assets.logo;
      this.loadAsset('logo', logoAsset);
    }

    // Puzzle image - always load, remove existing first to ensure fresh data
    const puzzleAsset = customAssets.puzzleImage || assets.puzzleImage;
    if (this.textures.exists('puzzleImage')) {
      console.log('[Preloader] Removing existing puzzleImage texture for fresh load');
      this.textures.remove('puzzleImage');
    }
    console.log('[Preloader] Loading puzzle image:', puzzleAsset ? (customAssets.puzzleImage ? 'custom' : 'default') : 'none');
    this.loadAsset('puzzleImage', puzzleAsset);

    // Splash hero (optional)
    if (!this.textures.exists('splashHero')) {
      const splashAsset = customAssets.splashHero || assets.splashHero;
      this.loadAsset('splashHero', splashAsset);
    }

    // End hero (optional)
    if (!this.textures.exists('endHero')) {
      const endAsset = customAssets.endHero || assets.endHero;
      this.loadAsset('endHero', endAsset);
    }

    // Background image (optional)
    if (!this.textures.exists('background')) {
      const bgImage = config.background?.image;
      // Load if there's a custom asset uploaded OR if config has an image path
      if (customAssets.background || (bgImage && config.background?.type === 'image')) {
        this.loadAsset('background', customAssets.background || bgImage);
      }
    }

    // First Party Data assets - check customAssets first (CDN URLs from build),
    // then fall back to relative paths (for local development)
    // FPD Age buttons
    const age1Url = customAssets.age1 || 'assets/images/fpd/age1.png';
    const age2Url = customAssets.age2 || 'assets/images/fpd/age2.png';
    const age3Url = customAssets.age3 || 'assets/images/fpd/age3.png';
    const age4Url = customAssets.age4 || 'assets/images/fpd/age4.png';
    const age5Url = customAssets.age5 || 'assets/images/fpd/age5.png';
    const age6Url = customAssets.age6 || 'assets/images/fpd/age6.png';
    this.load.image('age1', age1Url);
    this.load.image('age2', age2Url);
    this.load.image('age3', age3Url);
    this.load.image('age4', age4Url);
    this.load.image('age5', age5Url);
    this.load.image('age6', age6Url);

    // FPD Gender buttons
    const genderMaleUrl = customAssets.genderMale || 'assets/images/fpd/genderMale.png';
    const genderFemaleUrl = customAssets.genderFemale || 'assets/images/fpd/genderFemale.png';
    const genderOthersUrl = customAssets.genderOthers || 'assets/images/fpd/genderOthers.png';
    this.load.image('genderMale', genderMaleUrl);
    this.load.image('genderFemale', genderFemaleUrl);
    this.load.image('genderOthers', genderOthersUrl);

    // FPD Background
    const dataCaptureBgUrl = customAssets.dataCaptureBg || 'assets/images/fpd/background.png';
    this.load.image('dataCaptureBg', dataCaptureBgUrl);
  }

  create() {
    // Determine which scene to go to after loading - capture value immediately
    let nextScene = 'Splash';
    if (window.__jumpToAfterPreload) {
      nextScene = window.__jumpToAfterPreload;
      window.__jumpToAfterPreload = null; // Clear the flag
      console.log('[Preloader] Will jump to stored scene:', nextScene);
    }

    // Load any pending base64 assets before transitioning
    if (this.pendingBase64.length > 0) {
      console.log(`[Preloader] Loading ${this.pendingBase64.length} base64 assets...`);

      let loaded = 0;
      const total = this.pendingBase64.length;

      this.pendingBase64.forEach(({ key, data }) => {
        // Create an Image element to load the base64 data
        const img = new Image();
        img.onload = () => {
          // Add the texture to Phaser
          if (!this.textures.exists(key)) {
            this.textures.addImage(key, img);
            console.log(`[Preloader] Base64 texture added: ${key}`);
          }
          loaded++;
          if (loaded === total) {
            // All base64 assets loaded, proceed to next scene
            TrackingManager.trackImpression();
            console.log('[Preloader] All assets loaded, starting scene:', nextScene);
            this.scene.start(nextScene);
          }
        };
        img.onerror = (err) => {
          console.error(`[Preloader] Failed to load base64 asset: ${key}`, err);
          loaded++;
          if (loaded === total) {
            TrackingManager.trackImpression();
            console.log('[Preloader] Assets loaded (with errors), starting scene:', nextScene);
            this.scene.start(nextScene);
          }
        };
        img.src = data;
      });
    } else {
      // No base64 assets, proceed directly
      TrackingManager.trackImpression();
      console.log('[Preloader] No base64 assets, starting scene:', nextScene);
      this.scene.start(nextScene);
    }
  }
}

// ========================================
// SPLASH SCENE
// ========================================
class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Splash' });
    this.messageHandler = null;
  }

  init() {
    // Reset all state variables on scene start to prevent duplicates
    this.logo = null;
    this.splashHero = null;
    this.splashHeroAutoScale = 1;
    this.actionButton = null;
    this.actionButtonText = null;
    this.actionButtonGraphics = null;
    this.buttonAnimationTimer = null;
  }

  create() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    // Setup real-time update listener
    this.setupMessageListener();

    // Create background
    this.createBackground();

    // Logo
    if (this.textures.exists('logo')) {
      const logoScale = config.layout?.logoScale || 0.5;
      const logoY = height * (config.layout?.logoTopMargin || 0.05);
      this.logo = this.add.image(width / 2, logoY + 50, 'logo');
      this.logo.setScale(logoScale * (config.assetScales?.logo || 1));
      this.logo.setOrigin(0.5, 0);
      this.logo.setAlpha(0);

      // Animate logo
      this.tweens.add({
        targets: this.logo,
        alpha: 1,
        y: logoY,
        duration: 400,
        ease: 'Back.easeOut'
      });
    }

    // Splash hero image with auto-scaling (like catch-falling-items)
    if (this.textures.exists('splashHero')) {
      const heroY = height * (config.layout?.splashHeroYPosition || 0.55);
      this.splashHero = this.add.image(width / 2, heroY, 'splashHero');
      this.splashHero.setOrigin(0.5);

      // Smart auto-scaling: fit image within bounds while maintaining aspect ratio
      const imgWidth = this.splashHero.width;
      const imgHeight = this.splashHero.height;
      const maxHeight = height * 0.5;
      const maxWidth = width * 0.9;

      const scaleByHeight = maxHeight / imgHeight;
      const scaleByWidth = maxWidth / imgWidth;
      const autoScale = Math.min(scaleByHeight, scaleByWidth);
      this.splashHeroAutoScale = autoScale;

      const finalScale = autoScale * (config.assetScales?.splashHero || 1);
      this.splashHero.setScale(finalScale);
      console.log('[SplashScene] Splash hero created with autoScale:', autoScale, 'finalScale:', finalScale);
    }

    // Action button
    const btnY = height * (config.layout?.actionButtonTopMargin || 0.85);
    this.createActionButton(btnY);
  }

  createBackground() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const bgConfig = config.background;

    if (bgConfig.type === 'image' && this.textures.exists('background')) {
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setDepth(-1);
    } else if (bgConfig.type === 'gradient') {
      const graphics = this.add.graphics();
      const startColor = Phaser.Display.Color.HexStringToColor(bgConfig.gradientStart || '#1a1a2e');
      const endColor = Phaser.Display.Color.HexStringToColor(bgConfig.gradientEnd || '#16213e');

      for (let i = 0; i < height; i++) {
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          startColor, endColor, height, i
        );
        graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
        graphics.fillRect(0, i, width, 1);
      }
      graphics.setDepth(-1);
    } else {
      // Solid color, or image type with no image uploaded (fallback to solid)
      this.cameras.main.setBackgroundColor(bgConfig.solidColor || config.canvas.backgroundColor);
    }
  }

  createActionButton(y) {
    const config = window.GAME_CONFIG;
    const { width } = config.canvas;
    const btnConfig = config.actionButton;
    const buttonScale = btnConfig.scale || 1.0;
    const scaleFactor = config.fonts?.scaleFactor || 1.0;

    // Create temporary text to measure width (dynamic sizing like CFI)
    const btnText = config.text?.actionButtonText || 'START';
    const btnSize = config.text?.actionButtonSize || 24;
    const tempText = this.add.text(0, 0, btnText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${btnSize * scaleFactor}px`,
      fontStyle: 'bold'
    });
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    tempText.destroy();

    // Calculate button size based on text with padding (scales proportionally with text size)
    const horizontalPadding = textWidth * 0.4; // 40% of text width total (20% each side)
    const verticalPadding = textHeight * 0.6; // 60% of text height total (30% each side)
    const btnWidth = textWidth + horizontalPadding;
    const btnHeight = textHeight + verticalPadding;

    const graphics = this.add.graphics();
    const bgColor = Phaser.Display.Color.HexStringToColor(btnConfig.backgroundColor || '#FF6600').color;

    // Determine corner radius based on shape (proportional to button height)
    let cornerRadius = 0;
    if (btnConfig.shape === 'pill') {
      cornerRadius = btnHeight / 2;
    } else if (btnConfig.shape === 'rounded') {
      cornerRadius = btnHeight * 0.2; // 20% of button height for proportional rounding
    }

    graphics.fillStyle(bgColor, 1);
    if (cornerRadius > 0) {
      graphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, cornerRadius);
    } else {
      graphics.fillRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    }

    if (btnConfig.borderWidth > 0) {
      const borderColor = Phaser.Display.Color.HexStringToColor(btnConfig.borderColor || '#FFFFFF').color;
      graphics.lineStyle(btnConfig.borderWidth, borderColor);
      if (cornerRadius > 0) {
        graphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, cornerRadius);
      } else {
        graphics.strokeRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      }
    }

    const container = this.add.container(width / 2, y);
    container.add(graphics);

    this.actionButtonText = this.add.text(0, 0, btnText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${btnSize * scaleFactor}px`,
      color: btnConfig.textColor || '#FFFFFF',
      fontStyle: 'bold'
    });
    this.actionButtonText.setOrigin(0.5);
    container.add(this.actionButtonText);

    // Store graphics reference for button updates
    this.actionButtonGraphics = graphics;
    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });
    container.setScale(buttonScale);

    // Pulse animation
    this.tweens.add({
      targets: container,
      scaleX: buttonScale * 1.05,
      scaleY: buttonScale * 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    container.on('pointerdown', () => {
      this.startGame();
    });

    this.actionButton = container;

    // Explicitly load the font and update text after it's ready
    // This ensures the button text shows the correct font even on first load
    const fontName = config.fonts?.primary || 'Poppins';
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`600 16px "${fontName}"`).then(() => {
        // Small delay to ensure font is fully applied
        return new Promise(resolve => setTimeout(resolve, 100));
      }).then(() => {
        // Check if scene is still active
        if (!this.scene.isActive()) return;

        // Update text with the loaded font
        const fontFamily = `"${fontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        if (this.actionButtonText) {
          this.actionButtonText.setFontFamily(fontFamily);
          this.actionButtonText.updateText();
          console.log('[SplashScene] Font loaded and applied:', fontName);
        }
      }).catch(err => {
        console.warn('[SplashScene] Font loading error:', err);
      });
    }
  }

  startGame() {
    TrackingManager.trackPlayableStart();

    // Fade out elements
    this.tweens.add({
      targets: [this.logo, this.actionButton, this.splashHero].filter(x => x),
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.scene.start('Game');
      }
    });
  }

  setupMessageListener() {
    const config = window.GAME_CONFIG;
    const { height } = config.canvas;

    this.messageHandler = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      // Handle asset scale updates in real-time
      if (data.type === 'UPDATE_ASSET_SCALES' && data.data) {
        // Update logo scale
        if (data.data.logo !== undefined && this.logo) {
          const logoScale = config.layout?.logoScale || 0.5;
          this.logo.setScale(logoScale * data.data.logo);
          console.log('[SplashScene] Logo scale updated to:', data.data.logo);
        }

        // Update splash hero scale (using auto-scale)
        if (data.data.splashHero !== undefined && this.splashHero) {
          const finalScale = (this.splashHeroAutoScale || 1) * data.data.splashHero;
          this.splashHero.setScale(finalScale);
          console.log('[SplashScene] Splash hero scale updated to:', data.data.splashHero, 'finalScale:', finalScale);
        }
      }

      // Handle background updates
      if (data.type === 'UPDATE_BACKGROUND' && data.data) {
        if (data.data.solidColor && config.background.type === 'solid') {
          this.cameras.main.setBackgroundColor(data.data.solidColor);
        }
      }

      // Handle button updates - recreate button to resize based on new text
      if (data.type === 'UPDATE_BUTTONS' && data.data) {
        const needsRecreate = data.data.actionButtonText !== undefined ||
                             data.data.actionButtonSize !== undefined;

        if (needsRecreate && this.actionButton) {
          // Update config with new values
          if (data.data.actionButtonText !== undefined) {
            config.text.actionButtonText = data.data.actionButtonText;
          }
          if (data.data.actionButtonSize !== undefined) {
            config.text.actionButtonSize = data.data.actionButtonSize;
          }
          if (data.data.actionButton?.textColor) {
            config.actionButton.textColor = data.data.actionButton.textColor;
          }
          if (data.data.actionButton?.backgroundColor) {
            config.actionButton.backgroundColor = data.data.actionButton.backgroundColor;
          }

          // Get current button Y position before destroying
          const btnY = this.actionButton.y;

          // Destroy old button
          this.actionButton.destroy();
          this.actionButton = null;
          this.actionButtonText = null;
          this.actionButtonGraphics = null;

          // Recreate button with new text (pass the actual Y, not the layout margin)
          this.createActionButtonAtY(btnY);
          console.log('[SplashScene] Action button recreated with new text:', config.text.actionButtonText);
        } else if (data.data.actionButton?.textColor && this.actionButtonText) {
          // Just update color if no text change
          this.actionButtonText.setColor(data.data.actionButton.textColor);
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  // Helper to create button at a specific Y position (used for updates)
  createActionButtonAtY(y) {
    const config = window.GAME_CONFIG;
    const { width } = config.canvas;
    const btnConfig = config.actionButton;
    const buttonScale = btnConfig.scale || 1.0;
    const scaleFactor = config.fonts?.scaleFactor || 1.0;

    // Create temporary text to measure width (dynamic sizing like CFI)
    const btnText = config.text?.actionButtonText || 'START';
    const btnSize = config.text?.actionButtonSize || 24;
    const tempText = this.add.text(0, 0, btnText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${btnSize * scaleFactor}px`,
      fontStyle: 'bold'
    });
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    tempText.destroy();

    // Calculate button size based on text with padding
    const horizontalPadding = textWidth * 0.4;
    const verticalPadding = textHeight * 0.6;
    const btnWidth = textWidth + horizontalPadding;
    const btnHeight = textHeight + verticalPadding;

    const graphics = this.add.graphics();
    const bgColor = Phaser.Display.Color.HexStringToColor(btnConfig.backgroundColor || '#FF6600').color;

    let cornerRadius = 0;
    if (btnConfig.shape === 'pill') {
      cornerRadius = btnHeight / 2;
    } else if (btnConfig.shape === 'rounded') {
      cornerRadius = btnHeight * 0.2;
    }

    graphics.fillStyle(bgColor, 1);
    if (cornerRadius > 0) {
      graphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, cornerRadius);
    } else {
      graphics.fillRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    }

    if (btnConfig.borderWidth > 0) {
      const borderColor = Phaser.Display.Color.HexStringToColor(btnConfig.borderColor || '#FFFFFF').color;
      graphics.lineStyle(btnConfig.borderWidth, borderColor);
      if (cornerRadius > 0) {
        graphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, cornerRadius);
      } else {
        graphics.strokeRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      }
    }

    const container = this.add.container(width / 2, y);
    container.add(graphics);

    this.actionButtonText = this.add.text(0, 0, btnText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${btnSize * scaleFactor}px`,
      color: btnConfig.textColor || '#FFFFFF',
      fontStyle: 'bold'
    });
    this.actionButtonText.setOrigin(0.5);
    container.add(this.actionButtonText);

    this.actionButtonGraphics = graphics;
    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });
    container.setScale(buttonScale);

    // Pulse animation
    this.tweens.add({
      targets: container,
      scaleX: buttonScale * 1.05,
      scaleY: buttonScale * 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    container.on('pointerdown', () => {
      this.startGame();
    });

    this.actionButton = container;
  }

  updateLayout(layoutData) {
    const config = window.GAME_CONFIG;
    const { height } = config.canvas;

    // Update logo Y position
    if (layoutData.logoTopMargin !== undefined && this.logo) {
      const newY = height * layoutData.logoTopMargin;
      this.logo.setY(newY);
      console.log('[SplashScene] Logo Y position updated to:', newY);
    }

    // Update splash hero Y position
    if (layoutData.splashHeroYPosition !== undefined && this.splashHero) {
      const newY = height * layoutData.splashHeroYPosition;
      this.splashHero.setY(newY);
      console.log('[SplashScene] Splash hero Y position updated to:', newY);
    }

    // Update action button Y position
    if (layoutData.actionButtonTopMargin !== undefined && this.actionButton) {
      const newY = height * layoutData.actionButtonTopMargin;
      this.actionButton.setY(newY);
      console.log('[SplashScene] Action button Y position updated to:', newY);
    }
  }

  updateBackground() {
    const config = window.GAME_CONFIG;
    const bgConfig = config.background;
    const { width, height } = config.canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    // Destroy existing background if any
    if (this.bgImage) {
      this.bgImage.destroy();
      this.bgImage = null;
    }
    if (this.textures.exists('gradientBgSplash')) {
      this.textures.remove('gradientBgSplash');
    }

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      this.cameras.main.setBackgroundColor('#000000');

      const gradientCanvas = this.textures.createCanvas('gradientBgSplash', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart || '#1a1a2e');
      gradient.addColorStop(1, bgConfig.gradientEnd || '#16213e');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.bgImage = this.add.image(centerX, centerY, 'gradientBgSplash').setDepth(-100);
    } else if (bgConfig.type === 'image') {
      if (this.textures.exists('background')) {
        this.cameras.main.setBackgroundColor('#000000');
        const bg = this.add.image(centerX, centerY, 'background');
        const bgWidth = bg.width;
        const bgHeight = bg.height;
        const scaleX = width / bgWidth;
        const scaleY = height / bgHeight;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(-100);
        this.bgImage = bg;
      } else {
        // No image uploaded yet, show solid color as fallback
        this.cameras.main.setBackgroundColor(bgConfig.solidColor);
      }
    }
    console.log('[SplashScene] Background updated:', bgConfig.type);
  }

  shutdown() {
    // Cancel pending button animation timer
    if (this.buttonAnimationTimer) {
      this.buttonAnimationTimer.remove();
      this.buttonAnimationTimer = null;
    }

    // Remove message handler
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    // Clear references
    this.actionButton = null;
    this.actionButtonText = null;
    this.actionButtonGraphics = null;
  }
}

// ========================================
// GAME SCENE
// ========================================
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  init() {
    // Reset all state variables on each scene start
    this.rows = 0;
    this.columns = 0;
    this.pieceWidth = 0;
    this.pieceHeight = 0;
    this.pieces = null;
    this.spacer = null;
    this.slideSpeed = 300;
    this.slideEase = 'power3';
    this.iterations = 6;
    this.shuffleSpeed = 200;
    this.shuffleEase = 'power1';
    this.lastMove = null;
    this.slices = [];
    this.action = PuzzleState.ALLOW_CLICK;
    this.timeout = null;
    this.puzzleSolved = false;
    this.messageHandler = null;
  }

  create() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    // Clear any existing timeout from previous scene visit (both local and global)
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    // Also clear global timeout reference in case scene instance changed
    if (window.__puzzleGameTimeout) {
      clearTimeout(window.__puzzleGameTimeout);
      window.__puzzleGameTimeout = null;
    }

    this.puzzleSolved = false;

    // Setup real-time update listener
    this.setupMessageListener();

    // Create background
    this.createBackground();

    // Logo (top center, like splash and end screens)
    const logoY = height * (config.layout?.logoTopMargin || 0.05);
    this.textGap = 45; // Gap between logo bottom and instruction text

    if (this.textures.exists('logo')) {
      const logoScale = config.layout?.logoScaleGame || 0.3;
      this.gameLogo = this.add.image(width / 2, logoY, 'logo');
      this.gameLogo.setScale(logoScale * (config.assetScales?.logo || 1));
      this.gameLogo.setOrigin(0.5, 0);
    }

    // Game instruction text - positioned below logo
    const instructionText = config.text?.gameInstruction ?? 'Solve the Puzzle';
    const instructionY = this.gameLogo ? (this.gameLogo.y + this.gameLogo.displayHeight + this.textGap) : (logoY + 50);
    this.gameInstruction = this.add.text(width / 2, instructionY + 30, instructionText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${config.text?.gameInstructionSize || 32}px`,
      color: config.text?.gameInstructionColor || '#FFFFFF',
      align: 'center',
      fontStyle: 'bold'
    });
    this.gameInstruction.setOrigin(0.5);
    this.gameInstruction.setAlpha(0);

    // Store the final instruction Y for reference
    this.instructionFinalY = instructionY;
    this.subtextGap = 30; // Gap between instruction and subtext

    this.tweens.add({
      targets: this.gameInstruction,
      alpha: 1,
      y: instructionY,
      duration: 400,
      ease: 'Power2'
    });

    // Subtext - positioned below instruction text
    const subtextText = config.text?.gameSubtext ?? 'Tap tiles to slide them into place';
    const subtextY = instructionY + this.subtextGap;
    this.gameSubtext = this.add.text(width / 2, subtextY + 30, subtextText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${config.text?.gameSubtextSize || 18}px`,
      color: config.text?.gameSubtextColor || '#CCCCCC',
      align: 'center'
    });
    this.gameSubtext.setOrigin(0.5);
    this.gameSubtext.setAlpha(0);

    this.tweens.add({
      targets: this.gameSubtext,
      alpha: 1,
      y: subtextY,
      duration: 400,
      delay: 100,
      ease: 'Power2'
    });

    // Set iterations from config
    this.iterations = config.gameplay?.shuffleIterations || 6;

    // Start the puzzle
    this.startPuzzle();

    // Set timeout - store both locally and globally for reliable cleanup
    // Only start timer if autoEndTimer is enabled
    if (config.gameplay?.autoEndTimer) {
      const gameDuration = config.gameplay?.gameDuration || 30000;
      console.log('[GameScene] Starting game timer:', gameDuration, 'ms');
      this.timeout = setTimeout(() => {
        if (!this.puzzleSolved) {
          this.handleTimeout();
        }
      }, gameDuration);
      // Store globally so it can be cleared even if scene instance changes
      window.__puzzleGameTimeout = this.timeout;
    } else {
      console.log('[PicturePuzzle] Auto-end timer disabled in config - game will continue until puzzle is solved');
    }
  }

  createBackground() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const bgConfig = config.background;

    if (bgConfig.type === 'image' && this.textures.exists('background')) {
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setDepth(-1);
    } else if (bgConfig.type === 'gradient') {
      const graphics = this.add.graphics();
      const startColor = Phaser.Display.Color.HexStringToColor(bgConfig.gradientStart || '#1a1a2e');
      const endColor = Phaser.Display.Color.HexStringToColor(bgConfig.gradientEnd || '#16213e');

      for (let i = 0; i < height; i++) {
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          startColor, endColor, height, i
        );
        graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
        graphics.fillRect(0, i, width, 1);
      }
      graphics.setDepth(-1);
    } else {
      // Solid color, or image type with no image uploaded (fallback to solid)
      this.cameras.main.setBackgroundColor(bgConfig.solidColor || config.canvas.backgroundColor);
    }
  }

  startPuzzle() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    const rows = config.gameplay?.gridSize || 3;
    const columns = config.gameplay?.gridSize || 3;

    this.rows = rows;
    this.columns = columns;

    // Get puzzle image texture
    console.log('[GameScene] Checking for puzzleImage texture, exists:', this.textures.exists('puzzleImage'));
    const texture = this.textures.getFrame('puzzleImage');
    if (!texture) {
      console.error('[GameScene] Puzzle image not loaded - texture frame is null');
      console.log('[GameScene] Available textures:', this.textures.getTextureKeys());
      return;
    }
    console.log('[GameScene] Puzzle texture loaded, size:', texture.width, 'x', texture.height);

    // Calculate puzzle size based on canvas
    const puzzleScale = config.layout?.puzzleScale || 0.85;
    const maxPuzzleSize = Math.min(width, height * 0.5) * puzzleScale;

    // Make puzzle square based on image aspect ratio
    const photoWidth = Math.min(texture.width, maxPuzzleSize);
    const photoHeight = Math.min(texture.height, maxPuzzleSize);
    const puzzleSize = Math.min(photoWidth, photoHeight);

    const pieceWidth = puzzleSize / rows;
    const pieceHeight = puzzleSize / columns;

    this.pieceWidth = pieceWidth;
    this.pieceHeight = pieceHeight;

    // Create container for puzzle pieces
    const puzzleY = height * (config.layout?.puzzleTopMargin || 0.40);
    const puzzleX = (width - puzzleSize) / 2;

    // Clear old slice textures from texture manager BEFORE creating new ones
    for (let idx = 0; idx < 9; idx++) {
      const sliceKey = `slice${idx}`;
      if (this.textures.exists(sliceKey)) {
        console.log('[GameScene] Removing old slice texture:', sliceKey);
        this.textures.remove(sliceKey);
      }
    }

    // Reset slices array
    this.slices = [];

    // Always create a fresh container
    this.pieces = this.add.container(puzzleX, puzzleY);

    const borderWidth = config.gameplay?.tileBorderWidth || 2;
    const borderColor = config.gameplay?.tileBorderColor || '#FFFFFF';

    let i = 0;

    // Create puzzle pieces
    for (let y = 0; y < this.columns; y++) {
      for (let x = 0; x < this.rows; x++) {
        const sliceWidth = pieceWidth + borderWidth * 2;
        const sliceHeight = pieceHeight + borderWidth * 2;

        const slice = this.textures.createCanvas(`slice${i}`, sliceWidth, sliceHeight);
        const ctx = slice.getContext('2d');

        // Calculate source portion
        const sourceX = (x / rows) * texture.width;
        const sourceY = (y / columns) * texture.height;
        const sourceW = texture.width / rows;
        const sourceH = texture.height / columns;

        // Get source texture
        const sourceTexture = this.textures.get('puzzleImage');
        const source = sourceTexture.getSourceImage();

        // Draw border
        ctx.fillStyle = borderColor;
        ctx.fillRect(0, 0, sliceWidth, sliceHeight);

        // Draw image piece
        ctx.drawImage(
          source,
          sourceX, sourceY, sourceW, sourceH,
          borderWidth, borderWidth, pieceWidth, pieceHeight
        );

        slice.refresh();
        this.slices.push(slice);

        // Create piece sprite
        const piece = this.add.image(x * pieceWidth, y * pieceHeight, `slice${i}`);
        piece.setOrigin(0, 0);
        piece.x -= borderWidth;
        piece.y -= borderWidth;

        // Store position data
        piece.setData({
          row: x,
          column: y,
          correctRow: x,
          correctColumn: y
        });

        piece.setInteractive();
        piece.on('pointerdown', () => this.checkPiece(piece));

        this.pieces.add(piece);
        i++;
      }
    }

    // Last piece is the spacer
    this.spacer = this.pieces.getAt(this.pieces.length - 1);
    this.spacer.alpha = 0;

    this.lastMove = null;

    // Start shuffling after delay
    this.time.delayedCall(1000, () => {
      this.shufflePieces();
    });
  }

  shufflePieces() {
    const moves = [];
    const spacerCol = this.spacer.data.get('column');
    const spacerRow = this.spacer.data.get('row');

    if (spacerCol > 0 && this.lastMove !== Phaser.DOWN) {
      moves.push(Phaser.UP);
    }
    if (spacerCol < this.columns - 1 && this.lastMove !== Phaser.UP) {
      moves.push(Phaser.DOWN);
    }
    if (spacerRow > 0 && this.lastMove !== Phaser.RIGHT) {
      moves.push(Phaser.LEFT);
    }
    if (spacerRow < this.rows - 1 && this.lastMove !== Phaser.LEFT) {
      moves.push(Phaser.RIGHT);
    }

    this.lastMove = Phaser.Utils.Array.GetRandom(moves);

    switch (this.lastMove) {
      case Phaser.UP:
        this.swapPiece(spacerRow, spacerCol - 1);
        break;
      case Phaser.DOWN:
        this.swapPiece(spacerRow, spacerCol + 1);
        break;
      case Phaser.LEFT:
        this.swapPiece(spacerRow - 1, spacerCol);
        break;
      case Phaser.RIGHT:
        this.swapPiece(spacerRow + 1, spacerCol);
        break;
    }
  }

  swapPiece(row, column) {
    const piece = this.getPiece(row, column);
    const spacer = this.spacer;
    const x = spacer.x;
    const y = spacer.y;

    piece.data.values.row = spacer.data.values.row;
    piece.data.values.column = spacer.data.values.column;

    spacer.data.values.row = row;
    spacer.data.values.column = column;

    spacer.setPosition(piece.x, piece.y);

    if (this.shuffleSpeed === 0) {
      piece.setPosition(x, y);
      if (this.iterations > 0) {
        this.iterations--;
        this.shufflePieces();
      } else {
        this.startPlay();
      }
    } else {
      const tween = this.tweens.add({
        targets: piece,
        x, y,
        duration: this.shuffleSpeed,
        ease: this.shuffleEase
      });

      if (this.iterations > 0) {
        this.iterations--;
        tween.on('complete', this.shufflePieces, this);
      } else {
        tween.on('complete', this.startPlay, this);
      }
    }
  }

  getPiece(row, column) {
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces.getAt(i);
      if (piece.data.get('row') === row && piece.data.get('column') === column) {
        return piece;
      }
    }
    return null;
  }

  startPlay() {
    this.action = PuzzleState.ALLOW_CLICK;
  }

  checkPiece(piece) {
    if (this.action !== PuzzleState.ALLOW_CLICK || this.puzzleSolved) {
      return;
    }

    const spacer = this.spacer;

    if (piece.data.values.row === spacer.data.values.row) {
      if (spacer.data.values.column === piece.data.values.column - 1) {
        piece.data.values.column--;
        spacer.data.values.column++;
        spacer.y += this.pieceHeight;
        this.slidePiece(piece, piece.x, piece.y - this.pieceHeight);
      } else if (spacer.data.values.column === piece.data.values.column + 1) {
        piece.data.values.column++;
        spacer.data.values.column--;
        spacer.y -= this.pieceHeight;
        this.slidePiece(piece, piece.x, piece.y + this.pieceHeight);
      }
    } else if (piece.data.values.column === spacer.data.values.column) {
      if (spacer.data.values.row === piece.data.values.row - 1) {
        piece.data.values.row--;
        spacer.data.values.row++;
        spacer.x += this.pieceWidth;
        this.slidePiece(piece, piece.x - this.pieceWidth, piece.y);
      } else if (spacer.data.values.row === piece.data.values.row + 1) {
        piece.data.values.row++;
        spacer.data.values.row--;
        spacer.x -= this.pieceWidth;
        this.slidePiece(piece, piece.x + this.pieceWidth, piece.y);
      }
    }
  }

  slidePiece(piece, x, y) {
    this.action = PuzzleState.TWEENING;

    this.tweens.add({
      targets: piece,
      x, y,
      duration: this.slideSpeed,
      ease: this.slideEase,
      onComplete: () => this.tweenOver()
    });
  }

  tweenOver() {
    let outOfSequence = false;

    this.pieces.each((piece) => {
      if (
        piece.data.values.correctRow !== piece.data.values.row ||
        piece.data.values.correctColumn !== piece.data.values.column
      ) {
        outOfSequence = true;
      }
    });

    if (outOfSequence) {
      this.action = PuzzleState.ALLOW_CLICK;
    } else {
      // Puzzle solved!
      this.puzzleSolved = true;
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }

      this.handleWin();
    }
  }

  handleWin() {
    TrackingManager.trackPlayableComplete();

    // Launch confetti
    this.launchConfetti();

    // Reveal spacer
    this.tweens.add({
      targets: this.spacer,
      alpha: 1,
      duration: 600,
      ease: 'linear'
    });

    // Transition to end screen after delay
    this.time.delayedCall(2000, () => {
      this.scene.start('End', { won: true });
    });
  }

  handleTimeout() {
    TrackingManager.trackPlayableTimeout();

    // Fade out puzzle
    this.tweens.add({
      targets: [this.pieces, this.gameInstruction, this.gameSubtext],
      alpha: 0,
      duration: 500,
      ease: 'Power2'
    });

    this.time.delayedCall(1000, () => {
      this.scene.start('End', { won: false });
    });
  }

  launchConfetti() {
    const config = window.GAME_CONFIG;
    const colors = config.colors?.confetti || ['#FF6600', '#FFFFFF', '#FFD700', '#00FF00'];

    if (typeof confetti !== 'undefined') {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: colors
      });

      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.6 },
          colors: colors
        });
      }, 250);

      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.6 },
          colors: colors
        });
      }, 400);
    }
  }

  setupMessageListener() {
    const config = window.GAME_CONFIG;

    this.messageHandler = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      // Handle asset scale updates in real-time
      if (data.type === 'UPDATE_ASSET_SCALES' && data.data) {
        // Update logo scale and reposition text
        if (data.data.logo !== undefined && this.gameLogo) {
          const logoScale = config.layout?.logoScaleGame || 0.3;
          this.gameLogo.setScale(logoScale * data.data.logo);
          console.log('[GameScene] Logo scale updated to:', data.data.logo);

          // Reposition instruction text to maintain gap below logo
          if (this.gameInstruction) {
            const newInstructionY = this.gameLogo.y + this.gameLogo.displayHeight + this.textGap;
            this.gameInstruction.setY(newInstructionY);

            // Also reposition subtext
            if (this.gameSubtext) {
              this.gameSubtext.setY(newInstructionY + this.subtextGap);
            }
          }
        }
      }

      // Handle text updates in real-time
      if (data.type === 'UPDATE_TEXTS' && data.data) {
        if (data.data.gameInstruction !== undefined && this.gameInstruction) {
          this.gameInstruction.setText(data.data.gameInstruction);
        }
        if (data.data.gameInstructionColor !== undefined && this.gameInstruction) {
          this.gameInstruction.setColor(data.data.gameInstructionColor);
        }
        if (data.data.gameSubtext !== undefined && this.gameSubtext) {
          this.gameSubtext.setText(data.data.gameSubtext);
        }
        if (data.data.gameSubtextColor !== undefined && this.gameSubtext) {
          this.gameSubtext.setColor(data.data.gameSubtextColor);
        }
      }

      // Handle background updates
      if (data.type === 'UPDATE_BACKGROUND' && data.data) {
        if (data.data.solidColor && config.background.type === 'solid') {
          this.cameras.main.setBackgroundColor(data.data.solidColor);
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  updateBackground() {
    const config = window.GAME_CONFIG;
    const bgConfig = config.background;
    const { width, height } = config.canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    // Destroy existing background if any
    if (this.bgImage) {
      this.bgImage.destroy();
      this.bgImage = null;
    }
    if (this.textures.exists('gradientBgGame')) {
      this.textures.remove('gradientBgGame');
    }

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      this.cameras.main.setBackgroundColor('#000000');

      const gradientCanvas = this.textures.createCanvas('gradientBgGame', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart || '#1a1a2e');
      gradient.addColorStop(1, bgConfig.gradientEnd || '#16213e');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.bgImage = this.add.image(centerX, centerY, 'gradientBgGame').setDepth(-100);
    } else if (bgConfig.type === 'image') {
      if (this.textures.exists('background')) {
        this.cameras.main.setBackgroundColor('#000000');
        const bg = this.add.image(centerX, centerY, 'background');
        const bgWidth = bg.width;
        const bgHeight = bg.height;
        const scaleX = width / bgWidth;
        const scaleY = height / bgHeight;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(-100);
        this.bgImage = bg;
      } else {
        // No image uploaded yet, show solid color as fallback
        this.cameras.main.setBackgroundColor(bgConfig.solidColor);
      }
    }
    console.log('[GameScene] Background updated:', bgConfig.type);
  }

  shutdown() {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

// ========================================
// END SCENE
// ========================================
class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'End' });
    this.messageHandler = null;
  }

  init(data) {
    this.won = data?.won !== false;
  }

  create() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    // Setup real-time update listener
    this.setupMessageListener();

    // Create background
    this.createBackground();

    // Logo (same scale and position as Splash screen)
    const logoY = height * (config.layout?.logoTopMargin || 0.05);
    this.textGap = 25; // Gap between logo bottom and heading text
    this.subtextGap = 30; // Gap between heading and subtext

    if (this.textures.exists('logo')) {
      const logoScale = config.layout?.logoScale || 0.5;
      this.logo = this.add.image(width / 2, logoY + 30, 'logo');
      this.logo.setScale(logoScale * (config.assetScales?.logo || 1));
      this.logo.setOrigin(0.5, 0);
      this.logo.setAlpha(0);

      this.tweens.add({
        targets: this.logo,
        alpha: 1,
        y: logoY,
        duration: 400,
        ease: 'Back.easeOut'
      });
    }

    // Heading - positioned below logo
    // Use ?? instead of || to allow empty strings (user can clear the text)
    const headingText = this.won
      ? (config.text?.endHeading ?? 'Well Done!')
      : (config.text?.timeoutHeading ?? 'Time\'s Up!');
    const headingY = this.logo ? (this.logo.y + this.logo.displayHeight + this.textGap) : (logoY + 80);

    this.heading = this.add.text(width / 2, headingY + 30, headingText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${config.text?.endHeadingSize || 40}px`,
      color: config.text?.endHeadingColor || '#FFFFFF',
      align: 'center',
      fontStyle: 'bold'
    });
    this.heading.setOrigin(0.5);
    this.heading.setAlpha(0);

    // Store final heading Y for reference
    this.headingFinalY = headingY;

    this.time.delayedCall(200, () => {
      this.tweens.add({
        targets: this.heading,
        alpha: 1,
        y: headingY,
        duration: 400,
        ease: 'Power2'
      });
    });

    // Subtext - positioned below heading
    // Use ?? instead of || to allow empty strings (user can clear the text)
    const subtextText = this.won
      ? (config.text?.endSubtext ?? 'You solved the puzzle!')
      : (config.text?.timeoutSubtext ?? 'Better luck next time!');
    const subtextY = headingY + this.subtextGap;

    this.subtext = this.add.text(width / 2, subtextY + 30, subtextText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${config.text?.endSubtextSize || 20}px`,
      color: config.text?.endSubtextColor || '#CCCCCC',
      align: 'center'
    });
    this.subtext.setOrigin(0.5);
    this.subtext.setAlpha(0);

    this.time.delayedCall(300, () => {
      this.tweens.add({
        targets: this.subtext,
        alpha: 1,
        y: subtextY,
        duration: 400,
        ease: 'Power2'
      });
    });

    // End hero image with auto-scaling (like catch-falling-items)
    if (this.textures.exists('endHero')) {
      const heroY = height * (config.layout?.endHeroYPosition || 0.55);
      this.endHero = this.add.image(width / 2, heroY, 'endHero');
      this.endHero.setOrigin(0.5);

      // Smart auto-scaling: fit image within bounds while maintaining aspect ratio
      const imgWidth = this.endHero.width;
      const imgHeight = this.endHero.height;
      const maxHeight = height * 0.5;
      const maxWidth = width * 0.9;

      const scaleByHeight = maxHeight / imgHeight;
      const scaleByWidth = maxWidth / imgWidth;
      const autoScale = Math.min(scaleByHeight, scaleByWidth);
      this.endHeroAutoScale = autoScale;

      const finalScale = autoScale * (config.assetScales?.endHero || 1);
      this.endHero.setScale(finalScale);
      console.log('[EndScene] End hero created with autoScale:', autoScale, 'finalScale:', finalScale);
    }

    // CTA button
    const btnY = height * (config.layout?.ctaButtonTopMargin || 0.85);
    this.createCTAButton(btnY);
  }

  createBackground() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const bgConfig = config.background;

    if (bgConfig.type === 'image' && this.textures.exists('background')) {
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setDepth(-1);
    } else if (bgConfig.type === 'gradient') {
      const graphics = this.add.graphics();
      const startColor = Phaser.Display.Color.HexStringToColor(bgConfig.gradientStart || '#1a1a2e');
      const endColor = Phaser.Display.Color.HexStringToColor(bgConfig.gradientEnd || '#16213e');

      for (let i = 0; i < height; i++) {
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          startColor, endColor, height, i
        );
        graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
        graphics.fillRect(0, i, width, 1);
      }
      graphics.setDepth(-1);
    } else {
      // Solid color, or image type with no image uploaded (fallback to solid)
      this.cameras.main.setBackgroundColor(bgConfig.solidColor || config.canvas.backgroundColor);
    }
  }

  createCTAButton(y) {
    const config = window.GAME_CONFIG;
    const { width } = config.canvas;
    const btnConfig = config.ctaButton;
    const buttonScale = btnConfig.scale || 1.0;
    const scaleFactor = config.fonts?.scaleFactor || 1.0;

    // Create temporary text to measure width (dynamic sizing like CFI)
    const btnText = config.text?.ctaText || 'LEARN MORE';
    const btnSize = config.text?.ctaSize || 24;
    const tempText = this.add.text(0, 0, btnText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${btnSize * scaleFactor}px`,
      fontStyle: 'bold'
    });
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    tempText.destroy();

    // Calculate button size based on text with padding (scales proportionally with text size)
    const horizontalPadding = textWidth * 0.4; // 40% of text width total (20% each side)
    const verticalPadding = textHeight * 0.6; // 60% of text height total (30% each side)
    const btnWidth = textWidth + horizontalPadding;
    const btnHeight = textHeight + verticalPadding;

    const graphics = this.add.graphics();
    const bgColor = Phaser.Display.Color.HexStringToColor(btnConfig.backgroundColor || '#FF6600').color;

    // Determine corner radius based on shape (proportional to button height)
    let cornerRadius = 0;
    if (btnConfig.shape === 'pill') {
      cornerRadius = btnHeight / 2;
    } else if (btnConfig.shape === 'rounded') {
      cornerRadius = btnHeight * 0.2; // 20% of button height for proportional rounding
    }

    graphics.fillStyle(bgColor, 1);
    if (cornerRadius > 0) {
      graphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, cornerRadius);
    } else {
      graphics.fillRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    }

    if (btnConfig.borderWidth > 0) {
      const borderColor = Phaser.Display.Color.HexStringToColor(btnConfig.borderColor || '#FFFFFF').color;
      graphics.lineStyle(btnConfig.borderWidth, borderColor);
      if (cornerRadius > 0) {
        graphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, cornerRadius);
      } else {
        graphics.strokeRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      }
    }

    const container = this.add.container(width / 2, y);
    container.add(graphics);

    this.ctaButtonText = this.add.text(0, 0, btnText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${btnSize * scaleFactor}px`,
      color: btnConfig.textColor || '#FFFFFF',
      fontStyle: 'bold'
    });
    this.ctaButtonText.setOrigin(0.5);
    container.add(this.ctaButtonText);

    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });
    container.setScale(buttonScale);

    // Pulse animation
    this.tweens.add({
      targets: container,
      scaleX: buttonScale * 1.05,
      scaleY: buttonScale * 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    container.on('pointerdown', () => {
      this.handleCTA();
    });

    this.ctaButton = container;

    // Explicitly load the font and update text after it's ready
    const fontName = config.fonts?.primary || 'Poppins';
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`600 16px "${fontName}"`).then(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      }).then(() => {
        if (!this.scene.isActive()) return;
        const fontFamily = `"${fontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        if (this.ctaButtonText) {
          this.ctaButtonText.setFontFamily(fontFamily);
          this.ctaButtonText.updateText();
          console.log('[EndScene] Font loaded and applied:', fontName);
        }
      }).catch(err => {
        console.warn('[EndScene] Font loading error:', err);
      });
    }
  }

  handleCTA() {
    const config = window.GAME_CONFIG;
    TrackingManager.trackClick();
    if (config.cta?.url) {
      window.open(config.cta.url, config.cta.target || '_blank');
    }
  }

  setupMessageListener() {
    const config = window.GAME_CONFIG;

    this.messageHandler = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      // Handle asset scale updates in real-time
      if (data.type === 'UPDATE_ASSET_SCALES' && data.data) {
        // Update logo scale and reposition text
        if (data.data.logo !== undefined && this.logo) {
          const logoScale = config.layout?.logoScale || 0.5;
          this.logo.setScale(logoScale * data.data.logo);
          console.log('[EndScene] Logo scale updated to:', data.data.logo);

          // Reposition heading text to maintain gap below logo
          if (this.heading) {
            const newHeadingY = this.logo.y + this.logo.displayHeight + this.textGap;
            this.heading.setY(newHeadingY);

            // Also reposition subtext
            if (this.subtext) {
              this.subtext.setY(newHeadingY + this.subtextGap);
            }
          }
        }

        // Update end hero scale (using auto-scale)
        if (data.data.endHero !== undefined && this.endHero) {
          const finalScale = (this.endHeroAutoScale || 1) * data.data.endHero;
          this.endHero.setScale(finalScale);
          console.log('[EndScene] End hero scale updated to:', data.data.endHero, 'finalScale:', finalScale);
        }
      }

      // Handle text updates in real-time
      if (data.type === 'UPDATE_TEXTS' && data.data) {
        if (data.data.endHeading !== undefined && this.heading) {
          this.heading.setText(data.data.endHeading);
        }
        if (data.data.endHeadingColor !== undefined && this.heading) {
          this.heading.setColor(data.data.endHeadingColor);
        }
        if (data.data.endSubtext !== undefined && this.subtext) {
          this.subtext.setText(data.data.endSubtext);
        }
        if (data.data.endSubtextColor !== undefined && this.subtext) {
          this.subtext.setColor(data.data.endSubtextColor);
        }
        if (data.data.ctaText !== undefined && this.ctaButton) {
          // Find the text object in the container
          const textObj = this.ctaButton.list.find(obj => obj.type === 'Text');
          if (textObj) {
            textObj.setText(data.data.ctaText);
          }
        }
      }

      // Handle background updates
      if (data.type === 'UPDATE_BACKGROUND' && data.data) {
        if (data.data.solidColor && config.background.type === 'solid') {
          this.cameras.main.setBackgroundColor(data.data.solidColor);
        }
      }

      // Handle button updates - recreate button to resize based on new text
      if (data.type === 'UPDATE_BUTTONS' && data.data) {
        const needsRecreate = data.data.ctaText !== undefined ||
                             data.data.ctaSize !== undefined;

        if (needsRecreate && this.ctaButton) {
          // Update config with new values
          if (data.data.ctaText !== undefined) {
            config.text.ctaText = data.data.ctaText;
          }
          if (data.data.ctaSize !== undefined) {
            config.text.ctaSize = data.data.ctaSize;
          }
          if (data.data.ctaButton?.textColor) {
            config.ctaButton.textColor = data.data.ctaButton.textColor;
          }
          if (data.data.ctaButton?.backgroundColor) {
            config.ctaButton.backgroundColor = data.data.ctaButton.backgroundColor;
          }

          // Get current button Y position before destroying
          const btnY = this.ctaButton.y;

          // Destroy old button
          this.ctaButton.destroy();
          this.ctaButton = null;

          // Recreate button with new text
          this.createCTAButtonAtY(btnY);
          console.log('[EndScene] CTA button recreated with new text:', config.text.ctaText);
        } else if (data.data.ctaButton?.textColor && this.ctaButton) {
          // Just update color if no text change
          const textObj = this.ctaButton.list.find(obj => obj.type === 'Text');
          if (textObj) {
            textObj.setColor(data.data.ctaButton.textColor);
          }
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  // Helper to create CTA button at a specific Y position (used for updates)
  createCTAButtonAtY(y) {
    const config = window.GAME_CONFIG;
    const { width } = config.canvas;
    const btnConfig = config.ctaButton;
    const buttonScale = btnConfig.scale || 1.0;
    const scaleFactor = config.fonts?.scaleFactor || 1.0;

    // Create temporary text to measure width
    const btnText = config.text?.ctaText || 'LEARN MORE';
    const btnSize = config.text?.ctaSize || 24;
    const tempText = this.add.text(0, 0, btnText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${btnSize * scaleFactor}px`,
      fontStyle: 'bold'
    });
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    tempText.destroy();

    // Calculate button size based on text with padding
    const horizontalPadding = textWidth * 0.4;
    const verticalPadding = textHeight * 0.6;
    const btnWidth = textWidth + horizontalPadding;
    const btnHeight = textHeight + verticalPadding;

    const graphics = this.add.graphics();
    const bgColor = Phaser.Display.Color.HexStringToColor(btnConfig.backgroundColor || '#FF6600').color;

    let cornerRadius = 0;
    if (btnConfig.shape === 'pill') {
      cornerRadius = btnHeight / 2;
    } else if (btnConfig.shape === 'rounded') {
      cornerRadius = btnHeight * 0.2;
    }

    graphics.fillStyle(bgColor, 1);
    if (cornerRadius > 0) {
      graphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, cornerRadius);
    } else {
      graphics.fillRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    }

    if (btnConfig.borderWidth > 0) {
      const borderColor = Phaser.Display.Color.HexStringToColor(btnConfig.borderColor || '#FFFFFF').color;
      graphics.lineStyle(btnConfig.borderWidth, borderColor);
      if (cornerRadius > 0) {
        graphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, cornerRadius);
      } else {
        graphics.strokeRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      }
    }

    const container = this.add.container(width / 2, y);
    container.add(graphics);

    const text = this.add.text(0, 0, btnText, {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${btnSize * scaleFactor}px`,
      color: btnConfig.textColor || '#FFFFFF',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);
    container.add(text);

    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });
    container.setScale(buttonScale);

    // Pulse animation
    this.tweens.add({
      targets: container,
      scaleX: buttonScale * 1.05,
      scaleY: buttonScale * 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    container.on('pointerdown', () => {
      this.handleCTA();
    });

    this.ctaButton = container;
  }

  updateLayout(layoutData) {
    const config = window.GAME_CONFIG;
    const { height } = config.canvas;

    // Update end hero Y position
    if (layoutData.endHeroYPosition !== undefined && this.endHero) {
      const newY = height * layoutData.endHeroYPosition;
      this.endHero.setY(newY);
      console.log('[EndScene] End hero Y position updated to:', newY);
    }

    // Update CTA button Y position
    if (layoutData.ctaButtonTopMargin !== undefined && this.ctaButton) {
      const newY = height * layoutData.ctaButtonTopMargin;
      this.ctaButton.setY(newY);
      console.log('[EndScene] CTA button Y position updated to:', newY);
    }
  }

  updateBackground() {
    const config = window.GAME_CONFIG;
    const bgConfig = config.background;
    const { width, height } = config.canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    // Destroy existing background if any
    if (this.bgImage) {
      this.bgImage.destroy();
      this.bgImage = null;
    }
    if (this.textures.exists('gradientBgEnd')) {
      this.textures.remove('gradientBgEnd');
    }

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      this.cameras.main.setBackgroundColor('#000000');

      const gradientCanvas = this.textures.createCanvas('gradientBgEnd', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart || '#1a1a2e');
      gradient.addColorStop(1, bgConfig.gradientEnd || '#16213e');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.bgImage = this.add.image(centerX, centerY, 'gradientBgEnd').setDepth(-100);
    } else if (bgConfig.type === 'image') {
      if (this.textures.exists('background')) {
        this.cameras.main.setBackgroundColor('#000000');
        const bg = this.add.image(centerX, centerY, 'background');
        const bgWidth = bg.width;
        const bgHeight = bg.height;
        const scaleX = width / bgWidth;
        const scaleY = height / bgHeight;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(-100);
        this.bgImage = bg;
      } else {
        // No image uploaded yet, show solid color as fallback
        this.cameras.main.setBackgroundColor(bgConfig.solidColor);
      }
    }
    console.log('[EndScene] Background updated:', bgConfig.type);
  }

  shutdown() {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
}

// ========================================
// GAME INITIALIZATION
// ========================================
const gameConfig = {
  type: Phaser.AUTO,
  width: window.GAME_CONFIG.canvas.width,
  height: window.GAME_CONFIG.canvas.height,
  backgroundColor: window.GAME_CONFIG.canvas.backgroundColor,
  parent: 'game-container',
  scene: [PreloaderScene, SplashScene, GameScene, EndScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// Initialize game when DOM is ready AND fonts are loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for fonts to load before starting game to prevent fallback font flash
  const startGame = () => {
    console.log('[PicturePuzzle] Starting game...');
    window.gameInstance = new Phaser.Game(gameConfig);
  };

  // Check if fonts API is available
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      console.log('[PicturePuzzle] Fonts ready, starting game');
      startGame();
    }).catch(() => {
      console.warn('[PicturePuzzle] Font loading failed, starting anyway');
      startGame();
    });
  } else {
    // Fallback for browsers without fonts API
    console.log('[PicturePuzzle] No fonts API, starting game after short delay');
    setTimeout(startGame, 100);
  }
});

// ========================================
// POSTMESSAGE LISTENER FOR EDITOR
// ========================================
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  console.log('[LivePreview] Received message:', data.type);

  switch (data.type) {
    case 'UPDATE_CONFIG':
      if (data.config) {
        Object.assign(window.GAME_CONFIG, data.config);
      }
      break;

    case 'UPDATE_ASSETS':
      if (data.data) {
        console.log('[Game] Custom assets updated, storing and restarting from Preloader');
        const assetData = data.data;

        // Store custom assets globally
        window.customAssets = window.customAssets || {};
        Object.assign(window.customAssets, assetData);

        // Also save to sessionStorage for persistence across reloads (share preview page)
        try {
          sessionStorage.setItem('customAssets_picture-puzzle', JSON.stringify(window.customAssets));
          console.log('[Game] Assets saved to sessionStorage');
        } catch (e) {
          console.warn('[Game] Could not save assets to sessionStorage:', e);
        }

        // Remove existing textures so Preloader reloads them
        Object.keys(assetData).forEach(key => {
          if (window.gameInstance.textures.exists(key)) {
            console.log('[Game] Removing texture for reload:', key);
            window.gameInstance.textures.remove(key);
          }
          // Also remove dynamically created slice textures for puzzle
          if (key === 'puzzleImage') {
            for (let i = 0; i < 9; i++) {
              if (window.gameInstance.textures.exists(`slice${i}`)) {
                window.gameInstance.textures.remove(`slice${i}`);
              }
            }
          }
        });

        // Stop all scenes and restart from Preloader
        window.gameInstance.scene.scenes.forEach(scene => {
          if (scene.scene.isActive()) {
            scene.scene.stop();
          }
        });
        window.gameInstance.scene.start('Preloader');
      }
      break;

    case 'UPDATE_BACKGROUND':
      if (data.data && window.gameInstance) {
        Object.assign(window.GAME_CONFIG.background, data.data);
        console.log('[PicturePuzzle] Background update received:', data.data);

        // Update all active scenes
        window.gameInstance.scene.getScenes(true).forEach(scene => {
          if (scene.updateBackground) {
            scene.updateBackground();
          }
        });
      }
      break;

    case 'UPDATE_TEXTS':
      if (data.data) {
        window.GAME_CONFIG.text = { ...window.GAME_CONFIG.text, ...data.data };
      }
      break;

    case 'UPDATE_BUTTONS':
      if (data.data) {
        if (data.data.actionButton) {
          window.GAME_CONFIG.actionButton = { ...window.GAME_CONFIG.actionButton, ...data.data.actionButton };
        }
        if (data.data.ctaButton) {
          window.GAME_CONFIG.ctaButton = { ...window.GAME_CONFIG.ctaButton, ...data.data.ctaButton };
        }
      }
      break;

    case 'UPDATE_GAMEPLAY':
      if (data.data) {
        window.GAME_CONFIG.gameplay = { ...window.GAME_CONFIG.gameplay, ...data.data };
      }
      break;

    case 'UPDATE_LAYOUT':
      if (data.data && window.gameInstance) {
        const layoutData = data.data;
        console.log('[PicturePuzzle] Layout update received:', layoutData);

        // Update config
        window.GAME_CONFIG.layout = { ...window.GAME_CONFIG.layout, ...layoutData };

        // Update all active scenes
        window.gameInstance.scene.getScenes(true).forEach(scene => {
          if (scene.updateLayout) {
            scene.updateLayout(layoutData);
          }
        });
      }
      break;

    case 'UPDATE_FONTS':
      if (data.data) {
        window.GAME_CONFIG.fonts = { ...window.GAME_CONFIG.fonts, ...data.data };
      }
      break;

    case 'UPDATE_TRACKING':
      if (data.data) {
        if (data.data.cta) {
          window.GAME_CONFIG.cta = { ...window.GAME_CONFIG.cta, ...data.data.cta };
        }
        if (data.data.tracking) {
          window.GAME_CONFIG.tracking = { ...window.GAME_CONFIG.tracking, ...data.data.tracking };
        }
      }
      break;

    case 'UPDATE_ASSET_SCALES':
      if (data.data) {
        window.GAME_CONFIG.assetScales = { ...window.GAME_CONFIG.assetScales, ...data.data };
      }
      break;

    case 'JUMP_TO_SCENE':
      const sceneName = data.data?.scene || data.payload?.scene;
      console.log('[Game] Jumping to scene:', sceneName);

      if (!sceneName || !window.gameInstance) return;

      const sceneMap = {
        'Splash': 'Splash',
        'Game': 'Game',
        'End': 'End'
      };

      const targetScene = sceneMap[sceneName];
      if (!targetScene) return;

      // Clear any running game timeout before switching scenes
      if (window.__puzzleGameTimeout) {
        clearTimeout(window.__puzzleGameTimeout);
        window.__puzzleGameTimeout = null;
      }

      // Stop all running scenes
      window.gameInstance.scene.scenes.forEach(scene => {
        if (scene.scene.isActive()) {
          scene.scene.stop();
        }
      });

      // For Game scene, always go through Preloader to ensure clean texture state
      if (targetScene === 'Game') {
        // Clear slice textures
        for (let idx = 0; idx < 9; idx++) {
          const sliceKey = `slice${idx}`;
          if (window.gameInstance.textures.exists(sliceKey)) {
            window.gameInstance.textures.remove(sliceKey);
          }
        }
        // Remove puzzleImage so it gets reloaded fresh
        if (window.gameInstance.textures.exists('puzzleImage')) {
          window.gameInstance.textures.remove('puzzleImage');
        }

        console.log('[Game] Going through Preloader for Game scene');
        window.__jumpToAfterPreload = 'Game';
        window.gameInstance.scene.start('Preloader');
        return;
      }

      // Start requested scene directly for non-Game scenes
      window.gameInstance.scene.start(targetScene);
      break;

    case 'RELOAD':
      location.reload();
      break;

    case 'CLEAR_ASSETS':
      console.log('[Game] Clearing custom assets and restarting from Preloader');
      const oldAssets = window.customAssets || {};
      window.customAssets = {};

      // Also clear from sessionStorage
      try {
        sessionStorage.removeItem('customAssets_picture-puzzle');
      } catch (e) {
        console.warn('[Game] Could not clear assets from sessionStorage:', e);
      }

      // Remove textures that were custom so Preloader reloads defaults
      Object.keys(oldAssets).forEach(key => {
        if (window.gameInstance.textures.exists(key)) {
          console.log('[Game] Removing custom texture:', key);
          window.gameInstance.textures.remove(key);
        }
        // Also remove dynamically created slice textures for puzzle
        if (key === 'puzzleImage') {
          for (let i = 0; i < 9; i++) {
            if (window.gameInstance.textures.exists(`slice${i}`)) {
              window.gameInstance.textures.remove(`slice${i}`);
            }
          }
        }
      });

      // Stop all scenes and restart from Preloader
      window.gameInstance.scene.scenes.forEach(scene => {
        if (scene.scene.isActive()) {
          scene.scene.stop();
        }
      });
      window.gameInstance.scene.start('Preloader');
      break;

    case 'CLEAR_SESSION':
      console.log('[Game] Clearing session storage');
      window.customAssets = {};
      try {
        sessionStorage.removeItem('customConfig_picture-puzzle');
        sessionStorage.removeItem('customAssets_picture-puzzle');
      } catch (e) {
        console.warn('[Game] Could not clear session storage:', e);
      }
      break;
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  if (window.gameInstance && window.gameInstance.isBooted) {
    setTimeout(() => {
      window.gameInstance.scale.refresh();
    }, 100);
  }
});
