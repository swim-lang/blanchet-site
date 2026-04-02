/* ============================================
   BLANCHET — Main Scripts
   ============================================ */

const isDesktop = () => window.innerWidth >= 768;

// Lock service card heights to prevent jerk on hover (desktop only)
window.addEventListener('DOMContentLoaded', () => {
  if (isDesktop()) {
    document.querySelectorAll('.service-card').forEach(card => {
      card.style.height = card.offsetHeight + 'px';
    });
  }
});

// Custom dot cursor (skip on touch)
const cursor = document.querySelector('.cursor');
if (cursor && window.matchMedia('(hover: hover)').matches) {
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX - 4 + 'px';
    cursor.style.top = e.clientY - 4 + 'px';
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
const windowText = document.querySelector('.window-text');
const windowHint = document.querySelector('.window-scroll-hint');
if (windowSection && windowSquare) {
  window.addEventListener('scroll', () => {
    const rect = windowSection.getBoundingClientRect();
    const sectionHeight = windowSection.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / sectionHeight, 0), 1);

    // Square grows — cap to prevent horizontal overflow
    const minSize = 200;
    const rawMax = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    const maxSize = Math.min(rawMax, window.innerWidth * 1.1);
    const size = minSize + (maxSize - minSize) * Math.pow(progress, 0.6);
    windowSquare.style.width = size + 'px';
    windowSquare.style.height = size + 'px';

    const textOpacity = Math.max(1 - progress * 3, 0);
    windowText.style.opacity = textOpacity;
    windowHint.style.opacity = textOpacity;

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
    const inView = isDesktop()
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

// Horizontal scroll-lock for Practice Areas (desktop only)
const wrapper = document.querySelector('.practice-areas-wrapper');
const track = document.querySelector('.practice-track');

function initPracticeScroll() {
  if (!wrapper || !track) return;

  if (isDesktop()) {
    const leftPanel = document.querySelector('.practice-left');
    const leftWidth = leftPanel ? leftPanel.offsetWidth : 300;
    const totalTrackWidth = track.scrollWidth;
    const viewportWidth = window.innerWidth - leftWidth;
    const maxScroll = Math.max(totalTrackWidth - viewportWidth, 0);

    const neededHeight = maxScroll + window.innerHeight + window.innerHeight * 0.8;
    wrapper.style.height = neededHeight + 'px';

    function updateHorizontalScroll() {
      if (!isDesktop()) return;
      const rect = wrapper.getBoundingClientRect();
      const wrapperHeight = wrapper.offsetHeight - window.innerHeight;
      if (wrapperHeight <= 0) return;
      const rawProgress = Math.min(Math.max(-rect.top / wrapperHeight, 0), 1);
      const scrollProgress = Math.min(rawProgress / 0.75, 1);
      track.style.transform = `translateX(${-scrollProgress * maxScroll}px)`;
    }
    window.addEventListener('scroll', updateHorizontalScroll, { passive: true });
    updateHorizontalScroll();
  } else {
    // Mobile: reset
    wrapper.style.height = 'auto';
    track.style.transform = 'none';
  }
}
initPracticeScroll();

// Stacking cards scroll-lock for Approach section (desktop only)
const processWrapper = document.querySelector('.process-wrapper');
const stepCards = document.querySelectorAll('.step-card');

function initStackingCards() {
  if (!processWrapper || !stepCards.length) return;

  if (isDesktop()) {
    const cardCount = stepCards.length;
    const segmentSize = 1 / (cardCount + 1);
    processWrapper.style.height = (cardCount * 80 + 100) + 'vh';

    function updateStackingCards() {
      if (!isDesktop()) return;
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
    }

    window.addEventListener('scroll', updateStackingCards, { passive: true });
    updateStackingCards();
  } else {
    // Mobile: reset cards to normal flow
    processWrapper.style.height = 'auto';
    stepCards.forEach(card => {
      card.style.transform = 'none';
      card.style.opacity = '1';
      card.style.position = 'static';
    });
  }
}
initStackingCards();

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

// Who We Represent accordion
document.querySelectorAll('.wwr-row[data-accordion]').forEach(row => {
  const header = row.querySelector('.wwr-row-header');
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
});

// Debounced resize handler to reinitialize viewport-dependent features
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    initPracticeScroll();
    initStackingCards();
  }, 250);
});
