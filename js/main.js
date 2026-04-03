/* ============================================
   BLANCHET — Main Scripts
   ============================================ */

// Lock service card heights to prevent jerk on hover (desktop only)
window.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.service-card').forEach(card => {
      card.style.height = card.offsetHeight + 'px';
    });
  }
});

// Custom dot cursor with dark/light detection (skip on touch)
const cursor = document.querySelector('.cursor');
if (cursor && window.matchMedia('(hover: hover)').matches) {
  const darkSelectors = '.hero-left, .hero-right, .practice-areas, .partners-dark, .process-left, .window-sticky, .site-footer, .cta-banner';
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX - 6 + 'px';
    cursor.style.top = e.clientY - 6 + 'px';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.closest(darkSelectors)) {
      cursor.classList.add('light');
    } else {
      cursor.classList.remove('light');
    }
  });
}

// Scroll-up nav reveal
const scrollNav = document.querySelector('.scroll-nav');
let lastScroll = 0;
let scrollNavThreshold = window.innerHeight * 0.5;
window.addEventListener('scroll', () => {
  const current = window.scrollY;
  if (current < scrollNavThreshold) {
    scrollNav.classList.remove('visible');
  } else if (current < lastScroll - 5) {
    scrollNav.classList.add('visible');
  } else if (current > lastScroll + 5) {
    scrollNav.classList.remove('visible');
  }
  lastScroll = current;
}, { passive: true });

// Square window expand on scroll
const windowSection = document.querySelector('.window-section');
const windowSquare = document.querySelector('.window-square');
const windowBgVideo = document.querySelector('.window-video');
const windowLogo = document.querySelector('.window-logo');
if (windowSection && windowSquare) {
  window.addEventListener('scroll', () => {
    const rect = windowSection.getBoundingClientRect();
    const sectionHeight = windowSection.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / sectionHeight, 0), 1);

    const minSize = 200;
    const rawMax = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    const maxSize = Math.min(rawMax, window.innerWidth * 1.1);
    const size = minSize + (maxSize - minSize) * Math.pow(progress, 0.6);
    windowSquare.style.width = size + 'px';
    windowSquare.style.height = size + 'px';

    // Logo stays visible, fades gently near the end
    if (windowLogo) {
      const logoOpacity = Math.max(1 - progress * 1.5, 0);
      windowLogo.style.opacity = logoOpacity;
    }

    if (progress > 0.7) {
      windowBgVideo.style.opacity = (progress - 0.7) / 0.3;
    } else {
      windowBgVideo.style.opacity = 0;
    }
  }, { passive: true });
}

// Badge fade-in on scroll
const badges = document.querySelectorAll('.section-label, .partners-header .label, .practice-left .label, .step-label, .news-card .cat');
const badgeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      badgeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
badges.forEach(b => badgeObserver.observe(b));

// Staggered fade-in for practice cards
const practiceCards = document.querySelectorAll('.practice-card');
let lastScrollCheck = 0;
function checkCardVisibility() {
  practiceCards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    const inView = window.innerWidth >= 768
      ? (rect.left < window.innerWidth && rect.right > 0)
      : (rect.top < window.innerHeight && rect.bottom > 0);
    if (inView && !card.classList.contains('visible')) {
      setTimeout(() => card.classList.add('visible'), i * 120);
    }
  });
}
window.addEventListener('scroll', () => {
  if (Date.now() - lastScrollCheck > 100) {
    lastScrollCheck = Date.now();
    checkCardVisibility();
  }
}, { passive: true });
checkCardVisibility();

// ============================================
// Horizontal scroll-lock for Practice Areas
// ============================================
const practiceWrapper = document.querySelector('.practice-areas-wrapper');
const practiceTrack = document.querySelector('.practice-track');

function setupPracticeScroll() {
  if (!practiceWrapper || !practiceTrack) return;
  if (window.innerWidth < 768) {
    practiceWrapper.style.height = 'auto';
    practiceTrack.style.transform = 'none';
    return;
  }
  const leftPanel = document.querySelector('.practice-left');
  const leftWidth = leftPanel ? leftPanel.offsetWidth : 420;
  const totalTrackWidth = practiceTrack.scrollWidth;
  const viewportWidth = window.innerWidth - leftWidth;
  const maxScroll = Math.max(totalTrackWidth - viewportWidth, 0);
  const neededHeight = maxScroll + window.innerHeight + window.innerHeight * 0.8;
  practiceWrapper.style.height = neededHeight + 'px';
  return maxScroll;
}

let practiceMaxScroll = setupPracticeScroll();

window.addEventListener('scroll', () => {
  if (!practiceWrapper || !practiceTrack || window.innerWidth < 768) return;
  const rect = practiceWrapper.getBoundingClientRect();
  const wrapperHeight = practiceWrapper.offsetHeight - window.innerHeight;
  if (wrapperHeight <= 0) return;
  const rawProgress = Math.min(Math.max(-rect.top / wrapperHeight, 0), 1);
  const scrollProgress = Math.min(rawProgress / 0.75, 1);
  practiceTrack.style.transform = `translateX(${-scrollProgress * practiceMaxScroll}px)`;
}, { passive: true });

// ============================================
// Stacking cards scroll-lock for Approach
// ============================================
const processWrapper = document.querySelector('.process-wrapper');
const stepCards = document.querySelectorAll('.step-card');

function setupStackingCards() {
  if (!processWrapper || !stepCards.length) return;
  if (window.innerWidth < 768) {
    processWrapper.style.height = 'auto';
    stepCards.forEach(card => {
      card.style.transform = 'none';
      card.style.opacity = '1';
    });
    return;
  }
  const cardCount = stepCards.length;
  processWrapper.style.height = (cardCount * 80 + 100) + 'vh';
}

setupStackingCards();

window.addEventListener('scroll', () => {
  if (!processWrapper || !stepCards.length || window.innerWidth < 768) return;
  const cardCount = stepCards.length;
  const segmentSize = 1 / (cardCount + 1);
  const rect = processWrapper.getBoundingClientRect();
  const wrapperHeight = processWrapper.offsetHeight - window.innerHeight;
  if (wrapperHeight <= 0) return;
  const progress = Math.min(Math.max(-rect.top / wrapperHeight, 0), 1);

  stepCards.forEach((card, i) => {
    const cardStart = i * segmentSize;
    const cardEnd = (i + 1) * segmentSize;
    const cardProgress = Math.min(Math.max((progress - cardStart) / (cardEnd - cardStart), 0), 1);

    const startY = 110;
    const endY = i * 6;
    const y = startY - (startY - endY) * cardProgress;

    card.style.transform = `translateY(${y}%)`;
    const fadeProgress = Math.min(cardProgress / 0.3, 1);
    card.style.opacity = fadeProgress;
    card.style.zIndex = i + 1;
  });
}, { passive: true });

// Subtle parallax on scroll
const parallaxImages = document.querySelectorAll('[data-parallax]');
const newsImages = document.querySelectorAll('.news-img img');

function updateParallax() {
  parallaxImages.forEach(img => {
    const speed = parseFloat(img.dataset.parallax) || 0.1;
    const rect = img.parentElement.getBoundingClientRect();
    const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
    img.style.transform = `translateY(${offset}px)`;
  });

  newsImages.forEach(img => {
    const rect = img.closest('.news-img').getBoundingClientRect();
    const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * 0.08;
    img.style.transform = `translateY(${offset}px)`;
  });
}

window.addEventListener('scroll', updateParallax, { passive: true });
updateParallax();

// Who We Represent accordion — hover on desktop, click on mobile
document.querySelectorAll('.wwr-row[data-accordion]').forEach(row => {
  const header = row.querySelector('.wwr-row-header');
  if (window.innerWidth >= 768) {
    row.addEventListener('mouseenter', () => {
      document.querySelectorAll('.wwr-row.open').forEach(r => r.classList.remove('open'));
      row.classList.add('open');
    });
  } else {
    header.addEventListener('click', () => {
      const isOpen = row.classList.contains('open');
      const headerRect = header.getBoundingClientRect();
      const headerTop = headerRect.top + window.scrollY;
      document.querySelectorAll('.wwr-row.open').forEach(r => r.classList.remove('open'));
      if (!isOpen) row.classList.add('open');
      requestAnimationFrame(() => {
        const newHeaderTop = header.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, window.scrollY + (newHeaderTop - headerTop));
      });
    });
  }
});

// Page transition curtain
const curtain = document.querySelector('.page-curtain');
if (curtain) {
  // Reveal on load — curtain starts opaque, fades away
  window.addEventListener('load', () => {
    requestAnimationFrame(() => curtain.classList.add('reveal'));
  });
  // Also reveal quickly if load event already fired
  if (document.readyState === 'complete') {
    requestAnimationFrame(() => curtain.classList.add('reveal'));
  }
  // Exit on internal link click — curtain fades in, then navigate
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('javascript')) return;
    e.preventDefault();
    curtain.classList.remove('reveal');
    curtain.classList.add('exit');
    setTimeout(() => { window.location.href = href; }, 350);
  });
}

// Recalculate on resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    practiceMaxScroll = setupPracticeScroll();
    setupStackingCards();
  }, 250);
});

