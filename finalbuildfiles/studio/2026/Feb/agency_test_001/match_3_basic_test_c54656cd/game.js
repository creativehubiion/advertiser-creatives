/**
 * MATCH3 PUZZLE GAME
 *
 * A config-driven Match3 puzzle game for playable ads.
 * Supports 4x4, 5x5, or 6x6 grids with 4-6 item types.
 *
 * Scenes: PreloaderScene -> SplashScene -> HowToPlayScene -> GameScene -> EndScene
 */

// ============================================================================
// GLOBAL HELPERS
// ============================================================================

// Restore custom assets from sessionStorage (for iframe reload persistence)
try {
  const storedAssets = sessionStorage.getItem('customAssets');
  if (storedAssets) {
    window.customAssets = JSON.parse(storedAssets);
    console.log('[Match3] Restored custom assets from sessionStorage:', Object.keys(window.customAssets));
  }
} catch (e) {
  console.warn('[Match3] Could not restore custom assets from sessionStorage');
}

// Get editor mode - priority: URL param > sessionStorage > default
let restoredEditorMode = 'advanced';
try {
  // First check URL parameter (most reliable, set by LivePreview)
  const urlParams = new URLSearchParams(window.location.search);
  const urlMode = urlParams.get('mode');
  if (urlMode) {
    restoredEditorMode = urlMode;
    // Also save to sessionStorage for consistency
    sessionStorage.setItem('editorMode', urlMode);
    console.log('[Match3] Editor mode from URL:', urlMode);
  } else {
    // Fall back to sessionStorage
    const storedMode = sessionStorage.getItem('editorMode');
    if (storedMode) {
      restoredEditorMode = storedMode;
      console.log('[Match3] Restored editor mode from sessionStorage:', storedMode);
    }
  }
} catch (e) {
  console.warn('[Match3] Could not get editor mode');
}

const getAssetUrl = (key) => {
  if (window.customAssets && window.customAssets[key]) {
    return window.customAssets[key];
  }
  return window.GAME_CONFIG.assets[key];
};

const getConfig = () => window.GAME_CONFIG;

// Tracking manager for analytics
window.TrackingManager = {
  firedEvents: new Set(),

  fire: function(eventName, forceRepeat = false) {
    if (!forceRepeat && this.firedEvents.has(eventName)) {
      return;
    }
    this.firedEvents.add(eventName);

    const config = getConfig();
    const events = config.tracking?.events;

    if (events && events[eventName]) {
      const eventConfig = events[eventName];

      // Fire internal URLs
      if (eventConfig.internalUrls) {
        eventConfig.internalUrls.forEach(url => {
          if (url) {
            fetch(url, { method: 'GET' }).catch(() => {});
          }
        });
      }

      // Fire agency URLs
      if (eventConfig.urls) {
        eventConfig.urls.forEach(url => {
          if (url) {
            fetch(url, { method: 'GET' }).catch(() => {});
          }
        });
      }
    }
  }
};

// Global game state
const GameState = {
  matchCount: 0,
  isComplete: false,
  canInteract: true,
  isPreviewMode: false,  // When true, disables auto-timer (for editor scene jumping)
  editorMode: restoredEditorMode  // 'basic' or 'advanced' - determines logo scaling behavior
};

// ============================================================================
// PRELOADER SCENE
// ============================================================================

class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload() {
    const config = getConfig();
    const centerX = config.canvas.width / 2;
    const centerY = config.canvas.height / 2;

    // Background
    this.cameras.main.setBackgroundColor(config.canvas.backgroundColor);

    // Loading bar background
    const barWidth = config.loadingBar.width;
    const barHeight = config.loadingBar.height;
    const barBg = this.add.rectangle(centerX, centerY, barWidth, barHeight,
      parseInt(config.loadingBar.backgroundColor.replace('#', '0x')));
    barBg.setStrokeStyle(2, 0xffffff);

    // Loading bar fill
    const barFill = this.add.rectangle(
      centerX - barWidth / 2 + 2,
      centerY,
      0,
      barHeight - 4,
      parseInt(config.loadingBar.fillColor.replace('#', '0x'))
    );
    barFill.setOrigin(0, 0.5);

    // Loading text
    const loadingText = this.add.text(centerX, centerY + 40, 'Loading...', {
      fontFamily: config.fonts.primary,
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    // Progress callback
    this.load.on('progress', (value) => {
      barFill.width = (barWidth - 4) * value;
    });

    this.load.on('complete', () => {
      loadingText.setText('Ready!');
    });

    // Load all assets
    this.loadAssets();
  }

  // Helper to check if URL is a data URI
  isDataUri(url) {
    return url && url.startsWith('data:');
  }

  // Helper to load an image - handles both regular URLs and data URIs
  loadImage(key, url) {
    if (!url) return;

    if (this.isDataUri(url)) {
      // Data URIs need to be loaded via textures.addBase64
      // We'll track these and load them in create() after the loader completes
      if (!this.base64Assets) this.base64Assets = {};
      this.base64Assets[key] = url;
    } else {
      this.load.image(key, url);
    }
  }

  loadAssets() {
    const config = getConfig();
    this.base64Assets = {}; // Track data URI assets

    // Logo
    const logoUrl = getAssetUrl('logo');
    this.loadImage('logo', logoUrl);

    // Load ALL 6 item types upfront so they're available when itemTypes setting changes
    const maxItemTypes = 6;

    // Check if any individual item images exist (either in config or custom assets)
    let hasIndividualItems = false;
    for (let i = 1; i <= maxItemTypes; i++) {
      const itemUrl = getAssetUrl(`item${i}`);
      if (itemUrl) {
        hasIndividualItems = true;
        break;
      }
    }

    if (hasIndividualItems) {
      // Load all individual item images (1-6)
      for (let i = 1; i <= maxItemTypes; i++) {
        const itemUrl = getAssetUrl(`item${i}`);
        if (itemUrl) this.loadImage(`item${i}`, itemUrl);
      }
      this.usesSpritesheet = false;
    } else {
      // Fallback to spritesheet if no individual items
      const spritesheetUrl = getAssetUrl('itemsSpritesheet');
      if (spritesheetUrl) {
        this.load.spritesheet('items', spritesheetUrl, {
          frameWidth: config.assets.itemFrameWidth || 100,
          frameHeight: config.assets.itemFrameHeight || 100
        });
        this.usesSpritesheet = true;
      }
    }

    // Grid elements
    const gridUrl = getAssetUrl('grid');
    this.loadImage('grid', gridUrl);

    const gridCellUrl = getAssetUrl('gridCell');
    this.loadImage('gridCell', gridCellUrl);

    // Progress bar decorations
    const capUrl = getAssetUrl('progressCap');
    this.loadImage('progressCap', capUrl);

    const scrollUrl = getAssetUrl('progressScroll');
    this.loadImage('progressScroll', scrollUrl);

    // UI elements
    const handUrl = getAssetUrl('hand');
    this.loadImage('hand', handUrl);

    // Hero images
    const splashHeroUrl = getAssetUrl('splashHero');
    this.loadImage('splashHero', splashHeroUrl);

    const endHeroUrl = getAssetUrl('endHero');
    this.loadImage('endHero', endHeroUrl);

    // Background image (for 'image' background type)
    const backgroundUrl = getAssetUrl('background');
    if (backgroundUrl) {
      this.loadImage('background', backgroundUrl);
    }

    // Audio
    if (config.gameplay.enableSounds) {
      const swipeUrl = getAssetUrl('swipeSound');
      if (swipeUrl) this.load.audio('swipe', swipeUrl);

      const matchUrl = getAssetUrl('matchSound');
      if (matchUrl) this.load.audio('match', matchUrl);

      const completeUrl = getAssetUrl('completeSound');
      if (completeUrl) this.load.audio('complete', completeUrl);
    }

    // First Party Data - Age buttons
    this.load.image('age1', 'assets/images/fpd/age1.png');
    this.load.image('age2', 'assets/images/fpd/age2.png');
    this.load.image('age3', 'assets/images/fpd/age3.png');
    this.load.image('age4', 'assets/images/fpd/age4.png');
    this.load.image('age5', 'assets/images/fpd/age5.png');
    this.load.image('age6', 'assets/images/fpd/age6.png');

    // First Party Data - Gender buttons
    this.load.image('genderMale', 'assets/images/fpd/genderMale.png');
    this.load.image('genderFemale', 'assets/images/fpd/genderFemale.png');
    this.load.image('genderOthers', 'assets/images/fpd/genderOthers.png');
  }

  create() {
    // Reset game state
    GameState.matchCount = 0;
    GameState.isComplete = false;
    GameState.canInteract = true;

    // Fire impression tracking
    window.TrackingManager.fire('impression');

    // Load any base64 assets (data URIs from custom uploads)
    const base64Keys = Object.keys(this.base64Assets || {});
    if (base64Keys.length > 0) {
      console.log('[Match3] Loading base64 assets:', base64Keys);

      // Use textures.addBase64 for data URIs - it returns a promise-like event
      const loadPromises = base64Keys.map(key => {
        return new Promise((resolve) => {
          this.textures.addBase64(key, this.base64Assets[key]);
          // addBase64 is async, listen for the texture to be added
          this.textures.once(`addtexture-${key}`, () => {
            console.log('[Match3] Base64 texture loaded:', key);
            resolve();
          });
          // Fallback timeout in case event doesn't fire
          setTimeout(resolve, 500);
        });
      });

      Promise.all(loadPromises).then(() => {
        console.log('[Match3] All base64 assets loaded, starting SplashScene');
        this.scene.start('SplashScene');
      });
    } else {
      // No base64 assets, start immediately
      this.scene.start('SplashScene');
    }
  }
}

// ============================================================================
// SPLASH SCENE
// ============================================================================

class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' });
  }

  create() {
    const config = getConfig();
    const centerX = config.canvas.width / 2;
    const centerY = config.canvas.height / 2;

    // Background
    this.createBackground();

    // Logo - both modes use top anchor with logoTopMargin for consistent positioning
    if (this.textures.exists('logo')) {
      const logoScale = config.layout.logoScale * config.assetScales.logo;
      const isBasicMode = GameState.editorMode === 'basic';
      // Both modes use logoTopMargin with top anchor for splash
      // In Advanced mode, logoYPosition slider adjusts this value
      const logoY = isBasicMode
        ? config.layout.logoTopMargin
        : (config.layout.logoYPosition !== undefined ? config.layout.logoYPosition : config.layout.logoTopMargin);

      this.logo = this.add.image(centerX, config.canvas.height * logoY, 'logo')
        .setScale(logoScale)
        .setOrigin(0.5, 0);  // Top anchor for both modes
    }

    // Splash hero image (users can include text in the uploaded image)
    if (config.layout.showSplashHero && this.textures.exists('splashHero')) {
      const heroScale = config.assetScales.splashHero || 1;
      this.splashHero = this.add.image(
        centerX,
        config.canvas.height * config.layout.splashHeroYPosition,
        'splashHero'
      ).setScale(heroScale).setOrigin(0.5);
    }

    // Action button
    this.createActionButton();

    // Click anywhere to proceed
    this.input.once('pointerdown', () => {
      window.TrackingManager.fire('playableStart');

      // Check if first party data capture is enabled for afterSplash
      const fpdConfig = config.firstPartyData;
      const needsDataCapture = fpdConfig?.enabled &&
                               fpdConfig?.placement === 'afterSplash' &&
                               (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

      if (needsDataCapture) {
        // Determine next scene after data capture
        const nextScene = config.howToPlay.enabled ? 'HowToPlayScene' : 'GameScene';
        this.scene.start('DataCaptureScene', {
          nextScene: nextScene,
          placement: 'afterSplash'
        });
      } else if (config.howToPlay.enabled) {
        this.scene.start('HowToPlayScene');
      } else {
        this.scene.start('GameScene');
      }
    });
  }

  createBackground() {
    const config = getConfig();
    const bgConfig = config.background;
    const width = config.canvas.width;
    const height = config.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      // Create gradient texture with angle support
      const gradientCanvas = this.textures.createCanvas('gradientBgPreloader', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.add.image(centerX, centerY, 'gradientBgPreloader').setDepth(-1);
    } else if (bgConfig.type === 'image') {
      // Background image - scale to cover
      if (this.textures.exists('background')) {
        const bg = this.add.image(centerX, centerY, 'background');
        const bgWidth = bg.width;
        const bgHeight = bg.height;
        const scaleX = width / bgWidth;
        const scaleY = height / bgHeight;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(-1);
      } else {
        // No image uploaded yet, show solid color as fallback
        this.cameras.main.setBackgroundColor(bgConfig.solidColor);
      }
    }
  }

  createActionButton() {
    const config = getConfig();
    const centerX = config.canvas.width / 2;
    const buttonY = config.canvas.height * config.layout.actionButtonTopMargin;
    const btnConfig = config.actionButton;
    const baseButtonScale = 1.44; // Base scale multiplier for larger default button
    const buttonScale = (btnConfig.scale || 1.0) * baseButtonScale;
    const scaleFactor = config.fonts.scaleFactor || 1.0;

    // Create temporary text to measure width (dynamic sizing like CFI)
    const tempText = this.add.text(0, 0, config.text.actionButtonText, {
      fontFamily: config.fonts.semibold,
      fontSize: (config.text.actionButtonSize * scaleFactor) + 'px',
      fontStyle: 'bold'
    });
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    tempText.destroy();

    // Calculate button size based on text with padding (scales proportionally with text size)
    const horizontalPadding = textWidth * 0.4; // 40% of text width total (20% each side)
    const verticalPadding = textHeight * 0.6; // 60% of text height total (30% each side)
    const buttonWidth = textWidth + horizontalPadding;
    const buttonHeight = textHeight + verticalPadding;

    // Create a container for the button so we can scale it as a whole
    this.actionButtonContainer = this.add.container(centerX, buttonY);

    // Button background - draw centered at (0, 0) within container
    const graphics = this.add.graphics();
    const bgColor = parseInt(btnConfig.backgroundColor.replace('#', '0x'));

    graphics.fillStyle(bgColor);

    // Determine corner radius based on shape (proportional to button height)
    let cornerRadius = 0;
    if (btnConfig.shape === 'pill') {
      cornerRadius = buttonHeight / 2;
    } else if (btnConfig.shape === 'rounded') {
      cornerRadius = buttonHeight * 0.2; // 20% of button height for proportional rounding
    }
    // 'sharp' or any other value = 0 (no rounding)

    // Draw background
    if (cornerRadius > 0) {
      graphics.fillRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        cornerRadius
      );
    } else {
      graphics.fillRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight
      );
    }

    // Border
    if (btnConfig.borderWidth > 0) {
      graphics.lineStyle(btnConfig.borderWidth, parseInt(btnConfig.borderColor.replace('#', '0x')));
      if (cornerRadius > 0) {
        graphics.strokeRoundedRect(
          -buttonWidth / 2,
          -buttonHeight / 2,
          buttonWidth,
          buttonHeight,
          cornerRadius
        );
      } else {
        graphics.strokeRect(
          -buttonWidth / 2,
          -buttonHeight / 2,
          buttonWidth,
          buttonHeight
        );
      }
    }

    // Button text (centered at 0,0 within container)
    const buttonText = this.add.text(0, 0, config.text.actionButtonText, {
      fontFamily: config.fonts.semibold,
      fontSize: (config.text.actionButtonSize * scaleFactor) + 'px',
      color: btnConfig.textColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Add to container
    this.actionButtonContainer.add([graphics, buttonText]);

    // Apply scale to the entire container
    this.actionButtonContainer.setScale(buttonScale);

    // Pulse animation on the button
    this.tweens.add({
      targets: this.actionButtonContainer,
      scaleX: buttonScale * 1.05,
      scaleY: buttonScale * 1.05,
      duration: 400,
      ease: 'Power2',
      yoyo: true,
      repeat: -1
    });
  }

  createHandHint() {
    const config = getConfig();

    if (!this.textures.exists('hand')) return;

    const buttonY = config.canvas.height * config.layout.actionButtonTopMargin;
    const handScale = config.assetScales.hand || 0.25;

    this.hand = this.add.image(
      config.canvas.width / 2 + 50,
      buttonY + 30,
      'hand'
    ).setScale(handScale).setAlpha(0);

    // Animate hand
    this.tweens.add({
      targets: this.hand,
      alpha: 1,
      duration: 500,
      delay: 1000,
      onComplete: () => {
        this.tweens.add({
          targets: this.hand,
          scale: handScale * 0.9,
          duration: 300,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            this.tweens.add({
              targets: this.hand,
              alpha: 0,
              duration: 300
            });
          }
        });
      }
    });
  }

  // Real-time update methods
  updateBackground() {
    const config = getConfig();
    const bgConfig = config.background;
    const width = config.canvas.width;
    const height = config.canvas.height;
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
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.bgImage = this.add.image(centerX, centerY, 'gradientBgSplash').setDepth(-100);
    } else if (bgConfig.type === 'image') {
      // Background image - scale to cover
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
    console.log('[SplashScene] Background updated');
  }

  updateAssetScales(scaleData) {
    const config = getConfig();

    if (scaleData.logo !== undefined && this.logo) {
      const logoScale = config.layout.logoScale * scaleData.logo;
      this.logo.setScale(logoScale);
      console.log('[SplashScene] Logo scale updated to:', logoScale);
    }

    if (scaleData.splashHero !== undefined && this.splashHero) {
      this.splashHero.setScale(scaleData.splashHero);
      console.log('[SplashScene] Splash hero scale updated to:', scaleData.splashHero);
    }
  }

  updateLayout(layoutData) {
    const config = getConfig();

    // Update logo Y position
    if (layoutData.logoYPosition !== undefined && this.logo) {
      const newY = config.canvas.height * layoutData.logoYPosition;
      this.logo.setY(newY);
      console.log('[SplashScene] Logo Y position updated to:', newY);
    }

    if (layoutData.splashHeroYPosition !== undefined && this.splashHero) {
      const newY = config.canvas.height * layoutData.splashHeroYPosition;
      this.splashHero.setY(newY);
      console.log('[SplashScene] Splash hero Y position updated to:', newY);
    }

    // Update action button Y position
    if (layoutData.actionButtonTopMargin !== undefined && this.actionButtonContainer) {
      const newY = config.canvas.height * layoutData.actionButtonTopMargin;
      this.actionButtonContainer.setY(newY);
      console.log('[SplashScene] Action button Y position updated to:', newY);
    }
  }

  updateButtons(buttonData) {
    const config = getConfig();

    // Destroy and recreate the action button container with new settings
    if (this.actionButtonContainer) {
      // Stop any tweens on the container
      this.tweens.killTweensOf(this.actionButtonContainer);
      this.actionButtonContainer.destroy();
      this.actionButtonContainer = null;
    }

    // Recreate the action button with updated config
    this.createActionButton();
    console.log('[SplashScene] Action button updated');
  }

  updateFonts(fontData) {
    const fontName = fontData.primary;
    console.log('[SplashScene] Updating fonts to:', fontName);

    // Update instruction text
    if (this.instructionText) {
      this.instructionText.setFontFamily(fontName);
    }

    // Update button text
    if (this.buttonText) {
      this.buttonText.setFontFamily(fontName);
    }

    // Recreate the button to apply font changes
    if (this.actionButtonContainer) {
      this.tweens.killTweensOf(this.actionButtonContainer);
      this.actionButtonContainer.destroy();
      this.actionButtonContainer = null;
      this.createActionButton();
    }
  }
}

// ============================================================================
// HOW TO PLAY SCENE
// ============================================================================

class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HowToPlayScene' });
  }

  create() {
    const config = getConfig();
    const centerX = config.canvas.width / 2;
    const centerY = config.canvas.height / 2;

    // Background - uses same settings as game screen
    this.createBackground();

    // Title (stored as reference for real-time font updates)
    this.titleText = this.add.text(centerX, centerY - 200, config.text.howToTitle, {
      fontFamily: config.fonts.primary,
      fontSize: config.text.howToTitleSize + 'px',
      color: config.text.howToTitleColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Instruction text (stored as reference for real-time updates)
    this.instructionText = this.add.text(centerX, centerY, config.text.howToInstruction, {
      fontFamily: config.fonts.primary,
      fontSize: config.text.howToInstructionSize + 'px',
      color: config.text.howToInstructionColor,
      align: 'center'
    }).setOrigin(0.5);

    // Tap to start (stored as reference for real-time font updates)
    this.tapText = this.add.text(centerX, centerY + 200, config.text.howToAction, {
      fontFamily: config.fonts.semibold,
      fontSize: config.text.howToActionSize + 'px',
      color: config.text.howToActionColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Pulse animation on tap text
    this.tweens.add({
      targets: this.tapText,
      scale: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Click to proceed
    this.input.once('pointerdown', () => {
      window.TrackingManager.fire('howToPlay');
      this.scene.start('GameScene');
    });

    // Auto-skip if configured
    if (config.howToPlay.autoSkipDelay > 0) {
      this.time.delayedCall(config.howToPlay.autoSkipDelay, () => {
        window.TrackingManager.fire('howToPlay');
        this.scene.start('GameScene');
      });
    }
  }

  createBackground() {
    const config = getConfig();
    const bgConfig = config.background;
    const width = config.canvas.width;
    const height = config.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      this.cameras.main.setBackgroundColor('#000000');

      const gradientCanvas = this.textures.createCanvas('gradientBgHowTo', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.bgImage = this.add.image(centerX, centerY, 'gradientBgHowTo').setDepth(-100);
    } else if (bgConfig.type === 'image') {
      // Background image - scale to cover
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
  }

  // Real-time update methods
  updateBackground() {
    const config = getConfig();
    const bgConfig = config.background;
    const width = config.canvas.width;
    const height = config.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Destroy existing background if any
    if (this.bgImage) {
      this.bgImage.destroy();
      this.bgImage = null;
    }
    if (this.textures.exists('gradientBgHowTo')) {
      this.textures.remove('gradientBgHowTo');
    }

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      this.cameras.main.setBackgroundColor('#000000');

      const gradientCanvas = this.textures.createCanvas('gradientBgHowTo', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.bgImage = this.add.image(centerX, centerY, 'gradientBgHowTo').setDepth(-100);
    } else if (bgConfig.type === 'image') {
      // Background image - scale to cover
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
    console.log('[HowToPlayScene] Background updated');
  }

  updateTexts(textData) {
    if (this.instructionText) {
      if (textData.howToInstruction !== undefined) {
        this.instructionText.setText(textData.howToInstruction);
        console.log('[HowToPlayScene] Instruction text updated to:', textData.howToInstruction);
      }
      if (textData.howToInstructionSize !== undefined) {
        this.instructionText.setFontSize(textData.howToInstructionSize);
        console.log('[HowToPlayScene] Instruction size updated to:', textData.howToInstructionSize);
      }
      if (textData.howToInstructionColor !== undefined) {
        this.instructionText.setColor(textData.howToInstructionColor);
        console.log('[HowToPlayScene] Instruction color updated to:', textData.howToInstructionColor);
      }
    }
  }

  updateFonts(fontData) {
    const fontName = fontData.primary;
    console.log('[HowToPlayScene] Updating fonts to:', fontName);

    if (this.instructionText) {
      this.instructionText.setFontFamily(fontName);
    }
    if (this.titleText) {
      this.titleText.setFontFamily(fontName);
    }
    if (this.tapText) {
      this.tapText.setFontFamily(fontName);
    }
  }
}

// ============================================================================
// GAME SCENE - Main Match3 Gameplay
// ============================================================================

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create(data) {
    const config = getConfig();
    this.config = config;

    // Check if resuming from mid-game FPD
    const isResumingMidGame = data && data.matchCount !== undefined;

    this.canvasWidth = config.canvas.width;
    this.canvasHeight = config.canvas.height;

    // Game options from config
    this.gridSize = config.gameplay.gridSize || 4;
    this.itemTypes = config.gameplay.itemTypes || 4;
    this.itemSize = config.gameplay.itemSize || 100;
    this.matchTarget = config.gameplay.matchTarget || 3;
    this.swapSpeed = config.gameplay.swapSpeed || 200;
    this.fallSpeed = config.gameplay.fallSpeed || 125;

    console.log('[GameScene] Created with matchTarget:', this.matchTarget, 'gameDuration:', config.gameplay.gameDuration, 'isResumingMidGame:', isResumingMidGame);

    // Calculate item size based on canvas
    this.calculateItemSize();

    // Game state
    this.gameArray = [];
    this.selectedItem = null;
    this.canPick = true;
    this.matchCount = isResumingMidGame ? data.matchCount : 0;

    // Mid-game FPD tracking
    this.midGameDataCaptureShown = isResumingMidGame; // Mark as shown if resuming
    this.gameStartTime = isResumingMidGame ? (Date.now() - data.elapsedTime) : Date.now();
    this.remainingTime = isResumingMidGame ? data.remainingTime : (config.gameplay.gameDuration || 30000);

    // Create background
    this.createBackground();

    // Create UI elements
    this.createHeader();
    this.createProgressBar();

    // If resuming, update progress bar immediately
    if (isResumingMidGame) {
      this.updateProgressBar(this.matchCount);
      GameState.matchCount = this.matchCount;
    }

    // Create game grid
    this.createGrid();
    this.drawField();

    // Setup input
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);

    // Start game timer (with remaining time if resuming)
    this.startGameTimer(isResumingMidGame ? this.remainingTime : null);

    // Initial animation
    this.animateGridEntrance();
  }

  calculateItemSize() {
    const config = this.config;
    const gridScale = config.layout?.gridScale || 1.0;
    const gridMargin = 0.05; // 5% margin on each side
    const availableWidth = this.canvasWidth * (1 - gridMargin * 2);
    const availableHeight = this.canvasHeight * 0.52; // Grid takes ~52% of height

    const maxItemWidth = availableWidth / this.gridSize;
    const maxItemHeight = availableHeight / this.gridSize;

    // Use the smaller of width/height constraints, apply gridScale
    this.calculatedItemSize = Math.min(maxItemWidth, maxItemHeight) * gridScale;
    this.targetItemSize = this.calculatedItemSize * 0.85; // 85% of cell for padding
  }

  // Helper to calculate scale for any item texture to fit the target size
  getItemScale(textureKey, frameIndex = null) {
    const targetSize = this.targetItemSize;
    const assetScale = this.config.assetScales.item || 1;

    if (frameIndex !== null && this.textures.exists(textureKey)) {
      // Spritesheet
      const frame = this.textures.getFrame(textureKey, frameIndex);
      const frameWidth = frame ? frame.width : 100;
      const frameHeight = frame ? frame.height : 100;
      return (targetSize / Math.max(frameWidth, frameHeight)) * assetScale;
    } else if (this.textures.exists(textureKey)) {
      // Individual image
      const texture = this.textures.get(textureKey);
      const sourceImage = texture.getSourceImage();
      const imgWidth = sourceImage.width;
      const imgHeight = sourceImage.height;
      return (targetSize / Math.max(imgWidth, imgHeight)) * assetScale;
    }

    // Fallback
    return (targetSize / 100) * assetScale;
  }

  createBackground() {
    const config = this.config;
    const bgConfig = config.background;
    const width = this.canvasWidth;
    const height = this.canvasHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      const gradientCanvas = this.textures.createCanvas('gradientBgGame', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.add.image(centerX, centerY, 'gradientBgGame').setDepth(-1);
    } else if (bgConfig.type === 'image') {
      // Background image - scale to cover
      if (this.textures.exists('background')) {
        const bg = this.add.image(centerX, centerY, 'background');
        const bgWidth = bg.width;
        const bgHeight = bg.height;
        const scaleX = width / bgWidth;
        const scaleY = height / bgHeight;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(-1);
      } else {
        // No image uploaded yet, show solid color as fallback
        this.cameras.main.setBackgroundColor(bgConfig.solidColor);
      }
    }
  }

  createHeader() {
    const config = this.config;
    const centerX = this.canvasWidth / 2;

    // Logo - In Basic mode use same scale/position as Splash, in Advanced use game-specific settings
    if (this.textures.exists('logo')) {
      const isBasicMode = GameState.editorMode === 'basic';
      const logoScale = isBasicMode
        ? config.layout.logoScale * (config.assetScales.logo || 1)  // Same as splash
        : config.layout.logoScaleGame * (config.assetScales.logo || 1);
      // Both modes use logoTopMargin for game screen (top anchor)
      const logoY = config.layout.logoTopMargin;

      this.logo = this.add.image(
        centerX,
        this.canvasHeight * logoY,
        'logo'
      ).setScale(logoScale).setOrigin(0.5, 0).setDepth(100);
    }

    // Match message background (semi-transparent pill)
    this.messageBg = this.add.graphics().setDepth(199).setAlpha(0);

    // Match message text - positioned at center of grid
    const gridCenterY = this.canvasHeight * (config.layout.gridCenterY || 0.55);
    this.messageText = this.add.text(
      centerX,
      gridCenterY,
      '',
      {
        fontFamily: config.fonts.primary,
        fontSize: config.text.matchMessageSize + 'px',
        color: config.text.matchMessageColor,
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(200).setAlpha(0);
  }

  createProgressBar() {
    const config = this.config;
    const centerX = this.canvasWidth / 2;
    const barY = this.canvasHeight * (config.layout.progressBarTopMargin || 0.18);
    const barWidth = this.canvasWidth * (config.layout.progressBarWidth || 0.8);
    const barHeight = config.progressBar.height || 10;
    const radius = config.progressBar.borderRadius || 5;

    // White background bar
    this.progressBarBg = this.add.graphics().setDepth(100);
    this.progressBarBg.fillStyle(parseInt(config.progressBar.backgroundColor.replace('#', '0x')));
    this.progressBarBg.fillRoundedRect(
      centerX - barWidth / 2,
      barY - barHeight / 2,
      barWidth,
      barHeight,
      radius
    );

    // Yellow fill bar (starts empty)
    this.progressBarFill = this.add.graphics().setDepth(100);
    this.progressBarWidth = barWidth;
    this.progressBarX = centerX - barWidth / 2;
    this.progressBarY = barY - barHeight / 2;
    this.progressBarHeight = barHeight;
    this.progressBarRadius = radius;
    this.currentProgressWidth = 0;

    this.updateProgressBar(0);

    // Decorations
    if (config.progressBar.showDecorations) {
      if (this.textures.exists('progressCap')) {
        this.progressCap = this.add.image(
          centerX + barWidth / 2 - 10,
          barY,
          'progressCap'
        ).setScale(config.assetScales.progressCap || 1).setDepth(102);
      }

      if (this.textures.exists('progressScroll')) {
        this.progressScroll = this.add.image(
          this.progressBarX + this.currentProgressWidth,
          barY,
          'progressScroll'
        ).setScale(config.assetScales.progressScroll || 1).setDepth(102);
      }
    }
  }

  updateProgressBar(matchCount) {
    const config = this.config;
    const fillColor = parseInt(config.progressBar.fillColor.replace('#', '0x'));
    const progress = Math.min(matchCount / this.matchTarget, 1);
    const targetWidth = this.progressBarWidth * progress;

    this.progressBarFill.clear();
    this.progressBarFill.fillStyle(fillColor);

    if (targetWidth > 0) {
      this.progressBarFill.fillRoundedRect(
        this.progressBarX,
        this.progressBarY,
        targetWidth,
        this.progressBarHeight,
        this.progressBarRadius
      );
    }

    // Move scroll indicator
    if (this.progressScroll) {
      this.tweens.add({
        targets: this.progressScroll,
        x: this.progressBarX + targetWidth,
        duration: 300,
        ease: 'Power2'
      });
    }
  }

  createGrid() {
    const config = this.config;
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight * (config.layout.gridCenterY || 0.55);

    // Calculate grid position
    const gridWidth = this.gridSize * this.calculatedItemSize;
    const gridHeight = this.gridSize * this.calculatedItemSize;

    this.gridStartX = centerX - gridWidth / 2 + this.calculatedItemSize / 2;
    this.gridStartY = centerY - gridHeight / 2 + this.calculatedItemSize / 2;

    // Draw grid background with cells programmatically
    const graphics = this.add.graphics();
    const padding = 8;
    const cellPadding = 4;
    const cornerRadius = 12;

    // Main grid background
    graphics.fillStyle(0x1a2a5a, 0.8);
    graphics.fillRoundedRect(
      centerX - gridWidth / 2 - padding,
      centerY - gridHeight / 2 - padding,
      gridWidth + padding * 2,
      gridHeight + padding * 2,
      cornerRadius
    );

    // Draw individual cells
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cellX = this.gridStartX + col * this.calculatedItemSize - this.calculatedItemSize / 2 + cellPadding;
        const cellY = this.gridStartY + row * this.calculatedItemSize - this.calculatedItemSize / 2 + cellPadding;
        const cellSize = this.calculatedItemSize - cellPadding * 2;

        // Cell background with slight transparency
        graphics.fillStyle(0x4a5a8a, 0.4);
        graphics.fillRoundedRect(cellX, cellY, cellSize, cellSize, 8);

        // Cell border
        graphics.lineStyle(2, 0x6a7aaa, 0.3);
        graphics.strokeRoundedRect(cellX, cellY, cellSize, cellSize, 8);
      }
    }

    // Initialize game array
    for (let row = 0; row < this.gridSize; row++) {
      this.gameArray[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        this.gameArray[row][col] = {
          itemType: -1,
          itemSprite: null,
          isEmpty: true
        };
      }
    }
  }

  drawField() {
    const maxAttempts = 10;
    let attempts = 0;

    do {
      // Clear existing items if retrying
      if (attempts > 0) {
        for (let row = 0; row < this.gridSize; row++) {
          for (let col = 0; col < this.gridSize; col++) {
            if (this.gameArray[row][col].itemSprite) {
              this.gameArray[row][col].itemSprite.destroy();
            }
            this.gameArray[row][col] = {
              itemType: -1,
              itemSprite: null,
              isEmpty: true
            };
          }
        }
      }

      // Fill grid with items that don't create immediate matches
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          let itemType;
          do {
            itemType = Phaser.Math.Between(1, this.itemTypes);
          } while (this.wouldCreateMatch(row, col, itemType));

          this.createItem(row, col, itemType);
        }
      }

      attempts++;

      // Check if valid moves exist
      if (this.hasPossibleMoves()) {
        console.log('[Match3] Grid generated with valid moves after', attempts, 'attempt(s)');
        return;
      }

      console.log('[Match3] No valid moves, regenerating grid (attempt', attempts, ')');
    } while (attempts < maxAttempts);

    // Fallback: inject a guaranteed valid move pattern
    console.log('[Match3] Max attempts reached, injecting valid move');
    this.injectValidMove();
  }

  injectValidMove() {
    // Inject a guaranteed valid move pattern
    // Strategy: Create [A][A][B][A] pattern in first row
    // Swapping positions 2 and 3 creates [A][A][A][B] = match!

    const itemType = this.gameArray[0][0].itemType;

    // Ensure first two cells are same type
    this.replaceItemType(0, 0, itemType);
    this.replaceItemType(0, 1, itemType);

    // Make sure position 2 is DIFFERENT (pick a different type)
    let differentType = itemType % this.itemTypes + 1;
    this.replaceItemType(0, 2, differentType);

    // Make position 3 same as first two
    if (this.gridSize >= 4) {
      this.replaceItemType(0, 3, itemType);
    } else {
      // For 3x3 grid, use vertical pattern instead
      // [A]     Swap (0,0) with (1,0) gives:  [A]
      // [A]                                    [A]
      // [B]                                    [A] (if we set it up right)
      // Actually: [A][B] at (0,0),(1,0) and [A][A] at (0,1),(1,1)
      // Swap (1,0) with (1,1) to get vertical match in column 1
      this.replaceItemType(1, 0, differentType);
      this.replaceItemType(0, 1, itemType);
      this.replaceItemType(1, 1, itemType);
      if (this.gridSize >= 3) {
        this.replaceItemType(2, 1, itemType);
      }
    }

    console.log('[Match3] Valid move pattern injected');
  }

  replaceItemType(row, col, newType) {
    const cell = this.gameArray[row][col];
    if (cell.itemType === newType) return; // Already correct type

    // Destroy old item sprite
    if (cell.itemSprite) {
      cell.itemSprite.destroy();
    }

    // Create new item with desired type
    this.createItem(row, col, newType);
  }

  wouldCreateMatch(row, col, itemType) {
    // Check horizontal
    if (col >= 2) {
      if (this.gameArray[row][col - 1].itemType === itemType &&
          this.gameArray[row][col - 2].itemType === itemType) {
        return true;
      }
    }

    // Check vertical
    if (row >= 2) {
      if (this.gameArray[row - 1][col].itemType === itemType &&
          this.gameArray[row - 2][col].itemType === itemType) {
        return true;
      }
    }

    return false;
  }

  wouldCreateMatchAfterRefill(row, col, itemType) {
    // Temporarily set the item type to check
    const originalType = this.gameArray[row][col].itemType;
    this.gameArray[row][col].itemType = itemType;

    // Check horizontal - count consecutive matches in both directions
    let horizontalCount = 1;
    // Check left
    for (let c = col - 1; c >= 0; c--) {
      if (this.gameArray[row][c].itemType === itemType) horizontalCount++;
      else break;
    }
    // Check right
    for (let c = col + 1; c < this.gridSize; c++) {
      if (this.gameArray[row][c].itemType === itemType) horizontalCount++;
      else break;
    }

    // Check vertical - count consecutive matches in both directions
    let verticalCount = 1;
    // Check up
    for (let r = row - 1; r >= 0; r--) {
      if (this.gameArray[r][col].itemType === itemType) verticalCount++;
      else break;
    }
    // Check down
    for (let r = row + 1; r < this.gridSize; r++) {
      if (this.gameArray[r][col].itemType === itemType) verticalCount++;
      else break;
    }

    // Restore original type
    this.gameArray[row][col].itemType = originalType;

    // Return true if would create a match (3 or more in a row)
    return horizontalCount >= 3 || verticalCount >= 3;
  }

  createItem(row, col, itemType) {
    const x = this.gridStartX + col * this.calculatedItemSize;
    const y = this.gridStartY + row * this.calculatedItemSize;

    let item;

    // Check if using spritesheet or individual images
    if (this.textures.exists('items')) {
      // Using spritesheet - itemType-1 is the frame index (0-based)
      const scale = this.getItemScale('items', itemType - 1);

      item = this.add.image(x, y, 'items', itemType - 1)
        .setScale(scale)
        .setInteractive()
        .setData('row', row)
        .setData('col', col)
        .setData('itemType', itemType);
    } else {
      const itemKey = `item${itemType}`;

      if (!this.textures.exists(itemKey)) {
        // Fallback: create colored circle
        const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];
        const graphics = this.add.graphics();
        graphics.fillStyle(colors[(itemType - 1) % colors.length]);
        graphics.fillCircle(x, y, this.calculatedItemSize * 0.4);

        this.gameArray[row][col] = {
          itemType: itemType,
          itemSprite: graphics,
          isEmpty: false,
          x: x,
          y: y
        };
        return;
      }

      // Use helper to calculate proper scale based on actual texture size
      const scale = this.getItemScale(itemKey);

      item = this.add.image(x, y, itemKey)
        .setScale(scale)
        .setInteractive()
        .setData('row', row)
        .setData('col', col)
        .setData('itemType', itemType);
    }

    item.on('pointerdown', () => this.selectItem(item));

    this.gameArray[row][col] = {
      itemType: itemType,
      itemSprite: item,
      isEmpty: false
    };
  }

  animateGridEntrance() {
    // Fade in all items
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const item = this.gameArray[row][col].itemSprite;
        if (item && item.setAlpha) {
          item.setAlpha(0);
          this.tweens.add({
            targets: item,
            alpha: 1,
            duration: 300,
            delay: (row * this.gridSize + col) * 30
          });
        }
      }
    }
  }

  selectItem(item) {
    if (!this.canPick) return;

    if (!this.selectedItem) {
      // First selection
      this.selectedItem = item;
      item.setTint(0xaaaaaa);
    } else {
      // Second selection - check if adjacent
      const row1 = this.selectedItem.getData('row');
      const col1 = this.selectedItem.getData('col');
      const row2 = item.getData('row');
      const col2 = item.getData('col');

      // Check if adjacent (not diagonal)
      const isAdjacent = (Math.abs(row1 - row2) + Math.abs(col1 - col2)) === 1;

      if (isAdjacent) {
        this.swapItems(row1, col1, row2, col2);
      }

      this.selectedItem.clearTint();
      this.selectedItem = null;
    }
  }

  handlePointerMove(pointer) {
    if (!this.selectedItem || !pointer.isDown) return;

    const row1 = this.selectedItem.getData('row');
    const col1 = this.selectedItem.getData('col');

    // Calculate swipe direction
    const startX = this.gridStartX + col1 * this.calculatedItemSize;
    const startY = this.gridStartY + row1 * this.calculatedItemSize;
    const dx = pointer.x - startX;
    const dy = pointer.y - startY;

    const threshold = this.calculatedItemSize * 0.3;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      let row2 = row1;
      let col2 = col1;

      if (Math.abs(dx) > Math.abs(dy)) {
        col2 += dx > 0 ? 1 : -1;
      } else {
        row2 += dy > 0 ? 1 : -1;
      }

      // Validate target position
      if (row2 >= 0 && row2 < this.gridSize && col2 >= 0 && col2 < this.gridSize) {
        this.selectedItem.clearTint();
        this.swapItems(row1, col1, row2, col2);
        this.selectedItem = null;
      }
    }
  }

  handlePointerUp() {
    if (this.selectedItem) {
      this.selectedItem.clearTint();
      this.selectedItem = null;
    }
  }

  swapItems(row1, col1, row2, col2) {
    if (!this.canPick) return;
    this.canPick = false;

    // Play swap sound
    if (this.config.gameplay.enableSounds && this.sound.get('swipe')) {
      this.sound.play('swipe');
    }

    const item1 = this.gameArray[row1][col1].itemSprite;
    const item2 = this.gameArray[row2][col2].itemSprite;

    const x1 = item1.x;
    const y1 = item1.y;
    const x2 = item2.x;
    const y2 = item2.y;

    // Animate swap
    this.tweens.add({
      targets: item1,
      x: x2,
      y: y2,
      duration: this.swapSpeed
    });

    this.tweens.add({
      targets: item2,
      x: x1,
      y: y1,
      duration: this.swapSpeed,
      onComplete: () => {
        // Update data
        item1.setData('row', row2);
        item1.setData('col', col2);
        item2.setData('row', row1);
        item2.setData('col', col1);

        // Swap in array
        const temp = this.gameArray[row1][col1];
        this.gameArray[row1][col1] = this.gameArray[row2][col2];
        this.gameArray[row2][col2] = temp;

        // Check for matches
        const matches = this.findMatches();

        if (matches.length > 0) {
          this.processMatches(matches);
        } else {
          // Swap back
          this.tweens.add({
            targets: item1,
            x: x1,
            y: y1,
            duration: this.swapSpeed
          });

          this.tweens.add({
            targets: item2,
            x: x2,
            y: y2,
            duration: this.swapSpeed,
            onComplete: () => {
              item1.setData('row', row1);
              item1.setData('col', col1);
              item2.setData('row', row2);
              item2.setData('col', col2);

              const temp = this.gameArray[row1][col1];
              this.gameArray[row1][col1] = this.gameArray[row2][col2];
              this.gameArray[row2][col2] = temp;

              this.canPick = true;
            }
          });
        }
      }
    });
  }

  findMatches() {
    const matches = [];

    // Check horizontal matches
    for (let row = 0; row < this.gridSize; row++) {
      let matchLength = 1;
      let matchType = this.gameArray[row][0].itemType;

      for (let col = 1; col < this.gridSize; col++) {
        if (this.gameArray[row][col].itemType === matchType && matchType !== -1) {
          matchLength++;
        } else {
          if (matchLength >= 3) {
            for (let i = 0; i < matchLength; i++) {
              matches.push({ row: row, col: col - 1 - i });
            }
          }
          matchLength = 1;
          matchType = this.gameArray[row][col].itemType;
        }
      }

      if (matchLength >= 3) {
        for (let i = 0; i < matchLength; i++) {
          matches.push({ row: row, col: this.gridSize - 1 - i });
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < this.gridSize; col++) {
      let matchLength = 1;
      let matchType = this.gameArray[0][col].itemType;

      for (let row = 1; row < this.gridSize; row++) {
        if (this.gameArray[row][col].itemType === matchType && matchType !== -1) {
          matchLength++;
        } else {
          if (matchLength >= 3) {
            for (let i = 0; i < matchLength; i++) {
              matches.push({ row: row - 1 - i, col: col });
            }
          }
          matchLength = 1;
          matchType = this.gameArray[row][col].itemType;
        }
      }

      if (matchLength >= 3) {
        for (let i = 0; i < matchLength; i++) {
          matches.push({ row: this.gridSize - 1 - i, col: col });
        }
      }
    }

    // Remove duplicates
    const uniqueMatches = [];
    const seen = new Set();

    for (const match of matches) {
      const key = `${match.row},${match.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(match);
      }
    }

    return uniqueMatches;
  }

  processMatches(matches) {
    // Play match sound
    if (this.config.gameplay.enableSounds && this.sound.get('match')) {
      this.sound.play('match');
    }

    // Increment match count
    this.matchCount++;
    GameState.matchCount = this.matchCount;

    // Fire tracking
    window.TrackingManager.fire(`match${this.matchCount}`);

    // Update progress bar
    this.updateProgressBar(this.matchCount);

    // Check for mid-game FPD trigger on first match
    if (this.matchCount === 1) {
      if (this.checkAndTriggerMidGameCapture('firstMatch')) {
        return; // Scene is transitioning, stop processing
      }
    }

    // Show message
    this.showMatchMessage();

    // Remove matched items
    for (const match of matches) {
      const item = this.gameArray[match.row][match.col].itemSprite;

      this.tweens.add({
        targets: item,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          item.destroy();
        }
      });

      this.gameArray[match.row][match.col].isEmpty = true;
      this.gameArray[match.row][match.col].itemType = -1;
      this.gameArray[match.row][match.col].itemSprite = null;
    }

    // Check win condition
    if (this.matchCount >= this.matchTarget) {
      this.time.delayedCall(500, () => {
        this.onGameComplete();
      });
      return;
    }

    // Make items fall and refill
    this.time.delayedCall(250, () => {
      this.makeItemsFall();
      this.time.delayedCall(300, () => {
        this.refillGrid();
        this.time.delayedCall(400, () => {
          // Check for cascade matches
          const newMatches = this.findMatches();
          if (newMatches.length > 0) {
            this.processMatches(newMatches);
          } else {
            // Check for deadlock
            if (!this.hasPossibleMoves()) {
              this.shuffleGrid();
            } else {
              this.canPick = true;
            }
          }
        });
      });
    });
  }

  showMatchMessage() {
    const config = this.config;
    const messages = config.text.matchMessages;
    const message = messages[Phaser.Math.Between(0, messages.length - 1)];

    this.messageText.setText(message);

    // Draw background pill behind the text
    const textBounds = this.messageText.getBounds();
    const padding = 20;
    const bgWidth = textBounds.width + padding * 2;
    const bgHeight = textBounds.height + padding;
    const bgX = this.messageText.x - bgWidth / 2;
    const bgY = this.messageText.y - bgHeight / 2;

    this.messageBg.clear();
    this.messageBg.fillStyle(0x000000, 0.6);
    this.messageBg.fillRoundedRect(bgX, bgY, bgWidth, bgHeight, bgHeight / 2);

    // Animate both text and background
    this.tweens.add({
      targets: [this.messageText, this.messageBg],
      alpha: 1,
      duration: 200,
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: [this.messageText, this.messageBg],
            alpha: 0,
            duration: 200
          });
        });
      }
    });
  }

  makeItemsFall() {
    for (let col = 0; col < this.gridSize; col++) {
      for (let row = this.gridSize - 1; row >= 0; row--) {
        if (this.gameArray[row][col].isEmpty) {
          // Find item above
          for (let aboveRow = row - 1; aboveRow >= 0; aboveRow--) {
            if (!this.gameArray[aboveRow][col].isEmpty) {
              // Move item down
              const item = this.gameArray[aboveRow][col].itemSprite;
              const targetY = this.gridStartY + row * this.calculatedItemSize;

              this.tweens.add({
                targets: item,
                y: targetY,
                duration: this.fallSpeed * (row - aboveRow)
              });

              item.setData('row', row);

              // Update array
              this.gameArray[row][col] = this.gameArray[aboveRow][col];
              this.gameArray[aboveRow][col] = {
                itemType: -1,
                itemSprite: null,
                isEmpty: true
              };

              break;
            }
          }
        }
      }
    }
  }

  refillGrid() {
    for (let col = 0; col < this.gridSize; col++) {
      let emptyCount = 0;

      for (let row = 0; row < this.gridSize; row++) {
        if (this.gameArray[row][col].isEmpty) {
          emptyCount++;

          // Create new item that won't create a match
          let itemType;
          let attempts = 0;
          do {
            itemType = Phaser.Math.Between(1, this.itemTypes);
            attempts++;
          } while (this.wouldCreateMatchAfterRefill(row, col, itemType) && attempts < 20);
          const x = this.gridStartX + col * this.calculatedItemSize;
          const startY = this.gridStartY - (emptyCount * this.calculatedItemSize);
          const targetY = this.gridStartY + row * this.calculatedItemSize;

          let item;

          // Check if using spritesheet or individual images
          if (this.textures.exists('items')) {
            const scale = this.getItemScale('items', itemType - 1);
            item = this.add.image(x, startY, 'items', itemType - 1)
              .setScale(scale)
              .setInteractive()
              .setData('row', row)
              .setData('col', col)
              .setData('itemType', itemType);
          } else {
            const itemKey = `item${itemType}`;

            if (this.textures.exists(itemKey)) {
              const scale = this.getItemScale(itemKey);
              item = this.add.image(x, startY, itemKey)
                .setScale(scale)
                .setInteractive()
                .setData('row', row)
                .setData('col', col)
                .setData('itemType', itemType);
            }
          }

          if (item) {
            item.on('pointerdown', () => this.selectItem(item));

            this.tweens.add({
              targets: item,
              y: targetY,
              duration: this.fallSpeed * emptyCount,
              ease: 'Bounce.easeOut'
            });

            this.gameArray[row][col] = {
              itemType: itemType,
              itemSprite: item,
              isEmpty: false
            };
          }
        }
      }
    }
  }

  hasPossibleMoves() {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        // Check swap with right neighbor
        if (col < this.gridSize - 1) {
          this.swapInArray(row, col, row, col + 1);
          if (this.findMatches().length > 0) {
            this.swapInArray(row, col, row, col + 1);
            return true;
          }
          this.swapInArray(row, col, row, col + 1);
        }

        // Check swap with bottom neighbor
        if (row < this.gridSize - 1) {
          this.swapInArray(row, col, row + 1, col);
          if (this.findMatches().length > 0) {
            this.swapInArray(row, col, row + 1, col);
            return true;
          }
          this.swapInArray(row, col, row + 1, col);
        }
      }
    }
    return false;
  }

  swapInArray(row1, col1, row2, col2) {
    const temp = this.gameArray[row1][col1];
    this.gameArray[row1][col1] = this.gameArray[row2][col2];
    this.gameArray[row2][col2] = temp;
  }

  shuffleGrid() {
    // Fade out all items
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const item = this.gameArray[row][col].itemSprite;
        if (item) {
          this.tweens.add({
            targets: item,
            alpha: 0,
            duration: 200,
            onComplete: () => item.destroy()
          });
        }
      }
    }

    // Reinitialize grid
    this.time.delayedCall(300, () => {
      this.gameArray = [];
      for (let row = 0; row < this.gridSize; row++) {
        this.gameArray[row] = [];
        for (let col = 0; col < this.gridSize; col++) {
          this.gameArray[row][col] = {
            itemType: -1,
            itemSprite: null,
            isEmpty: true
          };
        }
      }

      this.drawField();
      this.animateGridEntrance();

      this.time.delayedCall(500, () => {
        this.canPick = true;
      });
    });
  }

  startGameTimer(remainingTimeOverride = null) {
    // Use global config to get the latest value (in case it was updated via editor)
    const config = window.GAME_CONFIG;

    // Don't start timer if autoEndTimer is disabled in config
    if (!config.gameplay.autoEndTimer) {
      console.log('[Match3] Auto-end timer disabled in config - game will continue until player completes matchTarget');
      return;
    }

    const totalDuration = config.gameplay.gameDuration || 30000;
    const duration = remainingTimeOverride !== null ? remainingTimeOverride : totalDuration;
    console.log('[Match3] Starting timer with duration:', duration, 'ms (', duration/1000, 'sec)');

    // Calculate mid-game trigger time (half of total game duration)
    const midGameTime = totalDuration / 2;

    // Set up mid-game FPD timer check if applicable
    const fpdConfig = config.firstPartyData;
    const needsMidGameCapture = !this.midGameDataCaptureShown &&
                                 fpdConfig?.enabled &&
                                 fpdConfig?.placement === 'midGame' &&
                                 (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    console.log('[Match3] Mid-game FPD check:', {
      midGameDataCaptureShown: this.midGameDataCaptureShown,
      fpdEnabled: fpdConfig?.enabled,
      fpdPlacement: fpdConfig?.placement,
      hasScreens: !!(fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email),
      needsMidGameCapture: needsMidGameCapture
    });

    if (needsMidGameCapture) {
      // Calculate time until mid-game trigger
      const elapsedSoFar = totalDuration - duration; // How much time has already passed
      const timeUntilMidGame = midGameTime - elapsedSoFar;

      console.log('[Match3] Mid-game timing:', {
        totalDuration: totalDuration,
        currentDuration: duration,
        midGameTime: midGameTime,
        elapsedSoFar: elapsedSoFar,
        timeUntilMidGame: timeUntilMidGame
      });

      if (timeUntilMidGame > 0) {
        console.log('[Match3] Mid-game FPD timer set for:', timeUntilMidGame, 'ms');
        this.midGameTimer = this.time.delayedCall(timeUntilMidGame, () => {
          console.log('[Match3] Mid-game timer FIRED!');
          this.checkAndTriggerMidGameCapture('timer');
        });
      } else {
        console.log('[Match3] Mid-game time already passed, skipping timer setup');
      }
    }

    this.gameTimer = this.time.delayedCall(duration, () => {
      console.log('[Match3] Main game timer expired, GameState.isComplete:', GameState.isComplete);
      if (!GameState.isComplete) {
        // Timer ended - auto-complete the game (fill progress and end)
        this.autoCompleteGame();
      }
    });
  }

  // Check if mid-game data capture should be triggered
  checkAndTriggerMidGameCapture(trigger) {
    console.log('[Match3] checkAndTriggerMidGameCapture called with trigger:', trigger, {
      midGameDataCaptureShown: this.midGameDataCaptureShown,
      isComplete: GameState.isComplete
    });

    if (this.midGameDataCaptureShown || GameState.isComplete) {
      console.log('[Match3] Skipping mid-game capture - already shown or game complete');
      return false;
    }

    const config = window.GAME_CONFIG;
    const fpdConfig = config.firstPartyData;
    const needsMidGameCapture = fpdConfig?.enabled &&
                                 fpdConfig?.placement === 'midGame' &&
                                 (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    console.log('[Match3] needsMidGameCapture:', needsMidGameCapture, {
      enabled: fpdConfig?.enabled,
      placement: fpdConfig?.placement,
      hasScreens: !!(fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email)
    });

    if (!needsMidGameCapture) return false;

    console.log('[Match3] Mid-game FPD triggered by:', trigger);
    this.midGameDataCaptureShown = true;

    // Cancel the mid-game timer if it exists (in case triggered by match first)
    if (this.midGameTimer) {
      this.midGameTimer.remove();
      this.midGameTimer = null;
    }

    // Pause game - calculate elapsed and remaining time
    const totalDuration = config.gameplay.gameDuration || 30000;
    const elapsedTime = Date.now() - this.gameStartTime;
    const remainingTime = Math.max(0, totalDuration - elapsedTime);

    // Cancel the main game timer
    if (this.gameTimer) {
      this.gameTimer.remove();
      this.gameTimer = null;
    }

    // Save current game state
    const gameState = {
      matchCount: this.matchCount,
      matchTarget: this.matchTarget,
      elapsedTime: elapsedTime,
      remainingTime: remainingTime
    };

    console.log('[Match3] Pausing for mid-game FPD, game state:', gameState);

    // Disable player input
    this.canPick = false;

    // Go to DataCaptureScene with game state
    this.scene.start('DataCaptureScene', {
      nextScene: 'GameScene',
      placement: 'midGame',
      gameData: gameState
    });

    return true;
  }

  autoCompleteGame() {
    // Bot takes over - auto-solve with visual match animations
    console.log('[Match3] autoCompleteGame called, GameState.isComplete:', GameState.isComplete, 'matchCount:', this.matchCount, 'matchTarget:', this.matchTarget);
    if (GameState.isComplete) {
      console.log('[Match3] Game already complete, skipping auto-solve');
      return;
    }
    this.canPick = false; // Disable player input

    // Start the auto-solve sequence
    this.autoSolveStep();
  }

  autoSolveStep() {
    console.log('[Match3] autoSolveStep called, matchCount:', this.matchCount, 'matchTarget:', this.matchTarget, 'GameState.isComplete:', GameState.isComplete);

    // Check if we've reached the target
    if (this.matchCount >= this.matchTarget) {
      console.log('[Match3] Match target reached, completing game');
      this.onGameComplete();
      return;
    }

    // Find a valid move
    const move = this.findValidMove();
    console.log('[Match3] findValidMove result:', move);
    if (move) {
      // Execute the move with animation
      this.executeAutoMove(move.row1, move.col1, move.row2, move.col2);
    } else {
      // No valid moves found, shuffle and try again
      console.log('[Match3] No valid moves, shuffling grid');
      this.shuffleGrid();
      this.time.delayedCall(600, () => {
        this.autoSolveStep();
      });
    }
  }

  findValidMove() {
    // Find a swap that would create a match
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        // Check swap with right neighbor
        if (col < this.gridSize - 1) {
          this.swapInArray(row, col, row, col + 1);
          if (this.findMatches().length > 0) {
            this.swapInArray(row, col, row, col + 1); // Swap back
            return { row1: row, col1: col, row2: row, col2: col + 1 };
          }
          this.swapInArray(row, col, row, col + 1); // Swap back
        }

        // Check swap with bottom neighbor
        if (row < this.gridSize - 1) {
          this.swapInArray(row, col, row + 1, col);
          if (this.findMatches().length > 0) {
            this.swapInArray(row, col, row + 1, col); // Swap back
            return { row1: row, col1: col, row2: row + 1, col2: col };
          }
          this.swapInArray(row, col, row + 1, col); // Swap back
        }
      }
    }
    return null;
  }

  executeAutoMove(row1, col1, row2, col2) {
    // Play swap sound
    if (this.config.gameplay.enableSounds && this.sound.get('swipe')) {
      this.sound.play('swipe');
    }

    const item1 = this.gameArray[row1][col1].itemSprite;
    const item2 = this.gameArray[row2][col2].itemSprite;

    const x1 = item1.x;
    const y1 = item1.y;
    const x2 = item2.x;
    const y2 = item2.y;

    // Faster swap animation for auto-solve
    const autoSwapSpeed = 150;

    // Animate swap
    this.tweens.add({
      targets: item1,
      x: x2,
      y: y2,
      duration: autoSwapSpeed
    });

    this.tweens.add({
      targets: item2,
      x: x1,
      y: y1,
      duration: autoSwapSpeed,
      onComplete: () => {
        // Update data
        item1.setData('row', row2);
        item1.setData('col', col2);
        item2.setData('row', row1);
        item2.setData('col', col1);

        // Swap in array
        const temp = this.gameArray[row1][col1];
        this.gameArray[row1][col1] = this.gameArray[row2][col2];
        this.gameArray[row2][col2] = temp;

        // Process matches
        const matches = this.findMatches();
        if (matches.length > 0) {
          this.processAutoMatches(matches);
        } else {
          // Continue auto-solving
          this.time.delayedCall(100, () => {
            this.autoSolveStep();
          });
        }
      }
    });
  }

  processAutoMatches(matches) {
    // Play match sound
    if (this.config.gameplay.enableSounds && this.sound.get('match')) {
      this.sound.play('match');
    }

    // Increment match count
    this.matchCount++;
    GameState.matchCount = this.matchCount;

    // Fire tracking
    window.TrackingManager.fire(`match${this.matchCount}`);

    // Update progress bar
    this.updateProgressBar(this.matchCount);

    // Show message
    this.showMatchMessage();

    // Remove matched items (faster animation for auto-solve)
    for (const match of matches) {
      const item = this.gameArray[match.row][match.col].itemSprite;

      this.tweens.add({
        targets: item,
        scale: 0,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          item.destroy();
        }
      });

      this.gameArray[match.row][match.col].isEmpty = true;
      this.gameArray[match.row][match.col].itemType = -1;
      this.gameArray[match.row][match.col].itemSprite = null;
    }

    // Check win condition
    if (this.matchCount >= this.matchTarget) {
      this.time.delayedCall(400, () => {
        this.onGameComplete();
      });
      return;
    }

    // Make items fall and refill, then continue auto-solving
    this.time.delayedCall(200, () => {
      this.makeItemsFall();
      this.time.delayedCall(200, () => {
        this.refillGrid();
        this.time.delayedCall(300, () => {
          // Continue auto-solving (skip cascade check since we prevent cascades)
          this.autoSolveStep();
        });
      });
    });
  }

  onGameComplete() {
    if (GameState.isComplete) return;
    GameState.isComplete = true;
    this.canPick = false;

    // Stop timer
    if (this.gameTimer) {
      this.gameTimer.destroy();
    }

    // Fire tracking
    window.TrackingManager.fire('playableComplete');

    // Play complete sound
    if (this.config.gameplay.enableSounds && this.sound.get('complete')) {
      this.sound.play('complete');
    }

    // Show confetti if configured
    if (this.config.transition.type === 'confetti') {
      this.createConfetti();
    }

    // Check if first party data capture is enabled for beforeEnd
    const fpdConfig = this.config.firstPartyData;
    const needsDataCapture = fpdConfig?.enabled &&
                             fpdConfig?.placement === 'beforeEnd' &&
                             (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    // Transition to end scene (or DataCapture first)
    this.time.delayedCall(this.config.transition.duration || 2000, () => {
      if (needsDataCapture) {
        this.scene.start('DataCaptureScene', {
          nextScene: 'EndScene',
          placement: 'beforeEnd'
        });
      } else {
        this.scene.start('EndScene');
      }
    });
  }

  createConfetti() {
    const config = this.config.transition.confetti;
    const colors = [0xFFD700, 0xFF6B6B, 0x4ECDC4, 0x45B7D1, 0x96CEB4, 0xFFA07A];

    for (let burst = 0; burst < config.bursts; burst++) {
      this.time.delayedCall(burst * config.burstDelay, () => {
        for (let i = 0; i < config.particleCount / config.bursts; i++) {
          const x = Phaser.Math.Between(0, this.canvasWidth);
          const y = this.canvasHeight * config.origin.y;
          const color = colors[Phaser.Math.Between(0, colors.length - 1)];
          const size = Phaser.Math.Between(5, 15);

          const particle = this.add.rectangle(x, y, size, size, color).setDepth(200);

          this.tweens.add({
            targets: particle,
            x: x + Phaser.Math.Between(-config.spread, config.spread),
            y: y + Phaser.Math.Between(-200, 400),
            rotation: Phaser.Math.Between(0, 6),
            scale: 0,
            alpha: 0,
            duration: Phaser.Math.Between(1500, 2500),
            onComplete: () => particle.destroy()
          });
        }
      });
    }
  }

  // Real-time update methods
  updateBackground() {
    const config = this.config;
    const bgConfig = config.background;
    const width = this.canvasWidth;
    const height = this.canvasHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    // Destroy existing background if any
    if (this.bgImage) {
      this.bgImage.destroy();
      this.bgImage = null;
    }
    if (this.textures.exists('gradientBgGameUpdate')) {
      this.textures.remove('gradientBgGameUpdate');
    }

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      this.cameras.main.setBackgroundColor('#000000');

      const gradientCanvas = this.textures.createCanvas('gradientBgGameUpdate', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.bgImage = this.add.image(centerX, centerY, 'gradientBgGameUpdate').setDepth(-100);
    } else if (bgConfig.type === 'image') {
      // Background image - scale to cover
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
    console.log('[GameScene] Background updated');
  }

  updateAssetScales(scaleData) {
    const config = this.config;

    if (scaleData.logo !== undefined && this.logo) {
      // In Basic mode, use same base scale as splash/end screens for consistency
      const isBasicMode = GameState.editorMode === 'basic';
      const baseScale = isBasicMode ? config.layout.logoScale : config.layout.logoScaleGame;
      const logoScale = baseScale * scaleData.logo;
      this.logo.setScale(logoScale);
      console.log('[GameScene] Logo scale updated to:', logoScale);
    }
  }

  updateFonts(fontData) {
    const fontName = fontData.primary;
    console.log('[GameScene] Updating fonts to:', fontName);

    if (this.messageText) {
      this.messageText.setFontFamily(fontName);
    }
    if (this.scoreText) {
      this.scoreText.setFontFamily(fontName);
    }
  }
}

// ============================================================================
// END SCENE
// ============================================================================

class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  create() {
    const config = getConfig();
    const centerX = config.canvas.width / 2;
    const centerY = config.canvas.height / 2;

    // Background
    this.createBackground();

    // Logo - In Basic mode use same scale/position as Splash, in Advanced use end-specific settings
    if (this.textures.exists('logo')) {
      const isBasicMode = GameState.editorMode === 'basic';
      const logoScale = isBasicMode
        ? config.layout.logoScale * (config.assetScales.logo || 1)  // Same as splash
        : config.layout.logoScaleEnd * (config.assetScales.logo || 1);
      // Both modes use logoTopMargin for end screen (top anchor)
      const logoY = config.layout.logoTopMargin;

      this.logo = this.add.image(centerX, config.canvas.height * logoY, 'logo')
        .setScale(logoScale)
        .setOrigin(0.5, 0);
    }

    // End hero (text can be included in the hero image)
    if (config.layout.showEndHero && this.textures.exists('endHero')) {
      const heroScale = config.assetScales.endHero || 1;
      this.endHero = this.add.image(centerX, config.canvas.height * config.layout.endHeroYPosition, 'endHero')
        .setScale(heroScale)
        .setOrigin(0.5);
    }

    // CTA button (click handling is done inside createCTAButton)
    this.createCTAButton();
  }

  createBackground() {
    const config = getConfig();
    const bgConfig = config.background;
    const width = config.canvas.width;
    const height = config.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    if (bgConfig.type === 'solid') {
      this.cameras.main.setBackgroundColor(bgConfig.solidColor);
    } else if (bgConfig.type === 'gradient') {
      const gradientCanvas = this.textures.createCanvas('gradientBgEndCreate', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 180) * Math.PI / 180;
      const x1 = centerX - Math.cos(angle) * centerX;
      const y1 = centerY - Math.sin(angle) * centerY;
      const x2 = centerX + Math.cos(angle) * centerX;
      const y2 = centerY + Math.sin(angle) * centerY;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.add.image(centerX, centerY, 'gradientBgEndCreate').setDepth(-1);
    } else if (bgConfig.type === 'image') {
      // Background image - scale to cover
      if (this.textures.exists('background')) {
        const bg = this.add.image(centerX, centerY, 'background');
        const bgWidth = bg.width;
        const bgHeight = bg.height;
        const scaleX = width / bgWidth;
        const scaleY = height / bgHeight;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(-1);
      } else {
        // No image uploaded yet, show solid color as fallback
        this.cameras.main.setBackgroundColor(bgConfig.solidColor);
      }
    }
  }

  createCTAButton() {
    const config = getConfig();
    const centerX = config.canvas.width / 2;
    const buttonY = config.canvas.height * config.layout.ctaButtonTopMargin;
    const btnConfig = config.ctaButton;
    const baseButtonScale = 1.44; // Base scale multiplier for larger default button
    const buttonScale = (btnConfig.scale || 1.0) * baseButtonScale;
    const scaleFactor = config.fonts.scaleFactor || 1.0;

    // Create temporary text to measure width (dynamic sizing like CFI)
    const tempText = this.add.text(0, 0, config.text.ctaText, {
      fontFamily: config.fonts.semibold,
      fontSize: (config.text.ctaSize * scaleFactor) + 'px',
      fontStyle: 'bold'
    });
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    tempText.destroy();

    // Calculate button size based on text with padding (scales proportionally with text size)
    const horizontalPadding = textWidth * 0.4; // 40% of text width total (20% each side)
    const verticalPadding = textHeight * 0.6; // 60% of text height total (30% each side)
    const buttonWidth = textWidth + horizontalPadding;
    const buttonHeight = textHeight + verticalPadding;

    // Create a container for the button so we can scale it as a whole
    this.ctaButtonContainer = this.add.container(centerX, buttonY);

    // Button background - draw centered at (0, 0) within container
    const graphics = this.add.graphics();
    const bgColor = parseInt(btnConfig.backgroundColor.replace('#', '0x'));

    graphics.fillStyle(bgColor);

    // Determine corner radius based on shape (proportional to button height)
    let cornerRadius = 0;
    if (btnConfig.shape === 'pill') {
      cornerRadius = buttonHeight / 2;
    } else if (btnConfig.shape === 'rounded') {
      cornerRadius = buttonHeight * 0.2; // 20% of button height for proportional rounding
    }
    // 'sharp' or any other value = 0 (no rounding)

    // Draw background
    if (cornerRadius > 0) {
      graphics.fillRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        cornerRadius
      );
    } else {
      graphics.fillRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight
      );
    }

    // Border
    if (btnConfig.borderWidth > 0) {
      graphics.lineStyle(btnConfig.borderWidth, parseInt(btnConfig.borderColor.replace('#', '0x')));
      if (cornerRadius > 0) {
        graphics.strokeRoundedRect(
          -buttonWidth / 2,
          -buttonHeight / 2,
          buttonWidth,
          buttonHeight,
          cornerRadius
        );
      } else {
        graphics.strokeRect(
          -buttonWidth / 2,
          -buttonHeight / 2,
          buttonWidth,
          buttonHeight
        );
      }
    }

    // Button text (centered at 0,0 within container)
    const buttonText = this.add.text(0, 0, config.text.ctaText, {
      fontFamily: config.fonts.semibold,
      fontSize: (config.text.ctaSize * scaleFactor) + 'px',
      color: btnConfig.textColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Add to container
    this.ctaButtonContainer.add([graphics, buttonText]);

    // Apply scale to the entire container
    this.ctaButtonContainer.setScale(buttonScale);

    // Make the container interactive for click handling
    this.ctaButtonContainer.setSize(buttonWidth, buttonHeight);
    this.ctaButtonContainer.setInteractive();

    this.ctaButtonContainer.on('pointerdown', () => {
      window.TrackingManager.fire('click');
      const url = config.cta.url || 'https://www.example.com';
      window.open(url, config.cta.target || '_blank');
    });

    // Set cursor to pointer on hover
    this.ctaButtonContainer.on('pointerover', () => {
      this.input.setDefaultCursor('pointer');
    });
    this.ctaButtonContainer.on('pointerout', () => {
      this.input.setDefaultCursor('default');
    });

    // Pulse animation on the container
    this.tweens.add({
      targets: this.ctaButtonContainer,
      scaleX: buttonScale * 1.05,
      scaleY: buttonScale * 1.05,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  // Real-time update methods
  updateBackground() {
    const config = getConfig();
    const bgConfig = config.background;
    const width = config.canvas.width;
    const height = config.canvas.height;
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
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.bgImage = this.add.image(centerX, centerY, 'gradientBgEnd').setDepth(-100);
    } else if (bgConfig.type === 'image') {
      // Background image - scale to cover
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
    console.log('[EndScene] Background updated');
  }

  updateAssetScales(scaleData) {
    const config = getConfig();

    if (scaleData.logo !== undefined && this.logo) {
      const logoScale = config.layout.logoScaleEnd * scaleData.logo;
      this.logo.setScale(logoScale);
      console.log('[EndScene] Logo scale updated to:', logoScale);
    }

    if (scaleData.endHero !== undefined && this.endHero) {
      this.endHero.setScale(scaleData.endHero);
      console.log('[EndScene] End hero scale updated to:', scaleData.endHero);
    }
  }

  updateLayout(layoutData) {
    const config = getConfig();

    if (layoutData.endHeroYPosition !== undefined && this.endHero) {
      const newY = config.canvas.height * layoutData.endHeroYPosition;
      this.endHero.setY(newY);
      console.log('[EndScene] End hero Y position updated to:', newY);
    }

    // Update CTA button Y position
    if (layoutData.ctaButtonTopMargin !== undefined && this.ctaButtonContainer) {
      const newY = config.canvas.height * layoutData.ctaButtonTopMargin;
      this.ctaButtonContainer.setY(newY);
      console.log('[EndScene] CTA button Y position updated to:', newY);
    }
  }

  updateButtons(buttonData) {
    const config = getConfig();

    // Destroy and recreate the CTA button container with new settings
    if (this.ctaButtonContainer) {
      // Stop any tweens on the container
      this.tweens.killTweensOf(this.ctaButtonContainer);
      this.ctaButtonContainer.destroy();
      this.ctaButtonContainer = null;
    }

    // Recreate the CTA button with updated config
    this.createCTAButton();
    console.log('[EndScene] CTA button updated');
  }

  updateFonts(fontData) {
    const fontName = fontData.primary;
    console.log('[EndScene] Updating fonts to:', fontName);

    if (this.titleText) {
      this.titleText.setFontFamily(fontName);
    }
    if (this.subtitleText) {
      this.subtitleText.setFontFamily(fontName);
    }
    if (this.buttonText) {
      this.buttonText.setFontFamily(fontName);
    }

    // Recreate CTA button to apply font changes
    if (this.ctaButtonContainer) {
      this.tweens.killTweensOf(this.ctaButtonContainer);
      this.ctaButtonContainer.destroy();
      this.ctaButtonContainer = null;
      this.createCTAButton();
    }
  }
}

// ============================================================================
// DATA CAPTURE SCENE - First Party Data Collection
// ============================================================================

class DataCaptureScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DataCaptureScene' });
  }

  init(data) {
    this.nextScene = data.nextScene || 'GameScene';
    this.placement = data.placement || 'afterSplash';
    this.gameData = data.gameData || {};
  }

  getFontFamily(config) {
    const primaryFont = config.fonts?.primary || 'Poppins';
    if (document.fonts && document.fonts.check) {
      const fontLoaded = document.fonts.check(`16px "${primaryFont}"`);
      if (fontLoaded) {
        return `"${primaryFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }
    }
    return `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  }

  create() {
    console.log('[DataCaptureScene] Scene started!');
    console.log('[DataCaptureScene] Placement:', this.placement);
    console.log('[DataCaptureScene] Next scene:', this.nextScene);

    const existingInput = document.getElementById('fpd-email-input');
    if (existingInput) {
      existingInput.remove();
    }

    const config = getConfig();
    const { width, height } = config.canvas;
    const fpdConfig = config.firstPartyData;

    console.log('[DataCaptureScene] First party data config:', fpdConfig);

    this.screens = [];
    if (fpdConfig.screens.age) this.screens.push('age');
    if (fpdConfig.screens.gender) this.screens.push('gender');
    if (fpdConfig.screens.email) this.screens.push('email');

    console.log('[DataCaptureScene] Screens to show:', this.screens);

    this.currentScreenIndex = 0;
    this.capturedData = {};

    this.createBlurBackground();
    this.createCarouselDots();
    this.showCurrentScreen();

    this.events.on('shutdown', this.cleanupEmailInput, this);
  }

  cleanupEmailInput() {
    if (this.emailInput) {
      this.emailInput.remove();
      this.emailInput = null;
    }
    const existingInput = document.getElementById('fpd-email-input');
    if (existingInput) {
      existingInput.remove();
    }
  }

  createBlurBackground() {
    const config = getConfig();
    const { width, height } = config.canvas;

    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.cameras && gameScene.cameras.main) {
      const renderTexture = this.add.renderTexture(0, 0, width, height);
      renderTexture.draw(gameScene.children);
      renderTexture.setDepth(-1);
    }

    const bgColor = parseInt((config.background.solidColor || config.canvas.backgroundColor).replace('#', '0x'));
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, bgColor, 0.5);
    overlay.setInteractive();
    overlay.setDepth(0);
  }

  createCarouselDots() {
    const config = getConfig();
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    const dotSize = 20 * scaleFactor;
    const dotSpacing = 40 * scaleFactor;
    const totalWidth = this.screens.length * dotSpacing - (dotSpacing - dotSize);
    const startX = (width - totalWidth) / 2;
    const y = height - (80 * scaleFactor);

    this.dots = [];

    for (let i = 0; i < this.screens.length; i++) {
      const x = startX + i * dotSpacing;
      const accentColor = parseInt((config.actionButton?.backgroundColor || '#dfab2e').replace('#', '0x'));
      const dot = this.add.circle(x, y, dotSize / 2, i === 0 ? accentColor : 0xFFFFFF);
      if (i !== 0) {
        dot.setAlpha(0.3);
      }
      dot.setDepth(1000);
      this.dots.push(dot);
    }
  }

  updateCarouselDots() {
    const config = getConfig();
    const accentColor = parseInt((config.actionButton?.backgroundColor || '#dfab2e').replace('#', '0x'));
    this.dots.forEach((dot, i) => {
      if (i === this.currentScreenIndex) {
        dot.setFillStyle(accentColor);
        dot.setAlpha(1);
      } else {
        dot.setFillStyle(0xFFFFFF);
        dot.setAlpha(0.3);
      }
    });
  }

  showCurrentScreen() {
    if (this.screenContainer) {
      this.screenContainer.destroy();
    }

    if (this.emailInput) {
      this.emailInput.remove();
      this.emailInput = null;
    }

    const screenType = this.screens[this.currentScreenIndex];

    if (screenType === 'age') {
      this.showAgeScreen();
    } else if (screenType === 'gender') {
      this.showGenderScreen();
    } else if (screenType === 'email') {
      this.showEmailScreen();
    }
  }

  showAgeScreen() {
    const config = getConfig();
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    this.screenContainer = this.add.container(0, 0);
    this.screenContainer.setDepth(10);

    const buttonSize = width * 0.27;
    const cols = 3;
    const rows = 2;
    const verticalSpacing = height * 0.23;

    const titleHeight = 48 * scaleFactor;
    const titleToButtonGap = height * 0.12;
    const gridHeight = buttonSize * rows + verticalSpacing * (rows - 1);
    const totalContentHeight = titleHeight + titleToButtonGap + gridHeight;
    const contentStartY = (height - totalContentHeight) / 2;

    const fontFamily = this.getFontFamily(config);

    const title = this.add.text(width / 2, contentStartY, 'Select Your Age Range', {
      fontFamily: fontFamily,
      fontSize: (48 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);

    this.screenContainer.add(title);

    const ageOptions = [
      { label: '<18', image: 'age1', value: '<18' },
      { label: '18-24', image: 'age2', value: '18-24' },
      { label: '25-34', image: 'age3', value: '25-34' },
      { label: '35-44', image: 'age4', value: '35-44' },
      { label: '45-54', image: 'age5', value: '45-54' },
      { label: '55+', image: 'age6', value: '55+' }
    ];

    const horizontalSpacing = width * 0.32;
    const startX = width / 2 - (cols - 1) * horizontalSpacing / 2;
    const startY = contentStartY + titleHeight / 2 + titleToButtonGap + buttonSize / 2;

    const accentColor = parseInt((config.actionButton?.backgroundColor || '#dfab2e').replace('#', '0x'));

    ageOptions.forEach((option, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = startX + col * horizontalSpacing;
      const y = startY + row * verticalSpacing;

      let button;

      if (this.textures.exists(option.image)) {
        button = this.add.image(x, y, option.image);

        // Scale to fit button size while maintaining aspect ratio
        const imgTexture = this.textures.get(option.image).getSourceImage();
        const imgWidth = imgTexture.width;
        const imgHeight = imgTexture.height;
        const scale = Math.min(buttonSize / imgWidth, buttonSize / imgHeight);

        button.setDisplaySize(imgWidth * scale, imgHeight * scale);
      } else {
        // Fallback text button
        const bg = this.add.rectangle(0, 0, buttonSize, buttonSize, 0xFFFFFF, 0.9);
        bg.setStrokeStyle(4, accentColor);
        const text = this.add.text(0, 0, option.label, {
          fontFamily: this.getFontFamily(config),
          fontSize: (32 * scaleFactor) + 'px',
          color: config.actionButton?.backgroundColor || '#dfab2e',
          fontStyle: '600'
        }).setOrigin(0.5);
        button = this.add.container(x, y, [bg, text]);
        button.setSize(buttonSize, buttonSize);
      }

      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.selectAge(option.value));

      this.screenContainer.add(button);
    });
  }

  showGenderScreen() {
    const config = getConfig();
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    this.screenContainer = this.add.container(0, 0);
    this.screenContainer.setDepth(10);

    const buttonSize = width * 0.27;
    const titleHeight = 48 * scaleFactor;
    const titleToButtonGap = height * 0.12;
    const totalContentHeight = titleHeight + titleToButtonGap + buttonSize;
    const contentStartY = (height - totalContentHeight) / 2;

    const title = this.add.text(width / 2, contentStartY, 'Select Your Gender', {
      fontFamily: this.getFontFamily(config),
      fontSize: (48 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);

    this.screenContainer.add(title);

    const genderOptions = [
      { label: 'Male', image: 'genderMale', value: 'male' },
      { label: 'Female', image: 'genderFemale', value: 'female' },
      { label: 'Others', image: 'genderOthers', value: 'others' }
    ];

    const cols = 3;
    const horizontalSpacing = width * 0.32;
    const startX = width / 2 - (cols - 1) * horizontalSpacing / 2;
    const y = contentStartY + titleHeight / 2 + titleToButtonGap + buttonSize / 2;

    const accentColor = parseInt((config.actionButton?.backgroundColor || '#dfab2e').replace('#', '0x'));

    genderOptions.forEach((option, index) => {
      const x = startX + index * horizontalSpacing;

      let button;

      if (this.textures.exists(option.image)) {
        button = this.add.image(x, y, option.image);

        // Scale to fit button size while maintaining aspect ratio
        const imgTexture = this.textures.get(option.image).getSourceImage();
        const imgWidth = imgTexture.width;
        const imgHeight = imgTexture.height;
        const scale = Math.min(buttonSize / imgWidth, buttonSize / imgHeight);

        button.setDisplaySize(imgWidth * scale, imgHeight * scale);
      } else {
        // Fallback text button
        const bg = this.add.rectangle(0, 0, buttonSize, buttonSize, 0xFFFFFF, 0.9);
        bg.setStrokeStyle(4, accentColor);
        const text = this.add.text(0, 0, option.label, {
          fontFamily: this.getFontFamily(config),
          fontSize: (32 * scaleFactor) + 'px',
          color: config.actionButton?.backgroundColor || '#dfab2e',
          fontStyle: '600'
        }).setOrigin(0.5);
        button = this.add.container(x, y, [bg, text]);
        button.setSize(buttonSize, buttonSize);
      }

      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.selectGender(option.value));

      this.screenContainer.add(button);
    });
  }

  showEmailScreen() {
    const config = getConfig();
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    this.screenContainer = this.add.container(0, 0);
    this.screenContainer.setDepth(10);

    const emailPromptText = config.firstPartyData?.emailPromptText || 'Enter Your Email';
    const title = this.add.text(width / 2, 0, emailPromptText, {
      fontFamily: this.getFontFamily(config),
      fontSize: (48 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: width * 0.8, useAdvancedWrap: true },
      lineSpacing: 5
    }).setOrigin(0.5, 0);

    const actualTitleHeight = title.height;
    const titleToInputGap = height * 0.08;
    const inputHeightCanvas = height * 0.06;
    const inputToButtonGap = height * 0.06;
    const buttonHeight = height * 0.06;
    const totalContentHeight = actualTitleHeight + titleToInputGap + inputHeightCanvas + inputToButtonGap + buttonHeight;
    const contentStartY = (height - totalContentHeight) / 2;

    title.setY(contentStartY);
    this.emailTitleText = title;
    this.screenContainer.add(title);

    const gameCanvas = document.querySelector('canvas');
    const canvasRect = gameCanvas ? gameCanvas.getBoundingClientRect() : { left: 0, top: 0, width: width, height: height };
    const scaleX = canvasRect.width / width;
    const scaleY = canvasRect.height / height;

    const inputWidthCanvas = width * 0.6;
    const inputXCanvas = width / 2 - inputWidthCanvas / 2;
    const inputYCanvas = contentStartY + actualTitleHeight + titleToInputGap;

    const inputWidth = inputWidthCanvas * scaleX;
    const inputHeight = inputHeightCanvas * scaleY;
    const inputX = canvasRect.left + (inputXCanvas * scaleX);
    const inputY = canvasRect.top + (inputYCanvas * scaleY);

    const inputElement = document.createElement('input');
    inputElement.type = 'email';
    inputElement.placeholder = 'your.email@example.com';
    inputElement.style.position = 'absolute';
    inputElement.style.left = `${inputX}px`;
    inputElement.style.top = `${inputY}px`;
    inputElement.style.width = `${inputWidth}px`;
    inputElement.style.height = `${inputHeight}px`;
    inputElement.style.fontSize = `${Math.max(14, 18 * scaleY)}px`;
    inputElement.style.padding = `${Math.max(5, 8 * scaleY)}px ${Math.max(10, 15 * scaleX)}px`;
    inputElement.style.borderRadius = '8px';
    inputElement.style.border = `2px solid ${config.actionButton?.backgroundColor || '#dfab2e'}`;
    inputElement.style.textAlign = 'center';
    inputElement.style.fontFamily = this.getFontFamily(config);
    inputElement.style.zIndex = '10000';
    inputElement.style.backgroundColor = '#FFFFFF';
    inputElement.style.outline = 'none';
    inputElement.id = 'fpd-email-input';

    document.body.appendChild(inputElement);
    this.emailInput = inputElement;

    const hintY = inputYCanvas + inputHeightCanvas + height * 0.03;
    this.validationHint = this.add.text(width / 2, hintY, 'Please input a valid email address', {
      fontFamily: this.getFontFamily(config),
      fontSize: (24 * scaleFactor) + 'px',
      color: config.actionButton?.backgroundColor || '#dfab2e',
      align: 'center',
      fontStyle: '600'
    }).setOrigin(0.5);
    this.validationHint.setVisible(false);
    this.validationHint.setDepth(100);
    this.screenContainer.add(this.validationHint);

    const buttonY = contentStartY + actualTitleHeight + titleToInputGap + inputHeightCanvas + inputToButtonGap + buttonHeight / 2;
    const buttonWidth = width * 0.3;

    const accentColor = parseInt((config.actionButton?.backgroundColor || '#dfab2e').replace('#', '0x'));
    const buttonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, accentColor);
    buttonBg.setStrokeStyle(4, 0xFFFFFF);

    const buttonText = this.add.text(0, 0, 'Confirm', {
      fontFamily: this.getFontFamily(config),
      fontSize: (32 * scaleFactor) + 'px',
      color: '#FFFFFF',
      fontStyle: '600'
    }).setOrigin(0.5);

    const confirmButton = this.add.container(width / 2, buttonY, [buttonBg, buttonText]);
    confirmButton.setSize(buttonWidth, buttonHeight);
    confirmButton.setInteractive({ useHandCursor: true });
    confirmButton.on('pointerdown', () => this.confirmEmail());

    this.screenContainer.add(confirmButton);
  }

  selectAge(age) {
    this.capturedData.age = age;
    this.advanceToNextScreen();
  }

  selectGender(gender) {
    this.capturedData.gender = gender;
    this.advanceToNextScreen();
  }

  confirmEmail() {
    console.log('[DataCaptureScene] Confirm button clicked');
    if (this.emailInput) {
      const email = this.emailInput.value.trim();
      console.log('[DataCaptureScene] Email value:', email);
      if (email && this.isValidEmail(email)) {
        console.log('[DataCaptureScene] Email is valid, advancing...');
        this.capturedData.email = email;

        if (this.validationHint) {
          this.validationHint.setVisible(false);
        }

        this.emailInput.remove();
        this.emailInput = null;
        this.advanceToNextScreen();
      } else {
        console.log('[DataCaptureScene] Email is invalid');

        if (this.validationHint) {
          this.validationHint.setVisible(true);
        }

        if (this.emailInput) {
          const originalBorder = this.emailInput.style.border;
          this.emailInput.style.border = '2px solid #FF0000';
          setTimeout(() => {
            if (this.emailInput) {
              this.emailInput.style.border = originalBorder;
            }
          }, 2000);
        }
      }
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  advanceToNextScreen() {
    this.currentScreenIndex++;

    if (this.currentScreenIndex < this.screens.length) {
      this.updateCarouselDots();
      this.showCurrentScreen();
    } else {
      this.saveDataAndTransition();
    }
  }

  saveDataAndTransition() {
    const templateId = 'match3';
    const storageKey = `fpd_${templateId}_${this.placement}`;

    sessionStorage.setItem(storageKey, JSON.stringify({
      ...this.capturedData,
      timestamp: Date.now(),
      placement: this.placement
    }));

    console.log('[DataCaptureScene] Data saved:', this.capturedData);

    if (this.emailInput) {
      this.emailInput.remove();
      this.emailInput = null;
    }

    this.scene.start(this.nextScene, this.gameData);
  }

  shutdown() {
    this.cleanupEmailInput();
  }
}

// ============================================================================
// PHASER GAME CONFIGURATION
// ============================================================================

const config = window.GAME_CONFIG;

const gameConfig = {
  type: Phaser.AUTO,
  width: config.canvas.width,
  height: config.canvas.height,
  parent: 'game-container',
  backgroundColor: config.canvas.backgroundColor,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [PreloaderScene, SplashScene, HowToPlayScene, GameScene, DataCaptureScene, EndScene]
};

// Handle postMessage for live preview updates
window.addEventListener('message', (event) => {
  const data = event.data;

  if (!data || !data.type) return;

  switch (data.type) {
    case 'UPDATE_CONFIG':
      if (data.config) {
        Object.assign(window.GAME_CONFIG, data.config);
      }
      break;

    case 'UPDATE_MODE':
      if (data.data && data.data.mode) {
        GameState.editorMode = data.data.mode;
        // Save to sessionStorage so it persists across iframe reloads
        try {
          sessionStorage.setItem('editorMode', data.data.mode);
        } catch (e) {
          console.warn('[Match3] Could not save editor mode to sessionStorage');
        }
        console.log('[Match3] Editor mode set to:', data.data.mode);
      }
      break;

    case 'UPDATE_ASSET':
      if (data.assetId && data.dataUrl) {
        if (!window.customAssets) window.customAssets = {};
        window.customAssets[data.assetId] = data.dataUrl;
      }
      break;

    case 'UPDATE_ASSETS':
      if (data.data) {
        const assetKeys = Object.keys(data.data);
        console.log('[Match3] Assets update received:', assetKeys);
        if (!window.customAssets) window.customAssets = {};
        Object.assign(window.customAssets, data.data);

        // Store in sessionStorage to persist across reload
        try {
          sessionStorage.setItem('customAssets', JSON.stringify(window.customAssets));
        } catch (e) {
          console.warn('[Match3] Could not save to sessionStorage');
        }

        // Reload to apply new textures
        setTimeout(() => {
          location.reload();
        }, 50);
      }
      break;

    case 'CLEAR_ASSETS':
      window.customAssets = {};
      // Clear sessionStorage too
      try {
        sessionStorage.removeItem('customAssets');
      } catch (e) {}
      // Reload to use default assets
      setTimeout(() => {
        location.reload();
      }, 100);
      break;

    case 'CLEAR_SESSION':
      // Clear ALL sessionStorage to reset everything to defaults
      console.log('[Match3] Clearing all sessionStorage');
      window.customAssets = {};
      try {
        sessionStorage.removeItem('customAssets');
        sessionStorage.removeItem('customConfig');
        sessionStorage.removeItem('editorMode');
      } catch (e) {}
      // Reload to use defaults
      setTimeout(() => {
        location.reload();
      }, 100);
      break;

    case 'RELOAD':
      location.reload();
      break;

    case 'JUMP_TO_SCENE':
      if (window.game && data.data && data.data.scene) {
        // Map short scene names to full scene keys
        // "Game" jumps to HowToPlayScene (instruction screen) which leads to GameScene
        const sceneMap = {
          'Splash': 'SplashScene',
          'Game': 'HowToPlayScene',  // Game starts with instruction screen
          'End': 'EndScene',
          'HowToPlay': 'HowToPlayScene',
          'DataCapture': 'DataCaptureScene'
        };
        const targetScene = data.data.scene;
        const sceneName = sceneMap[targetScene] || targetScene + 'Scene';
        console.log('[Match3] Jumping to scene:', sceneName);

        // Enable preview mode to disable auto-timer when jumping to Game scene
        GameState.isPreviewMode = true;
        GameState.isComplete = false;  // Reset completion state

        // Stop all running scenes and start the target scene
        window.game.scene.getScenes(true).forEach(scene => {
          if (scene.scene.key !== sceneName) {
            window.game.scene.stop(scene.scene.key);
          }
        });
        window.game.scene.start(sceneName);
      }
      break;

    case 'UPDATE_GAMEPLAY':
      if (data.data) {
        const gameplayChanges = data.data;
        console.log('[Match3] Gameplay update received:', gameplayChanges);

        // Update config
        Object.assign(window.GAME_CONFIG.gameplay, gameplayChanges);
        console.log('[Match3] Config after update - matchTarget:', window.GAME_CONFIG.gameplay.matchTarget, 'gameDuration:', window.GAME_CONFIG.gameplay.gameDuration);

        // If grid-related changes, restart the current scene to apply
        if (gameplayChanges.requiresReload) {
          console.log('[Match3] Requires reload, restarting to HowToPlayScene');

          // Reset game state
          GameState.matchCount = 0;
          GameState.isComplete = false;
          // Don't set isPreviewMode = true here - let the timer run so user can test duration settings
          GameState.isPreviewMode = false;

          // Get current active scene and restart from HowToPlay to show the game
          if (window.game) {
            window.game.scene.getScenes(true).forEach(scene => {
              console.log('[Match3] Stopping scene:', scene.scene.key);
              window.game.scene.stop(scene.scene.key);
            });
            console.log('[Match3] Starting HowToPlayScene');
            window.game.scene.start('HowToPlayScene');
          }
        }
      }
      break;

    case 'UPDATE_TEXTS':
      if (data.data && window.game) {
        const textData = data.data;
        console.log('[Match3] Text update received:', textData);

        // Update config
        Object.assign(window.GAME_CONFIG.text, textData);

        // Update all active scenes' texts
        window.game.scene.getScenes(true).forEach(scene => {
          if (scene.updateTexts) {
            scene.updateTexts(textData);
          }
        });
      }
      break;

    case 'UPDATE_FONTS':
      if (data.data) {
        const fontData = data.data;
        console.log('[Match3] Font update received:', fontData.primary);

        // Update config - also set semibold to match primary for buttons
        Object.assign(window.GAME_CONFIG.fonts, fontData);
        if (fontData.primary) {
          window.GAME_CONFIG.fonts.semibold = fontData.primary;
        }

        // Dynamically load new Google Font
        const fontName = fontData.primary === 'CustomFont' ? fontData.customFontUrl : fontData.primary;
        if (fontName && fontName !== 'CustomFont') {
          const link = document.createElement('link');
          link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;600;700&display=swap`;
          link.rel = 'stylesheet';
          document.head.appendChild(link);

          // Wait for font to load before updating text in all scenes
          document.fonts.load(`600 16px "${fontName}"`).then(() => {
            console.log('[Match3] Font loaded, updating all scenes...');
            // Small delay to ensure Phaser can access the font
            setTimeout(() => {
              if (window.game) {
                window.game.scene.getScenes(true).forEach(scene => {
                  if (scene.updateFonts) {
                    scene.updateFonts(fontData);
                  }
                });
              }
            }, 100);
          });
        }
      }
      break;

    case 'UPDATE_BACKGROUND':
      if (data.data && window.game) {
        const bgData = data.data;
        console.log('[Match3] Background update received:', bgData);

        // Update config
        Object.assign(window.GAME_CONFIG.background, bgData);

        // Update all active scenes' backgrounds
        window.game.scene.getScenes(true).forEach(scene => {
          if (scene.updateBackground) {
            scene.updateBackground();
          }
        });
      }
      break;

    case 'UPDATE_ASSET_SCALES':
      if (data.data && window.game) {
        const scaleData = data.data;
        console.log('[Match3] Asset scale update received:', scaleData);

        // Update config
        Object.assign(window.GAME_CONFIG.assetScales, scaleData);

        // Update all active scenes
        window.game.scene.getScenes(true).forEach(scene => {
          if (scene.updateAssetScales) {
            scene.updateAssetScales(scaleData);
          }
        });
      }
      break;

    case 'UPDATE_LAYOUT':
      if (data.data && window.game) {
        const layoutData = data.data;
        console.log('[Match3] Layout update received:', layoutData);

        // Update config
        Object.assign(window.GAME_CONFIG.layout, layoutData);

        // Update all active scenes
        window.game.scene.getScenes(true).forEach(scene => {
          if (scene.updateLayout) {
            scene.updateLayout(layoutData);
          }
        });
      }
      break;

    case 'UPDATE_BUTTONS':
      if (data.data && window.game) {
        const buttonData = data.data;
        console.log('[Match3] Button update received:', buttonData);

        // Update config
        if (buttonData.actionButton) {
          Object.assign(window.GAME_CONFIG.actionButton, buttonData.actionButton);
        }
        if (buttonData.ctaButton) {
          Object.assign(window.GAME_CONFIG.ctaButton, buttonData.ctaButton);
        }
        if (buttonData.scoreBox) {
          Object.assign(window.GAME_CONFIG.scoreBox, buttonData.scoreBox);
        }
        if (buttonData.actionButtonText !== undefined) {
          window.GAME_CONFIG.text.actionButtonText = buttonData.actionButtonText;
        }
        if (buttonData.actionButtonSize !== undefined) {
          window.GAME_CONFIG.text.actionButtonSize = buttonData.actionButtonSize;
        }
        if (buttonData.ctaText !== undefined) {
          window.GAME_CONFIG.text.ctaText = buttonData.ctaText;
        }
        if (buttonData.ctaSize !== undefined) {
          window.GAME_CONFIG.text.ctaSize = buttonData.ctaSize;
        }

        // Update all active scenes
        window.game.scene.getScenes(true).forEach(scene => {
          if (scene.updateButtons) {
            scene.updateButtons(buttonData);
          }
        });
      }
      break;

    case 'UPDATE_FIRST_PARTY_DATA':
      if (data.data) {
        console.log('[Match3] First party data update received:', data.data);
        window.GAME_CONFIG.firstPartyData = data.data;

        // Update live email prompt text if DataCapture scene is active
        if (window.game && window.game.scene && window.game.scene.isActive('DataCaptureScene') && data.data.emailPromptText !== undefined) {
          const scene = window.game.scene.getScene('DataCaptureScene');
          if (scene && scene.screens && scene.currentScreenIndex !== undefined) {
            const currentScreen = scene.screens[scene.currentScreenIndex];
            if (currentScreen === 'email' && scene.emailTitleText) {
              const emailPromptText = data.data.emailPromptText || 'Enter Your Email';
              scene.emailTitleText.setText(emailPromptText);
              console.log('[Match3] Email prompt text updated in real-time:', emailPromptText);
            }
          }
        }
      }
      break;
  }
});

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.game = new Phaser.Game(gameConfig);
});
