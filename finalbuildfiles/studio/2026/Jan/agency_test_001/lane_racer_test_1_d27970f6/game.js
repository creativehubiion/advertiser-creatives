/**
 * LANE RACER - SHELL RACING GAME
 * Complete game implementation with all scenes
 * Based on catch-falling-items architecture with Shell F1 racing mechanics
 */

// ========================================
// TRANSITION MANAGER
// ========================================
class TransitionManager {
  constructor() {
    this.isTransitioning = false;
  }

  async playTransition(type, config) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    try {
      if (type === 'confetti') {
        await this.playConfetti(config);
      } else if (type === 'fade') {
        await this.playFade(config);
      }
    } catch (error) {
      console.error('Transition error:', error);
    } finally {
      this.isTransitioning = false;
    }
  }

  async playConfetti(config) {
    console.log('[TransitionManager] Starting confetti...');
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas || typeof confetti === 'undefined') {
      console.warn('[TransitionManager] Confetti canvas or library not found');
      return;
    }

    // Store confetti instance globally so it can be stopped when needed
    // useWorker: false allows us to clear the canvas directly when needed
    if (!window.confettiInstance) {
      window.confettiInstance = confetti.create(canvas, {
        resize: true,
        useWorker: false  // Disable workers so we can clear canvas immediately
      });
    }
    const myConfetti = window.confettiInstance;

    const colors = window.GAME_CONFIG?.colors?.confetti || ['#FBCE0C', '#DD2024', '#FFFFFF'];

    // Single burst - quick and simple like developer's version
    console.log('[TransitionManager] Playing confetti burst...');
    await myConfetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors: colors
    });

    console.log('[TransitionManager] Confetti burst complete, waiting 500ms...');
    // Very short delay before transitioning to end screen (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[TransitionManager] Confetti transition complete');
  }

  async playFade(config) {
    await new Promise(resolve => setTimeout(resolve, config.duration || 1000));
  }
}

// ========================================
// BOOT SCENE
// ========================================
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    const config = window.GAME_CONFIG;
    const fontUrl = config?.fonts?.customFontUrl;

    if (fontUrl) {
      const fontFamily = config.fonts.primary || 'CustomFont';
      const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);
      fontFace.load().then(loadedFont => {
        document.fonts.add(loadedFont);
      }).catch(error => {
        console.warn('Custom font loading failed:', error);
      });
    }
  }

  create() {
    this.scene.start('Preloader');
  }
}

// ========================================
// PRELOADER SCENE
// ========================================
class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preloader' });
  }

  preload() {
    const config = window.GAME_CONFIG;
    const customAssets = window.customAssets || {};

    // Create loading bar
    const centerX = config.canvas.width / 2;
    const centerY = config.canvas.height / 2;

    const barWidth = config.loadingBar?.width || 250;
    const barHeight = config.loadingBar?.height || 20;

    const bgColor = Phaser.Display.Color.HexStringToColor(
      config.loadingBar?.backgroundColor || '#333333'
    ).color;
    const fillColor = Phaser.Display.Color.HexStringToColor(
      config.loadingBar?.fillColor || '#FBCE0C'
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

    // Load all assets
    const assets = config.assets;

    // Background
    if (!this.textures.exists('background')) {
      const bgAsset = customAssets.background || assets.background;
      if (bgAsset) this.load.image('background', bgAsset);
    }

    // Logo
    if (!this.textures.exists('logo')) {
      const logoAsset = customAssets.logo || assets.logo;
      if (logoAsset) this.load.image('logo', logoAsset);
    }

    // Player car
    if (!this.textures.exists('character')) {
      const charAsset = customAssets.character || assets.character;
      if (charAsset) this.load.image('character', charAsset);
    }

    // Collectible (coin)
    if (!this.textures.exists('collectible')) {
      const collectAsset = customAssets.collectible || assets.collectible;
      if (collectAsset) this.load.image('collectible', collectAsset);
    }

    // Splash hero
    if (!this.textures.exists('splashHero')) {
      const splashAsset = customAssets.splashHero || assets.splashHero;
      if (splashAsset) this.load.image('splashHero', splashAsset);
    }

    // End hero
    if (!this.textures.exists('endHero')) {
      const endAsset = customAssets.endHero || assets.endHero;
      if (endAsset) this.load.image('endHero', endAsset);
    }

    // Lane Racer specific assets
    if (!this.textures.exists('road')) {
      const roadAsset = customAssets.road || assets.road;
      if (roadAsset) this.load.image('road', roadAsset);
    }

    if (!this.textures.exists('obstacle')) {
      const obstacleAsset = customAssets.obstacle || assets.obstacle;
      if (obstacleAsset) this.load.image('obstacle', obstacleAsset);
    }

    if (!this.textures.exists('finishLine')) {
      const finishAsset = customAssets.finishLine || assets.finishLine;
      if (finishAsset) this.load.image('finishLine', finishAsset);
    }

    if (!this.textures.exists('btn1')) {
      const btn1Asset = customAssets.btn1 || assets.btn1;
      if (btn1Asset) this.load.image('btn1', btn1Asset);
    }

    if (!this.textures.exists('cta')) {
      const ctaAsset = customAssets.cta || assets.cta;
      if (ctaAsset) this.load.image('cta', ctaAsset);
    }

    if (!this.textures.exists('viewdetails')) {
      const viewAsset = customAssets.viewdetails || assets.viewdetails;
      if (viewAsset) this.load.image('viewdetails', viewAsset);
    }

    // First Party Data - Age buttons
    if (!this.textures.exists('age1')) {
      const age1Asset = customAssets.age1 || 'assets/images/fpd/age1.png';
      if (age1Asset) this.load.image('age1', age1Asset);
    }
    if (!this.textures.exists('age2')) {
      const age2Asset = customAssets.age2 || 'assets/images/fpd/age2.png';
      if (age2Asset) this.load.image('age2', age2Asset);
    }
    if (!this.textures.exists('age3')) {
      const age3Asset = customAssets.age3 || 'assets/images/fpd/age3.png';
      if (age3Asset) this.load.image('age3', age3Asset);
    }
    if (!this.textures.exists('age4')) {
      const age4Asset = customAssets.age4 || 'assets/images/fpd/age4.png';
      if (age4Asset) this.load.image('age4', age4Asset);
    }
    if (!this.textures.exists('age5')) {
      const age5Asset = customAssets.age5 || 'assets/images/fpd/age5.png';
      if (age5Asset) this.load.image('age5', age5Asset);
    }
    if (!this.textures.exists('age6')) {
      const age6Asset = customAssets.age6 || 'assets/images/fpd/age6.png';
      if (age6Asset) this.load.image('age6', age6Asset);
    }

    // First Party Data - Gender buttons
    if (!this.textures.exists('genderMale')) {
      const genderMaleAsset = customAssets.genderMale || 'assets/images/fpd/genderMale.png';
      if (genderMaleAsset) this.load.image('genderMale', genderMaleAsset);
    }
    if (!this.textures.exists('genderFemale')) {
      const genderFemaleAsset = customAssets.genderFemale || 'assets/images/fpd/genderFemale.png';
      if (genderFemaleAsset) this.load.image('genderFemale', genderFemaleAsset);
    }
    if (!this.textures.exists('genderOthers')) {
      const genderOthersAsset = customAssets.genderOthers || 'assets/images/fpd/genderOthers.png';
      if (genderOthersAsset) this.load.image('genderOthers', genderOthersAsset);
    }

    // First Party Data - Background
    if (!this.textures.exists('dataCaptureBg')) {
      const bgAsset = customAssets.dataCaptureBg || 'assets/images/fpd/background.png';
      if (bgAsset) this.load.image('dataCaptureBg', bgAsset);
    }
  }

  create() {
    this.scene.start('Splash');
  }
}

// ========================================
// SPLASH SCENE
// ========================================
class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Splash' });
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
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.gameplay?.scaleFactor || 1.4;

    // Track impressions
    if (window.TrackingManager) {
      window.TrackingManager.trackImpression();
    }

    // Background
    this.createBackground();

    // Logo
    if (this.textures.exists('logo')) {
      const logoScale = (config.layout?.logoScale || 0.4) * scaleFactor;
      const logoY = height * (config.layout?.logoTopMargin || 0.125);
      const logo = this.add.image(width / 2, logoY, 'logo');
      logo.setScale(logoScale * (config.assetScales?.logo || 1));
    }

    // Instruction text
    const instructionText = config.text?.instruction || 'Maak je klaar voor de\nrace naar Zandvoort!';
    const instructionY = height * (config.layout?.instructionTopMargin || 0.25);
    const instructionSize = (config.text?.instructionSize || 45) * scaleFactor;
    const instructionColor = config.text?.instructionColor || '#4A4A4A';

    const instruction = this.add.text(width / 2, instructionY, instructionText, {
      fontFamily: this.getFontFamily(config),
      fontSize: `${instructionSize}px`,
      color: instructionColor,
      align: 'center',
      wordWrap: { width: width * 0.8 }
    });
    instruction.setOrigin(0.5);
    this.instructionText = instruction;

    // Hero car (bottom)
    if (config.layout?.showSplashHero && this.textures.exists('splashHero')) {
      const heroScale = (config.gameplay?.carTitleScale || 1.54) * scaleFactor;
      const heroY = height * (config.layout?.splashHeroYPosition || 1.05);
      const hero = this.add.image(width / 2, heroY, 'splashHero');
      hero.setScale(heroScale * (config.assetScales?.splashHero || 1));
      hero.setOrigin(0.5, 1);
    }

    // Action button
    this.actionButtonY = height * (config.layout?.actionButtonTopMargin || 0.36);
    const { buttonGraphics, buttonText } = this.createActionButton();
    this.actionButtonGraphics = buttonGraphics;
    this.actionButtonText = buttonText;

    // Listen for font updates from the editor
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

            // Recreate button with new font
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
            console.log('[SplashScene] Font being applied:', window.GAME_CONFIG.fonts.primary);
            const { buttonGraphics, buttonText } = this.createActionButton();
            this.actionButtonGraphics = buttonGraphics;
            this.actionButtonText = buttonText;
            console.log('[SplashScene] Button recreated with font:', buttonText?.style?.fontFamily || 'image button');
            if (buttonText) {
              console.log('[SplashScene] Button text color:', buttonText.style.color);
            }

            // Force refresh the text rendering
            if (buttonText) {
              buttonText.updateText();
              buttonText.setVisible(false);
              buttonText.setVisible(true);
            }

            // Force a canvas update
            this.sys.game.renderer.snapshot((snapshot) => {});

            // Update instruction text with new font
            if (this.instructionText) {
              this.instructionText.setFontFamily(data.primary);
              this.instructionText.updateText();
              console.log('[SplashScene] Instruction text font updated to:', data.primary);
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

        // Recreate action button with new config
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
      }
    });

    // Listen for background updates without scene restart
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_BACKGROUND') {
        const data = event.data.data;
        const config = window.GAME_CONFIG;
        const { width, height } = config.canvas;

        // Destroy old background overlay if exists
        if (this.backgroundOverlay) {
          this.backgroundOverlay.destroy();
          this.backgroundOverlay = null;
        }

        // Recreate background based on type
        if (data.type === 'solid') {
          const solidColor = parseInt(data.solidColor.replace('#', '0x'));
          this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
          this.backgroundOverlay.setDepth(-1);
          config.background = { ...config.background, ...data };
          console.log('[SplashScene] Background updated to solid color:', data.solidColor);
        } else if (data.type === 'gradient') {
          // Destroy existing gradient texture if it exists
          if (this.textures.exists('gradientBgSplash')) {
            this.textures.remove('gradientBgSplash');
          }

          // Recreate gradient texture
          const gradientCanvas = this.textures.createCanvas('gradientBgSplash', width, height);
          const ctx = gradientCanvas.context;
          const angleRad = (data.gradientAngle || 180) * Math.PI / 180;
          const x0 = width / 2 - Math.cos(angleRad) * width / 2;
          const y0 = height / 2 - Math.sin(angleRad) * height / 2;
          const x1 = width / 2 + Math.cos(angleRad) * width / 2;
          const y1 = height / 2 + Math.sin(angleRad) * height / 2;
          const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
          gradient.addColorStop(0, data.gradientStart);
          gradient.addColorStop(1, data.gradientEnd);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          gradientCanvas.refresh();

          this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgSplash');
          this.backgroundOverlay.setOrigin(0.5);
          this.backgroundOverlay.setDepth(-1);
          config.background = { ...config.background, ...data };
          console.log('[SplashScene] Background updated to gradient');
        } else if (data.type === 'image') {
          // For image type, just destroy the overlay and let the background image show through
          // The iframe will reload when a new background image is uploaded
          config.background = { ...config.background, ...data };
          console.log('[SplashScene] Background updated to image type');
        }
      }
    });
  }

  createBackground() {
    const config = window.GAME_CONFIG;
    const { width, height} = config.canvas;
    const bgConfig = config.background;

    // Background overlay (solid color or gradient)
    this.backgroundOverlay = null;

    if (bgConfig.type === 'solid') {
      const solidColor = parseInt(bgConfig.solidColor.replace('#', '0x'));
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(-1);
    } else if (bgConfig.type === 'gradient') {
      // Remove existing texture if it exists
      if (this.textures.exists('gradientBgSplash')) {
        this.textures.remove('gradientBgSplash');
      }

      // Create gradient using canvas
      const gradientCanvas = this.textures.createCanvas('gradientBgSplash', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 0) * Math.PI / 180;
      const x1 = width / 2 - Math.cos(angle) * width / 2;
      const y1 = height / 2 - Math.sin(angle) * height / 2;
      const x2 = width / 2 + Math.cos(angle) * width / 2;
      const y2 = height / 2 + Math.sin(angle) * height / 2;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgSplash');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(-1);
    } else if (bgConfig.type === 'image' && this.textures.exists('background')) {
      // Background image only when type is 'image'
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setDepth(-2);
    } else {
      // Fallback to camera background color
      this.cameras.main.setBackgroundColor(bgConfig.solidColor || config.canvas.backgroundColor);
    }
  }

  createActionButton() {
    const config = window.GAME_CONFIG;
    const { width } = config.canvas;
    const scaleFactor = config.gameplay?.scaleFactor || 1.4;
    const y = this.actionButtonY;

    // Check if using image button
    if (this.textures.exists('btn1')) {
      const btn = this.add.image(width / 2, y, 'btn1');
      const btnScale = config.actionButton?.scale || 1.0;
      btn.setScale(btnScale * scaleFactor);
      btn.setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.startGame();
      });

      // Add pulsating animation - animates between current scale and 1.1x
      const baseScale = btnScale * scaleFactor;
      const pulseTween = this.tweens.add({
        targets: btn,
        scale: {
          from: baseScale,
          to: baseScale * 1.1
        },
        duration: 400,
        ease: 'Linear',
        yoyo: true,
        repeat: -1
      });

      btn.on('pointerover', () => {
        pulseTween.pause();
        btn.setScale((btnScale * scaleFactor) * 1.05);
      });

      btn.on('pointerout', () => {
        btn.setScale(baseScale);
        pulseTween.resume();
      });

      this.actionButton = btn;
      return { buttonGraphics: btn, buttonText: null };
    } else {
      // Create programmatic button with dynamic sizing
      const btnConfig = config.actionButton;
      const btnText = config.text?.actionButtonText || 'Start je motoren';
      const btnSize = (config.text?.actionButtonSize || 32) * scaleFactor;

      // Create text first to measure it
      const text = this.add.text(0, 0, btnText, {
        fontFamily: this.getFontFamily(config),
        fontSize: `${btnSize}px`,
        color: btnConfig.textColor,
        fontStyle: 'bold'
      });
      text.setOrigin(0.5);

      // Calculate button dimensions based on text with padding
      const horizontalPadding = 40 * scaleFactor; // 40px padding on each side
      const verticalPadding = 20 * scaleFactor; // 20px padding top/bottom
      const btnWidth = text.width + (horizontalPadding * 2);
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
      const buttonScale = btnConfig.scale || 1.0;
      container.setScale(buttonScale);

      container.setSize(btnWidth, btnHeight);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => {
        this.startGame();
      });

      // Add pulsating animation using the button scale
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

      this.actionButton = container;
      return { buttonGraphics: container, buttonText: text };
    }
  }

  startGame() {
    if (window.TrackingManager) {
      window.TrackingManager.trackPlayableStart();
    }

    // Stop any running confetti animations immediately
    if (window.confettiInstance) {
      window.confettiInstance.reset();
    }

    // Manually clear the confetti canvas to ensure immediate visual clearing
    const confettiCanvas = document.getElementById('confetti-canvas');
    if (confettiCanvas) {
      const ctx = confettiCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    // Reset lives system when starting a new game from splash
    const config = window.GAME_CONFIG;
    const gameplay = config.gameplay;
    this.registry.set('livesRemaining', gameplay.lives ?? 3);
    this.registry.set('totalScore', 0);
    this.registry.set('skipConfetti', false);
    this.registry.set('gameOverTriggered', false);

    // Check if first party data capture is enabled and configured for afterSplash
    const fpdConfig = config.firstPartyData;
    console.log('[SplashScene] First party data config:', fpdConfig);
    const needsDataCapture = fpdConfig?.enabled &&
                             fpdConfig?.placement === 'afterSplash' &&
                             (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    console.log('[SplashScene] Needs data capture after splash:', needsDataCapture);

    if (needsDataCapture) {
      // Go to DataCapture scene first, then to Game
      console.log('[SplashScene] Starting DataCapture scene');
      this.scene.start('DataCapture', {
        nextScene: 'Game',
        placement: 'afterSplash'
      });
    } else {
      console.log('[SplashScene] Starting Game scene directly');
      this.scene.start('Game', {});
    }
  }

  handleCTA() {
    const config = window.GAME_CONFIG;
    if (window.TrackingManager) {
      window.TrackingManager.trackClick();
    }
    if (config.cta?.url) {
      window.open(config.cta.url, config.cta.target || '_blank');
    }
  }
}

// ========================================
// GAME SCENE
// ========================================
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  create(data) {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const gameplay = config.gameplay;
    const scaleFactor = gameplay.scaleFactor || 1.4;

    // Assign unique ID to this game loop - incremented on every restart
    // This allows us to ignore callbacks from previous loops
    this._gameLoopId = (this._gameLoopId || 0) + 1;
    console.log('[GameScene] New game loop started, ID:', this._gameLoopId);

    // Clear any pending scene transition timers from previous game loop
    if (this.endGameTimer) {
      this.endGameTimer.remove();
      this.endGameTimer = null;
    }

    // Check if resuming from mid-game FPD
    const isResumingMidGame = data && data.score !== undefined && data.timeElapsed !== undefined;

    // Check if this is a restart due to collision (lives system)
    // The registry will have livesRemaining set to a value LESS than total lives
    const totalLives = gameplay.lives ?? 3;
    const storedLives = this.registry.get('livesRemaining');
    const storedScore = this.registry.get('totalScore') || 0;
    const isRestartFromCollision = gameplay.collisionBehavior === 'restart' &&
                                   storedLives !== undefined &&
                                   storedLives < totalLives &&
                                   storedLives > 0;

    // Game state
    if (isResumingMidGame) {
      // Resume with saved state from FPD interruption - keep registry intact
      this.score = data.score;
      this.livesRemaining = data.livesRemaining;
      // Adjust start time to account for elapsed time
      this.gameStartTime = Date.now() - data.timeElapsed;
    } else if (isRestartFromCollision) {
      // Continuing after collision - restore lives and score from registry
      this.livesRemaining = storedLives;
      this.score = storedScore;
      this.gameStartTime = Date.now();
      console.log('[GameScene] Restart from collision - lives:', this.livesRemaining, 'score:', this.score);
    } else {
      // Fresh game start - reset registry completely
      this.registry.set('livesRemaining', totalLives);
      this.registry.set('totalScore', 0);
      this.registry.set('gameOverTriggered', false);
      this.score = 0;
      this.livesRemaining = totalLives;
      this.gameStartTime = Date.now();
    }

    this.gameDuration = gameplay.duration || 30000;
    this.currentLane = 0; // 0 = left, 1 = right
    this.isLaneSwitching = false;
    this.isBlinking = false;
    this.finishSequenceStarted = false;
    this.gameEnded = false;
    this.midGameDataCaptureShown = isResumingMidGame; // Mark as shown if resuming

    // Create background
    this.createBackground();

    // Road scrolling
    this.roadSpeed = (gameplay.roadSpeed || 18) * scaleFactor;
    this.roads = this.add.group();
    this.createRoad();

    // Lane positions
    this.leftLaneX = width * (gameplay.leftLanePosition || 0.345);
    this.rightLaneX = width * (gameplay.rightLanePosition || 0.655);

    // Player character
    const carY = height * (config.layout?.characterBottomMargin || 0.8);
    const carScale = (gameplay.carScale || 0.6) * scaleFactor;

    if (this.textures.exists('character')) {
      this.player = this.add.image(this.leftLaneX, carY, 'character');

      // Container-based scaling: maintain consistent size across different image dimensions
      if (gameplay.characterContainerSize) {
        const texture = this.player.texture.getSourceImage();
        const maxDimension = Math.max(texture.width, texture.height);
        const targetScale = (gameplay.characterContainerSize / maxDimension) * scaleFactor;
        const assetScaleMultiplier = config.assetScales?.character || 1;
        this.player.baseScale = targetScale; // Store base scale on sprite like obstacles do
        this.player.setScale(targetScale * assetScaleMultiplier);
      } else {
        // Fallback to original scaling
        this.player.baseScale = carScale; // Store base scale on sprite like obstacles do
        this.player.setScale(carScale * (config.assetScales?.character || 1));
      }
    } else {
      this.player = this.add.rectangle(this.leftLaneX, carY, 80, 120, 0xFF6600);
    }

    // Collectibles (coins)
    this.coins = this.add.group();
    this.coinSpawnTimer = 0;
    // Adjust initial spawn intervals based on road speed to maintain visual density
    const defaultRoadSpeed = 18;
    const currentRoadSpeed = gameplay.roadSpeed || 18;
    const spawnAdjustment = defaultRoadSpeed / currentRoadSpeed;
    const coinSpawnMin = (gameplay.coinSpawnMin || 600) * spawnAdjustment;
    const coinSpawnMax = (gameplay.coinSpawnMax || 1400) * spawnAdjustment;
    this.nextCoinSpawn = Phaser.Math.Between(coinSpawnMin, coinSpawnMax);

    // Enemy cars
    this.enemies = this.add.group();
    this.enemySpawnTimer = 0;
    const enemySpawnMin = (gameplay.enemySpawnMin || 1000) * spawnAdjustment;
    const enemySpawnMax = (gameplay.enemySpawnMax || 1500) * spawnAdjustment;
    this.nextEnemySpawn = Phaser.Math.Between(enemySpawnMin, enemySpawnMax);

    // Logo (top)
    if (this.textures.exists('logo')) {
      const logoScale = (config.layout?.logoScaleGame || 0.3) * scaleFactor;
      const logoY = height * 0.05;
      this.gameLogo = this.add.image(width / 2, logoY, 'logo');
      this.gameLogo.setScale(logoScale);
      this.gameLogo.setDepth(100);
    }

    // Score display
    this.createScoreDisplay();

    // Update score display to show persisted score from previous lives
    this.updateScore();

    // Initialize game state flags
    this.gameStarted = false;
    this.isPaused = false; // Flag to pause game during restart collision

    // Show how-to overlay (skip if resuming mid-game or restarting from collision)
    if (isResumingMidGame || isRestartFromCollision) {
      // Auto-start gameplay when resuming or restarting
      this.startGameplay();
    } else {
      this.showHowToOverlay();
    }

    // Input - Tap/Click
    this.input.on('pointerdown', (pointer) => {
      if (!this.gameStarted) {
        this.startGameplay();
      } else if (!this.gameEnded && !this.finishSequenceStarted) {
        this.switchLane();
      }
    });

    // Swipe detection
    this.input.on('pointerup', (pointer) => {
      if (this.swipeStartX !== undefined) {
        const swipeDelta = pointer.x - this.swipeStartX;
        if (Math.abs(swipeDelta) > 50 && !this.gameEnded && !this.finishSequenceStarted) {
          if (swipeDelta > 0 && this.currentLane === 0) {
            this.switchLane();
          } else if (swipeDelta < 0 && this.currentLane === 1) {
            this.switchLane();
          }
        }
        this.swipeStartX = undefined;
      }
    });

    this.input.on('pointerdown', (pointer) => {
      this.swipeStartX = pointer.x;
    });

    // Keyboard controls
    this.input.keyboard.on('keydown-LEFT', () => {
      if (this.gameStarted && !this.gameEnded && !this.finishSequenceStarted && this.currentLane === 1) {
        this.switchLane();
      }
    });

    this.input.keyboard.on('keydown-RIGHT', () => {
      if (this.gameStarted && !this.gameEnded && !this.finishSequenceStarted && this.currentLane === 0) {
        this.switchLane();
      }
    });

    this.input.keyboard.on('keydown-A', () => {
      if (this.gameStarted && !this.gameEnded && !this.finishSequenceStarted && this.currentLane === 1) {
        this.switchLane();
      }
    });

    this.input.keyboard.on('keydown-D', () => {
      if (this.gameStarted && !this.gameEnded && !this.finishSequenceStarted && this.currentLane === 0) {
        this.switchLane();
      }
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      if (!this.gameStarted) {
        this.startGameplay();
      } else if (this.gameStarted && !this.gameEnded && !this.finishSequenceStarted) {
        this.switchLane();
      }
    });

    // Listen for font updates from the editor
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

            if (this.scoreText) {
              this.scoreText.setFontFamily(data.primary);
              this.scoreText.updateText();
            }
            if (this.howtoInstructionText) {
              this.howtoInstructionText.setFontFamily(data.primary);
              this.howtoInstructionText.updateText();
            }
            if (this.howtoActionText) {
              this.howtoActionText.setFontFamily(data.primary);
              this.howtoActionText.updateText();
            }
          }).catch(err => {
            console.warn('[GameScene] Font load failed:', err);
          });
        }
      }

      // Handle asset scale updates in real-time
      // REMOVED: This handler was causing duplicate scaling with index.html
      // Asset scaling is now handled entirely in index.html using baseScale
      // which provides more consistent scaling behavior
      if (event.data.type === 'UPDATE_ASSET_SCALES') {
        const scaleData = event.data.data;
        console.log('[GameScene] Asset scales received (handled by index.html):', scaleData);

        // Only update the config, don't apply scaling here
        // The index.html handler will do the actual scaling using baseScale
        if (window.GAME_CONFIG && window.GAME_CONFIG.assetScales) {
          Object.assign(window.GAME_CONFIG.assetScales, scaleData);
        }
      }
    });
  }

  createBackground() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const bgConfig = config.background;

    // Background overlay (solid color or gradient)
    this.backgroundOverlay = null;

    if (bgConfig.type === 'solid') {
      const solidColor = parseInt(bgConfig.solidColor.replace('#', '0x'));
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(-1);
    } else if (bgConfig.type === 'gradient') {
      // Remove existing texture if it exists
      if (this.textures.exists('gradientBgGame')) {
        this.textures.remove('gradientBgGame');
      }

      // Create gradient using canvas
      const gradientCanvas = this.textures.createCanvas('gradientBgGame', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 0) * Math.PI / 180;
      const x1 = width / 2 - Math.cos(angle) * width / 2;
      const y1 = height / 2 - Math.sin(angle) * height / 2;
      const x2 = width / 2 + Math.cos(angle) * width / 2;
      const y2 = height / 2 + Math.sin(angle) * height / 2;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgGame');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(-1);
    } else if (bgConfig.type === 'image' && this.textures.exists('background')) {
      // Background image only when type is 'image'
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setDepth(-2);
    } else {
      // Fallback to camera background color
      this.cameras.main.setBackgroundColor(bgConfig.solidColor || config.canvas.backgroundColor);
    }

    //Listen for background updates without scene restart
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_BACKGROUND') {
        const data = event.data.data;
        const config = window.GAME_CONFIG;
        const { width, height } = config.canvas;

        // Destroy old background overlay if exists
        if (this.backgroundOverlay) {
          this.backgroundOverlay.destroy();
          this.backgroundOverlay = null;
        }

        // Recreate background based on type
        if (data.type === 'solid') {
          const solidColor = parseInt(data.solidColor.replace('#', '0x'));
          this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
          this.backgroundOverlay.setDepth(-1);
          config.background = { ...config.background, ...data };
          console.log('[GameScene] Background updated to solid color:', data.solidColor);
        } else if (data.type === 'gradient') {
          // Destroy existing gradient texture if it exists
          if (this.textures.exists('gradientBgGame')) {
            this.textures.remove('gradientBgGame');
          }

          // Recreate gradient texture
          const gradientCanvas = this.textures.createCanvas('gradientBgGame', width, height);
          const ctx = gradientCanvas.context;
          const angleRad = (data.gradientAngle || 180) * Math.PI / 180;
          const x0 = width / 2 - Math.cos(angleRad) * width / 2;
          const y0 = height / 2 - Math.sin(angleRad) * height / 2;
          const x1 = width / 2 + Math.cos(angleRad) * width / 2;
          const y1 = height / 2 + Math.sin(angleRad) * height / 2;
          const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
          gradient.addColorStop(0, data.gradientStart);
          gradient.addColorStop(1, data.gradientEnd);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          gradientCanvas.refresh();

          this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgGame');
          this.backgroundOverlay.setOrigin(0.5);
          this.backgroundOverlay.setDepth(-1);
          config.background = { ...config.background, ...data };
          console.log('[GameScene] Background updated to gradient');
        } else if (data.type === 'image') {
          // For image type, just destroy the overlay and let the background image show through
          // The iframe will reload when a new background image is uploaded
          config.background = { ...config.background, ...data };
          console.log('[GameScene] Background updated to image type');
        }
      }
    });
  }

  createRoad() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.gameplay?.scaleFactor || 1.4;
    const roadScale = (config.gameplay?.roadScale || 0.6) * scaleFactor;

    if (!this.textures.exists('road')) return;

    const road1 = this.add.image(width / 2, 0, 'road');
    road1.setScale(roadScale);
    road1.setOrigin(0.5, 0);
    road1.setDepth(0);

    const roadHeight = road1.displayHeight;
    // Add 2px overlap to prevent gaps at high speeds
    const road2 = this.add.image(width / 2, -roadHeight + 2, 'road');
    road2.setScale(roadScale);
    road2.setOrigin(0.5, 0);
    road2.setDepth(0);

    this.roads.addMultiple([road1, road2]);
  }

  createScoreDisplay() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.gameplay?.scaleFactor || 1.4;
    const scoreBox = config.scoreBox || {};

    const scoreX = width * (config.layout?.scoreBoxLeftMargin || 0.9);
    const scoreY = height * (config.layout?.scoreBoxTopMargin || 0.1);
    const scoreSize = (config.text?.scoreSize || 40) * scaleFactor;
    const scoreScale = config.layout?.scoreBoxScale || 1.0;

    // Create temporary text to measure size (for triple digits "999")
    const tempText = this.add.text(0, 0, '999', {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${scoreSize}px`,
      fontStyle: 'bold'
    });
    const textWidth = tempText.width;
    const textHeight = tempText.height;
    tempText.destroy();

    // Calculate box size based on text with padding (handles triple digit scores)
    const padding = 20 * scaleFactor;
    const boxSize = Math.max(textWidth, textHeight) + (padding * 2);

    // Get colors and shape from scoreBox config
    const bgColor = Phaser.Display.Color.HexStringToColor(scoreBox.backgroundColor || '#FBCE0C').color;
    const borderColor = Phaser.Display.Color.HexStringToColor(scoreBox.borderColor || '#FBCE0C').color;
    const borderWidth = scoreBox.borderWidth || 3;
    const shape = scoreBox.shape || 'circle'; // 'circle' or 'square'

    // Create score box background based on shape, scaled to fit text
    const size = boxSize * scoreScale;
    const graphics = this.add.graphics();
    graphics.fillStyle(bgColor, 1);

    if (shape === 'square') {
      // Draw square
      graphics.fillRect(-size / 2, -size / 2, size, size);
      if (borderWidth > 0) {
        graphics.lineStyle(borderWidth, borderColor);
        graphics.strokeRect(-size / 2, -size / 2, size, size);
      }
    } else {
      // Draw circle (default)
      const radius = size / 2;
      graphics.fillCircle(0, 0, radius);
      if (borderWidth > 0) {
        graphics.lineStyle(borderWidth, borderColor);
        graphics.strokeCircle(0, 0, radius);
      }
    }

    this.scoreContainer = this.add.container(scoreX, scoreY);
    this.scoreContainer.add(graphics);
    this.scoreContainer.setDepth(100);

    // Store references for real-time updates
    this.scoreGraphics = graphics;
    this.scoreBoxSize = size;

    this.scoreText = this.add.text(0, 0, '0', {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${scoreSize}px`,
      color: config.text?.scoreColor || '#DD2024',
      fontStyle: 'bold'
    });
    this.scoreText.setOrigin(0.5);
    this.scoreContainer.add(this.scoreText);
  }

  showHowToOverlay() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.gameplay?.scaleFactor || 1.4;
    const fontFamily = config.fonts?.primary || 'Poppins';
    const text = config.text || {};

    // Semi-transparent overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
    overlay.setOrigin(0);
    overlay.setDepth(200);

    // Store elements for cleanup
    this.howtoElements = [overlay];

    // Instruction text - multi-line combined message (create first to measure)
    const instructionText = this.add.text(
      0, 0,
      text.howToInstruction || 'Swipe left or right to avoid obstacles\nand collect Shell V-Power coins',
      {
        fontFamily: fontFamily,
        fontSize: (text.howToInstructionSize || 28) * scaleFactor,
        color: text.howToInstructionColor || '#4A4A4A',
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: width * 0.85 }
      }
    );
    instructionText.setOrigin(0.5);

    // Action text (TAP TO START)
    const actionText = this.add.text(
      0, 0,
      text.howToAction || 'TAP TO START',
      {
        fontFamily: fontFamily,
        fontSize: (text.howToActionSize || 36) * scaleFactor,
        color: text.howToActionColor || '#DD2024',
        align: 'center',
        fontStyle: 'bold'
      }
    );
    actionText.setOrigin(0.5);

    // Calculate dynamic banner height based on text bounds
    const padding = 30;
    const textSpacing = 20;
    const bannerHeight = instructionText.height + actionText.height + (padding * 2) + textSpacing;
    const bannerY = height * (config.layout?.instructionBoxYPos || 0.75);

    // Get instruction box color from config
    const boxColor = config.gameplay?.instructionBoxColor || '#FBCE0C';
    const boxColorHex = Phaser.Display.Color.HexStringToColor(boxColor).color;

    // Create banner with dynamic height
    const banner = this.add.rectangle(
      width / 2,
      bannerY,
      width * 0.9,
      bannerHeight,
      boxColorHex
    );
    banner.setDepth(201);
    this.howtoElements.push(banner);

    // Position texts centered in banner
    const textStartY = bannerY - (bannerHeight / 2) + padding + (instructionText.height / 2);
    instructionText.setPosition(width / 2, textStartY);
    instructionText.setDepth(202);
    this.howtoElements.push(instructionText);

    actionText.setPosition(width / 2, textStartY + (instructionText.height / 2) + textSpacing + (actionText.height / 2));
    actionText.setDepth(202);
    this.howtoElements.push(actionText);

    // Store references for real-time updates
    this.howtoBanner = banner;
    this.howtoOverlay = overlay;
    this.howtoInstructionText = instructionText;
    this.howtoActionText = actionText;
  }

  startGameplay() {
    this.gameStarted = true;

    // Remove how-to overlay and all elements
    if (this.howtoElements) {
      this.howtoElements.forEach(element => {
        if (element) element.destroy();
      });
      this.howtoElements = null;
    }

    if (window.TrackingManager) {
      window.TrackingManager.trackHowToPlay();
    }
  }

  switchLane() {
    // Disable controls during finish sequence or when game ended
    if (this.isLaneSwitching || this.gameEnded || this.finishSequenceStarted) return;

    const config = window.GAME_CONFIG;
    const gameplay = config.gameplay;
    const duration = gameplay.laneSwitchDuration || 150;
    const tiltAngle = gameplay.laneTiltAngle || 0.2;

    this.isLaneSwitching = true;
    this.currentLane = this.currentLane === 0 ? 1 : 0;
    const targetX = this.currentLane === 0 ? this.leftLaneX : this.rightLaneX;

    // Smooth single tween for position
    this.tweens.add({
      targets: this.player,
      x: targetX,
      duration: duration,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.isLaneSwitching = false;
      }
    });

    // Separate smooth tilt animation (tilt while moving, return to upright)
    const tiltDuration = duration * 0.6; // Tilt happens in first 60% of movement
    const returnDuration = duration * 0.4; // Return to upright in last 40%

    this.tweens.add({
      targets: this.player,
      angle: (this.currentLane === 0 ? -tiltAngle : tiltAngle) * (180 / Math.PI),
      duration: tiltDuration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.player,
          angle: 0,
          duration: returnDuration,
          ease: 'Quad.easeIn'
        });
      }
    });
  }

  update(time, delta) {
    if (!this.gameStarted || this.gameEnded) return;

    const config = window.GAME_CONFIG;
    const gameplay = config.gameplay;
    const scaleFactor = gameplay.scaleFactor || 1.4;

    // Read roadSpeed dynamically from config for real-time updates
    this.roadSpeed = (gameplay.roadSpeed || 18) * scaleFactor;

    // If game is paused (during restart collision), skip all movement updates
    if (this.isPaused) return;

    // Update road scrolling with overlap to prevent gaps at high speeds
    this.roads.children.entries.forEach(road => {
      road.y += this.roadSpeed;
      // Add 2px overlap to prevent gaps at high speeds
      if (road.y >= config.canvas.height) {
        road.y = (road.displayHeight * -1) + 2;
      }
    });

    // Calculate spawn interval adjustment based on road speed
    // At default speed (18), intervals stay as configured
    // At slower speeds, intervals increase proportionally to maintain visual density
    // At faster speeds, intervals decrease proportionally
    const defaultRoadSpeed = 18;
    const currentRoadSpeed = gameplay.roadSpeed || 18;
    const spawnAdjustment = defaultRoadSpeed / currentRoadSpeed;

    // Spawn coins
    this.coinSpawnTimer += delta;
    if (this.coinSpawnTimer >= this.nextCoinSpawn) {
      this.spawnCoin();
      this.coinSpawnTimer = 0;
      // Read dynamically from config for real-time updates and adjust for speed
      const coinSpawnMin = (config.gameplay.coinSpawnMin || 600) * spawnAdjustment;
      const coinSpawnMax = (config.gameplay.coinSpawnMax || 1400) * spawnAdjustment;
      this.nextCoinSpawn = Phaser.Math.Between(coinSpawnMin, coinSpawnMax);
    }

    // Spawn enemies
    this.enemySpawnTimer += delta;
    if (this.enemySpawnTimer >= this.nextEnemySpawn) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
      // Adjust enemy spawn intervals for speed
      const enemySpawnMin = (gameplay.enemySpawnMin || 1000) * spawnAdjustment;
      const enemySpawnMax = (gameplay.enemySpawnMax || 1500) * spawnAdjustment;
      this.nextEnemySpawn = Phaser.Math.Between(enemySpawnMin, enemySpawnMax);
    }

    // Update coins
    this.coins.children.entries.forEach(coin => {
      coin.y += this.roadSpeed;
      if (coin.y > config.canvas.height + 100) {
        coin.destroy();
      }
    });

    // Update enemies
    const enemySpeed = this.roadSpeed * (gameplay.enemySpeedMultiplier || 0.85);
    this.enemies.children.entries.forEach(enemy => {
      enemy.y += enemySpeed;
      if (enemy.y > config.canvas.height + 100) {
        enemy.destroy();
      }
    });

    // Skip collision detection during finish sequence (score is locked)
    if (!this.finishSequenceStarted) {
      // ALWAYS check coin collisions - coins should be collected even while blinking
      this.checkCoinCollisions();

      // Only check enemy collisions when NOT blinking (invincibility during blink)
      if (!this.isBlinking) {
        this.checkEnemyCollisions();
      }
    }

    // Check game end
    const elapsed = Date.now() - this.gameStartTime;
    const remaining = this.gameDuration - elapsed;

    // Check for mid-game data capture (halfway point by time OR score)
    const fpdConfig = config.firstPartyData;
    const needsMidGameCapture = !this.midGameDataCaptureShown &&
                                 fpdConfig?.enabled &&
                                 fpdConfig?.placement === 'midGame' &&
                                 (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    // Trigger at whichever comes first: half time (15s, only if autoEndTimer) OR half target score
    const targetScore = gameplay.targetScore || 100;
    const halfTime = this.gameDuration / 2;  // 15000ms (15 seconds)
    const halfScore = targetScore / 2;       // 50 points
    // Only check time if autoEndTimer is enabled, otherwise just check score
    const midGameReached = (gameplay.autoEndTimer && elapsed >= halfTime) || this.score >= halfScore;

    if (needsMidGameCapture && midGameReached) {
      this.midGameDataCaptureShown = true;

      // Pause game - save current state
      const gameState = {
        score: this.score,
        livesRemaining: this.livesRemaining,
        timeElapsed: elapsed
      };

      // Go to DataCapture scene with game state
      this.scene.start('DataCapture', {
        nextScene: 'Game',
        placement: 'midGame',
        gameData: gameState
      });
      return; // Exit update loop
    }

    // Show finish line when target score is reached
    // OR when time is running out (only if autoEndTimer is enabled)
    const targetScoreReached = this.score >= targetScore;
    const timeRunningOut = gameplay.autoEndTimer && remaining <= 4000;

    if (!this.finishSequenceStarted && (timeRunningOut || targetScoreReached)) {
      this.startFinishLineSequence();
    }

    // Game naturally ends after finish sequence completes
    // (endGame is called at the end of the sequence)
    // If autoEndTimer is false, game continues until player loses all lives (handled in collision logic)
  }

  spawnCoin() {
    const config = window.GAME_CONFIG;
    const { height } = config.canvas;
    const gameplay = config.gameplay;
    const scaleFactor = gameplay.scaleFactor || 1.4;
    const coinScale = (gameplay.coinScale || 0.4) * scaleFactor;

    // Choose random lane that doesn't have an enemy
    const lane = Phaser.Math.Between(0, 1);
    const x = lane === 0 ? this.leftLaneX : this.rightLaneX;

    // Check if lane is safe (no enemy nearby)
    let isSafe = true;
    this.enemies.children.entries.forEach(enemy => {
      if (Math.abs(enemy.x - x) < 50 && enemy.y < 200) {
        isSafe = false;
      }
    });

    if (!isSafe) return;

    let coin;
    if (this.textures.exists('collectible')) {
      coin = this.add.image(x, -50, 'collectible');

      // Container-based scaling: maintain consistent size across different image dimensions
      if (gameplay.collectibleContainerSize) {
        const texture = coin.texture.getSourceImage();
        const maxDimension = Math.max(texture.width, texture.height);
        const targetScale = (gameplay.collectibleContainerSize / maxDimension) * scaleFactor;
        coin.baseScale = targetScale; // Store base scale for real-time updates
        coin.setScale(targetScale * (config.assetScales?.collectible || 1));
      } else {
        // Fallback to original scaling
        coin.baseScale = coinScale; // Store base scale for real-time updates
        coin.setScale(coinScale * (config.assetScales?.collectible || 1));
      }

      coin.setDepth(11); // Coins render ABOVE enemy cars (depth 1)
    } else {
      coin = this.add.circle(x, -50, 30, 0xFFD700);
      coin.setDepth(11);
    }

    // Store lane data for collision checking
    coin.setData('lane', lane);

    this.coins.add(coin);
  }

  spawnEnemy() {
    const config = window.GAME_CONFIG;
    const gameplay = config.gameplay;
    const scaleFactor = gameplay.scaleFactor || 1.4;
    const carScale = (gameplay.carScale || 0.6) * scaleFactor;

    // Choose random lane
    const lane = Phaser.Math.Between(0, 1);
    const x = lane === 0 ? this.leftLaneX : this.rightLaneX;

    let enemy;
    if (this.textures.exists('obstacle')) {
      enemy = this.add.image(x, -100, 'obstacle');

      // Container-based scaling: maintain consistent size across different image dimensions
      if (gameplay.obstacleContainerSize) {
        const texture = enemy.texture.getSourceImage();
        const maxDimension = Math.max(texture.width, texture.height);
        const targetScale = (gameplay.obstacleContainerSize / maxDimension) * scaleFactor;
        enemy.baseScale = targetScale; // Store base scale for real-time updates
        enemy.setScale(targetScale * (config.assetScales?.obstacle || 1));
      } else {
        // Fallback to original scaling
        enemy.baseScale = carScale; // Store base scale for real-time updates
        enemy.setScale(carScale * (config.assetScales?.obstacle || 1));
      }
    } else {
      enemy = this.add.rectangle(x, -100, 80, 120, 0x888888);
    }

    // Store lane data for collision checking
    enemy.setData('lane', lane);

    this.enemies.add(enemy);
  }

  startFinishLineSequence() {
    console.log('[Game] Starting dramatic finish line sequence');
    this.finishSequenceStarted = true;

    // Lock the final score - prevent any further score changes during finish animation
    this.finalScore = this.score;
    console.log('[Game] Final score locked:', this.finalScore);

    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const gameplay = config.gameplay;
    const scaleFactor = gameplay.scaleFactor || 1.4;

    // Clear collision blink effect and ensure player is visible
    this.isBlinking = false;
    if (this.player) {
      this.player.setVisible(true);
      this.player.setAlpha(1);
    }

    // Stop spawning new obstacles and coins
    this.time.removeAllEvents();

    // Clear all enemy cars
    this.enemies.children.entries.forEach(enemy => enemy.destroy());
    this.enemies.clear(true, true);

    // Clear all coins
    this.coins.children.entries.forEach(coin => coin.destroy());
    this.coins.clear(true, true);

    // Hide the logo to prevent overlap with finish line
    if (this.gameLogo) {
      this.gameLogo.setVisible(false);
    }

    // Create finish line above the screen
    if (this.textures.exists('finishLine')) {
      this.finishLine = this.add.image(width / 2, -100, 'finishLine');
      const finishScale = (gameplay.finishLineScale || 0.4) * scaleFactor;
      this.finishLine.setScale(finishScale);
      this.finishLine.setDepth(1);

      // Move the finish line into view
      this.tweens.add({
        targets: this.finishLine,
        y: 150, // Position slightly above center
        duration: 500,
        ease: 'Power2'
      });
    }

    // Center the car horizontally
    const centerX = width / 2;
    this.tweens.add({
      targets: this.player,
      x: centerX,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        // Move car up to cross finish line
        this.tweens.add({
          targets: this.player,
          y: -this.player.displayHeight * 1.2, // Move above screen
          duration: 1500,
          ease: 'Power2',
          onComplete: () => {
            console.log('[Game] Car crossed finish line!');

            // Short delay before transitioning (store reference to clear on restart)
            this.endGameTimer = this.time.delayedCall(500, () => {
              // Transition to end scene
              this.endGame();
            });
          }
        });
      }
    });
  }

  checkCoinCollisions() {
    const config = window.GAME_CONFIG;
    const gameplay = config.gameplay;

    // ALWAYS check coin collisions - coins should vanish instantly when touching car
    // This includes during lane switching and blinking to prevent visual glitches

    this.coins.children.entries.forEach(coin => {
      // Calculate actual player X position (even during lane switch animation)
      const playerX = this.player.x;
      const coinX = coin.x;

      // Match developer's collision bounds (90% hitbox)
      const playerHitboxScale = 0.9; // 90% of sprite size
      const coinHitboxScale = 0.9;   // 90% of sprite size

      const playerHalfHeight = (this.player.displayHeight / 2) * playerHitboxScale;
      const playerHalfWidth = (this.player.displayWidth / 2) * playerHitboxScale;
      const coinHalfHeight = (coin.displayHeight / 2) * coinHitboxScale;
      const coinHalfWidth = (coin.displayWidth / 2) * coinHitboxScale;

      // Get bounds for each sprite (tightened hitbox)
      const playerTop = this.player.y - playerHalfHeight;
      const playerBottom = this.player.y + playerHalfHeight;
      const playerLeft = playerX - playerHalfWidth;
      const playerRight = playerX + playerHalfWidth;

      const coinTop = coin.y - coinHalfHeight;
      const coinBottom = coin.y + coinHalfHeight;
      const coinLeft = coinX - coinHalfWidth;
      const coinRight = coinX + coinHalfWidth;

      // Check if tightened bounding boxes overlap (pixel-accurate collision)
      // This checks ACTUAL positions, not lane data, so works during lane switches
      const isOverlapping =
        playerLeft < coinRight &&
        playerRight > coinLeft &&
        playerTop < coinBottom &&
        playerBottom > coinTop;

      if (isOverlapping) {
        // Collect coin IMMEDIATELY - destroy it the instant pixels touch
        // Read coinValue dynamically from config for real-time updates
        const coinValue = config.gameplay.coinValue || 10;
        this.score += coinValue;
        this.updateScore();
        coin.destroy(); // Vanish instantly, no visual passing over car
      }
    });
  }

  checkEnemyCollisions() {
    const config = window.GAME_CONFIG;
    const gameplay = config.gameplay;

    if (!gameplay.collisionEnabled) return;

    // Don't check collisions while switching lanes or already blinking
    if (this.isLaneSwitching || this.isBlinking) return;

    this.enemies.children.entries.forEach(enemy => {
      const enemyLane = enemy.getData('lane');

      // Only check collision if in same lane
      if (enemyLane !== this.currentLane) return;

      // Match developer's collision bounds (90% hitbox)
      const playerHitboxScale = 0.9; // 90% of sprite size
      const enemyHitboxScale = 0.9;  // 90% of sprite size

      const playerHalfHeight = (this.player.displayHeight / 2) * playerHitboxScale;
      const playerHalfWidth = (this.player.displayWidth / 2) * playerHitboxScale;
      const enemyHalfHeight = (enemy.displayHeight / 2) * enemyHitboxScale;
      const enemyHalfWidth = (enemy.displayWidth / 2) * enemyHitboxScale;

      // Get bounds for each sprite (tightened hitbox)
      const playerTop = this.player.y - playerHalfHeight;
      const playerBottom = this.player.y + playerHalfHeight;
      const playerLeft = this.player.x - playerHalfWidth;
      const playerRight = this.player.x + playerHalfWidth;

      const enemyTop = enemy.y - enemyHalfHeight;
      const enemyBottom = enemy.y + enemyHalfHeight;
      const enemyLeft = enemy.x - enemyHalfWidth;
      const enemyRight = enemy.x + enemyHalfWidth;

      // Check if tightened bounding boxes overlap (pixel-accurate collision)
      const isOverlapping =
        playerLeft < enemyRight &&
        playerRight > enemyLeft &&
        playerTop < enemyBottom &&
        playerBottom > enemyTop;

      if (isOverlapping) {
        this.handleCollision();
        enemy.destroy();
      }
    });
  }

  handleCollision() {
    const config = window.GAME_CONFIG;
    const gameplay = config.gameplay;
    const { width, height } = config.canvas;

    // Determine collision behavior - default to 'penalty' for backwards compatibility
    const behavior = gameplay.collisionBehavior || 'penalty';

    // Handle 'continue' mode - do nothing
    if (behavior === 'continue') {
      return;
    }

    // Handle 'penalty' mode - apply penalty
    if (behavior === 'penalty') {
      const penalty = gameplay.collisionPenalty || 10;
      this.score = Math.max(0, this.score - penalty);
      this.updateScore();

      // Blink effect for penalty
      this.isBlinking = true;
      const blinkDuration = gameplay.blinkDuration || 700;
      const blinkCount = 7;
      const blinkInterval = blinkDuration / blinkCount;

      let blinks = 0;
      const blinkTimer = this.time.addEvent({
        delay: blinkInterval,
        callback: () => {
          this.player.setVisible(!this.player.visible);
          blinks++;
          if (blinks >= blinkCount) {
            this.player.setVisible(true);
            this.isBlinking = false;
            blinkTimer.remove();
          }
        },
        loop: true
      });
      return;
    }

    // Handle 'restart' mode - restart the game
    if (behavior === 'restart') {
      // Decrement lives
      this.livesRemaining--;
      this.registry.set('livesRemaining', this.livesRemaining);
      // Also save the current score so it persists across restarts
      this.registry.set('totalScore', this.score);
      console.log('[GameScene] Collision! Saving state - lives:', this.livesRemaining, 'score:', this.score);

      // Freeze the entire game (stop all movement)
      this.isBlinking = true;
      this.isPaused = true; // New flag to pause game updates

      // Show floating lives remaining text
      const livesText = this.add.text(
        width / 2,
        height / 2,
        `${this.livesRemaining} ${this.livesRemaining === 1 ? 'Life' : 'Lives'} Remaining`,
        {
          fontSize: '48px',
          color: '#FFFFFF',
          fontFamily: config.fonts.primary,
          stroke: '#000000',
          strokeThickness: 6
        }
      ).setOrigin(0.5).setDepth(200);

      // Blink effect before restart - only 3 blinks
      const blinkCount = 3;
      const blinkInterval = 150; // Fast blink

      let blinks = 0;
      const blinkTimer = this.time.addEvent({
        delay: blinkInterval,
        callback: () => {
          this.player.setVisible(!this.player.visible);
          blinks++;
          if (blinks >= blinkCount * 2) { // *2 because we toggle visibility
            this.player.setVisible(true);
            this.isBlinking = false;
            this.isPaused = false;
            blinkTimer.remove();

            // Remove lives text
            livesText.destroy();

            // Check if lives are exhausted
            if (this.livesRemaining <= 0) {
              // Game over - go to end screen without confetti
              this.registry.set('gameOverTriggered', true);
              this.registry.set('skipConfetti', true);
              this.endGame();
            } else {
              // Still have lives - restart level
              this.scene.restart();
            }
          }
        },
        loop: true
      });
    }
  }

  updateScore() {
    const config = window.GAME_CONFIG;
    const scoreFormat = config.text?.scoreFormat || '{score}';
    this.scoreText.setText(scoreFormat.replace('{score}', this.score));

    // Persist total score across lives
    this.registry.set('totalScore', this.score);
  }

  endGame() {
    this.gameEnded = true;

    if (window.TrackingManager) {
      window.TrackingManager.trackPlayableComplete();
    }

    // Use locked final score if available (from finish sequence), otherwise use current score
    const finalScore = this.finalScore !== undefined ? this.finalScore : this.score;
    console.log('[Game] Ending game with final score:', finalScore);

    // Store final score in registry
    this.registry.set('totalScore', finalScore);

    // Transition to end scene
    const config = window.GAME_CONFIG;
    const transitionConfig = config.transition;

    // Check if we should skip confetti (game over from lives system)
    const skipConfetti = this.registry.get('skipConfetti');

    // Check if first party data capture is enabled and configured for beforeEnd
    const fpdConfig = config.firstPartyData;
    const needsDataCapture = fpdConfig?.enabled &&
                             fpdConfig?.placement === 'beforeEnd' &&
                             (fpdConfig?.screens?.age || fpdConfig?.screens?.gender || fpdConfig?.screens?.email);

    const transitionToScene = (targetScene) => {
      if (transitionConfig.type === 'confetti' && typeof confetti !== 'undefined' && !skipConfetti) {
        console.log('[GameScene] Starting confetti transition to:', targetScene);
        const transitionManager = new TransitionManager();
        // Store the current game loop ID - if scene restarts, this will be different
        const gameLoopId = this._gameLoopId;
        transitionManager.playTransition('confetti', transitionConfig.confetti).then(() => {
          // Check if this is still the same game loop (scene might have been restarted)
          if (this._gameLoopId !== gameLoopId) {
            console.log('[GameScene] Transition cancelled - game loop changed (scene restarted)');
            return;
          }
          // Check if scene is still active (user might have jumped to different scene)
          if (!this.scene.isActive()) {
            console.log('[GameScene] Transition cancelled - scene no longer active');
            return;
          }
          console.log('[GameScene] Confetti complete, transitioning to:', targetScene);
          this.scene.start(targetScene, { score: finalScore });
        }).catch(error => {
          console.error('[GameScene] Confetti error:', error);
          // On error, transition anyway only if still same game loop
          if (this._gameLoopId === gameLoopId) {
            this.scene.start(targetScene, { score: finalScore });
          }
        });
      } else {
        console.log('[GameScene] No confetti, direct transition to:', targetScene);
        this.scene.start(targetScene, { score: finalScore });
      }
    };

    if (needsDataCapture) {
      // Go to DataCapture scene first, then to End
      // Note: DataCapture scene will handle transition to End
      if (transitionConfig.type === 'confetti' && typeof confetti !== 'undefined' && !skipConfetti) {
        console.log('[GameScene] Starting confetti transition to DataCapture');
        const transitionManager = new TransitionManager();
        // Store the current game loop ID - if scene restarts, this will be different
        const gameLoopId = this._gameLoopId;
        transitionManager.playTransition('confetti', transitionConfig.confetti).then(() => {
          // Check if this is still the same game loop (scene might have been restarted)
          if (this._gameLoopId !== gameLoopId) {
            console.log('[GameScene] DataCapture transition cancelled - game loop changed (scene restarted)');
            return;
          }
          // Check if scene is still active (user might have jumped to different scene)
          if (!this.scene.isActive()) {
            console.log('[GameScene] DataCapture transition cancelled - scene no longer active');
            return;
          }
          console.log('[GameScene] Confetti complete, transitioning to DataCapture');
          this.scene.start('DataCapture', {
            nextScene: 'End',
            placement: 'beforeEnd'
          });
        }).catch(error => {
          console.error('[GameScene] Confetti error:', error);
          // On error, transition anyway only if still same game loop
          if (this._gameLoopId === gameLoopId) {
            this.scene.start('DataCapture', {
              nextScene: 'End',
              placement: 'beforeEnd'
            });
          }
        });
      } else {
        console.log('[GameScene] No confetti, direct transition to DataCapture');
        this.scene.start('DataCapture', {
          nextScene: 'End',
          placement: 'beforeEnd'
        });
      }
    } else {
      transitionToScene('End');
    }
  }

  handleCTA() {
    const config = window.GAME_CONFIG;
    if (window.TrackingManager) {
      window.TrackingManager.trackClick();
    }
    if (config.cta?.url) {
      window.open(config.cta.url, config.cta.target || '_blank');
    }
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
    const { width, height } = config.canvas;
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
    const { width, height} = config.canvas;

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
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000966, 0.5);
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
    const y = height - (80 * scaleFactor);  // Position from bottom with scaling

    this.dots = [];

    for (let i = 0; i < this.screens.length; i++) {
      const x = startX + i * dotSpacing;
      // Active dot is yellow (#FBCE0C), inactive dots are semi-transparent white
      const dot = this.add.circle(x, y, dotSize / 2, i === 0 ? 0xFBCE0C : 0xFFFFFF);
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
        dot.setFillStyle(0xFBCE0C);  // Active: yellow
        dot.setAlpha(1);
      } else {
        dot.setFillStyle(0xFFFFFF);  // Inactive: white
        dot.setAlpha(0.3);
      }
    });
  }

  showCurrentScreen() {
    // Clear previous screen elements
    if (this.screenElements) {
      this.screenElements.forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
    }
    this.screenElements = [];

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

    console.log('[DataCaptureScene] Canvas dimensions:', width, 'x', height);

    // Calculate vertical centering
    // Grid dimensions
    const buttonSize = width * 0.27;  // Square buttons, 27% of canvas width
    const cols = 3;
    const rows = 2;
    const verticalSpacing = height * 0.23;   // 23% spacing between rows

    // Total height of content: title + gap + buttons grid
    const titleHeight = 40 * scaleFactor;  // Font size
    const titleToButtonGap = height * 0.12;  // Increased gap between title and buttons
    const gridHeight = buttonSize * rows + verticalSpacing * (rows - 1);
    const totalContentHeight = titleHeight + titleToButtonGap + gridHeight;

    // Center the entire unit vertically
    const contentStartY = (height - totalContentHeight) / 2;

    // Title
    const title = this.add.text(width / 2, contentStartY, 'Select Your Age Range', {
      fontFamily: this.getFontFamily(config),
      fontSize: (40 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center',
      fontStyle: '600'
    }).setOrigin(0.5);
    title.setDepth(100);

    this.screenElements.push(title);

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

    console.log('[DataCaptureScene] Button layout:', { buttonSize, horizontalSpacing, verticalSpacing, startX, startY });

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

        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.selectAge(option.value));
        button.setDepth(100);
        this.screenElements.push(button);
      } else {
        // Fallback text button - create as interactive rectangle with text overlay
        const bg = this.add.rectangle(x, y, buttonSize, buttonSize, 0xFFFFFF, 0.9);
        bg.setStrokeStyle(4, 0x0033FF);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.selectAge(option.value));
        bg.setDepth(100);

        const text = this.add.text(x, y, option.label, {
          fontFamily: this.getFontFamily(config),
          fontSize: (32 * scaleFactor) + 'px',
          color: '#0033FF',
          fontStyle: '600'
        }).setOrigin(0.5);
        text.setDepth(101);

        this.screenElements.push(bg);
        this.screenElements.push(text);
      }
    });
  }

  showGenderScreen() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    // Calculate vertical centering
    const buttonSize = width * 0.27;  // Square buttons, 27% of canvas width
    const titleHeight = 40 * scaleFactor;  // Font size
    const titleToButtonGap = height * 0.12;  // Gap between title and buttons
    const totalContentHeight = titleHeight + titleToButtonGap + buttonSize;

    // Center the entire unit vertically
    const contentStartY = (height - totalContentHeight) / 2;

    // Title
    const title = this.add.text(width / 2, contentStartY, 'Select Your Gender', {
      fontFamily: this.getFontFamily(config),
      fontSize: (40 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center',
      fontStyle: '600'
    }).setOrigin(0.5);
    title.setDepth(100);

    this.screenElements.push(title);

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

        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.selectGender(option.value));
        button.setDepth(100);
        this.screenElements.push(button);
      } else {
        // Fallback text button - create as interactive rectangle with text overlay
        const bg = this.add.rectangle(x, y, buttonSize, buttonSize, 0xFFFFFF, 0.9);
        bg.setStrokeStyle(4, 0x0033FF);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.selectGender(option.value));
        bg.setDepth(100);

        const text = this.add.text(x, y, option.label, {
          fontFamily: this.getFontFamily(config),
          fontSize: (32 * scaleFactor) + 'px',
          color: '#0033FF',
          fontStyle: '600'
        }).setOrigin(0.5);
        text.setDepth(101);

        this.screenElements.push(bg);
        this.screenElements.push(text);
      }
    });
  }

  showEmailScreen() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.layout?.scaleFactor || 1.4;

    // Title - use custom email prompt text or default
    const emailPromptText = config.firstPartyData?.emailPromptText || 'Enter Your Email';
    const title = this.add.text(width / 2, height * 0.3, emailPromptText, {
      fontFamily: this.getFontFamily(config),
      fontSize: (40 * scaleFactor) + 'px',
      color: '#FFFFFF',
      align: 'center',
      fontStyle: '600',
      wordWrap: { width: width * 0.8 },  // Wrap at 80% of screen width
      lineSpacing: 10 * scaleFactor  // Add space between lines
    }).setOrigin(0.5, 0);
    title.setDepth(100);

    // Calculate actual height of text after wrapping
    const titleHeight = title.height;

    // Recalculate vertical centering with actual text height
    const titleToInputGap = height * 0.1;  // Gap between title and input
    const inputHeightCanvas = height * 0.06;   // Input height
    const inputToButtonGap = height * 0.08;  // Gap between input and button
    const buttonHeight = height * 0.06;
    const totalContentHeight = titleHeight + titleToInputGap + inputHeightCanvas + inputToButtonGap + buttonHeight;

    // Center the entire unit vertically
    const contentStartY = (height - totalContentHeight) / 2;

    // Update title position to properly centered position
    title.setY(contentStartY);

    // Store reference to email title for real-time updates
    this.emailTitleText = title;

    this.screenElements.push(title);

    // Create HTML input field for email (scaled to canvas)
    const gameCanvas = document.querySelector('canvas');
    const canvasRect = gameCanvas ? gameCanvas.getBoundingClientRect() : { left: 0, top: 0, width: width, height: height };

    // Calculate the scale ratio between canvas internal resolution and displayed size
    const scaleX = canvasRect.width / width;
    const scaleY = canvasRect.height / height;

    // Input dimensions in canvas coordinates
    const inputWidthCanvas = width * 0.6;      // 60% of canvas width
    const inputXCanvas = width / 2 - inputWidthCanvas / 2;  // Centered horizontally
    const inputYCanvas = contentStartY + titleHeight + titleToInputGap;

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

    // Validation hint text (initially hidden) - yellow for good contrast on blue background
    const hintY = inputYCanvas + inputHeightCanvas + height * 0.03;  // Small gap below input
    this.validationHint = this.add.text(width / 2, hintY, 'Please input a valid email address', {
      fontFamily: this.getFontFamily(config),
      fontSize: (24 * scaleFactor) + 'px',
      color: '#FBCE0C',
      align: 'center',
      fontStyle: '600'
    }).setOrigin(0.5);
    this.validationHint.setVisible(false);
    this.validationHint.setDepth(100);
    this.screenElements.push(this.validationHint);

    // Confirm button (scaled) - using Shell red theme color
    const buttonY = contentStartY + titleHeight + titleToInputGap + inputHeightCanvas + inputToButtonGap + buttonHeight / 2;
    const buttonWidth = width * 0.3;
    const buttonBg = this.add.rectangle(width / 2, buttonY, buttonWidth, buttonHeight, 0xDD2024); // Shell red
    buttonBg.setStrokeStyle(4, 0xFFFFFF);
    buttonBg.setDepth(100);
    buttonBg.setInteractive({ useHandCursor: true });
    buttonBg.on('pointerdown', () => this.confirmEmail());

    const buttonText = this.add.text(width / 2, buttonY, 'Confirm', {
      fontFamily: this.getFontFamily(config),
      fontSize: (32 * scaleFactor) + 'px',
      color: '#FFFFFF',
      fontStyle: '600'
    }).setOrigin(0.5);
    buttonText.setDepth(101);

    this.screenElements.push(buttonBg);
    this.screenElements.push(buttonText);
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
    const templateId = 'lane-racer';
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
    super({ key: 'End' });
  }

  init(data) {
    this.finalScore = data.score || 0;
  }

  create() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const scaleFactor = config.gameplay?.scaleFactor || 1.4;

    // Background
    this.createBackground();

    // Logo - Match developer's positioning (12.5% from top)
    if (this.textures.exists('logo')) {
      const logoScale = (config.layout?.logoScaleEnd || 0.6) * scaleFactor;
      const logoY = height * 0.125; // Developer's exact position
      const logo = this.add.image(width / 2, logoY, 'logo');
      logo.setScale(logoScale * (config.assetScales?.logo || 1));
    }

    // Title text - Match developer's layout (30% from top)
    const titleY = height * 0.3;
    const endTextSize = (config.text?.endScreenTextSize || 40) * scaleFactor;
    const endTextColor = config.text?.endScreenTextColor || '#4A4A4A';
    const endText = config.text?.endScreenText || 'Experience game advertising\nlike never before.';

    const titleText = this.add.text(
      width / 2,
      titleY,
      endText,
      {
        fontFamily: config.fonts?.primary || 'Poppins',
        fontSize: `${endTextSize}px`,
        color: endTextColor,
        align: 'center'
      }
    );
    titleText.setOrigin(0.5);
    this.endTitleText = titleText; // Store reference for CTA positioning

    // Score display - Below title
    const scoreY = titleY + 80 * scaleFactor;
    const scoreSize = (config.text?.scoreSize || 40) * scaleFactor * 1.5;
    const scoreText = this.add.text(width / 2, scoreY, this.finalScore.toString(), {
      fontFamily: config.fonts?.primary || 'Poppins',
      fontSize: `${scoreSize}px`,
      color: config.text?.scoreColor || '#DD2024',
      fontStyle: 'bold'
    });
    scoreText.setOrigin(0.5);
    this.endScoreText = scoreText;

    // Hero car (bottom) - Match developer's positioning (1.05 from top)
    if (config.layout?.showEndHero && this.textures.exists('endHero')) {
      const heroScale = (config.gameplay?.carTitleScale || 1.54) * scaleFactor;
      const heroY = height * 1.05; // Developer's exact position
      const hero = this.add.image(width / 2, heroY, 'endHero');
      hero.setScale(heroScale * (config.assetScales?.endHero || 1));
      hero.setOrigin(0.5, 1);
    }

    // CTA Button - Use config ctaButtonTopMargin for consistent positioning
    this.ctaButtonY = height * (config.layout?.ctaButtonTopMargin || 0.45);
    const { buttonGraphics, buttonText } = this.createCTAButton();
    this.ctaButtonGraphics = buttonGraphics;
    this.ctaButtonText = buttonText;

    // View details button
    if (this.textures.exists('viewdetails')) {
      const viewY = height * 0.85;
      const viewBtn = this.add.image(width / 2, viewY, 'viewdetails');
      viewBtn.setScale(scaleFactor);
      viewBtn.setInteractive({ useHandCursor: true });

      viewBtn.on('pointerdown', () => {
        this.handleCTA();
      });

      viewBtn.on('pointerover', () => {
        viewBtn.setScale(scaleFactor * 1.05);
      });

      viewBtn.on('pointerout', () => {
        viewBtn.setScale(scaleFactor);
      });
    }

    // Listen for font updates from the editor
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

            // Update title and score text
            if (this.endTitleText) {
              this.endTitleText.setFontFamily(data.primary);
              this.endTitleText.updateText();
            }
            if (this.endScoreText) {
              this.endScoreText.setFontFamily(data.primary);
              this.endScoreText.updateText();
            }

            // Recreate CTA button with new font
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

            console.log('[EndScene] Button colors before recreation:', window.GAME_CONFIG.ctaButton.backgroundColor, window.GAME_CONFIG.ctaButton.textColor);
            console.log('[EndScene] Font being applied:', window.GAME_CONFIG.fonts.primary);
            const { buttonGraphics, buttonText } = this.createCTAButton();
            this.ctaButtonGraphics = buttonGraphics;
            this.ctaButtonText = buttonText;
            console.log('[EndScene] CTA button recreated with font:', buttonText?.style?.fontFamily || 'image button');
            if (buttonText) {
              console.log('[EndScene] Button text color:', buttonText.style.color);
            }

            // Force refresh the text rendering
            if (buttonText) {
              buttonText.updateText();
              buttonText.setVisible(false);
              buttonText.setVisible(true);
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

        // Recreate CTA button with new config
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
      }
    });

    // Listen for background updates without scene restart
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_BACKGROUND') {
        const data = event.data.data;
        const config = window.GAME_CONFIG;
        const { width, height } = config.canvas;

        // Destroy old background overlay if exists
        if (this.backgroundOverlay) {
          this.backgroundOverlay.destroy();
          this.backgroundOverlay = null;
        }

        // Recreate background based on type
        if (data.type === 'solid') {
          const solidColor = parseInt(data.solidColor.replace('#', '0x'));
          this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
          this.backgroundOverlay.setDepth(-1);
          config.background = { ...config.background, ...data };
          console.log('[EndScene] Background updated to solid color:', data.solidColor);
        } else if (data.type === 'gradient') {
          // Destroy existing gradient texture if it exists
          if (this.textures.exists('gradientBgEnd')) {
            this.textures.remove('gradientBgEnd');
          }

          // Recreate gradient texture
          const gradientCanvas = this.textures.createCanvas('gradientBgEnd', width, height);
          const ctx = gradientCanvas.context;
          const angleRad = (data.gradientAngle || 180) * Math.PI / 180;
          const x0 = width / 2 - Math.cos(angleRad) * width / 2;
          const y0 = height / 2 - Math.sin(angleRad) * height / 2;
          const x1 = width / 2 + Math.cos(angleRad) * width / 2;
          const y1 = height / 2 + Math.sin(angleRad) * height / 2;
          const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
          gradient.addColorStop(0, data.gradientStart);
          gradient.addColorStop(1, data.gradientEnd);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
          gradientCanvas.refresh();

          this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgEnd');
          this.backgroundOverlay.setOrigin(0.5);
          this.backgroundOverlay.setDepth(-1);
          config.background = { ...config.background, ...data };
          console.log('[EndScene] Background updated to gradient');
        } else if (data.type === 'image') {
          // For image type, just destroy the overlay and let the background image show through
          // The iframe will reload when a new background image is uploaded
          config.background = { ...config.background, ...data };
          console.log('[EndScene] Background updated to image type');
        }
      }
    });
  }

  createBackground() {
    const config = window.GAME_CONFIG;
    const { width, height } = config.canvas;
    const bgConfig = config.background;

    // Background overlay (solid color or gradient)
    this.backgroundOverlay = null;

    if (bgConfig.type === 'solid') {
      const solidColor = parseInt(bgConfig.solidColor.replace('#', '0x'));
      this.backgroundOverlay = this.add.rectangle(width / 2, height / 2, width, height, solidColor);
      this.backgroundOverlay.setDepth(-1);
    } else if (bgConfig.type === 'gradient') {
      // Remove existing texture if it exists
      if (this.textures.exists('gradientBgEnd')) {
        this.textures.remove('gradientBgEnd');
      }

      // Create gradient using canvas
      const gradientCanvas = this.textures.createCanvas('gradientBgEnd', width, height);
      const ctx = gradientCanvas.context;

      const angle = (bgConfig.gradientAngle || 0) * Math.PI / 180;
      const x1 = width / 2 - Math.cos(angle) * width / 2;
      const y1 = height / 2 - Math.sin(angle) * height / 2;
      const x2 = width / 2 + Math.cos(angle) * width / 2;
      const y2 = height / 2 + Math.sin(angle) * height / 2;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, bgConfig.gradientStart);
      gradient.addColorStop(1, bgConfig.gradientEnd);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      gradientCanvas.refresh();

      this.backgroundOverlay = this.add.image(width / 2, height / 2, 'gradientBgEnd');
      this.backgroundOverlay.setOrigin(0.5);
      this.backgroundOverlay.setDepth(-1);
    } else if (bgConfig.type === 'image' && this.textures.exists('background')) {
      // Background image only when type is 'image'
      const bg = this.add.image(width / 2, height / 2, 'background');
      bg.setDisplaySize(width, height);
      bg.setDepth(-2);
    } else {
      // Fallback to camera background color
      this.cameras.main.setBackgroundColor(bgConfig.solidColor || config.canvas.backgroundColor);
    }
  }

  createCTAButton() {
    const config = window.GAME_CONFIG;
    const { width } = config.canvas;
    const scaleFactor = config.gameplay?.scaleFactor || 1.4;
    const y = this.ctaButtonY;

    // Check if using image button
    if (this.textures.exists('cta')) {
      const btn = this.add.image(width / 2, y, 'cta');
      const btnScale = config.ctaButton?.scale || 1.0;
      btn.setScale(btnScale * scaleFactor);
      btn.setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.handleCTA();
      });

      // Add pulsating animation
      const baseScale = btnScale * scaleFactor;
      const pulseTween = this.tweens.add({
        targets: btn,
        scale: {
          from: baseScale,
          to: baseScale * 1.1
        },
        duration: 400,
        ease: 'Linear',
        yoyo: true,
        repeat: -1
      });

      btn.on('pointerover', () => {
        pulseTween.pause();
        btn.setScale((btnScale * scaleFactor) * 1.05);
      });

      btn.on('pointerout', () => {
        btn.setScale(baseScale);
        pulseTween.resume();
      });

      this.ctaButton = btn;
      return { buttonGraphics: btn, buttonText: null };
    } else {
      // Create text first to measure bounds
      const btnText = config.text?.ctaText || 'DOWNLOAD NOW';
      const btnSize = (config.text?.ctaSize || 24) * scaleFactor;
      const text = this.add.text(0, 0, btnText, {
        fontFamily: config.fonts?.primary || 'Poppins',
        fontSize: `${btnSize}px`,
        color: config.ctaButton?.textColor || '#FFFFFF',
        fontStyle: 'bold'
      });
      text.setOrigin(0.5);

      // Calculate button size based on text with padding
      const padding = 30 * scaleFactor;
      const btnWidth = text.width + (padding * 2);
      const btnHeight = text.height + (padding * 1.2);
      const btnConfig = config.ctaButton;

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
      const buttonScale = btnConfig.scale || 1.0;
      container.setScale(buttonScale);

      container.setSize(btnWidth, btnHeight);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerdown', () => {
        this.handleCTA();
      });

      // Add pulsating animation using the button scale
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

      this.ctaButton = container;
      return { buttonGraphics: container, buttonText: text };
    }
  }

  handleCTA() {
    const config = window.GAME_CONFIG;
    if (window.TrackingManager) {
      window.TrackingManager.trackClick();
    }
    if (config.cta?.url) {
      window.open(config.cta.url, config.cta.target || '_blank');
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
  scene: [BootScene, PreloaderScene, SplashScene, GameScene, DataCaptureScene, EndScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};

// The iframe isolation code runs in index.html BEFORE Phaser loads
// This prevents Phaser from adding event listeners to the parent window/document

// Function to initialize game after fonts are ready
function initializeGame() {
  window.gameInstance = new Phaser.Game(gameConfig);
}

// Wait for fonts to be ready before creating the game
const fontFamily = window.GAME_CONFIG?.fonts?.primary || 'Poppins';

// Ensure the font is loaded before starting the game
if (fontFamily && fontFamily !== 'CustomFont') {
  // For Google Fonts, ensure it's loaded
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      // Additional check to ensure the specific font is loaded
      const fontCheck = `16px "${fontFamily}"`;
      if (document.fonts.check(fontCheck)) {
        console.log('[Game] Font ready:', fontFamily);
        initializeGame();
      } else {
        // Try to load the font explicitly
        document.fonts.load(fontCheck).then(() => {
          console.log('[Game] Font loaded:', fontFamily);
          initializeGame();
        }).catch(() => {
          console.warn('[Game] Font load failed, starting anyway');
          initializeGame();
        });
      }
    });
  } else {
    // Fallback for older browsers
    setTimeout(initializeGame, 100);
  }
} else {
  // Custom font or no font specified
  initializeGame();
}

// Scene jumping support for editor
window.addEventListener('message', (event) => {
  if (event.data.type === 'JUMP_TO_SCENE') {
    const sceneName = event.data.data?.scene || event.data.payload?.scene;
    console.log('[Game] Jumping to scene:', sceneName);

    if (!sceneName || !window.gameInstance) return;

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

    // Reset lives system when jumping to Splash or Game scene
    if (sceneName === 'Splash' || sceneName === 'Game') {
      const config = window.GAME_CONFIG;
      const gameplay = config.gameplay;
      if (window.gameInstance.registry) {
        window.gameInstance.registry.set('livesRemaining', gameplay.lives ?? 3);
        window.gameInstance.registry.set('totalScore', 0);
        window.gameInstance.registry.set('skipConfetti', false);
        window.gameInstance.registry.set('gameOverTriggered', false);
        console.log('[Game] Lives system reset for scene jump');
      }
    }

    // Stop confetti when jumping to End or DataCapture scene
    if (sceneName === 'End' || sceneName === 'DataCapture') {
      if (window.gameInstance.registry) {
        window.gameInstance.registry.set('skipConfetti', true);
        console.log('[Game] Confetti disabled for direct jump to', sceneName);
      }
    }

    // Check if the requested scene exists and is already running
    const targetScene = window.gameInstance.scene.getScene(sceneName);

    if (!targetScene) {
      console.warn('[Game] Scene not found:', sceneName);
      return;
    }

    const isAlreadyRunning = targetScene.scene.isActive();

    if (isAlreadyRunning) {
      // If already running, restart the scene
      console.log('[Game] Restarting scene:', sceneName);

      // Clear registry when restarting Splash or Game to ensure fresh game starts
      if (sceneName === 'Splash' || sceneName === 'Game') {
        const config = window.GAME_CONFIG;
        const gameplay = config.gameplay;
        window.gameInstance.registry.set('livesRemaining', gameplay.lives ?? 3);
        window.gameInstance.registry.set('totalScore', 0);
        window.gameInstance.registry.set('skipConfetti', false);
        window.gameInstance.registry.set('gameOverTriggered', false);
        console.log('[Game] Registry cleared for fresh start');
      }

      targetScene.scene.restart({});
    } else {
      // Stop all running scenes
      window.gameInstance.scene.scenes.forEach(scene => {
        if (scene.scene.isActive()) {
          console.log('[Game] Stopping scene:', scene.scene.key);
          scene.scene.stop();
        }
      });

      // Clear registry when starting Splash or Game to ensure fresh game starts
      if (sceneName === 'Splash' || sceneName === 'Game') {
        const config = window.GAME_CONFIG;
        const gameplay = config.gameplay;
        window.gameInstance.registry.set('livesRemaining', gameplay.lives ?? 3);
        window.gameInstance.registry.set('totalScore', 0);
        window.gameInstance.registry.set('skipConfetti', false);
        window.gameInstance.registry.set('gameOverTriggered', false);
        console.log('[Game] Registry cleared for fresh start');
      }

      // Start the requested scene
      console.log('[Game] Starting scene:', sceneName);
      window.gameInstance.scene.start(sceneName, {});
    }
  }

  // Handle custom asset updates
  if (event.data.type === 'UPDATE_ASSETS') {
    console.log('[Game] Custom assets updated, storing and restarting current scene');
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

    // Find the currently active scene
    const activeScene = window.gameInstance.scene.scenes.find(scene => scene.scene.isActive());
    if (activeScene) {
      const sceneName = activeScene.scene.key;
      console.log('[Game] Restarting scene to load new assets:', sceneName);

      // Small delay to ensure texture data is ready before restart
      setTimeout(() => {
        console.log('[Game] Scene restarting NOW - button colors:', window.GAME_CONFIG.actionButton.backgroundColor);
        activeScene.scene.restart();
      }, 100);
    }
  }

  // Handle clearing custom assets
  if (event.data.type === 'CLEAR_ASSETS') {
    console.log('[Game] Clearing custom assets and restarting current scene');

    // Clear custom assets
    window.__customAssets = {};

    // Find the currently active scene and restart it
    const activeScene = window.gameInstance.scene.scenes.find(scene => scene.scene.isActive());
    if (activeScene) {
      const sceneName = activeScene.scene.key;
      console.log('[Game] Restarting scene after clearing assets:', sceneName);

      setTimeout(() => {
        activeScene.scene.restart();
      }, 100);
    }
  }

  // Handle asset scale updates
});
