/**
 * CATCH FALLING ITEMS - PLAYABLE AD GAME
 *
 * Game Flow:
 * Boot → Preloader → Splash → Game → [Transition] → End
 *
 * All customizable values are loaded from config.js
 */

// ========================================
// HERO SCALING UTILITY (Single Source of Truth)
// ========================================
/**
 * Calculate hero scale for splashHero or endHero
 * This function is the SINGLE SOURCE OF TRUTH for hero scaling.
 * Used by: SplashScene, EndScene, and live preview UPDATE_ASSET_SCALES handler
 *
 * For CFI template:
 * - Custom assets: WYSIWYG - direct userScale only
 * - Default assets: auto-scale to fit 70% height, then multiply by userScale
 *
 * @param {string} assetKey - 'splashHero' or 'endHero'
 * @param {object} config - GAME_CONFIG object
 * @param {object} customAssets - window.__customAssets object (CFI uses double underscore)
 * @param {number} imgWidth - Image width (for auto-scale calculation)
 * @param {number} imgHeight - Image height (for auto-scale calculation)
 * @returns {number} - The scale to apply to the hero image
 */
function calculateHeroScale(assetKey, config, customAssets, imgWidth, imgHeight) {
  // Pure WYSIWYG scaling - same as Lane Racer
  // No auto-scaling for any assets - ensures live preview, share preview, and built HTML all match
  // Users can adjust scale via the slider as needed
  const userScale = config.assetScales?.[assetKey] || 1;
  return userScale;
}

// Make available globally for index.html live preview handler
window.calculateHeroScale = calculateHeroScale;

// ========================================
// TRANSITION MANAGER
// ========================================
class TransitionManager {
  /**
   * Play transition effect based on config
   * @param {Phaser.Scene} scene - Current Phaser scene
   * @param {Function} onComplete - Callback when transition finishes
   */
  static play(scene, onComplete) {
    const config = window.GAME_CONFIG.transition;
    console.log('[Transition] Playing:', config.type);

    switch (config.type) {
      case 'confetti':
        this.playConfetti(scene, config, onComplete);
        break;

      case 'fade':
        this.playFade(scene, config, onComplete);
        break;

      case 'none':
      default:
        onComplete();
        break;
    }
  }

  /**
   * Confetti transition using canvas-confetti library
   */
  static playConfetti(scene, config, onComplete) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      console.error('[Transition] Confetti canvas not found');
      onComplete();
      return;
    }

    // Store confetti instance globally so it can be stopped when needed
    // useWorker: false allows us to clear the canvas directly when needed
    if (!window.confettiInstance) {
      window.confettiInstance = window.confetti.create(canvas, {
        resize: true,
        useWorker: false  // Disable workers so we can clear canvas immediately
      });
    }
    const myConfetti = window.confettiInstance;

    const settings = config.confetti;
    // Use hardcoded confetti colors since colors section was removed
    const colors = ['#CE315C', '#fbdf42'];

    // Store the current game loop ID to check if scene was restarted
    const gameLoopId = scene._gameLoopId;

    // Main burst
    myConfetti({
      particleCount: settings.particleCount,
      spread: settings.spread,
      origin: settings.origin,
      colors: colors
    });

    // Additional bursts if configured
    if (settings.bursts > 1) {
      for (let i = 1; i < settings.bursts; i++) {
        setTimeout(() => {
          // Check if scene was restarted or jumped during confetti
          if (scene._gameLoopId !== gameLoopId || !scene.scene.isActive()) {
            console.log('[Transition] Side burst cancelled - scene changed');
            return;
          }
          // Side bursts
          myConfetti({
            particleCount: settings.particleCount / 3,
            angle: 60,
            spread: 55,
            origin: { x: 0.1, y: 0.5 },
            colors: colors
          });

          myConfetti({
            particleCount: settings.particleCount / 3,
            angle: 120,
            spread: 55,
            origin: { x: 0.9, y: 0.5 },
            colors: colors
          });
        }, i * settings.burstDelay);
      }
    }

    // Call onComplete after transition duration
    setTimeout(() => {
      // Check if this is still the same game loop (scene might have been restarted)
      if (scene._gameLoopId !== gameLoopId) {
        console.log('[Transition] Confetti callback cancelled - game loop changed (scene restarted)');
        return;
      }
      // Check if scene is still active (user might have jumped to different scene)
      if (!scene.scene.isActive()) {
        console.log('[Transition] Confetti callback cancelled - scene no longer active');
        return;
      }
      onComplete();
    }, config.duration);
  }

  /**
   * Fade transition using Phaser rectangles
   */
  static playFade(scene, config, onComplete) {
    const settings = config.fade;
    const overlay = scene.add.rectangle(
      scene.game.config.width / 2,
      scene.game.config.height / 2,
      scene.game.config.width,
      scene.game.config.height,
      settings.color,
      0
    );
    overlay.setDepth(9999);

    // Fade in
    scene.tweens.add({
      targets: overlay,
      alpha: settings.alpha,
      duration: config.duration / 3,
      ease: 'Power2',
      onComplete: () => {
        // Hold
        scene.time.delayedCall(config.duration / 3, () => {
          // Fade out
          scene.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: config.duration / 3,
            ease: 'Power2',
            onComplete: () => {
              overlay.destroy();
              onComplete();
            }
          });
        });
      }
    });
  }
}

// ========================================
// TRACKING MANAGER
// ========================================
class TrackingManager {
  /**
   * Fire tracking pixels for an event
   * @param {string} eventKey - Event key (e.g., 'playableStart', 'impression', 'click')
   */
  static fire(eventKey) {
    if (!eventKey || !window.GAME_CONFIG.tracking.events) {
      return;
    }

    const event = window.GAME_CONFIG.tracking.events[eventKey];
    if (!event) {
      console.warn(`[Tracking] Event not found: ${eventKey}`);
      return;
    }

    console.log(`[Tracking] Firing event: ${eventKey}`);

    // Fire internal DMP trackers first (for engagement events only)
    const internalUrls = event.internalUrls || [];
    if (internalUrls.length > 0) {
      console.log(`[Internal DMP] Firing ${internalUrls.length} internal tracker(s)`);
      internalUrls.forEach((url, index) => {
        if (url && url.trim()) {
          const normalizedUrl = this.normalizeUrl(url.trim());
          console.log(`  → Internal ${index + 1}:`, normalizedUrl);
          fetch(normalizedUrl, { mode: 'no-cors' })
            .then(() => console.log(`  ✓ Internal ${index + 1} fired`))
            .catch(err => console.error(`  ✗ Internal ${index + 1} error:`, err.message));
        }
      });
    }

    // Fire agency trackers
    const agencyUrls = event.urls || [];
    if (agencyUrls.length > 0) {
      console.log(`[Agency] Firing ${agencyUrls.length} agency tracker(s)`);
      agencyUrls.forEach((url, index) => {
        if (url && url.trim()) {
          // Skip unfilled DSP macros (they'll be replaced at serving time)
          if (this.isMacroPlaceholder(url.trim())) {
            console.log(`  → Agency ${index + 1}: Contains macros - skipping in preview`);
            return;
          }

          const normalizedUrl = this.normalizeUrl(url.trim());
          console.log(`  → Agency ${index + 1}:`, normalizedUrl);
          fetch(normalizedUrl, { mode: 'no-cors' })
            .then(() => console.log(`  ✓ Agency ${index + 1} fired`))
            .catch(err => console.error(`  ✗ Agency ${index + 1} error:`, err.message));
        }
      });
    }

    if (internalUrls.length === 0 && agencyUrls.length === 0) {
      console.log(`[Tracking] No trackers configured for ${eventKey}`);
    }
  }

  /**
   * Check if a URL is a DSP macro placeholder
   * @param {string} url - URL to check
   * @returns {boolean} True if URL contains unfilled macros
   */
  static isMacroPlaceholder(url) {
    // Check for common DSP macro patterns that haven't been replaced
    return url.includes('%%') ||              // %%MACRO%%
           url.match(/\{\{.*\}\}/) ||         // {{TIMESTAMP}}
           url.match(/\[timestamp\]/);        // [timestamp]
  }

  /**
   * Normalize URL to ensure it has a protocol
   * @param {string} url - URL to normalize
   * @returns {string} Normalized URL with protocol
   */
  static normalizeUrl(url) {
    // If URL already has a protocol, return as-is
    if (url.match(/^https?:\/\//i)) {
      return url;
    }
    // If URL starts with //, add https:
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    // Otherwise, add https:// prefix
    return 'https://' + url;
  }
}

// ========================================
// BOOT SCENE
// ========================================
class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    console.log('[Boot] Starting...');
  }

  create() {
    console.log('[Boot] Transitioning to Preloader');
    this.scene.start('Preloader');
  }
}

// ========================================
// PRELOADER SCENE
// ========================================
class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    console.log('[Preloader] Loading assets...');

    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const customAssets = window.__customAssets || {};
    console.log('[Preloader] Custom assets available:', Object.keys(customAssets));

    // Add background color/gradient overlay BEFORE loading UI
    // This ensures the background color shows even before assets load
    this.backgroundOverlay = null;

    if (config.background.type === 'solid') {
      console.log('[Preloader] Adding solid color background:', config.background.solidColor);
      const solidColor = parseInt(config.background.solidColor.replace('#', '0x'));
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(1); // Above background (0) but below loading UI (100+)
    } else if (config.background.type === 'gradient') {
      console.log('[Preloader] Adding gradient background');
      const gradientCanvas = this.textures.createCanvas('gradientBgPreloader', width, height);
      const ctx = gradientCanvas.context;

      const angle = (config.background.gradientAngle || 0) * Math.PI / 180;
      const x1 = width / 2 - Math.cos(angle) * width / 2;
      const y1 = height / 2 - Math.sin(angle) * height / 2;
      const x2 = width / 2 + Math.cos(angle) * width / 2;
      const y2 = height / 2 + Math.sin(angle) * height / 2;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, config.background.gradientStart);
      gradient.addColorStop(1, config.background.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgPreloader');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(1); // Above background (0) but below loading UI (100+)
    }
    // If type is 'image', no overlay - will show default Phaser background

    // Create loading UI
    this.createLoadingUI();

    // Error handler for load failures
    this.load.on('loaderror', (file) => {
      console.error('[Preloader] Failed to load:', file.key, file.src);
    });

    // Load images (use custom assets if available, otherwise use config paths)
    this.load.image('background', customAssets.background || config.assets.background);
    this.load.image('logo', customAssets.logo || config.assets.logo);
    this.load.image('character', customAssets.character || config.assets.character);
    this.load.image('collectible', customAssets.collectible || config.assets.collectible);
    // Score box is now drawn as vector graphics, no image loading needed
    // Note: tapToPlay and ctaButton are now drawn programmatically

    // Load optional splash hero image if configured
    console.log('[Preloader] Hero check - splashHero:', !!customAssets.splashHero, 'endHero:', !!customAssets.endHero);
    if (config.assets.splashHero || customAssets.splashHero) {
      this.load.image('splashHero', customAssets.splashHero || config.assets.splashHero);
    }

    // Load optional end hero image if configured
    if (config.assets.endHero || customAssets.endHero) {
      this.load.image('endHero', customAssets.endHero || config.assets.endHero);
    }

    // Load audio if configured
    if (config.assets.backgroundMusic) {
      this.load.audio('bgMusic', config.assets.backgroundMusic);
    }
    if (config.assets.collectSound) {
      this.load.audio('collectSound', config.assets.collectSound);
    }

    // First Party Data assets - always load if defined in config
    // This allows FPD to be enabled dynamically in the studio without reloading
    // Assets are only loaded if they exist in config.assets or customAssets

    // First Party Data - Age buttons
    if (!this.textures.exists('age1')) {
      const age1Asset = customAssets.age1 || config.assets?.age1;
      if (age1Asset) this.load.image('age1', age1Asset);
    }
    if (!this.textures.exists('age2')) {
      const age2Asset = customAssets.age2 || config.assets?.age2;
      if (age2Asset) this.load.image('age2', age2Asset);
    }
    if (!this.textures.exists('age3')) {
      const age3Asset = customAssets.age3 || config.assets?.age3;
      if (age3Asset) this.load.image('age3', age3Asset);
    }
    if (!this.textures.exists('age4')) {
      const age4Asset = customAssets.age4 || config.assets?.age4;
      if (age4Asset) this.load.image('age4', age4Asset);
    }
    if (!this.textures.exists('age5')) {
      const age5Asset = customAssets.age5 || config.assets?.age5;
      if (age5Asset) this.load.image('age5', age5Asset);
    }
    if (!this.textures.exists('age6')) {
      const age6Asset = customAssets.age6 || config.assets?.age6;
      if (age6Asset) this.load.image('age6', age6Asset);
    }

    // First Party Data - Gender buttons
    if (!this.textures.exists('genderMale')) {
      const genderMaleAsset = customAssets.genderMale || config.assets?.genderMale;
      if (genderMaleAsset) this.load.image('genderMale', genderMaleAsset);
    }
    if (!this.textures.exists('genderFemale')) {
      const genderFemaleAsset = customAssets.genderFemale || config.assets?.genderFemale;
      if (genderFemaleAsset) this.load.image('genderFemale', genderFemaleAsset);
    }
    if (!this.textures.exists('genderOthers')) {
      const genderOthersAsset = customAssets.genderOthers || config.assets?.genderOthers;
      if (genderOthersAsset) this.load.image('genderOthers', genderOthersAsset);
    }

    // First Party Data - Background
    if (!this.textures.exists('dataCaptureBg')) {
      const bgAsset = customAssets.dataCaptureBg || config.assets?.dataCaptureBg;
      if (bgAsset) this.load.image('dataCaptureBg', bgAsset);
    }

    // Update loading bar
    this.load.on('progress', (value) => {
      this.updateLoadingBar(value);
    });

    this.load.on('complete', () => {
      console.log('[Preloader] All assets loaded');
    });
  }

  createLoadingUI() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    // Add logo with smart scaling
    const logoY = height * (config.layout.logoTopMargin || 0.16);

    // Calculate smart scale for preloader logo
    const logoTexture = this.textures.get('logo').getSourceImage();
    const logoAspectRatio = logoTexture.width / logoTexture.height;

    // Read editor mode from sessionStorage for mode-specific scaling
    const editorMode = sessionStorage.getItem('editorMode') || 'advanced';
    const isBasicMode = editorMode === 'basic';

    // Use mode-specific scaling for professional appearance
    const maxLogoWidth = isBasicMode
      ? width * 0.45   // Basic: 45% width (more conservative for loading)
      : width * 0.6;   // Advanced: 60% width

    const maxLogoHeight = isBasicMode
      ? height * 0.15  // Basic: 15% height (more conservative for loading)
      : height * 0.2;  // Advanced: 20% height

    let preloaderSmartScale;
    if (logoAspectRatio > 1) {
      // Horizontal logo - constrain by width
      preloaderSmartScale = maxLogoWidth / logoTexture.width;
    } else {
      // Vertical or square logo - constrain by height
      preloaderSmartScale = maxLogoHeight / logoTexture.height;
    }

    // Store smart scale for later updates
    this.logoSmartScale = preloaderSmartScale;

    this.preloaderLogo = this.add.image(width / 2, logoY, 'logo')
      .setOrigin(0.5)
      .setScale(preloaderSmartScale * (config.assetScales?.logo || 1));

    // Loading bar dimensions from config
    const barWidth = config.loadingBar.width || width * 0.6;
    const barHeight = config.loadingBar.height || 25;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    // Loading bar background
    const bgColor = parseInt(config.loadingBar.backgroundColor.replace('#', '0x'));
    this.add.rectangle(barX, barY, barWidth, barHeight, bgColor, 1).setOrigin(0);

    // Loading bar fill
    const fillColor = parseInt(config.loadingBar.fillColor.replace('#', '0x'));
    this.loadingBar = this.add.rectangle(
      barX,
      barY,
      0,
      barHeight,
      fillColor,
      1
    ).setOrigin(0);

    this.loadingBarWidth = barWidth;
    this.loadingBarX = barX;
    this.loadingBarY = barY;
    this.loadingBarHeight = barHeight;

    // Percentage text (optional, using score color as fallback)
    const scaleFactor = config.fonts.scaleFactor || 1.4;
    this.percentText = this.add.text(
      width / 2,
      barY + barHeight + 20,
      '0%',
      {
        fontFamily: config.fonts.primary,
        fontSize: '22px',
        color: config.text.scoreColor || '#ffffff'
      }
    ).setOrigin(0.5);
  }

  updateLoadingBar(value) {
    const newWidth = this.loadingBarWidth * value;
    this.loadingBar.width = newWidth;
    this.percentText.setText(Math.floor(value * 100) + '%');
  }

  create() {
    console.log('[Preloader] Transitioning to Splash');
    this.scene.start('Splash');
  }
}

// ========================================
// SPLASH SCENE
// ========================================
class SplashScene extends Phaser.Scene {
  constructor() {
    super('Splash');
    // Track last applied scale values to detect real changes
    this.lastLogoScale = null;
    this.lastSplashHeroScale = null;
  }

  getFontFamily(config) {
    // Get the font family with proper fallback stack (EXACT Lane Racer pattern)
    const primaryFont = config.fonts?.primary || 'Poppins';

    // Check if font is loaded
    if (document.fonts && document.fonts.check) {
      const fontLoaded = document.fonts.check(`16px "${primaryFont}"`);
      if (fontLoaded) {
        return `"${primaryFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }
    }

    // Return with fallback stack to prevent Times Roman
    return `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  }

  create() {
    console.log('[Splash] Creating splash screen');

    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;


    // Background - scale to cover without distortion (like CSS background-size: cover)
    this.background = this.add.image(width / 2, height / 2, 'background');
    // Get actual texture dimensions
    const bgWidth = this.background.width;
    const bgHeight = this.background.height;
    // Calculate scale needed for both dimensions
    const scaleX = width / bgWidth;
    const scaleY = height / bgHeight;
    // Use the larger scale to ensure full coverage (some parts may be cropped)
    const scale = Math.max(scaleX, scaleY);
    this.background.setScale(scale);
    this.background.setOrigin(0.5);
    this.background.setDepth(0);

    // Create overlay for solid/gradient backgrounds
    this.backgroundOverlay = null;

    if (config.background.type === 'solid') {
      // Solid color overlay
      console.log('[Splash Scene] Adding solid color overlay:', config.background.solidColor);
      const solidColor = Phaser.Display.Color.HexStringToColor(config.background.solidColor).color;
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(1); // Above background image (0) but below game elements (50+)
    } else if (config.background.type === 'gradient') {
      // Gradient overlay
      console.log('[Splash Scene] Adding gradient overlay');
      // Remove existing texture if it exists to prevent "Texture key already in use" error
      if (this.textures.exists('gradientBgSplash')) {
        this.textures.remove('gradientBgSplash');
      }
      const gradientCanvas = this.textures.createCanvas('gradientBgSplash', width, height);
      const ctx = gradientCanvas.context;

      const angle = (config.background.gradientAngle || 0) * Math.PI / 180;
      const x1 = width / 2 - Math.cos(angle) * width / 2;
      const y1 = height / 2 - Math.sin(angle) * height / 2;
      const x2 = width / 2 + Math.cos(angle) * width / 2;
      const y2 = height / 2 + Math.sin(angle) * height / 2;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, config.background.gradientStart);
      gradient.addColorStop(1, config.background.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgSplash');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(1); // Above background image (0) but below game elements (50+)
    }
    // If type is 'image', backgroundOverlay stays null and image shows through

    // Logo with smart scaling to fit container
    this.logo = this.add.image(
      width / 2,
      height * config.layout.logoTopMargin,
      'logo'
    );

    // Calculate smart scale based on logo dimensions and available space
    const logoTexture = this.textures.get('logo').getSourceImage();
    const logoAspectRatio = logoTexture.width / logoTexture.height;

    // Read editor mode from sessionStorage for mode-specific scaling
    const editorMode = sessionStorage.getItem('editorMode') || 'advanced';
    const isBasicMode = editorMode === 'basic';

    // Use mode-specific scaling for professional appearance
    const maxLogoWidth = isBasicMode
      ? width * 0.7   // Basic: 70% width (same as advanced)
      : width * 0.7;  // Advanced: 70% width for maximum size

    const maxLogoHeight = isBasicMode
      ? height * 0.25  // Basic: 25% height (same as advanced)
      : height * 0.25; // Advanced: 25% height for maximum size

    let smartScale;
    if (logoAspectRatio > 1) {
      // Horizontal logo - constrain by width
      smartScale = maxLogoWidth / logoTexture.width;
    } else {
      // Vertical or square logo - constrain by height
      smartScale = maxLogoHeight / logoTexture.height;
    }

    // Store smart scale for later updates
    this.logoSmartScale = smartScale;

    // Apply smart scale with user's custom scale multiplier
    const initialLogoScale = config.assetScales?.logo || 1;
    this.logo.setScale(smartScale * initialLogoScale);
    this.logo.setOrigin(0.5);
    this.logo.setDepth(100); // Above background overlay

    // Track initial logo scale
    this.lastLogoScale = initialLogoScale;

    // Optional splash hero image - Uses calculateHeroScale for WYSIWYG custom assets
    this.splashHero = null;
    if (config.layout.showSplashHero && this.textures.exists('splashHero')) {
      const heroY = height * (config.layout.splashHeroYPosition || 0.55);

      this.splashHero = this.add.image(width / 2, heroY, 'splashHero')
        .setOrigin(0.5)
        .setAlpha(0) // Start invisible for fade-in effect
        .setDepth(50); // Above background overlay

      // Use single source of truth for hero scaling
      const imgWidth = this.splashHero.width;
      const imgHeight = this.splashHero.height;
      const finalScale = calculateHeroScale('splashHero', config, window.__customAssets || {}, imgWidth, imgHeight);
      this.splashHero.setScale(finalScale);

      console.log('[Splash] Splash hero image added with finalScale:', finalScale);

      // Store image dimensions for future scale recalculations
      this.splashHeroImgWidth = imgWidth;
      this.splashHeroImgHeight = imgHeight;

      // Fade in the hero image
      this.tweens.add({
        targets: this.splashHero,
        alpha: 1,
        duration: 500,
        ease: 'Power2'
      });
    }

    // Store button Y position for recreation (like Lane Racer)
    this.actionButtonY = height * config.layout.actionButtonTopMargin;

    // Create programmatic action button (returns buttonGraphics and buttonText like Lane Racer)
    const { buttonGraphics, buttonText } = this.createActionButton();
    this.actionButtonGraphics = buttonGraphics;
    this.actionButtonText = buttonText;

    // Fire tracking event if configured (legacy impression tracking)
    TrackingManager.fire('impressionUrl');

    // Disable clickTag on splash screen (only active on end screen)
    if (window.disableClickTag) {
      window.disableClickTag();
    }

    // ============================================
    // INLINE EVENT LISTENERS
    // ============================================
    // Listen for font updates from the editor (EXACT Lane Racer pattern)
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_FONTS') {
        const data = event.data.data;
        window.GAME_CONFIG.fonts = { ...window.GAME_CONFIG.fonts, ...data };

        const fontName = data.primary === 'CustomFont' ? data.customFontUrl : data.primary;
        if (fontName && fontName !== 'CustomFont') {
          const link = document.createElement('link');
          link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;600;700&display=swap`;
          link.rel = 'stylesheet';
          document.head.appendChild(link);

          document.fonts.load(`600 16px "${fontName}"`).then(() => {
            return new Promise(resolve => setTimeout(resolve, 300));
          }).then(() => {
            // Check if scene is still active
            if (!this.scene.isActive()) {
              console.log('[SplashScene] Scene not active, skipping font update');
              return;
            }

            // Update instruction text
            if (this.instructionText) {
              this.instructionText.setFontFamily(data.primary);
              this.instructionText.updateText();
            }

            // Recreate button with new font (EXACT Lane Racer pattern)
            // Destroy all tweens associated with the button first
            if (this.actionButton) {
              this.tweens.killTweensOf(this.actionButton);
            }
            if (this.actionButtonGraphics) {
              this.tweens.killTweensOf(this.actionButtonGraphics);
              this.actionButtonGraphics.destroy();
              this.actionButtonGraphics = null;
            }
            if (this.actionButtonText) {
              this.actionButtonText.destroy();
              this.actionButtonText = null;
            }
            if (this.actionButton) {
              this.actionButton.destroy();
              this.actionButton = null;
            }

            console.log('[SplashScene] Button colors before recreation:', window.GAME_CONFIG.actionButton.backgroundColor, window.GAME_CONFIG.actionButton.textColor);
            console.log('[SplashScene] Font being applied:', fontName);
            const { buttonGraphics, buttonText } = this.createActionButton();
            this.actionButtonGraphics = buttonGraphics;
            this.actionButtonText = buttonText;

            // Directly apply the loaded font (bypass getFontFamily check)
            if (buttonText) {
              const fontFamily = `"${fontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
              buttonText.setFontFamily(fontFamily);
              buttonText.updateText();
              buttonText.setVisible(false);
              buttonText.setVisible(true);
              console.log('[SplashScene] Button font directly set to:', fontFamily);
            }

            // Force a canvas update
            this.sys.game.renderer.snapshot((snapshot) => {});

            // Update instruction text with new font
            if (this.instructionText) {
              const fontFamily = `"${fontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
              this.instructionText.setFontFamily(fontFamily);
              this.instructionText.updateText();
              console.log('[SplashScene] Instruction text font updated to:', fontName);
            }
          }).catch(err => {
            console.warn('[SplashScene] Font load failed:', err);
          });
        }
      }
    });

    // Listen for button updates from the editor
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_BUTTONS' && event.data.data) {
        // Check if scene is still active
        if (!this.scene.isActive()) {
          console.log('[SplashScene] Scene not active, skipping button update');
          return;
        }

        const data = event.data.data;
        const config = window.GAME_CONFIG;

        // Update config with new button values
        if (data.actionButton) {
          config.actionButton = { ...config.actionButton, ...data.actionButton };
        }
        if (data.ctaButton) {
          config.ctaButton = { ...config.ctaButton, ...data.ctaButton };
        }
        if (data.actionButtonText !== undefined) {
          config.text.actionButtonText = data.actionButtonText;
        }
        if (data.actionButtonSize !== undefined) {
          config.text.actionButtonSize = data.actionButtonSize;
        }
        if (data.ctaText !== undefined) {
          config.text.ctaText = data.ctaText;
        }
        if (data.ctaSize !== undefined) {
          config.text.ctaSize = data.ctaSize;
        }

        // Recreate action button with new config - destroy all components
        if (this.actionButton) {
          this.tweens.killTweensOf(this.actionButton);
          this.actionButton.destroy();
          this.actionButton = null;
        }
        if (this.actionButtonGraphics) {
          this.tweens.killTweensOf(this.actionButtonGraphics);
          this.actionButtonGraphics.destroy();
          this.actionButtonGraphics = null;
        }
        if (this.actionButtonText) {
          this.actionButtonText.destroy();
          this.actionButtonText = null;
        }

        const { buttonGraphics, buttonText } = this.createActionButton();
        this.actionButtonGraphics = buttonGraphics;
        this.actionButtonText = buttonText;
        console.log('[SplashScene] Button recreated with new config');

        // Force refresh (Lane Racer pattern)
        if (buttonText) {
          buttonText.updateText();
          buttonText.setVisible(false);
          buttonText.setVisible(true);
        }
      }
    });

    // Listen for background updates without scene restart
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_BACKGROUND') {
        // Check if scene is still active
        if (!this.scene.isActive()) {
          return;
        }
        this.updateBackground(event.data.data);
      }
    });
  }

  createActionButton() {
    const config = window.GAME_CONFIG;
    const { width } = config.canvas;
    const scaleFactor = config.fonts.scaleFactor || 1.4;
    const y = this.actionButtonY;

    // Get button config
    const btnConfig = config.actionButton;
    const btnText = config.text.actionButtonText || 'TAP TO PLAY';
    const btnSize = (config.text.actionButtonSize || 24) * scaleFactor;
    const buttonScale = btnConfig.scale || 1.0;

    // Create text first to measure it (Lane Racer pattern)
    const text = this.add.text(0, 0, btnText, {
      fontFamily: this.getFontFamily(config),
      fontSize: `${btnSize}px`,
      color: btnConfig.textColor,
      fontStyle: '600'  // Use semibold (600) instead of bold (700) to match live version
    });
    text.setOrigin(0.5);

    // Calculate button dimensions based on text with padding
    // Use larger padding for display fonts which tend to have more flourishes
    const horizontalPadding = 60 * scaleFactor; // 60px padding on each side (increased for display fonts)
    const verticalPadding = 25 * scaleFactor; // 25px padding top/bottom
    const btnWidth = Math.max(text.width + (horizontalPadding * 2), 280 * scaleFactor); // Minimum width
    const btnHeight = text.height + (verticalPadding * 2);

    const graphics = this.add.graphics();
    const bgColor = Phaser.Display.Color.HexStringToColor(btnConfig.backgroundColor).color;

    // Calculate border radius (20% of button height for proportional rounding)
    const borderRadius = btnConfig.shape === 'rounded' ? btnHeight * 0.2 : (btnConfig.shape === 'pill' ? btnHeight / 2 : 0);

    graphics.fillStyle(bgColor, 1);
    if (btnConfig.shape === 'pill') {
      graphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, borderRadius);
    } else if (btnConfig.shape === 'rounded') {
      graphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, borderRadius);
    } else {
      graphics.fillRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    }

    if (btnConfig.borderWidth > 0) {
      const borderColor = Phaser.Display.Color.HexStringToColor(btnConfig.borderColor).color;
      graphics.lineStyle(btnConfig.borderWidth, borderColor);
      if (btnConfig.shape === 'pill') {
        graphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, borderRadius);
      } else if (btnConfig.shape === 'rounded') {
        graphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, borderRadius);
      } else {
        graphics.strokeRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      }
    }

    const container = this.add.container(width / 2, y);
    container.add(graphics);
    container.add(text);

    // Apply button scale from config
    container.setScale(buttonScale);

    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });
    container.setDepth(100);

    // Track button creation time to prevent accidental clicks during recreation
    const buttonCreatedAt = Date.now();

    container.on('pointerdown', () => {
      // Ignore clicks within 200ms of button creation to prevent accidental triggers during recreation
      if (Date.now() - buttonCreatedAt < 200) {
        console.log('[Splash] Action button click ignored (too soon after creation)');
        return;
      }
      console.log('[Splash] Action button clicked, starting game');
      this.startGame();
    });

    // Add pulsating animation using the button scale (Lane Racer pattern)
    const pulseTween = this.tweens.add({
      targets: container,
      scaleX: buttonScale * 1.1,
      scaleY: buttonScale * 1.1,
      duration: 400,
      ease: 'Linear',
      yoyo: true,
      repeat: -1
    });

    container.on('pointerover', () => {
      pulseTween.pause();
      container.setScale(buttonScale * 1.05);
    });

    container.on('pointerout', () => {
      container.setScale(buttonScale);
      pulseTween.resume();
    });

    // Store container reference for startGame animation
    this.actionButton = container;

    // Return separate references (Lane Racer pattern)
    return { buttonGraphics: graphics, buttonText: text };
  }

  startGame() {
    // Fire playableStart tracking event
    TrackingManager.fire('playableStart');

    // Disable clickTag overlay during gameplay
    if (window.disableClickTag) {
      window.disableClickTag();
    }

    // Animate elements out (include splashHero if it exists)
    // Use this.actionButton (the container) instead of old actionButtonContainer
    const elementsToFade = [this.logo, this.actionButton];
    if (this.splashHero) {
      elementsToFade.push(this.splashHero);
    }

    // Check if first party data capture is enabled and configured for afterSplash
    const config = window.GAME_CONFIG;
    const fpdConfig = config.firstPartyData;
    const needsDataCapture = fpdConfig?.enabled &&
                             fpdConfig?.placement === 'afterSplash' &&
                             (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    this.tweens.add({
      targets: elementsToFade,
      alpha: 0,
      y: '-=50',
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        if (needsDataCapture) {
          // Go to DataCapture scene first, then to Game
          this.scene.start('DataCapture', {
            nextScene: 'Game',
            placement: 'afterSplash'
          });
        } else {
          this.scene.start('Game', {});
        }
      }
    });
  }

  // Centralized update methods called by global message handler (kept for backward compatibility)
  // Note: Inline listeners in create() are now the primary handlers (Lane Racer pattern)
  updateButtons(buttonData) {
    // Check if scene is still active (prevents ghosting from updates to inactive scenes)
    if (!this.scene.isActive()) {
      console.log('[SplashScene] Scene not active, skipping button update');
      return;
    }

    // Destroy all button components (Lane Racer pattern)
    if (this.actionButton) {
      this.tweens.killTweensOf(this.actionButton);
      this.actionButton.destroy();
      this.actionButton = null;
    }
    if (this.actionButtonGraphics) {
      this.tweens.killTweensOf(this.actionButtonGraphics);
      this.actionButtonGraphics.destroy();
      this.actionButtonGraphics = null;
    }
    if (this.actionButtonText) {
      this.actionButtonText.destroy();
      this.actionButtonText = null;
    }

    const { buttonGraphics, buttonText } = this.createActionButton();
    this.actionButtonGraphics = buttonGraphics;
    this.actionButtonText = buttonText;
    console.log('[SplashScene] Action button updated');
  }

  updateFonts(fontData) {
    // Check if scene is still active (prevents ghosting from updates to inactive scenes)
    if (!this.scene.isActive()) {
      console.log('[SplashScene] Scene not active, skipping font update');
      return;
    }

    const fontName = fontData.primary;
    console.log('[SplashScene] updateFonts called with:', fontName);

    // Update instruction text font
    if (this.instructionText) {
      this.instructionText.setFontFamily(fontName);
      this.instructionText.updateText();
    }

    // Recreate button with new font - destroy all components (Lane Racer pattern)
    if (this.actionButton) {
      this.tweens.killTweensOf(this.actionButton);
      this.actionButton.destroy();
      this.actionButton = null;
    }
    if (this.actionButtonGraphics) {
      this.tweens.killTweensOf(this.actionButtonGraphics);
      this.actionButtonGraphics.destroy();
      this.actionButtonGraphics = null;
    }
    if (this.actionButtonText) {
      this.actionButtonText.destroy();
      this.actionButtonText = null;
    }

    console.log('[SplashScene] Recreating button with font:', window.GAME_CONFIG.fonts.primary);
    const { buttonGraphics, buttonText } = this.createActionButton();
    this.actionButtonGraphics = buttonGraphics;
    this.actionButtonText = buttonText;
    console.log('[SplashScene] Button recreated, text font:', buttonText?.style?.fontFamily);

    // Force refresh (Lane Racer pattern)
    if (buttonText) {
      buttonText.updateText();
      buttonText.setVisible(false);
      buttonText.setVisible(true);
    }

    // Force a canvas update (Lane Racer pattern)
    this.sys.game.renderer.snapshot(() => {});
  }

  updateLayout(layoutData) {
    const config = window.GAME_CONFIG;

    // Update logo Y position
    if (layoutData.logoTopMargin !== undefined && this.logo) {
      const newY = config.canvas.height * layoutData.logoTopMargin;
      this.logo.setY(newY);
      console.log('[SplashScene] Logo Y position updated to:', layoutData.logoTopMargin);
    }

    // Update action button Y position (use this.actionButton instead of actionButtonContainer)
    if (layoutData.actionButtonTopMargin !== undefined && this.actionButton) {
      const newY = config.canvas.height * layoutData.actionButtonTopMargin;
      this.actionButton.setY(newY);
      this.actionButtonY = newY; // Also update stored Y for button recreation
      console.log('[SplashScene] Action button Y position updated to:', layoutData.actionButtonTopMargin);
    }

    // Update splash hero Y position
    if (layoutData.splashHeroYPosition !== undefined && this.splashHero) {
      const newY = config.canvas.height * layoutData.splashHeroYPosition;
      this.splashHero.setY(newY);
      console.log('[SplashScene] Splash hero Y position updated to:', layoutData.splashHeroYPosition);
    }

    // Handle showSplashHero visibility - Uses calculateHeroScale for WYSIWYG custom assets
    if (layoutData.showSplashHero !== undefined) {
      if (layoutData.showSplashHero && !this.splashHero && this.textures.exists('splashHero')) {
        const heroY = config.canvas.height * (config.layout.splashHeroYPosition || 0.55);
        this.splashHero = this.add.image(config.canvas.width / 2, heroY, 'splashHero')
          .setOrigin(0.5)
          .setDepth(50);

        const imgWidth = this.splashHero.width;
        const imgHeight = this.splashHero.height;
        this.splashHeroImgWidth = imgWidth;
        this.splashHeroImgHeight = imgHeight;

        const finalScale = calculateHeroScale('splashHero', config, window.__customAssets || {}, imgWidth, imgHeight);
        this.splashHero.setScale(finalScale);
      } else if (!layoutData.showSplashHero && this.splashHero) {
        this.splashHero.setVisible(false);
      } else if (layoutData.showSplashHero && this.splashHero) {
        this.splashHero.setVisible(true);
      }
    }
  }

  updateAssetScales(scaleData) {
    const config = window.GAME_CONFIG;

    // Update splash hero scale - Uses calculateHeroScale for WYSIWYG custom assets
    if (scaleData.splashHero !== undefined && this.splashHero) {
      const imgWidth = this.splashHeroImgWidth || this.splashHero.width;
      const imgHeight = this.splashHeroImgHeight || this.splashHero.height;
      const finalScale = calculateHeroScale('splashHero', config, window.__customAssets || {}, imgWidth, imgHeight);
      this.splashHero.setScale(finalScale);
      console.log('[SplashScene] Splash hero scale updated to:', scaleData.splashHero);
    }

    // Update logo scale
    if (scaleData.logo !== undefined && this.logo) {
      const finalScale = (this.logoSmartScale || 1) * scaleData.logo;
      this.logo.setScale(finalScale);
      console.log('[SplashScene] Logo scale updated to:', scaleData.logo);
    }
  }

  updateBackground(bgData) {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    // Destroy old background overlay
    if (this.backgroundOverlay) {
      this.backgroundOverlay.destroy();
      this.backgroundOverlay = null;
    }

    if (bgData.type === 'solid') {
      const solidColor = Phaser.Display.Color.HexStringToColor(bgData.solidColor).color;
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(1);
    } else if (bgData.type === 'gradient') {
      if (this.textures.exists('gradientBgSplash')) {
        this.textures.remove('gradientBgSplash');
      }

      const gradientCanvas = this.textures.createCanvas('gradientBgSplash', width, height);
      const ctx = gradientCanvas.context;
      const angleRad = (bgData.gradientAngle || 180) * Math.PI / 180;
      const x0 = width / 2 - Math.cos(angleRad) * width / 2;
      const y0 = height / 2 - Math.sin(angleRad) * height / 2;
      const x1 = width / 2 + Math.cos(angleRad) * width / 2;
      const y1 = height / 2 + Math.sin(angleRad) * height / 2;
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, bgData.gradientStart);
      gradient.addColorStop(1, bgData.gradientEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgSplash');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(1);
    }
    console.log('[SplashScene] Background updated to:', bgData.type);
  }

}

// ========================================
// GAME SCENE
// ========================================
class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(data) {
    console.log('[Game] Starting gameplay');

    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    // Assign unique ID to this game loop - incremented on every restart
    // This allows us to ignore callbacks from previous loops
    this._gameLoopId = (this._gameLoopId || 0) + 1;
    console.log('[GameScene] New game loop started, ID:', this._gameLoopId);

    // Check if resuming from mid-game FPD
    const isResumingMidGame = data && data.score !== undefined;

    this.gameConfig = config;
    this.score = isResumingMidGame ? data.score : 0;
    this.targetScore = config.gameplay.targetScore;
    this.gameActive = isResumingMidGame; // Auto-start if resuming, otherwise wait for instruction
    this.fallingItems = [];
    this.midGameDataCaptureShown = isResumingMidGame; // Mark as shown if resuming

    // Timer tracking
    this.gameStartTime = null;
    this.gameDuration = config.gameplay.gameDuration || 30000;
    this.gameTimer = null;

    // Expose gameplay properties for live preview
    this.itemSpeed = config.gameplay.itemSpeed;
    this.characterSpeed = config.gameplay.characterSpeed;

    // Track recent spawn positions to avoid clustering (store last 3 spawns)
    this.recentSpawnPositions = [];

    // Background - always load the image first, then overlay color/gradient if needed
    console.log('[Game Scene] Background config:', config.background);

    // Always render the background image (will be hidden by overlay if needed)
    this.background = this.add.image(width / 2, height / 2, 'background');
    const bgWidth = this.background.width;
    const bgHeight = this.background.height;
    const scaleX = width / bgWidth;
    const scaleY = height / bgHeight;
    const scale = Math.max(scaleX, scaleY);
    this.background.setScale(scale);
    this.background.setOrigin(0.5);
    this.background.setDepth(0);

    // Create overlay for solid/gradient backgrounds
    this.backgroundOverlay = null;

    if (config.background.type === 'solid') {
      // Solid color overlay
      console.log('[Game Scene] Adding solid color overlay:', config.background.solidColor);
      const solidColor = parseInt(config.background.solidColor.replace('#', '0x'));
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(1); // Above background image (0) but below game elements (50+)
    } else if (config.background.type === 'gradient') {
      // Gradient overlay
      console.log('[Game Scene] Adding gradient overlay');
      // Remove existing texture if it exists to prevent "Texture key already in use" error
      if (this.textures.exists('gradientBg')) {
        this.textures.remove('gradientBg');
      }
      const gradientCanvas = this.textures.createCanvas('gradientBg', width, height);
      const ctx = gradientCanvas.context;

      const angle = (config.background.gradientAngle || 0) * Math.PI / 180;
      const x1 = width / 2 - Math.cos(angle) * width / 2;
      const y1 = height / 2 - Math.sin(angle) * height / 2;
      const x2 = width / 2 + Math.cos(angle) * width / 2;
      const y2 = height / 2 + Math.sin(angle) * height / 2;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, config.background.gradientStart);
      gradient.addColorStop(1, config.background.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBg');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(1); // Above background image (0) but below game elements (50+)
    }
    // If type is 'image', backgroundOverlay stays null and image shows through

    // Logo (top-right) - with smart scaling
    const logoTexture = this.textures.get('logo').getSourceImage();
    const logoAspectRatio = logoTexture.width / logoTexture.height;

    // Read editor mode from sessionStorage for mode-specific scaling
    const editorMode = sessionStorage.getItem('editorMode') || 'advanced';
    const isBasicMode = editorMode === 'basic';

    // Use same scaling for both modes (game screen logos)
    const maxLogoWidthGame = width * 0.3;   // 30% width for maximum size
    const maxLogoHeightGame = height * 0.12; // 12% height for maximum size

    let gameSmartScale;
    if (logoAspectRatio > 1) {
      // Horizontal logo - constrain by width
      gameSmartScale = maxLogoWidthGame / logoTexture.width;
    } else {
      // Vertical or square logo - constrain by height
      gameSmartScale = maxLogoHeightGame / logoTexture.height;
    }

    // Store smart scale for later updates
    this.logoSmartScale = gameSmartScale;

    this.logo = this.add.image(
      0,
      0,
      'logo'
    );
    // Game screen logo: use only smart scale, not affected by user's scale slider
    this.logo.setScale(gameSmartScale);
    this.logo.setOrigin(0.5);
    this.logo.setDepth(100);

    // Position with calculated margin from edges
    this.logo.x = width - (this.logo.displayWidth * 0.7);
    this.logo.y = this.logo.displayHeight;

    // Score UI
    this.createScoreUI();

    // Character
    this.createCharacter();

    // Start spawning items (but won't spawn until gameActive = true)
    this.startSpawning();

    // Setup input
    this.setupInput();

    // Show instruction overlay (skip if resuming mid-game)
    if (!isResumingMidGame) {
      this.showInstructionOverlay();
    }

    // Listen for font updates from the editor (Lane Racer inline pattern)
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_FONTS') {
        const data = event.data.data;
        window.GAME_CONFIG.fonts = { ...window.GAME_CONFIG.fonts, ...data };

        const fontName = data.primary === 'CustomFont' ? data.customFontUrl : data.primary;
        if (fontName && fontName !== 'CustomFont') {
          const link = document.createElement('link');
          link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;600;700&display=swap`;
          link.rel = 'stylesheet';
          document.head.appendChild(link);

          document.fonts.load(`600 16px "${fontName}"`).then(() => {
            return new Promise(resolve => setTimeout(resolve, 300));
          }).then(() => {
            // Check if scene is still active
            if (!this.scene.isActive()) {
              console.log('[GameScene] Scene not active, skipping font update');
              return;
            }

            // Use the full font family string with the loaded font (use fontName to handle CustomFont case)
            const fontFamilyString = `"${fontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

            if (this.scoreText) {
              this.scoreText.setFontFamily(fontFamilyString);
              this.scoreText.updateText();
            }
            if (this.instructionText) {
              this.instructionText.setFontFamily(fontFamilyString);
              this.instructionText.updateText();
            }
            if (this.tapHint) {
              this.tapHint.setFontFamily(fontFamilyString);
              this.tapHint.updateText();
            }
            console.log('[GameScene] Font updated to:', fontFamilyString);
          }).catch(err => {
            console.warn('[GameScene] Font load failed:', err);
          });
        }
      }
    });
  }

  // Centralized update methods called by global message handler
  updateTexts(textData) {
    const scaleFactor = this.gameConfig.fonts.scaleFactor || 1.4;

    // Update instruction text
    if (this.instructionText) {
      if (textData.instruction !== undefined) {
        this.instructionText.setText(textData.instruction);
      }
      if (textData.instructionColor !== undefined) {
        this.instructionText.setColor(textData.instructionColor);
      }
      if (textData.instructionSize !== undefined) {
        this.instructionText.setFontSize(textData.instructionSize * scaleFactor);
      }
    }

    // Update tap hint text
    if (this.tapHint) {
      if (textData.instructionColor !== undefined) {
        this.tapHint.setColor(textData.instructionColor);
      }
      if (textData.instructionSize !== undefined) {
        this.tapHint.setFontSize(textData.instructionSize * scaleFactor * 0.6);
      }
    }

    // Update score text and box
    if (this.scoreText && this.scoreBox) {
      let needsResize = false;

      if (textData.scoreFormat !== undefined) {
        const scoreTextContent = textData.scoreFormat
          .replace('{score}', this.score)
          .replace('{target}', this.targetScore);
        this.scoreText.setText(scoreTextContent);
        needsResize = true;
      }
      if (textData.scoreColor !== undefined) {
        this.scoreText.setColor(textData.scoreColor);
      }
      if (textData.scoreSize !== undefined) {
        this.scoreText.setFontSize(textData.scoreSize * scaleFactor);
        needsResize = true;
      }

      if (needsResize) {
        this.scoreBox.destroy();
        this.scoreBox = null;
        const tempText = this.scoreText;
        this.scoreText = null;
        this.createScoreUI();
        tempText.destroy();
      }
    }
  }

  updateAssetScales(scaleData) {
    const config = this.gameConfig;

    // Update character scale
    if (scaleData.character !== undefined && this.character) {
      const referenceWidth = 479;
      const textureWidth = this.character.texture.source[0].width;
      const normalizeScale = referenceWidth / textureWidth;
      const finalScale = normalizeScale * config.gameplay.characterScale * scaleData.character;
      this.character.setScale(finalScale);
      this.character.y = config.canvas.height + config.layout.characterBottomMargin * this.character.displayHeight;
      console.log('[GameScene] Character scale updated to:', scaleData.character);
    }

    // Update collectible scale
    if (scaleData.collectible !== undefined) {
      if (this.fallingItems && this.fallingItems.length > 0) {
        this.fallingItems.forEach((item) => {
          const referenceSize = 208;
          const textureWidth = item.texture.source[0].width;
          const normalizeScale = referenceSize / textureWidth;
          const finalScale = normalizeScale * config.gameplay.collectibleScale * scaleData.collectible;
          item.setScale(finalScale);
        });
        console.log('[GameScene] Updated', this.fallingItems.length, 'collectibles');
      }
    }
  }

  updateLayout(layoutData) {
    const config = this.gameConfig;

    // Update character Y position
    if (layoutData.characterBottomMargin !== undefined && this.character) {
      const newY = config.canvas.height + layoutData.characterBottomMargin * this.character.displayHeight;
      this.character.setY(newY);
      console.log('[GameScene] Character Y position updated');
    }

    // Update score box Y position
    if (layoutData.scoreBoxTopMargin !== undefined && this.scoreBox && this.scoreText) {
      const newY = config.canvas.height * layoutData.scoreBoxTopMargin;
      this.scoreBox.setY(newY);
      this.scoreText.setY(newY);
      console.log('[GameScene] Score box Y position updated');
    }
  }

  updateFonts(fontData) {
    // Check if scene is still active (prevents ghosting from updates to inactive scenes)
    if (!this.scene.isActive()) {
      console.log('[GameScene] Scene not active, skipping font update');
      return;
    }

    const fontName = fontData.primary;
    console.log('[GameScene] Updating fonts to:', fontName);

    if (this.instructionText) {
      this.instructionText.setFontFamily(fontName);
    }
    if (this.tapHint) {
      this.tapHint.setFontFamily(fontName);
    }
    if (this.scoreText) {
      this.scoreText.setFontFamily(fontName);
    }
  }

  updateBackground(bgData) {
    const config = this.gameConfig;
    const { width, height } = config.canvas;

    if (this.backgroundOverlay) {
      this.backgroundOverlay.destroy();
      this.backgroundOverlay = null;
    }

    if (bgData.type === 'solid') {
      const solidColor = parseInt(bgData.solidColor.replace('#', '0x'));
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(1);
    } else if (bgData.type === 'gradient') {
      if (this.textures.exists('gradientBgGame')) {
        this.textures.remove('gradientBgGame');
      }

      const gradientCanvas = this.textures.createCanvas('gradientBgGame', width, height);
      const ctx = gradientCanvas.context;
      const angleRad = (bgData.gradientAngle || 180) * Math.PI / 180;
      const x0 = width / 2 - Math.cos(angleRad) * width / 2;
      const y0 = height / 2 - Math.sin(angleRad) * height / 2;
      const x1 = width / 2 + Math.cos(angleRad) * width / 2;
      const y1 = height / 2 + Math.sin(angleRad) * height / 2;
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, bgData.gradientStart);
      gradient.addColorStop(1, bgData.gradientEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgGame');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(1);
    }
    console.log('[GameScene] Background updated to:', bgData.type);
  }

  createScoreUI() {
    const config = this.gameConfig;
    const { width, height } = config.canvas;

    // Score box configuration
    const scoreBoxConfig = config.scoreBox;
    const scaleFactor = config.fonts.scaleFactor || 1.4;

    // Create temporary text to measure dimensions (like buttons do)
    const scoreText = config.text.scoreFormat
      .replace('{score}', this.score)
      .replace('{target}', this.targetScore);

    const tempText = this.add.text(0, 0, scoreText, {
      fontFamily: config.fonts.primary,
      fontSize: (config.text.scoreSize * scaleFactor) + 'px',
      fontStyle: '600'
    });

    const textWidth = tempText.width;
    const textHeight = tempText.height;
    tempText.destroy();

    // Calculate box dimensions based on text size (like buttons)
    const horizontalPadding = 40; // 20px padding on each side
    const verticalPadding = 20; // 10px padding top/bottom
    const boxWidth = textWidth + horizontalPadding;
    const boxHeight = textHeight + verticalPadding;

    // Calculate border radius based on shape
    let borderRadius = 0;
    if (scoreBoxConfig.shape === 'pill') {
      borderRadius = boxHeight / 2;
    } else if (scoreBoxConfig.shape === 'rounded') {
      borderRadius = boxHeight * 0.2; // 20% of box height for proportional rounding
    }

    // Create score box graphics
    const scoreBoxX = width * config.layout.scoreBoxLeftMargin;
    const scoreBoxY = height * config.layout.scoreBoxTopMargin;

    this.scoreBox = this.add.graphics();
    this.scoreBox.setPosition(scoreBoxX, scoreBoxY);

    // Fill score box background
    const bgColor = parseInt(scoreBoxConfig.backgroundColor.replace('#', '0x'));
    this.scoreBox.fillStyle(bgColor, 1);
    this.scoreBox.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, borderRadius);

    // Draw border as stroke (outline only) with alignment 0.5 for centered stroke
    if (scoreBoxConfig.borderWidth && scoreBoxConfig.borderColor) {
      const borderColor = parseInt(scoreBoxConfig.borderColor.replace('#', '0x'));
      this.scoreBox.lineStyle(scoreBoxConfig.borderWidth, borderColor, 1, 0.5);
      this.scoreBox.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, borderRadius);
    }

    this.scoreBox.setDepth(130);

    // Score text
    const scoreStyle = {
      fontFamily: config.fonts.primary,
      fontSize: (config.text.scoreSize * scaleFactor) + 'px',
      color: config.text.scoreColor,
      fontStyle: '600'
    };

    this.scoreText = this.add.text(
      scoreBoxX,
      scoreBoxY,
      scoreText,
      scoreStyle
    ).setOrigin(0.5);
    this.scoreText.setDepth(131);
  }

  createCharacter() {
    const config = this.gameConfig;
    const { width, height } = config.canvas;

    this.character = this.add.image(
      width / 2,
      height,
      'character'
    );

    // Smart scaling: normalize to reference size (479px default character width)
    const referenceWidth = 479;
    const textureWidth = this.character.texture.source[0].width;
    const normalizeScale = referenceWidth / textureWidth;
    const finalScale = normalizeScale * config.gameplay.characterScale * (config.assetScales?.character || 1);
    this.character.setScale(finalScale);

    this.character.setOrigin(0.5, 0.75);
    this.character.setDepth(50);

    // Position at bottom with margin
    this.character.y = height + config.layout.characterBottomMargin * this.character.displayHeight;

    // Make interactive - use default texture-based hit area (works better with any texture size)
    this.character.setInteractive();
  }

  showInstructionOverlay() {
    const config = this.gameConfig;
    const { width, height } = config.canvas;
    const scaleFactor = config.fonts.scaleFactor || 1.4;

    // Semi-transparent dark overlay background
    this.instructionOverlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.7
    );
    this.instructionOverlay.setDepth(200);
    this.instructionOverlay.setInteractive();

    // Instruction text
    const instructionStyle = {
      fontFamily: config.fonts.primary,
      fontSize: (config.text.instructionSize * scaleFactor) + 'px',
      color: config.text.instructionColor,
      fontStyle: '600',
      align: 'center',
      wordWrap: { width: width * 0.8 }
    };

    this.instructionText = this.add.text(
      width / 2,
      height * 0.4,
      config.text.instruction,
      instructionStyle
    ).setOrigin(0.5);
    this.instructionText.setDepth(201);

    // "Tap anywhere to start" hint
    const tapHintStyle = {
      fontFamily: config.fonts.primary,
      fontSize: (config.text.instructionSize * scaleFactor * 0.6) + 'px',
      color: config.text.instructionColor,
      fontStyle: '400',
      align: 'center'
    };

    this.tapHint = this.add.text(
      width / 2,
      height * 0.6,
      'Tap anywhere to start',
      tapHintStyle
    ).setOrigin(0.5);
    this.tapHint.setDepth(201);

    // Pulsing animation for tap hint
    this.tweens.add({
      targets: this.tapHint,
      alpha: 0.4,
      duration: 800,
      ease: 'Power2',
      yoyo: true,
      repeat: -1
    });

    // Handle tap to dismiss - only respond to clicks within the game canvas
    this.input.on('pointerdown', this.onInstructionClick, this);

    console.log('[Game] Instruction overlay shown - gameplay paused');
  }

  onInstructionClick(pointer) {
    // Only dismiss if instruction overlay exists and click is within canvas bounds
    if (this.instructionOverlay && pointer.downElement && pointer.downElement.tagName === 'CANVAS') {
      this.dismissInstructionOverlay();
    }
  }

  dismissInstructionOverlay() {
    console.log('[Game] Dismissing instruction overlay - starting gameplay');

    // Fire howToPlay tracking event (only once)
    TrackingManager.fire('howToPlay');

    // Remove the instruction click listener to prevent multiple tracking fires
    this.input.off('pointerdown', this.onInstructionClick, this);

    // Fade out overlay elements
    this.tweens.add({
      targets: [this.instructionOverlay, this.instructionText, this.tapHint],
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.instructionOverlay.destroy();
        this.instructionText.destroy();
        this.tapHint.destroy();

        // Activate gameplay
        this.gameActive = true;
        console.log('[Game] Gameplay started');

        // Start game timer
        this.startGameTimer();
      }
    });
  }

  startGameTimer() {
    const config = window.GAME_CONFIG;

    // Record start time for elapsed calculations
    this.gameStartTime = Date.now();

    // Only start timer if autoEndTimer is enabled
    if (!config.gameplay.autoEndTimer) {
      console.log('[CatchFallingItems] Auto-end timer disabled in config - game will continue until targetScore reached');
      return;
    }

    const duration = config.gameplay.gameDuration || 30000;
    console.log('[CatchFallingItems] Starting game timer:', duration, 'ms');

    // Set up mid-game FPD timer check if applicable
    const fpdConfig = config.firstPartyData;
    const needsMidGameCapture = !this.midGameDataCaptureShown &&
                                 fpdConfig?.enabled &&
                                 fpdConfig?.placement === 'midGame' &&
                                 (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    if (needsMidGameCapture) {
      // Set timer for half-time mid-game FPD trigger
      const halfTime = duration / 2;
      console.log('[CatchFallingItems] Mid-game FPD timer set for:', halfTime, 'ms');
      this.midGameTimer = this.time.delayedCall(halfTime, () => {
        this.checkAndTriggerMidGameCapture('timer');
      });
    }

    // Main game timer - auto-complete when time runs out
    this.gameTimer = this.time.delayedCall(duration, () => {
      if (this.gameActive && this.score < this.targetScore) {
        console.log('[CatchFallingItems] Timer expired - auto-completing game');
        this.onWin(); // End game even if target not reached
      }
    });
  }

  checkAndTriggerMidGameCapture(trigger) {
    if (this.midGameDataCaptureShown) {
      return false;
    }

    const config = window.GAME_CONFIG;
    const fpdConfig = config.firstPartyData;
    const needsMidGameCapture = fpdConfig?.enabled &&
                                 fpdConfig?.placement === 'midGame' &&
                                 (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    if (!needsMidGameCapture) {
      return false;
    }

    console.log('[CatchFallingItems] Mid-game FPD triggered by:', trigger);
    this.midGameDataCaptureShown = true;

    // Cancel the mid-game timer if it exists (in case score triggered first)
    if (this.midGameTimer) {
      this.midGameTimer.remove();
      this.midGameTimer = null;
    }

    // Pause game - save current state
    const gameState = {
      score: this.score,
      targetScore: this.targetScore
    };

    // Stop game active flag
    this.gameActive = false;

    // Go to DataCapture scene with game state
    this.scene.pause();
    this.scene.start('DataCapture', {
      nextScene: 'Game',
      placement: 'midGame',
      gameData: gameState
    });
    return true;
  }

  setupInput() {
    // Track previous X position for direction detection
    this.characterPrevX = this.character.x;

    if (this.gameConfig.gameplay.enableDrag) {
      // Drag mode - enable drag on the input
      this.input.setDraggable(this.character);

      this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (gameObject === this.character) {
          // Clamp to canvas boundaries with minimal margins for edge-to-edge movement
          const margin = 20;
          const clampedX = Phaser.Math.Clamp(dragX, margin, this.gameConfig.canvas.width - margin);

          // Detect direction and flip character
          if (clampedX < this.characterPrevX) {
            // Moving left - flip horizontally
            this.character.setFlipX(true);
          } else if (clampedX > this.characterPrevX) {
            // Moving right - original orientation
            this.character.setFlipX(false);
          }

          this.character.x = clampedX;
          this.characterPrevX = clampedX;
        }
      });
    } else {
      // Auto-follow mode
      this.input.on('pointermove', (pointer) => {
        if (this.gameActive) {
          const targetX = pointer.x;
          // Use minimal margins for edge-to-edge movement
          const margin = 20;
          const clampedX = Phaser.Math.Clamp(targetX, margin, this.gameConfig.canvas.width - margin);

          // Detect direction and flip character
          if (clampedX < this.characterPrevX) {
            // Moving left - flip horizontally
            this.character.setFlipX(true);
          } else if (clampedX > this.characterPrevX) {
            // Moving right - original orientation
            this.character.setFlipX(false);
          }

          // Smooth movement
          this.tweens.add({
            targets: this.character,
            x: clampedX,
            duration: 150,
            ease: 'Power2'
          });

          this.characterPrevX = clampedX;
        }
      });
    }
  }

  startSpawning() {
    // Spawn first item immediately
    this.time.delayedCall(200, () => this.spawnItem());

    // Schedule next spawn - reads config each time for live updates
    this.scheduleNextSpawn();
  }

  scheduleNextSpawn() {
    // Read spawnInterval from config each time for live updates in advanced mode
    const config = window.GAME_CONFIG;
    const spawnInterval = config.gameplay.spawnInterval;

    this.spawnTimer = this.time.delayedCall(spawnInterval, () => {
      if (this.gameActive) {
        this.spawnItem();
      }
      this.scheduleNextSpawn();
    });
  }

  spawnItem() {
    if (!this.gameActive) return;

    const config = this.gameConfig;
    const { width, height } = config.canvas;

    // Controlled random X position with anti-clustering
    const minX = 20;
    const maxX = width - 20;
    const minDistance = 200; // Minimum distance from recent spawns
    const maxAttempts = 10; // Maximum attempts to find a good position

    let randomX;
    let attempts = 0;
    let foundGoodPosition = false;

    // Try to find a position that's not too close to recent spawns
    while (attempts < maxAttempts && !foundGoodPosition) {
      randomX = Phaser.Math.Between(minX, maxX);

      // Check distance from recent spawn positions
      let tooClose = false;
      for (const recentPos of this.recentSpawnPositions) {
        if (Math.abs(randomX - recentPos) < minDistance) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        foundGoodPosition = true;
      }

      attempts++;
    }

    // If we couldn't find a good position after max attempts, use the last random value
    // This prevents infinite loops while still preferring well-distributed spawns

    // Track this spawn position (keep only last 3)
    this.recentSpawnPositions.push(randomX);
    if (this.recentSpawnPositions.length > 3) {
      this.recentSpawnPositions.shift(); // Remove oldest
    }

    // Create falling item
    const item = this.add.image(randomX, -100, 'collectible');

    // Smart scaling: normalize to reference size (208px default collectible)
    const referenceSize = 208;
    const textureWidth = item.texture.source[0].width;
    const normalizeScale = referenceSize / textureWidth;
    const finalScale = normalizeScale * config.gameplay.collectibleScale * (config.assetScales?.collectible || 1);
    item.setScale(finalScale);

    item.setOrigin(0.5);
    item.setDepth(60); // Above character (50) so items appear in front
    item.setData('speed', this.itemSpeed); // Use this.itemSpeed for live updates
    item.setData('rotation', Phaser.Math.FloatBetween(-0.02, 0.02));

    this.fallingItems.push(item);
  }

  update() {
    if (!this.gameActive) return;

    // Update falling items
    for (let i = this.fallingItems.length - 1; i >= 0; i--) {
      const item = this.fallingItems[i];

      // Move down
      item.y += item.getData('speed');
      item.rotation += item.getData('rotation');

      // Check collision with character
      if (this.checkCollision(item, this.character)) {
        this.collectItem(item, i);
        continue; // Skip further checks since item is collected
      }

      // Remove if off screen (bottom or sides)
      const { width, height } = this.gameConfig.canvas;
      const isOffBottom = item.y > height + 100;
      const isOffSides = item.x < -100 || item.x > width + 100;

      if (isOffBottom || isOffSides) {
        item.destroy();
        this.fallingItems.splice(i, 1);
      }
    }
  }

  checkCollision(item, character) {
    const itemBounds = item.getBounds();
    const charBounds = character.getBounds();

    // Use smaller hit box for character (more forgiving)
    const hitBox = new Phaser.Geom.Rectangle(
      charBounds.x + charBounds.width * 0.2,
      charBounds.y + charBounds.height * 0.4,
      charBounds.width * 0.6,
      charBounds.height * 0.3
    );

    return Phaser.Geom.Rectangle.Overlaps(itemBounds, hitBox);
  }

  collectItem(item, index) {
    // Remove item
    item.destroy();
    this.fallingItems.splice(index, 1);

    // Increment score
    this.score++;
    this.updateScoreUI();

    // Particle effect
    this.createCollectEffect(item.x, item.y);

    // Check for mid-game data capture (halfway to target score)
    // This triggers if half-score is reached before half-time
    // Read targetScore from config for live updates in advanced mode
    const config = window.GAME_CONFIG;
    const targetScore = config.gameplay.targetScore;
    if (this.score >= targetScore / 2) {
      if (this.checkAndTriggerMidGameCapture('score')) {
        return; // Exit method while paused
      }
    }

    // Check win condition
    if (this.score >= targetScore) {
      this.onWin();
    }
  }

  createCollectEffect(x, y) {
    const config = this.gameConfig;

    // Score text pop (uses instruction color which is secondary brand color in basic mode)
    const popText = this.add.text(x, y, '+1', {
      fontFamily: config.fonts.primary,
      fontSize: '60px',
      color: config.text.instructionColor || '#ffffff',
      fontStyle: '600'
    }).setOrigin(0.5);
    popText.setDepth(120);

    this.tweens.add({
      targets: popText,
      y: y - 100,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => popText.destroy()
    });

    // Character bounce
    const originalY = this.character.y;
    this.tweens.add({
      targets: this.character,
      y: originalY + 15,
      duration: 100,
      ease: 'Bounce.easeIn',
      yoyo: true
    });
  }

  updateScoreUI() {
    const scoreText = this.gameConfig.text.scoreFormat
      .replace('{score}', this.score)
      .replace('{target}', this.targetScore);

    this.scoreText.setText(scoreText);

    // Pulse animation
    this.tweens.add({
      targets: [this.scoreText, this.scoreBox],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
  }

  onWin() {
    console.log('[Game] Player wins!');

    this.gameActive = false;

    // Stop spawning
    if (this.spawnTimer) {
      this.spawnTimer.remove();
    }

    // Flip character horizontally to show happy state
    this.character.setFlipX(!this.character.flipX);

    // Fire tracking event
    const url = this.gameConfig.tracking.gameCompleteUrl;
    if (url) {
      console.log('[Tracking] gameCompleteUrl', url);
      fetch(url).catch(err => console.error('[Tracking] Error:', err));
    }

    // Fade out game elements
    this.tweens.add({
      targets: [this.scoreBox, this.scoreText, this.logo],
      alpha: 0,
      y: '-=50',
      duration: 500,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: this.character,
      alpha: 0,
      y: '+=50',
      duration: 500,
      ease: 'Power2'
    });

    // Clear remaining items
    this.fallingItems.forEach(item => {
      this.tweens.add({
        targets: item,
        alpha: 0,
        scale: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => item.destroy()
      });
    });
    this.fallingItems = [];

    // Play transition after elements fade
    this.time.delayedCall(600, () => {
      // Check if first party data capture is enabled and configured for beforeEnd
      const config = window.GAME_CONFIG;
      const fpdConfig = config.firstPartyData;
      const needsDataCapture = fpdConfig?.enabled &&
                               fpdConfig?.placement === 'beforeEnd' &&
                               (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

      TransitionManager.play(this, () => {
        console.log('[Game] Transition complete, showing end screen');

        if (needsDataCapture) {
          // Go to DataCapture scene first, then to End
          this.scene.start('DataCapture', {
            nextScene: 'End',
            placement: 'beforeEnd'
          });
        } else {
          this.scene.start('End');
        }
      });
    });
  }

}

// ========================================
// DATA CAPTURE SCENE
// ========================================
class DataCaptureScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DataCapture' });
  }

  init(data) {
    this.nextScene = data.nextScene || 'Game';
    this.placement = data.placement || 'afterSplash';
    this.gameData = data.gameData || {}; // Store game state for mid-game placement
  }

  getFontFamily(config) {
    // Get the font family with proper fallback stack
    const primaryFont = config.fonts?.primary || 'Poppins';

    // Check if font is loaded
    if (document.fonts && document.fonts.check) {
      const fontLoaded = document.fonts.check(`16px "${primaryFont}"`);
      if (fontLoaded) {
        return `"${primaryFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }
    }

    // Return with fallback stack to prevent Times Roman
    return `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  }

  create() {
    console.log('[DataCaptureScene] Scene started!');
    console.log('[DataCaptureScene] Placement:', this.placement);
    console.log('[DataCaptureScene] Next scene:', this.nextScene);

    // Clean up any existing email inputs from previous instances
    const existingInput = document.getElementById('fpd-email-input');
    if (existingInput) {
      existingInput.remove();
    }

    const config = window.GAME_CONFIG;
    const { width, height} = config.canvas;
    const fpdConfig = config.firstPartyData;

    // Ensure font is loaded before proceeding
    const primaryFont = config.fonts?.primary || 'Poppins';
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        console.log('[DataCaptureScene] Fonts ready');
      });
    }

    console.log('[DataCaptureScene] First party data config:', fpdConfig);
    console.log('[DataCaptureScene] Screens config:', fpdConfig?.screens);

    // Determine which screens to show based on config
    this.screens = [];
    if (fpdConfig.screens.age) this.screens.push('age');
    if (fpdConfig.screens.gender) this.screens.push('gender');
    if (fpdConfig.screens.email) this.screens.push('email');

    console.log('[DataCaptureScene] Screens to show:', this.screens);

    this.currentScreenIndex = 0;
    this.capturedData = {};

    // Create blur background
    this.createBlurBackground();

    // Create carousel dots
    this.createCarouselDots();

    // Show first screen
    this.showCurrentScreen();

    // Register cleanup handler for scene shutdown
    this.events.on('shutdown', this.cleanupEmailInput, this);
  }

  cleanupEmailInput() {
    if (this.emailInput) {
      this.emailInput.remove();
      this.emailInput = null;
    }
    // Also check for any orphaned email inputs
    const existingInput = document.getElementById('fpd-email-input');
    if (existingInput) {
      existingInput.remove();
    }
  }

  createBlurBackground() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    // Take a snapshot of the game scene behind
    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.cameras && gameScene.cameras.main) {
      // Render the game scene to a texture
      const renderTexture = this.add.renderTexture(0, 0, width, height);
      renderTexture.draw(gameScene.children);
      renderTexture.setDepth(-1);

      // Apply blur effect using Phaser pipeline
      if (this.game.renderer.pipelines) {
        try {
          // Apply blur using post-processing
          renderTexture.setPostPipeline('BlurPostFX');
        } catch (e) {
          console.log('[DataCaptureScene] Blur pipeline not available, using fallback');
        }
      }
    }

    // Add semi-transparent overlay on top for better readability
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0xCE315C, 0.5);
    overlay.setInteractive();
    overlay.setDepth(0);
  }

  createCarouselDots() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    const dotSize = 20 * scaleFactor;  // Increased from 12 to 20
    const dotSpacing = 40 * scaleFactor;  // Increased from 24 to 40
    const totalWidth = this.screens.length * dotSpacing - (dotSpacing - dotSize);
    const startX = (width - totalWidth) / 2;
    const y = height - (80 * scaleFactor);

    this.dots = [];

    for (let i = 0; i < this.screens.length; i++) {
      const x = startX + i * dotSpacing;
      // Active dot is yellow (#FBDF42), inactive dots are semi-transparent white
      const dot = this.add.circle(x, y, dotSize / 2, i === 0 ? 0xFBDF42 : 0xFFFFFF);
      if (i !== 0) {
        dot.setAlpha(0.3);  // Make inactive dots semi-transparent
      }
      dot.setDepth(1000);  // Ensure dots are visible above other elements
      this.dots.push(dot);
    }
  }

  updateCarouselDots() {
    this.dots.forEach((dot, i) => {
      if (i === this.currentScreenIndex) {
        dot.setFillStyle(0xFBDF42);  // Active: yellow
        dot.setAlpha(1);
      } else {
        dot.setFillStyle(0xFFFFFF);  // Inactive: white
        dot.setAlpha(0.3);
      }
    });
  }

  showCurrentScreen() {
    // Clear previous screen elements
    if (this.screenContainer) {
      this.screenContainer.destroy();
    }

    // Clean up email input if it exists
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
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    this.screenContainer = this.add.container(0, 0);
    this.screenContainer.setDepth(10);  // Ensure container is visible above blur background

    // Calculate vertical centering
    // Grid dimensions
    const buttonSize = width * 0.27;  // Square buttons, 27% of canvas width
    const cols = 3;
    const rows = 2;
    const verticalSpacing = height * 0.23;   // 23% spacing between rows

    // Total height of content: title + gap + buttons grid
    const titleHeight = 48 * scaleFactor;  // Font size
    const titleToButtonGap = height * 0.12;  // Increased gap between title and buttons
    const gridHeight = buttonSize * rows + verticalSpacing * (rows - 1);
    const totalContentHeight = titleHeight + titleToButtonGap + gridHeight;

    // Center the entire unit vertically
    const contentStartY = (height - totalContentHeight) / 2;

    // Get font family with proper fallback
    const fontFamily = this.getFontFamily(config);

    // Title
    const title = this.add.text(width / 2, contentStartY, 'Select Your Age Range', {
      fontFamily: fontFamily,
      fontSize: (48 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);

    this.screenContainer.add(title);

    // Age options with images - 2 column layout
    const ageOptions = [
      { label: '<18', image: 'age1', value: '<18' },
      { label: '18-24', image: 'age2', value: '18-24' },
      { label: '25-34', image: 'age3', value: '25-34' },
      { label: '35-44', image: 'age4', value: '35-44' },
      { label: '45-54', image: 'age5', value: '45-54' },
      { label: '55+', image: 'age6', value: '55+' }
    ];

    // 3-column grid layout (3 columns x 2 rows)
    const horizontalSpacing = width * 0.32;  // 32% spacing between columns
    const startX = width / 2 - (cols - 1) * horizontalSpacing / 2;
    const startY = contentStartY + titleHeight / 2 + titleToButtonGap + buttonSize / 2;  // Start buttons after title + gap

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
        const bg = this.add.rectangle(x, y, buttonSize, buttonSize, 0xFFFFFF, 0.9);
        bg.setStrokeStyle(4, 0x0033FF);
        const text = this.add.text(x, y, option.label, {
          fontFamily: this.getFontFamily(config),
          fontSize: (32 * scaleFactor) + 'px',
          color: '#0033FF',
          fontStyle: '600'
        }).setOrigin(0.5);
        button = this.add.container(x, y, [bg, text]);
      }

      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.selectAge(option.value));

      this.screenContainer.add(button);
    });
  }

  showGenderScreen() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    this.screenContainer = this.add.container(0, 0);
    this.screenContainer.setDepth(10);  // Ensure container is visible above blur background

    // Calculate vertical centering
    const buttonSize = width * 0.27;  // Square buttons, 27% of canvas width
    const titleHeight = 48 * scaleFactor;  // Font size
    const titleToButtonGap = height * 0.12;  // Gap between title and buttons
    const totalContentHeight = titleHeight + titleToButtonGap + buttonSize;

    // Center the entire unit vertically
    const contentStartY = (height - totalContentHeight) / 2;

    // Title
    const title = this.add.text(width / 2, contentStartY, 'Select Your Gender', {
      fontFamily: this.getFontFamily(config),
      fontSize: (48 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5);

    this.screenContainer.add(title);

    // Gender options with images - 3-column layout in single row
    const genderOptions = [
      { label: 'Male', image: 'genderMale', value: 'male' },
      { label: 'Female', image: 'genderFemale', value: 'female' },
      { label: 'Others', image: 'genderOthers', value: 'others' }
    ];

    // Match age screen button sizing
    const cols = 3;
    const horizontalSpacing = width * 0.32;  // 32% spacing between columns
    const startX = width / 2 - (cols - 1) * horizontalSpacing / 2;
    const y = contentStartY + titleHeight / 2 + titleToButtonGap + buttonSize / 2;  // Position buttons after title + gap

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
        const bg = this.add.rectangle(x, y, buttonSize, buttonSize, 0xFFFFFF, 0.9);
        bg.setStrokeStyle(4, 0x0033FF);
        const text = this.add.text(x, y, option.label, {
          fontFamily: this.getFontFamily(config),
          fontSize: (32 * scaleFactor) + 'px',
          color: '#0033FF',
          fontStyle: '600'
        }).setOrigin(0.5);
        button = this.add.container(x, y, [bg, text]);
      }

      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.selectGender(option.value));

      this.screenContainer.add(button);
    });
  }

  showEmailScreen() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    this.screenContainer = this.add.container(0, 0);
    this.screenContainer.setDepth(10);  // Ensure container is visible above blur background

    // Title - use custom email prompt text or default (create first to measure height)
    const emailPromptText = config.firstPartyData?.emailPromptText || 'Enter Your Email';
    const title = this.add.text(width / 2, 0, emailPromptText, {
      fontFamily: this.getFontFamily(config),
      fontSize: (48 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: {
        width: width * 0.8,  // Use 80% of screen width for text
        useAdvancedWrap: true
      },
      lineSpacing: 5
    }).setOrigin(0.5, 0);

    // Calculate vertical centering with actual text height
    const actualTitleHeight = title.height;  // Get actual height after word wrap
    const titleToInputGap = height * 0.08;  // Gap between title and input
    const inputHeightCanvas = height * 0.06;   // Input height
    const inputToButtonGap = height * 0.06;  // Gap between input and button
    const buttonHeight = height * 0.06;
    const totalContentHeight = actualTitleHeight + titleToInputGap + inputHeightCanvas + inputToButtonGap + buttonHeight;

    // Center the entire unit vertically
    const contentStartY = (height - totalContentHeight) / 2;

    // Update title position
    title.setY(contentStartY);

    // Store reference to email title for real-time updates
    this.emailTitleText = title;

    this.screenContainer.add(title);

    // Create HTML input field for email (scaled to canvas)
    const gameCanvas = document.querySelector('canvas');
    const canvasRect = gameCanvas ? gameCanvas.getBoundingClientRect() : { left: 0, top: 0, width: width, height: height };

    // Calculate the scale ratio between canvas internal resolution and displayed size
    const scaleX = canvasRect.width / width;
    const scaleY = canvasRect.height / height;

    // Input dimensions in canvas coordinates
    const inputWidthCanvas = width * 0.6;      // 60% of canvas width
    const inputXCanvas = width / 2 - inputWidthCanvas / 2;  // Centered horizontally
    const inputYCanvas = contentStartY + actualTitleHeight + titleToInputGap;

    // Convert to screen coordinates
    const inputWidth = inputWidthCanvas * scaleX;
    const inputHeight = inputHeightCanvas * scaleY;
    const inputX = canvasRect.left + (inputXCanvas * scaleX);
    const inputY = canvasRect.top + (inputYCanvas * scaleY);

    // Create input element
    const inputElement = document.createElement('input');
    inputElement.type = 'email';
    inputElement.placeholder = 'your.email@example.com';
    inputElement.style.position = 'absolute';
    inputElement.style.left = `${inputX}px`;
    inputElement.style.top = `${inputY}px`;
    inputElement.style.width = `${inputWidth}px`;
    inputElement.style.height = `${inputHeight}px`;
    inputElement.style.fontSize = `${Math.max(14, 18 * scaleY)}px`;  // Scale font size
    inputElement.style.padding = `${Math.max(5, 8 * scaleY)}px ${Math.max(10, 15 * scaleX)}px`;
    inputElement.style.borderRadius = '8px';
    inputElement.style.border = '2px solid #0033FF';
    inputElement.style.textAlign = 'center';
    inputElement.style.fontFamily = this.getFontFamily(config);
    inputElement.style.zIndex = '10000';  // Ensure it's on top
    inputElement.style.backgroundColor = '#FFFFFF';
    inputElement.style.outline = 'none';
    inputElement.id = 'fpd-email-input';

    console.log('[DataCaptureScene] Email input:', {
      canvasSize: { width, height },
      displaySize: { width: canvasRect.width, height: canvasRect.height },
      scale: { scaleX, scaleY },
      input: { x: inputX, y: inputY, width: inputWidth, height: inputHeight }
    });

    // Append to body for reliable positioning
    document.body.appendChild(inputElement);

    this.emailInput = inputElement;

    // Validation hint text (initially hidden) - yellow for good contrast on pink background
    const hintY = inputYCanvas + inputHeightCanvas + height * 0.03;  // Small gap below input
    this.validationHint = this.add.text(width / 2, hintY, 'Please input a valid email address', {
      fontFamily: this.getFontFamily(config),
      fontSize: (24 * scaleFactor) + 'px',
      color: '#FBDF42',
      align: 'center',
      fontStyle: '600'
    }).setOrigin(0.5);
    this.validationHint.setVisible(false);
    this.validationHint.setDepth(100);
    this.screenContainer.add(this.validationHint);

    // Confirm button (scaled) - create at 0,0 relative to container position, using theme colors
    const buttonY = contentStartY + actualTitleHeight + titleToInputGap + inputHeightCanvas + inputToButtonGap + buttonHeight / 2;
    const buttonWidth = width * 0.3;

    const buttonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000000); // Black background
    buttonBg.setStrokeStyle(4, 0xFFFFFF); // White border

    const buttonText = this.add.text(0, 0, 'Confirm', {
      fontFamily: this.getFontFamily(config),
      fontSize: (32 * scaleFactor) + 'px',
      color: '#FFFFFF', // White text
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

        // Hide validation hint
        if (this.validationHint) {
          this.validationHint.setVisible(false);
        }

        this.emailInput.remove();
        this.emailInput = null;
        this.advanceToNextScreen();
      } else {
        console.log('[DataCaptureScene] Email is invalid');

        // Show validation hint text
        if (this.validationHint) {
          this.validationHint.setVisible(true);
        }

        // Show error by changing border color
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
    } else {
      console.log('[DataCaptureScene] No email input found');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  advanceToNextScreen() {
    this.currentScreenIndex++;

    if (this.currentScreenIndex < this.screens.length) {
      // Show next screen
      this.updateCarouselDots();
      this.showCurrentScreen();
    } else {
      // All screens completed, save data and transition
      this.saveDataAndTransition();
    }
  }

  saveDataAndTransition() {
    // Save captured data to sessionStorage with template namespace
    const templateId = 'catch-falling-items';
    const storageKey = `fpd_${templateId}_${this.placement}`;

    sessionStorage.setItem(storageKey, JSON.stringify({
      ...this.capturedData,
      timestamp: Date.now(),
      placement: this.placement
    }));

    console.log('[DataCaptureScene] Data saved:', this.capturedData);

    // Clean up email input if it exists
    if (this.emailInput) {
      this.emailInput.remove();
      this.emailInput = null;
    }

    // Transition to next scene
    if (this.nextScene === 'Game' && this.placement === 'midGame') {
      // Resume game with saved state
      this.scene.start(this.nextScene, this.gameData);
    } else {
      this.scene.start(this.nextScene, {});
    }
  }

  shutdown() {
    // Clean up email input if scene is shutdown before completion
    this.cleanupEmailInput();
  }
}

// ========================================
// END SCENE
// ========================================
class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
    // Track last applied scale values to detect real changes
    this.lastLogoScale = null;
    this.lastEndHeroScale = null;
  }

  getFontFamily(config) {
    // Get the font family with proper fallback stack (EXACT Lane Racer pattern)
    const primaryFont = config.fonts?.primary || 'Poppins';

    // Check if font is loaded
    if (document.fonts && document.fonts.check) {
      const fontLoaded = document.fonts.check(`16px "${primaryFont}"`);
      if (fontLoaded) {
        return `"${primaryFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }
    }

    // Return with fallback stack to prevent Times Roman
    return `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  }

  create() {
    console.log('[End] Showing end screen');

    // Fire playableComplete tracking event
    TrackingManager.fire('playableComplete');

    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    // Background - scale to cover without distortion (like CSS background-size: cover)
    this.background = this.add.image(width / 2, height / 2, 'background');
    // Get actual texture dimensions
    const bgWidth = this.background.width;
    const bgHeight = this.background.height;
    // Calculate scale needed for both dimensions
    const scaleX = width / bgWidth;
    const scaleY = height / bgHeight;
    // Use the larger scale to ensure full coverage (some parts may be cropped)
    const scale = Math.max(scaleX, scaleY);
    this.background.setScale(scale);
    this.background.setOrigin(0.5);
    this.background.setDepth(0);

    // Create overlay for solid/gradient backgrounds
    this.backgroundOverlay = null;

    if (config.background.type === 'solid') {
      console.log('[End Scene] Adding solid color overlay:', config.background.solidColor);
      const solidColor = parseInt(config.background.solidColor.replace('#', '0x'));
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(1); // Above background image (0) but below game elements (50+)
    } else if (config.background.type === 'gradient') {
      console.log('[End Scene] Adding gradient overlay');
      // Remove existing texture if it exists to prevent "Texture key already in use" error
      if (this.textures.exists('gradientBgEnd')) {
        this.textures.remove('gradientBgEnd');
      }
      const gradientCanvas = this.textures.createCanvas('gradientBgEnd', width, height);
      const ctx = gradientCanvas.context;

      const angle = (config.background.gradientAngle || 0) * Math.PI / 180;
      const x1 = width / 2 - Math.cos(angle) * width / 2;
      const y1 = height / 2 - Math.sin(angle) * height / 2;
      const x2 = width / 2 + Math.cos(angle) * width / 2;
      const y2 = height / 2 + Math.sin(angle) * height / 2;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, config.background.gradientStart);
      gradient.addColorStop(1, config.background.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgEnd');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(1); // Above background image (0) but below game elements (50+)
    }
    // If type is 'image', backgroundOverlay stays null and image shows through

    // Logo with smart scaling for end screen
    const logoTexture = this.textures.get('logo').getSourceImage();
    const logoAspectRatio = logoTexture.width / logoTexture.height;

    // Read editor mode from sessionStorage for mode-specific scaling
    const editorMode = sessionStorage.getItem('editorMode') || 'advanced';
    const isBasicMode = editorMode === 'basic';

    // Use mode-specific scaling for professional appearance
    const maxLogoWidthEnd = isBasicMode
      ? width * 0.7   // Basic: 70% width (same as advanced)
      : width * 0.7;  // Advanced: 70% width for maximum size

    const maxLogoHeightEnd = isBasicMode
      ? height * 0.25  // Basic: 25% height (same as splash)
      : height * 0.25;  // Advanced: 25% height (same as splash)

    let endSmartScale;
    if (logoAspectRatio > 1) {
      // Horizontal logo - constrain by width
      endSmartScale = maxLogoWidthEnd / logoTexture.width;
    } else {
      // Vertical or square logo - constrain by height
      endSmartScale = maxLogoHeightEnd / logoTexture.height;
    }

    // Store smart scale for later updates
    this.logoSmartScale = endSmartScale;

    this.logo = this.add.image(
      width / 2,
      height * 0.2,
      'logo'
    );
    const initialLogoScale = config.assetScales?.logo || 1;
    this.logo.setScale(endSmartScale * initialLogoScale);
    this.logo.setOrigin(0.5);
    this.logo.setDepth(100); // Above background overlay (1)

    // Track initial logo scale
    this.lastLogoScale = initialLogoScale;

    // End Hero Image (optional) - Uses calculateHeroScale for WYSIWYG custom assets
    this.endHeroImage = null;
    if (config.layout.showEndHero && this.textures.exists('endHero')) {
      this.endHeroImage = this.add.image(
        width / 2,
        height * config.layout.endHeroYPosition,
        'endHero'
      );

      // Use single source of truth for hero scaling
      const imgWidth = this.endHeroImage.width;
      const imgHeight = this.endHeroImage.height;
      const finalScale = calculateHeroScale('endHero', config, window.__customAssets || {}, imgWidth, imgHeight);
      this.endHeroImage.setScale(finalScale);
      this.endHeroImage.setOrigin(0.5);
      this.endHeroImage.setDepth(90); // Below logo (100) but above background
      console.log('[End] End hero image added at Y:', height * config.layout.endHeroYPosition, 'finalScale:', finalScale);

      // Store image dimensions for future scale recalculations
      this.endHeroImgWidth = imgWidth;
      this.endHeroImgHeight = imgHeight;
    }

    // Store CTA button Y position for recreation (like Lane Racer)
    this.ctaButtonY = height * config.layout.ctaButtonTopMargin;

    // Create programmatic CTA button (returns buttonGraphics and buttonText like Lane Racer)
    const { buttonGraphics, buttonText } = this.createCTAButton();
    this.ctaButtonGraphics = buttonGraphics;
    this.ctaButtonText = buttonText;

    // Enable clickTag overlay for end screen (DSP compliance)
    if (window.enableClickTag) {
      window.enableClickTag();
    }

    // Setup fade-in animation
    this.setupFadeInAnimation();

    // ============================================
    // INLINE EVENT LISTENERS
    // ============================================
    // Listen for font updates from the editor (Lane Racer inline pattern)
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_FONTS') {
        const data = event.data.data;
        window.GAME_CONFIG.fonts = { ...window.GAME_CONFIG.fonts, ...data };

        const fontName = data.primary === 'CustomFont' ? data.customFontUrl : data.primary;
        if (fontName && fontName !== 'CustomFont') {
          const link = document.createElement('link');
          link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;600;700&display=swap`;
          link.rel = 'stylesheet';
          document.head.appendChild(link);

          document.fonts.load(`600 16px "${fontName}"`).then(() => {
            return new Promise(resolve => setTimeout(resolve, 300));
          }).then(() => {
            // Check if scene is still active
            if (!this.scene.isActive()) {
              console.log('[EndScene] Scene not active, skipping font update');
              return;
            }

            // Recreate CTA button with new font (EXACT Lane Racer pattern)
            // Destroy all tweens associated with the button first
            if (this.ctaButton) {
              this.tweens.killTweensOf(this.ctaButton);
            }
            if (this.ctaButtonGraphics) {
              this.tweens.killTweensOf(this.ctaButtonGraphics);
              this.ctaButtonGraphics.destroy();
              this.ctaButtonGraphics = null;
            }
            if (this.ctaButtonText) {
              this.ctaButtonText.destroy();
              this.ctaButtonText = null;
            }
            if (this.ctaButton) {
              this.ctaButton.destroy();
              this.ctaButton = null;
            }

            console.log('[EndScene] CTA button colors before recreation:', window.GAME_CONFIG.ctaButton.backgroundColor, window.GAME_CONFIG.ctaButton.textColor);
            console.log('[EndScene] Font being applied:', fontName);
            const { buttonGraphics, buttonText } = this.createCTAButton();
            this.ctaButtonGraphics = buttonGraphics;
            this.ctaButtonText = buttonText;

            // Directly apply the loaded font (bypass getFontFamily check)
            if (buttonText) {
              const fontFamily = `"${fontName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
              buttonText.setFontFamily(fontFamily);
              buttonText.updateText();
              buttonText.setVisible(false);
              buttonText.setVisible(true);
              console.log('[EndScene] CTA button font directly set to:', fontFamily);
            }

            // Force a canvas update
            this.sys.game.renderer.snapshot((snapshot) => {});
          }).catch(err => {
            console.warn('[EndScene] Font load failed:', err);
          });
        }
      }
    });

    // Listen for button updates from the editor
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_BUTTONS' && event.data.data) {
        // Check if scene is still active
        if (!this.scene.isActive()) {
          console.log('[EndScene] Scene not active, skipping button update');
          return;
        }

        const data = event.data.data;
        const config = window.GAME_CONFIG;

        // Update config with new button values
        if (data.actionButton) {
          config.actionButton = { ...config.actionButton, ...data.actionButton };
        }
        if (data.ctaButton) {
          config.ctaButton = { ...config.ctaButton, ...data.ctaButton };
        }
        if (data.actionButtonText !== undefined) {
          config.text.actionButtonText = data.actionButtonText;
        }
        if (data.actionButtonSize !== undefined) {
          config.text.actionButtonSize = data.actionButtonSize;
        }
        if (data.ctaText !== undefined) {
          config.text.ctaText = data.ctaText;
        }
        if (data.ctaSize !== undefined) {
          config.text.ctaSize = data.ctaSize;
        }

        // Recreate CTA button with new config - destroy all components
        if (this.ctaButton) {
          this.tweens.killTweensOf(this.ctaButton);
          this.ctaButton.destroy();
          this.ctaButton = null;
        }
        if (this.ctaButtonGraphics) {
          this.tweens.killTweensOf(this.ctaButtonGraphics);
          this.ctaButtonGraphics.destroy();
          this.ctaButtonGraphics = null;
        }
        if (this.ctaButtonText) {
          this.ctaButtonText.destroy();
          this.ctaButtonText = null;
        }

        const { buttonGraphics, buttonText } = this.createCTAButton();
        this.ctaButtonGraphics = buttonGraphics;
        this.ctaButtonText = buttonText;
        console.log('[EndScene] CTA button recreated with new config');

        // Force refresh (Lane Racer pattern)
        if (buttonText) {
          buttonText.updateText();
          buttonText.setVisible(false);
          buttonText.setVisible(true);
        }
      }
    });

    // Listen for background updates without scene restart
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_BACKGROUND') {
        // Check if scene is still active
        if (!this.scene.isActive()) {
          return;
        }
        this.updateBackground(event.data.data);
      }
    });
  }

  // Centralized update methods called by global message handler (kept for backward compatibility)
  // Note: Inline listeners in create() are now the primary handlers (Lane Racer pattern)
  updateButtons(buttonData) {
    // Check if scene is still active (prevents ghosting from updates to inactive scenes)
    if (!this.scene.isActive()) {
      console.log('[EndScene] Scene not active, skipping button update');
      return;
    }

    // Destroy all button components (Lane Racer pattern)
    if (this.ctaButton) {
      this.tweens.killTweensOf(this.ctaButton);
      this.ctaButton.destroy();
      this.ctaButton = null;
    }
    if (this.ctaButtonGraphics) {
      this.tweens.killTweensOf(this.ctaButtonGraphics);
      this.ctaButtonGraphics.destroy();
      this.ctaButtonGraphics = null;
    }
    if (this.ctaButtonText) {
      this.ctaButtonText.destroy();
      this.ctaButtonText = null;
    }

    const { buttonGraphics, buttonText } = this.createCTAButton();
    this.ctaButtonGraphics = buttonGraphics;
    this.ctaButtonText = buttonText;
    console.log('[EndScene] CTA button updated');
  }

  updateFonts(fontData) {
    // Check if scene is still active (prevents ghosting from updates to inactive scenes)
    if (!this.scene.isActive()) {
      console.log('[EndScene] Scene not active, skipping font update');
      return;
    }

    const fontName = fontData.primary;
    console.log('[EndScene] updateFonts called with:', fontName);

    // Recreate CTA button with new font - destroy all components (Lane Racer pattern)
    if (this.ctaButton) {
      this.tweens.killTweensOf(this.ctaButton);
      this.ctaButton.destroy();
      this.ctaButton = null;
    }
    if (this.ctaButtonGraphics) {
      this.tweens.killTweensOf(this.ctaButtonGraphics);
      this.ctaButtonGraphics.destroy();
      this.ctaButtonGraphics = null;
    }
    if (this.ctaButtonText) {
      this.ctaButtonText.destroy();
      this.ctaButtonText = null;
    }

    console.log('[EndScene] Recreating button with font:', window.GAME_CONFIG.fonts.primary);
    const { buttonGraphics, buttonText } = this.createCTAButton();
    this.ctaButtonGraphics = buttonGraphics;
    this.ctaButtonText = buttonText;
    console.log('[EndScene] Button recreated, text font:', buttonText?.style?.fontFamily);

    // Force refresh (Lane Racer pattern)
    if (buttonText) {
      buttonText.updateText();
      buttonText.setVisible(false);
      buttonText.setVisible(true);
    }

    // Force a canvas update (Lane Racer pattern)
    this.sys.game.renderer.snapshot(() => {});
  }

  updateLayout(layoutData) {
    const config = window.GAME_CONFIG;

    // Update end hero Y position
    if (layoutData.endHeroYPosition !== undefined && this.endHeroImage) {
      const newY = config.canvas.height * layoutData.endHeroYPosition;
      this.endHeroImage.setY(newY);
      console.log('[EndScene] End hero Y position updated');
    }

    // Update CTA button Y position (use this.ctaButton instead of ctaButtonContainer)
    if (layoutData.ctaButtonTopMargin !== undefined && this.ctaButton) {
      const newY = config.canvas.height * layoutData.ctaButtonTopMargin;
      this.ctaButton.setY(newY);
      this.ctaButtonY = newY; // Also update stored Y for button recreation
      console.log('[EndScene] CTA button Y position updated');
    }

    // Handle showEndHero visibility - Uses calculateHeroScale for WYSIWYG custom assets
    if (layoutData.showEndHero !== undefined) {
      if (layoutData.showEndHero && !this.endHeroImage && this.textures.exists('endHero')) {
        this.endHeroImage = this.add.image(
          config.canvas.width / 2,
          config.canvas.height * config.layout.endHeroYPosition,
          'endHero'
        );

        const imgWidth = this.endHeroImage.width;
        const imgHeight = this.endHeroImage.height;
        this.endHeroImgWidth = imgWidth;
        this.endHeroImgHeight = imgHeight;

        const finalScale = calculateHeroScale('endHero', config, window.__customAssets || {}, imgWidth, imgHeight);
        this.endHeroImage.setScale(finalScale);
        this.endHeroImage.setOrigin(0.5);
        this.endHeroImage.setDepth(90);
      } else if (!layoutData.showEndHero && this.endHeroImage) {
        this.endHeroImage.setVisible(false);
      } else if (layoutData.showEndHero && this.endHeroImage) {
        this.endHeroImage.setVisible(true);
      }
    }
  }

  updateAssetScales(scaleData) {
    const config = window.GAME_CONFIG;

    // Update end hero scale - Uses calculateHeroScale for WYSIWYG custom assets
    if (scaleData.endHero !== undefined && this.endHeroImage) {
      const imgWidth = this.endHeroImgWidth || this.endHeroImage.width;
      const imgHeight = this.endHeroImgHeight || this.endHeroImage.height;
      const finalScale = calculateHeroScale('endHero', config, window.__customAssets || {}, imgWidth, imgHeight);
      this.endHeroImage.setScale(finalScale);
      console.log('[EndScene] End hero scale updated to:', scaleData.endHero);
    }

    // Update logo scale
    if (scaleData.logo !== undefined && this.logo) {
      const finalScale = (this.logoSmartScale || 1) * scaleData.logo;
      this.logo.setScale(finalScale);
      console.log('[EndScene] Logo scale updated to:', scaleData.logo);
    }
  }

  updateBackground(bgData) {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;

    if (this.backgroundOverlay) {
      this.backgroundOverlay.destroy();
      this.backgroundOverlay = null;
    }

    if (bgData.type === 'solid') {
      const solidColor = Phaser.Display.Color.HexStringToColor(bgData.solidColor).color;
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(1);
    } else if (bgData.type === 'gradient') {
      if (this.textures.exists('gradientBgEnd')) {
        this.textures.remove('gradientBgEnd');
      }

      const gradientCanvas = this.textures.createCanvas('gradientBgEnd', width, height);
      const ctx = gradientCanvas.context;
      const angleRad = (bgData.gradientAngle || 180) * Math.PI / 180;
      const x0 = width / 2 - Math.cos(angleRad) * width / 2;
      const y0 = height / 2 - Math.sin(angleRad) * height / 2;
      const x1 = width / 2 + Math.cos(angleRad) * width / 2;
      const y1 = height / 2 + Math.sin(angleRad) * height / 2;
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, bgData.gradientStart);
      gradient.addColorStop(1, bgData.gradientEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgEnd');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(1);
    }
    console.log('[EndScene] Background updated to:', bgData.type);
  }

  createCTAButton() {
    const config = window.GAME_CONFIG;
    const { width } = config.canvas;
    const scaleFactor = config.fonts.scaleFactor || 1.4;
    const y = this.ctaButtonY;

    // Get button config
    const btnConfig = config.ctaButton;
    const btnText = config.text.ctaText || 'SHOP NOW';
    const btnSize = (config.text.ctaSize || 24) * scaleFactor;
    const buttonScale = btnConfig.scale || 1.0;

    // Create text first to measure it (Lane Racer pattern)
    const text = this.add.text(0, 0, btnText, {
      fontFamily: this.getFontFamily(config),
      fontSize: `${btnSize}px`,
      color: btnConfig.textColor,
      fontStyle: '600'  // Use semibold (600) instead of bold (700) to match live version
    });
    text.setOrigin(0.5);

    // Calculate button dimensions based on text with padding
    // Use larger padding for display fonts which tend to have more flourishes
    const horizontalPadding = 60 * scaleFactor; // 60px padding on each side (increased for display fonts)
    const verticalPadding = 25 * scaleFactor; // 25px padding top/bottom
    const btnWidth = Math.max(text.width + (horizontalPadding * 2), 280 * scaleFactor); // Minimum width
    const btnHeight = text.height + (verticalPadding * 2);

    const graphics = this.add.graphics();
    const bgColor = Phaser.Display.Color.HexStringToColor(btnConfig.backgroundColor).color;

    // Calculate border radius (20% of button height for proportional rounding)
    const borderRadius = btnConfig.shape === 'rounded' ? btnHeight * 0.2 : (btnConfig.shape === 'pill' ? btnHeight / 2 : 0);

    graphics.fillStyle(bgColor, 1);
    if (btnConfig.shape === 'pill') {
      graphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, borderRadius);
    } else if (btnConfig.shape === 'rounded') {
      graphics.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, borderRadius);
    } else {
      graphics.fillRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
    }

    if (btnConfig.borderWidth > 0) {
      const borderColor = Phaser.Display.Color.HexStringToColor(btnConfig.borderColor).color;
      graphics.lineStyle(btnConfig.borderWidth, borderColor);
      if (btnConfig.shape === 'pill') {
        graphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, borderRadius);
      } else if (btnConfig.shape === 'rounded') {
        graphics.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, borderRadius);
      } else {
        graphics.strokeRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight);
      }
    }

    const container = this.add.container(width / 2, y);
    container.add(graphics);
    container.add(text);

    // Apply button scale from config
    container.setScale(buttonScale);

    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });
    container.setDepth(100);

    container.on('pointerdown', () => {
      console.log('[End] CTA clicked, opening:', config.cta.url);

      // Fire click tracking event
      TrackingManager.fire('click');

      // Open landing page
      window.open(config.cta.url, config.cta.target);
    });

    // Add pulsating animation using the button scale (Lane Racer pattern)
    const pulseTween = this.tweens.add({
      targets: container,
      scaleX: buttonScale * 1.1,
      scaleY: buttonScale * 1.1,
      duration: 400,
      ease: 'Linear',
      yoyo: true,
      repeat: -1
    });

    container.on('pointerover', () => {
      pulseTween.pause();
      container.setScale(buttonScale * 1.05);
    });

    container.on('pointerout', () => {
      container.setScale(buttonScale);
      pulseTween.resume();
    });

    // Store container reference for animations
    this.ctaButton = container;

    // Return separate references (Lane Racer pattern)
    return { buttonGraphics: graphics, buttonText: text };
  }

  setupFadeInAnimation() {
    const config = window.GAME_CONFIG;
    const { height } = config.canvas;

    // Fade in elements (use this.ctaButton - the container)
    this.logo.alpha = 0;
    this.ctaButton.alpha = 0;

    this.tweens.add({
      targets: this.logo,
      alpha: 1,
      y: height * config.layout.logoTopMargin,
      duration: 800,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: this.ctaButton,
      alpha: 1,
      duration: 800,
      delay: 400,
      ease: 'Power2'
    });
  }
}

// ========================================
// GAME INITIALIZATION
// ========================================
window.initGame = function() {
  const config = window.GAME_CONFIG;

  if (!config) {
    console.error('[Game] GAME_CONFIG not found!');
    return;
  }

  // Phaser game configuration
  const phaserConfig = {
    type: Phaser.AUTO,
    width: config.canvas.width,
    height: config.canvas.height,
    parent: 'game-container',
    backgroundColor: config.canvas.backgroundColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, PreloaderScene, SplashScene, GameScene, DataCaptureScene, EndScene]
  };

  // Create game instance
  const game = new Phaser.Game(phaserConfig);

  console.log('[Game] Phaser game created successfully');

  // Fire impression tracking on game initialization
  TrackingManager.fire('impression');

  // Global message listener for scene jumping and asset updates
  window.addEventListener('message', (event) => {
    if (event.data.type === 'JUMP_TO_SCENE') {
      const sceneName = event.data.data.scene;
      console.log('[Game] Jumping to scene:', sceneName);

      // Stop and clear any running confetti immediately
      if (window.confettiInstance) {
        window.confettiInstance.reset();
      }
      const confettiCanvas = document.getElementById('confetti-canvas');
      if (confettiCanvas) {
        const ctx = confettiCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
      }

      // Stop confetti loops when jumping to End or DataCapture scene
      // Increment GameScene's _gameLoopId to cancel any pending confetti callbacks
      if (sceneName === 'End' || sceneName === 'DataCapture') {
        const gameScene = game.scene.getScene('Game');
        if (gameScene && gameScene._gameLoopId !== undefined) {
          gameScene._gameLoopId++;
          console.log('[Game] Game loop ID incremented to stop confetti for jump to', sceneName);
        }
      }

      // Check if the requested scene is already running
      const targetScene = game.scene.getScene(sceneName);
      const isAlreadyRunning = targetScene && targetScene.scene.isActive();

      if (isAlreadyRunning) {
        // If already running, restart the scene
        console.log('[Game] Restarting scene:', sceneName);
        targetScene.scene.restart({});
      } else {
        // Stop all running scenes
        game.scene.scenes.forEach(scene => {
          if (scene.scene.isActive()) {
            console.log('[Game] Stopping scene:', scene.scene.key);
            scene.scene.stop();
          }
        });

        // Start the requested scene
        console.log('[Game] Starting scene:', sceneName);
        game.scene.start(sceneName, {});
      }
    }

    // Handle custom asset updates
    if (event.data.type === 'UPDATE_ASSETS') {
      console.log('[Game] Custom assets updated, storing and restarting from Preloader');
      const assetData = event.data.data;

      // Store custom assets globally
      window.__customAssets = window.__customAssets || {};
      Object.assign(window.__customAssets, assetData);

      // Log button colors in config before restart
      console.log('[Game] Button colors in config before restart:', {
        actionButtonBg: window.GAME_CONFIG.actionButton.backgroundColor,
        actionButtonText: window.GAME_CONFIG.actionButton.textColor,
        ctaButtonBg: window.GAME_CONFIG.ctaButton.backgroundColor,
        ctaButtonText: window.GAME_CONFIG.ctaButton.textColor
      });

      // Remove existing textures that are being updated so Preloader can reload them
      Object.keys(assetData).forEach(key => {
        if (game.textures.exists(key)) {
          console.log('[Game] Removing existing texture:', key);
          game.textures.remove(key);
        }
      });

      // Stop all scenes and restart from Preloader to properly reload textures
      game.scene.scenes.forEach(scene => {
        if (scene.scene.isActive()) {
          scene.scene.stop();
        }
      });

      // Small delay to ensure texture data is ready before restart
      setTimeout(() => {
        console.log('[Game] Starting Preloader to reload assets');
        game.scene.start('Preloader');
      }, 100);
    }

    // Handle tracking updates
    if (event.data.type === 'UPDATE_TRACKING') {
      console.log('[Game] Tracking configuration updated');
      const trackingData = event.data.data;

      // Update the global config tracking
      if (window.GAME_CONFIG && window.GAME_CONFIG.tracking) {
        // Update CTA URL if provided
        if (trackingData.cta && trackingData.cta.url !== undefined) {
          window.GAME_CONFIG.cta.url = trackingData.cta.url;
        }

        // Update tracking events if provided
        if (trackingData.tracking) {
          window.GAME_CONFIG.tracking = {
            ...window.GAME_CONFIG.tracking,
            ...trackingData.tracking
          };
          console.log('[Game] Updated tracking config:', window.GAME_CONFIG.tracking.events);
        }
      }
    }

    // Handle asset clearing
    if (event.data.type === 'CLEAR_ASSETS') {
      console.log('[Game] Clearing custom assets and restarting from Preloader');
      const oldAssets = window.__customAssets || {};
      window.__customAssets = {};

      // Remove textures that were custom so Preloader reloads defaults
      Object.keys(oldAssets).forEach(key => {
        if (game.textures.exists(key)) {
          console.log('[Game] Removing custom texture:', key);
          game.textures.remove(key);
        }
      });

      // Stop all scenes and restart from Preloader
      game.scene.scenes.forEach(scene => {
        if (scene.scene.isActive()) {
          scene.scene.stop();
        }
      });
      game.scene.start('Preloader');
    }

    // Centralized UPDATE_BUTTONS handler - calls updateButtons() on all active scenes
    if (event.data.type === 'UPDATE_BUTTONS') {
      const buttonData = event.data.data;
      const config = window.GAME_CONFIG;
      console.log('[CFI] Button update received:', buttonData);

      // Update config FIRST
      if (buttonData.actionButton) {
        Object.assign(config.actionButton, buttonData.actionButton);
      }
      if (buttonData.ctaButton) {
        Object.assign(config.ctaButton, buttonData.ctaButton);
      }
      if (buttonData.scoreBox) {
        Object.assign(config.scoreBox, buttonData.scoreBox);
      }
      if (buttonData.actionButtonText !== undefined) {
        config.text.actionButtonText = buttonData.actionButtonText;
      }
      if (buttonData.actionButtonSize !== undefined) {
        config.text.actionButtonSize = buttonData.actionButtonSize;
      }
      if (buttonData.ctaText !== undefined) {
        config.text.ctaText = buttonData.ctaText;
      }
      if (buttonData.ctaSize !== undefined) {
        config.text.ctaSize = buttonData.ctaSize;
      }

      // Update all active scenes
      game.scene.getScenes(true).forEach(scene => {
        if (scene.updateButtons) {
          scene.updateButtons(buttonData);
        }
      });
    }

    // NOTE: UPDATE_FONTS is now handled by inline handlers in each scene's create() method
    // This follows the Lane Racer pattern for reliable real-time font switching

    // Centralized UPDATE_LAYOUT handler - calls updateLayout() on all active scenes
    if (event.data.type === 'UPDATE_LAYOUT') {
      const layoutData = event.data.data;
      console.log('[CFI] Layout update received:', layoutData);

      // Update config
      Object.assign(window.GAME_CONFIG.layout, layoutData);

      // Update all active scenes
      game.scene.getScenes(true).forEach(scene => {
        if (scene.updateLayout) {
          scene.updateLayout(layoutData);
        }
      });
    }

    // Centralized UPDATE_ASSET_SCALES handler - calls updateAssetScales() on all active scenes
    if (event.data.type === 'UPDATE_ASSET_SCALES') {
      const scaleData = event.data.data;
      console.log('[CFI] Asset scale update received:', scaleData);

      // Update config
      Object.assign(window.GAME_CONFIG.assetScales, scaleData);

      // Update all active scenes
      game.scene.getScenes(true).forEach(scene => {
        if (scene.updateAssetScales) {
          scene.updateAssetScales(scaleData);
        }
      });
    }

    // Centralized UPDATE_BACKGROUND handler - calls updateBackground() on all active scenes
    if (event.data.type === 'UPDATE_BACKGROUND') {
      const bgData = event.data.data;
      console.log('[CFI] Background update received:', bgData);

      // Update config
      Object.assign(window.GAME_CONFIG.background, bgData);

      // Update all active scenes
      game.scene.getScenes(true).forEach(scene => {
        if (scene.updateBackground) {
          scene.updateBackground(bgData);
        }
      });
    }

    // Centralized UPDATE_TEXTS handler - calls updateTexts() on all active scenes
    if (event.data.type === 'UPDATE_TEXTS') {
      const textData = event.data.data;
      console.log('[CFI] Text update received:', textData);

      // Update config
      Object.assign(window.GAME_CONFIG.text, textData);

      // Update all active scenes
      game.scene.getScenes(true).forEach(scene => {
        if (scene.updateTexts) {
          scene.updateTexts(textData);
        }
      });
    }
  });

  return game;
};
