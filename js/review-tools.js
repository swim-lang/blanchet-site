/* BLANCHET review annotations */
(function() {
  const MODE_KEY = 'blanchet-review-mode';
  const COMMENTS_KEY = 'blanchet-review-comments';
  const PAGE = location.pathname.split('/').pop() || 'index.html';
  const PROJECT = 'blanchet-site';

  let mode = sessionStorage.getItem(MODE_KEY) || '';
  let activeTarget = null;
  let toolbar;
  let panel;
  let fileInput;

  const storageAdapter = {
    load: comments,
    save: saveComments
  };

  const targetSelector = [
    '[data-review-id]',
    'main',
    'section',
    'footer',
    '.hero',
    '.firm-hero',
    '.team-page',
    '.contact-page',
    '.service-card',
    '.practice-card',
    '.partner-card',
    '.step-card',
    '.team-row',
    '.firm-defines-row',
    '.firm-pov-card',
    '.practices-cell',
    '.wc-section',
    '.wc-mini-card',
    '.insights-featured-card',
    '.insights-card',
    '.article-related-card'
  ].join(',');

  function pageSlug() {
    return PAGE.replace(/\.html$/, '').replace(/^index$/, 'home');
  }

  function slug(value) {
    return (value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 42);
  }

  function comments() {
    try {
      return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveComments(items) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(items, null, 2));
  }

  function textQuote(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  }

  function ensureAnchors() {
    const seen = new Map();
    document.querySelectorAll(targetSelector).forEach(el => {
      if (el.closest('.password-gate, .review-toolbar, .review-popover, .review-panel, .review-mode-choice')) return;
      if (!el.dataset.reviewId) {
        const className = Array.from(el.classList || []).find(name => !name.startsWith('visible') && !name.startsWith('active'));
        const label = slug(el.getAttribute('id') || className || el.tagName.toLowerCase());
        const text = slug(textQuote(el));
        const base = [pageSlug(), label, text].filter(Boolean).join('.');
        const count = (seen.get(base) || 0) + 1;
        seen.set(base, count);
        el.dataset.reviewId = count > 1 ? `${base}.${count}` : base;
      }
      el.classList.add('review-target');
    });
  }

  function setMode(nextMode) {
    mode = nextMode;
    sessionStorage.setItem(MODE_KEY, nextMode);
    document.documentElement.dataset.reviewMode = nextMode;
    if (toolbar) {
      toolbar.querySelectorAll('[data-mode]').forEach(button => {
        button.classList.toggle('active', button.dataset.mode === nextMode);
      });
    }
  }

  function createToolbar() {
    if (toolbar || mode === 'view') return;
    toolbar = document.createElement('div');
    toolbar.className = 'review-toolbar';
    toolbar.innerHTML = `
      <button type="button" data-mode="browse">Browse</button>
      <button type="button" data-mode="comment">Comment</button>
      <button type="button" data-action="panel">Comments <span class="review-count">0</span></button>
      <button type="button" data-action="export">Export</button>
      <button type="button" data-action="import">Import</button>
    `;
    document.body.appendChild(toolbar);
    toolbar.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.mode) setMode(button.dataset.mode);
      if (button.dataset.action === 'panel') togglePanel();
      if (button.dataset.action === 'export') exportComments();
      if (button.dataset.action === 'import') importComments();
    });
    updateCount();
  }

  function promptMode() {
    if (sessionStorage.getItem(MODE_KEY) || document.querySelector('.review-mode-choice')) return;
    const choice = document.createElement('div');
    choice.className = 'review-mode-choice';
    choice.innerHTML = `
      <div class="review-mode-card">
        <span>Private Preview</span>
        <h2>How are you using the site today?</h2>
        <div class="review-mode-actions">
          <button type="button" data-choice="review">Review and leave comments</button>
          <button type="button" data-choice="view">Just view the site</button>
        </div>
      </div>
    `;
    document.body.appendChild(choice);
    choice.addEventListener('click', event => {
      const button = event.target.closest('[data-choice]');
      if (!button) return;
      choice.remove();
      if (button.dataset.choice === 'review') {
        createToolbar();
        setMode('browse');
      } else {
        setMode('view');
      }
    });
  }

  function openPopover(target) {
    document.querySelector('.review-popover')?.remove();
    activeTarget = target;

    const rect = target.getBoundingClientRect();
    const popover = document.createElement('form');
    popover.className = 'review-popover';
    popover.innerHTML = `
      <div class="review-popover-meta">${target.dataset.reviewId}</div>
      <textarea name="comment" placeholder="Leave a comment on this element" required></textarea>
      <div class="review-popover-actions">
        <button type="button" data-close>Cancel</button>
        <button type="submit">Save</button>
      </div>
    `;
    document.body.appendChild(popover);

    const top = Math.min(window.innerHeight - popover.offsetHeight - 16, Math.max(16, rect.top + 12));
    const left = Math.min(window.innerWidth - popover.offsetWidth - 16, Math.max(16, rect.left + 12));
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.querySelector('textarea').focus();

    popover.addEventListener('click', event => {
      if (event.target.matches('[data-close]')) popover.remove();
    });
    popover.addEventListener('submit', event => {
      event.preventDefault();
      const body = popover.elements.comment.value.trim();
      if (!body) return;
      addComment(activeTarget, body);
      popover.remove();
    });
  }

  function addComment(target, body) {
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      project: PROJECT,
      page: PAGE,
      path: location.pathname,
      reviewId: target.dataset.reviewId,
      selector: `[data-review-id="${target.dataset.reviewId}"]`,
      textQuote: textQuote(target),
      comment: body,
      status: 'open',
      viewport: { width: window.innerWidth, height: window.innerHeight },
      createdAt: new Date().toISOString()
    };
    const items = storageAdapter.load();
    items.push(item);
    storageAdapter.save(items);
    updateCount();
    markCommentedTargets();
  }

  function updateCount() {
    const count = storageAdapter.load().filter(item => item.status !== 'resolved').length;
    document.querySelectorAll('.review-count').forEach(el => {
      el.textContent = count;
    });
  }

  function markCommentedTargets() {
    const ids = new Set(storageAdapter.load().filter(item => item.status !== 'resolved').map(item => item.reviewId));
    document.querySelectorAll('.review-target').forEach(el => {
      el.classList.toggle('has-review-comment', ids.has(el.dataset.reviewId));
    });
  }

  function togglePanel() {
    if (panel) {
      panel.remove();
      panel = null;
      return;
    }
    panel = document.createElement('aside');
    panel.className = 'review-panel';
    renderPanel();
    document.body.appendChild(panel);
  }

  function renderPanel() {
    if (!panel) return;
    const items = storageAdapter.load();
    panel.innerHTML = `
      <div class="review-panel-header">
        <div>
          <span>Review Comments</span>
          <h2>${items.length} total</h2>
        </div>
        <button type="button" data-close>Close</button>
      </div>
      <div class="review-panel-list">
        ${items.length ? items.map(item => `
          <article class="review-panel-item" data-id="${item.id}">
            <div class="review-panel-meta">${item.page} · ${item.reviewId}</div>
            <p class="review-panel-quote">${item.textQuote || 'No text captured'}</p>
            <p>${item.comment}</p>
            <div class="review-panel-actions">
              <button type="button" data-jump="${item.reviewId}">Jump</button>
              <button type="button" data-resolve="${item.id}">${item.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
            </div>
          </article>
        `).join('') : '<p class="review-panel-empty">No comments yet.</p>'}
      </div>
    `;
    panel.addEventListener('click', handlePanelClick);
  }

  function handlePanelClick(event) {
    const close = event.target.closest('[data-close]');
    if (close) {
      togglePanel();
      return;
    }
    const jump = event.target.closest('[data-jump]');
    if (jump) {
      const target = document.querySelector(`[data-review-id="${CSS.escape(jump.dataset.jump)}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('review-jump');
        setTimeout(() => target.classList.remove('review-jump'), 1200);
      }
    }
    const resolve = event.target.closest('[data-resolve]');
    if (resolve) {
      const items = storageAdapter.load().map(item => {
        if (item.id === resolve.dataset.resolve) {
          return { ...item, status: item.status === 'resolved' ? 'open' : 'resolved' };
        }
        return item;
      });
      storageAdapter.save(items);
      updateCount();
      markCommentedTargets();
      renderPanel();
    }
  }

  function exportComments() {
    const data = {
      project: PROJECT,
      exportedAt: new Date().toISOString(),
      comments: storageAdapter.load()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blanchet-review-comments-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importComments() {
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'application/json,.json';
      fileInput.hidden = true;
      document.body.appendChild(fileInput);
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        fileInput.value = '';
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          const imported = Array.isArray(data) ? data : data.comments;
          if (!Array.isArray(imported)) throw new Error('No comments array found.');
          const existing = storageAdapter.load();
          const seen = new Set(existing.map(item => item.id));
          const merged = existing.concat(imported.filter(item => item && item.id && !seen.has(item.id)));
          storageAdapter.save(merged);
          updateCount();
          markCommentedTargets();
          if (panel) renderPanel();
        } catch (error) {
          alert('Could not import review comments. Please choose a valid review JSON export.');
        }
      });
    }
    fileInput.click();
  }

  function attachEvents() {
    document.addEventListener('click', event => {
      if (mode !== 'comment') return;
      if (event.target.closest('.review-toolbar, .review-popover, .review-panel, .review-mode-choice')) return;
      const target = event.target.closest('.review-target');
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      openPopover(target);
    }, true);
  }

  function initReviewTools() {
    ensureAnchors();
    attachEvents();
    markCommentedTargets();
    if (mode === 'review' || mode === 'browse' || mode === 'comment') {
      createToolbar();
      setMode(mode === 'review' ? 'browse' : mode);
    } else if (mode === 'view') {
      setMode('view');
    } else {
      promptMode();
    }
  }

  window.BlanchetReview = { promptMode, initReviewTools, comments, saveComments };
  document.addEventListener('blanchet:unlocked', initReviewTools);

  if (document.readyState !== 'loading' && !document.documentElement.classList.contains('auth-lock')) {
    initReviewTools();
  }
})();
