/* ============================================
   BLANCHET — Main Scripts
   ============================================ */

// Lock service card heights to prevent jerk on hover
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.service-card').forEach(card => {
    card.style.height = card.offsetHeight + 'px';
  });
});

// Custom dot cursor
const cursor = document.querySelector('.cursor');
document.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX - 4 + 'px';
  cursor.style.top = e.clientY - 4 + 'px';
});

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

    // Square grows from 200px to full viewport
    const minSize = 200;
    const maxSize = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    const size = minSize + (maxSize - minSize) * Math.pow(progress, 0.6);
    windowSquare.style.width = size + 'px';
    windowSquare.style.height = size + 'px';

    // Text fades out as square grows
    const textOpacity = Math.max(1 - progress * 3, 0);
    windowText.style.opacity = textOpacity;
    windowHint.style.opacity = textOpacity;

    // Background video fades in near the end
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
    if (rect.left < window.innerWidth && rect.right > 0 && !card.classList.contains('visible')) {
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

// Horizontal scroll-lock for Practice Areas
const wrapper = document.querySelector('.practice-areas-wrapper');
const track = document.querySelector('.practice-track');
if (wrapper && track) {
  const leftPanel = document.querySelector('.practice-left');
  const leftWidth = leftPanel ? leftPanel.offsetWidth : 420;
  const totalTrackWidth = track.scrollWidth;
  const viewportWidth = window.innerWidth - leftWidth;
  const maxScroll = totalTrackWidth - viewportWidth;

  // Set wrapper height: scroll distance + viewport + dwell time on last card
  const neededHeight = maxScroll + window.innerHeight + window.innerHeight * 0.8;
  wrapper.style.height = neededHeight + 'px';

  function updateHorizontalScroll() {
    const rect = wrapper.getBoundingClientRect();
    const wrapperHeight = wrapper.offsetHeight - window.innerHeight;
    const rawProgress = Math.min(Math.max(-rect.top / wrapperHeight, 0), 1);
    // Complete horizontal scroll at 75% of the way through, then dwell on last card
    const scrollProgress = Math.min(rawProgress / 0.75, 1);
    track.style.transform = `translateX(${-scrollProgress * maxScroll}px)`;
  }
  window.addEventListener('scroll', updateHorizontalScroll, { passive: true });
  updateHorizontalScroll();
}

// Stacking cards scroll-lock for Approach section
const processWrapper = document.querySelector('.process-wrapper');
const stepCards = document.querySelectorAll('.step-card');
if (processWrapper && stepCards.length) {
  const cardCount = stepCards.length;
  // Each card gets a segment of scroll, plus dwell at the end
  const segmentSize = 1 / (cardCount + 1); // +1 for dwell on last card

  // Set wrapper height for scroll room
  processWrapper.style.height = (cardCount * 80 + 100) + 'vh';

  function updateStackingCards() {
    const rect = processWrapper.getBoundingClientRect();
    const wrapperHeight = processWrapper.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / wrapperHeight, 0), 1);

    stepCards.forEach((card, i) => {
      const cardStart = i * segmentSize;
      const cardEnd = (i + 1) * segmentSize;
      const cardProgress = Math.min(Math.max((progress - cardStart) / (cardEnd - cardStart), 0), 1);

      // Card slides up from below into its stacked position
      const startY = 110; // start 110% below
      const endY = i * 6; // stack with 6px offset each
      const y = startY - (startY - endY) * cardProgress;

      card.style.transform = `translateY(${y}%)`;
      // Smooth fade in over the first 30% of each card's animation
      const fadeProgress = Math.min(cardProgress / 0.3, 1);
      card.style.opacity = fadeProgress;
      card.style.zIndex = i + 1;
    });
  }

  window.addEventListener('scroll', updateStackingCards, { passive: true });
  updateStackingCards();
}

// Subtle parallax on scroll
const parallaxImages = document.querySelectorAll('[data-parallax]');
const newsImages = document.querySelectorAll('.news-img img');

function updateParallax() {
  const scrollY = window.scrollY;

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
    // Pin scroll position at the clicked header
    const headerRect = header.getBoundingClientRect();
    const headerTop = headerRect.top + window.scrollY;
    // Close all others
    document.querySelectorAll('.wwr-row.open').forEach(r => r.classList.remove('open'));
    // Toggle clicked
    if (!isOpen) row.classList.add('open');
    // Restore so the clicked header stays in place
    requestAnimationFrame(() => {
      const newHeaderTop = header.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, window.scrollY + (newHeaderTop - headerTop));
    });
  });
});
