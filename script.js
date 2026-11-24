/**
 * Treefalls - script.js
 * Frame sequence progressive loader, automatic video playback, section scroll animations, and interactive UI
 * Fully responsive with mobile hamburger menu
 */

document.addEventListener('DOMContentLoaded', () => {
  const TOTAL_FRAMES = 94; // Exact total frame count extracted from building.mp4
  const PRIORITY_FRAMES = 20; // Preload the first 20 frames first, the rest in the background

  const canvas = document.getElementById('building');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const loader = document.getElementById('loader');
  const loaderProgress = document.getElementById('loader-progress');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const indicatorText = document.querySelector('.indicator-text');
  const indicatorDot = document.querySelector('.indicator-dot');

  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Register GSAP ScrollTrigger safely
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Preloaded frames array (index 0 to 93)
  const images = new Array(TOTAL_FRAMES);
  let priorityLoadedCount = 0;
  let isPriorityReady = false;
  let backgroundStarted = false;
  let autoplayTween = null;
  let isVideoPlaying = true;
  let introPlayed = false;

  // Animation state tracked by GSAP
  const buildingAnimation = {
    frame: 0
  };

  /**
   * Helper to format frame path: frames/f_001.webp ... frames/f_094.webp
   */
  function getFramePath(index) {
    const padded = String(index).padStart(3, '0');
    return `frames/f_${padded}.webp`;
  }

  /**
   * Draw specific frame onto canvas with retina resolution & correct aspect ratio
   * Includes progressive fallback if user seeks to a frame still loading in background.
   */
  function renderFrame(frameIndex) {
    const targetIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameIndex)));
    let img = images[targetIndex];

    // Progressive fallback: find the closest already loaded frame
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let i = targetIndex - 1; i >= 0; i--) {
        if (images[i] && images[i].complete && images[i].naturalWidth > 0) {
          img = images[i];
          break;
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) {
      return;
    }

    const cw = canvas.width;
    const ch = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, cw, ch);

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate aspect ratio (contain fit)
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const scale = Math.min(cw / imgWidth, ch / imgHeight);

    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const offsetX = (cw - drawWidth) / 2;
    const offsetY = (ch - drawHeight) / 2;

    ctx.drawImage(img, 0, 0, imgWidth, imgHeight, offsetX, offsetY, drawWidth, drawHeight);
  }

  /**
   * Update internal canvas resolution for sharp rendering on retina screens
   */
  function updateCanvasDimensions() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    renderFrame(buildingAnimation.frame);
  }

  /**
   * Automatic Building Construction Video Playback
   * Plays the building animation automatically when opening the landing page.
   */
  function startBuildingAutoplay() {
    updateCanvasDimensions();

    if (typeof gsap === 'undefined') {
      return;
    }

    if (autoplayTween) {
      autoplayTween.kill();
    }

    buildingAnimation.frame = 0;

    // Autoplay the 94 frames automatically over 3.92s (native 24fps duration)
    autoplayTween = gsap.to(buildingAnimation, {
      frame: TOTAL_FRAMES - 1,
      duration: 3.92,
      ease: 'none',
      repeat: -1, // loop continuously
      repeatDelay: 2.0, // hold on finished building for 2 seconds
      onUpdate: () => {
        renderFrame(buildingAnimation.frame);
      }
    });

    // Pause autoplay when hero is scrolled out of view to optimize CPU/GPU
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({
        trigger: '.hero',
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => {
          if (isVideoPlaying && autoplayTween) autoplayTween.play();
        },
        onLeave: () => {
          if (autoplayTween) autoplayTween.pause();
        },
        onEnterBack: () => {
          if (isVideoPlaying && autoplayTween) autoplayTween.play();
        },
        onLeaveBack: () => {
          if (autoplayTween) autoplayTween.pause();
        }
      });
    }

    // Toggle pause/play on canvas wrapper click
    if (canvasWrapper) {
      canvasWrapper.addEventListener('click', () => {
        if (!autoplayTween) return;

        const videoIndicator = document.querySelector('.video-indicator');
        if (isVideoPlaying) {
          autoplayTween.pause();
          isVideoPlaying = false;
          if (indicatorText) indicatorText.textContent = 'Paused';
          if (indicatorDot) indicatorDot.style.backgroundColor = '#f59e0b';
          if (videoIndicator) videoIndicator.classList.add('is-paused');
        } else {
          autoplayTween.play();
          isVideoPlaying = true;
          if (indicatorText) indicatorText.textContent = 'Auto Playing';
          if (indicatorDot) indicatorDot.style.backgroundColor = '#22c55e';
          if (videoIndicator) videoIndicator.classList.remove('is-paused');
        }
      });
    }

    // Re-render and resize canvas on window resize
    window.addEventListener('resize', () => {
      updateCanvasDimensions();
    });
  }

  /**
   * Page-load entrance animations with GSAP
   * - Navbar slides down
   * - Tag pills, headline, paragraph and buttons fade up with 0.15s stagger
   * - Bottom cards slide up last
   */
  function playPageLoadAnimation() {
    if (introPlayed) return;
    introPlayed = true;

    if (typeof gsap === 'undefined') return;

    const tl = gsap.timeline({
      defaults: {
        ease: 'power3.out'
      },
      onComplete: () => {
        // Clear inline transforms so CSS hover effects function cleanly
        gsap.set(['.navbar-wrapper', '.tag-pills', '.hero-headline', '.hero-description', '.hero-cta', '.slider-dots', '.hero-cards .info-card', '.canvas-wrapper', '.whatsapp-btn', '.contact-tab'], {
          clearProps: 'transform,opacity'
        });
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      }
    });

    // 1. Navbar slides down
    tl.from('.navbar-wrapper', {
      y: -35,
      opacity: 0,
      duration: 0.75
    })
    // 2. Tag pills, headline, paragraph, and buttons fade up staggered by 0.15s
    .from(['.tag-pills', '.hero-headline', '.hero-description', '.hero-cta', '.slider-dots'], {
      y: 28,
      opacity: 0,
      duration: 0.75,
      stagger: 0.15
    }, '-=0.4')
    // Canvas container subtle fade & scale in parallel with text
    .from('.canvas-wrapper', {
      opacity: 0,
      scale: 0.96,
      duration: 0.85
    }, '<')
    // 3. Bottom cards slide up last
    .from('.hero-cards .info-card', {
      y: 35,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12
    }, '-=0.25')
    // Floating contact controls subtle entrance
    .from(['.whatsapp-btn', '.contact-tab'], {
      opacity: 0,
      scale: 0.9,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out'
    }, '-=0.2');
  }

  /**
   * Fade-in-on-scroll animations for each content section
   * (Our Properties, Why Choose Us, How It Works, Testimonials, CTA Banner)
   */
  function initSectionScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const sections = document.querySelectorAll('.animate-section');
    sections.forEach(section => {
      const header = section.querySelector('.section-header');
      const items = section.querySelectorAll('.animate-item');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });

      if (header) {
        tl.from(header, {
          y: 35,
          opacity: 0,
          duration: 0.75,
          ease: 'power3.out'
        });
      }

      if (items.length > 0) {
        tl.from(items, {
          y: 40,
          opacity: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          clearProps: 'transform,opacity'
        }, header ? '-=0.35' : 0);
      }
    });
  }

  /**
   * Hide the loading screen with smooth fade out
   */
  function hideLoader() {
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 550);
    }
  }

  /**
   * Trigger app ready state when priority frames are preloaded
   */
  function onPriorityLoadingReady() {
    if (isPriorityReady) return;
    isPriorityReady = true;

    hideLoader();
    startBuildingAutoplay();
    initSectionScrollAnimations();
    initPropertiesMarqueeScrub();
    playPageLoadAnimation();
    startBackgroundLoading();
  }

  /**
   * Dual-Row Marquee Parallax Scroll Scrub
   * Row 1 scrubs to the right and Row 2 scrubs to the left as user scrolls down
   */
  function initPropertiesMarqueeScrub() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const propertiesSection = document.getElementById('properties');
    if (!propertiesSection) return;

    // Scrub Row 1 further to the right
    gsap.to('.track-move-right', {
      x: '+=90',
      ease: 'none',
      scrollTrigger: {
        trigger: propertiesSection,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.8
      }
    });

    // Scrub Row 2 further to the left
    gsap.to('.track-move-left', {
      x: '-=90',
      ease: 'none',
      scrollTrigger: {
        trigger: propertiesSection,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.8
      }
    });
  }

  /**
   * Load the remaining frames (21 to 94) in the background
   */
  function startBackgroundLoading() {
    if (backgroundStarted) return;
    backgroundStarted = true;

    for (let i = PRIORITY_FRAMES + 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        images[i - 1] = img;
      };
      img.onerror = () => {
        // Continue gracefully without logging errors
      };
    }
  }

  /**
   * Track progress of priority loaded images (first 20 frames)
   */
  function onPriorityImageLoaded() {
    priorityLoadedCount++;
    const progress = Math.min(100, Math.round((priorityLoadedCount / PRIORITY_FRAMES) * 100));

    if (loaderProgress) {
      loaderProgress.textContent = `${progress}%`;
    }

    // Render the very first frame immediately once available
    if (priorityLoadedCount === 1) {
      updateCanvasDimensions();
    }

    if (priorityLoadedCount >= PRIORITY_FRAMES) {
      setTimeout(() => {
        onPriorityLoadingReady();
      }, 150);
    }
  }

  // Preload priority frames (1 to 20) first
  for (let i = 1; i <= PRIORITY_FRAMES; i++) {
    const img = new Image();
    img.src = getFramePath(i);
    const index = i - 1;
    img.onload = () => {
      images[index] = img;
      onPriorityImageLoaded();
    };
    img.onerror = () => {
      onPriorityImageLoaded();
    };
  }

  // Fallback safety timeout: reveal app if priority loading takes longer than 3.5s
  setTimeout(() => {
    if (!isPriorityReady) {
      onPriorityLoadingReady();
    }
  }, 3500);

  // Interactive slider dots
  const dots = document.querySelectorAll('.slider-dots .dot');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      dots.forEach(d => {
        d.classList.remove('active');
        d.setAttribute('aria-selected', 'false');
      });
      dot.classList.add('active');
      dot.setAttribute('aria-selected', 'true');
    });
  });

  // Mobile Hamburger Menu Toggle
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = hamburgerBtn.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    });

    // Close when clicking any menu link
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (
        mobileMenu.classList.contains('open') &&
        !mobileMenu.contains(e.target) &&
        !hamburgerBtn.contains(e.target)
      ) {
        hamburgerBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      }
    });
  }
});
