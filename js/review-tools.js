/* BLANCHET review annotations */
(function() {
  const MODE_KEY = 'blanchet-review-mode';
  const COMMENTS_KEY = 'blanchet-review-comments';
  const PENDING_JUMP_KEY = 'blanchet-review-pending-jump';
  const PAGE = location.pathname.split('/').pop() || 'index.html';
  const CONFIG = window.BLANCHET_REVIEW_CONFIG || {};
  const PROJECT = CONFIG.project || 'blanchet-site';
  const SUPABASE_URL = (CONFIG.supabaseUrl || '').replace(/\/$/, '');
  const SUPABASE_ANON_KEY = CONFIG.supabaseAnonKey || '';
  const NOTIFICATION_FUNCTION = CONFIG.notificationFunction || '';
  const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  let mode = sessionStorage.getItem(MODE_KEY) || '';
  let activeTarget = null;
  let toolbar;
  let panel;
  let fileInput;
  let remoteComments = [];
  let remoteLoaded = false;
  let noticeTimer;

  const storageAdapter = {
    load() {
      return HAS_SUPABASE ? remoteComments : localComments();
    },
    save(items) {
      if (HAS_SUPABASE) {
        remoteComments = items;
        return;
      }
      saveLocalComments(items);
    }
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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function scrollToReviewTarget(reviewId, attempt = 0) {
    if (!reviewId) return false;
    const target = document.querySelector(`[data-review-id="${CSS.escape(reviewId)}"]`);
    if (!target) {
      if (attempt < 10) {
        setTimeout(() => scrollToReviewTarget(reviewId, attempt + 1), 120);
      } else {
        showNotice('Could not find that section on this page.');
      }
      return false;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('review-jump');
    setTimeout(() => target.classList.remove('review-jump'), 1400);
    return true;
  }

  function handlePendingJump() {
    let pending;
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING_JUMP_KEY) || 'null');
    } catch {
      pending = null;
    }
    if (!pending || pending.page !== PAGE) return;
    sessionStorage.removeItem(PENDING_JUMP_KEY);
    setTimeout(() => scrollToReviewTarget(pending.reviewId), 150);
  }

  function localComments() {
    try {
      return JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveLocalComments(items) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(items, null, 2));
  }

  function toClientComment(row) {
    return {
      id: row.id,
      project: row.project,
      page: row.page,
      path: row.path,
      reviewId: row.review_id,
      selector: row.selector,
      textQuote: row.text_quote || '',
      comment: row.comment,
      status: row.status || 'open',
      viewport: row.viewport || null,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at || null
    };
  }

  function toSupabaseRow(item) {
    return {
      id: item.id,
      project: item.project,
      page: item.page,
      path: item.path,
      review_id: item.reviewId,
      selector: item.selector,
      text_quote: item.textQuote,
      comment: item.comment,
      status: item.status,
      viewport: item.viewport,
      created_at: item.createdAt,
      resolved_at: item.resolvedAt || null
    };
  }

  async function supabaseRequest(path, options = {}) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Supabase request failed: ${response.status}`);
    }
    if (response.status === 204) return [];
    return response.json();
  }

  async function callSupabaseFunction(name, body) {
    if (!HAS_SUPABASE || !name) return null;
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json();
  }

  async function loadRemoteComments() {
    if (!HAS_SUPABASE) return;
    try {
      const rows = await supabaseRequest(`review_comments?project=eq.${encodeURIComponent(PROJECT)}&select=*&order=created_at.desc`);
      remoteComments = rows.map(toClientComment);
      remoteLoaded = true;
      updateCount();
      markCommentedTargets();
      if (panel) renderPanel();
    } catch (error) {
      console.warn('Could not load review comments from Supabase. Falling back to local comments.', error);
      remoteComments = localComments();
      remoteLoaded = true;
      showNotice('Could not sync comments. Saving locally for now.');
      updateCount();
      markCommentedTargets();
    }
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
      <button type="button" data-action="export">Export Comments</button>
      ${isAdmin() ? '<button type="button" data-action="import">Import</button>' : ''}
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

  function isAdmin() {
    return new URLSearchParams(location.search).has('reviewAdmin') || localStorage.getItem('blanchet-review-admin') === 'true';
  }

  function showNotice(message) {
    const existing = document.querySelector('.review-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'review-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => toast.remove(), 2600);
  }

  function promptMode() {
    if (sessionStorage.getItem(MODE_KEY) || document.querySelector('.review-mode-choice')) return;
    const choice = document.createElement('div');
    choice.className = 'review-mode-choice';
    choice.innerHTML = `
      <div class="review-mode-card">
        <span>Private Preview</span>
        <h2>How are you using the site today?</h2>
        <p>Choose review mode to leave comments directly on page sections. Choose view mode to browse without review tools.</p>
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
    popover.addEventListener('submit', async event => {
      event.preventDefault();
      const body = popover.elements.comment.value.trim();
      if (!body) return;
      const submit = popover.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Saving';
      await addComment(activeTarget, body);
      popover.remove();
    });
  }

  async function addComment(target, body) {
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
    if (HAS_SUPABASE) {
      try {
        const rows = await supabaseRequest('review_comments', {
          method: 'POST',
          body: JSON.stringify(toSupabaseRow(item))
        });
        const saved = rows[0] ? toClientComment(rows[0]) : item;
        remoteComments = remoteComments.map(comment => comment.id === item.id ? saved : comment);
        notifyReviewActivity(saved);
        showNotice('Comment saved.');
      } catch (error) {
        console.warn('Could not save comment to Supabase.', error);
        saveLocalComments(localComments().concat(item));
        showNotice('Could not sync. Comment saved locally.');
      }
    } else {
      showNotice('Comment saved locally.');
    }
    updateCount();
    markCommentedTargets();
    if (panel) renderPanel();
  }

  function notifyReviewActivity(item) {
    callSupabaseFunction(NOTIFICATION_FUNCTION, {
      project: item.project,
      page: item.page,
      path: item.path,
      reviewId: item.reviewId,
      textQuote: item.textQuote,
      comment: item.comment
    }).catch(error => {
      console.warn('Could not send review notification.', error);
    });
  }

  function updateCount() {
    const items = storageAdapter.load();
    const count = items.filter(item => item.status !== 'resolved').length;
    document.querySelectorAll('.review-count').forEach(el => {
      el.textContent = count;
    });
    document.querySelectorAll('.review-sync-state').forEach(el => {
      el.textContent = HAS_SUPABASE ? (remoteLoaded ? 'Synced' : 'Syncing') : 'Local';
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
    const openItems = items.filter(item => item.status !== 'resolved');
    const resolvedItems = items.filter(item => item.status === 'resolved');
    const renderItems = (sectionItems) => sectionItems.map(item => `
      <article class="review-panel-item${item.status === 'resolved' ? ' is-resolved' : ''}" data-id="${item.id}">
        <div class="review-panel-meta">${escapeHtml(item.page)} · ${escapeHtml(item.reviewId)}</div>
        <p class="review-panel-quote">${escapeHtml(item.textQuote || 'No text captured')}</p>
        <p>${escapeHtml(item.comment)}</p>
        <div class="review-panel-actions">
          <button type="button" data-jump="${escapeHtml(item.reviewId)}" data-jump-page="${escapeHtml(item.page)}">Jump</button>
          <button type="button" data-resolve="${item.id}">${item.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
        </div>
      </article>
    `).join('');
    panel.innerHTML = `
      <div class="review-panel-header">
        <div>
          <span>Review Comments</span>
          <h2>${openItems.length} to do</h2>
          <small class="review-sync-state">${HAS_SUPABASE ? (remoteLoaded ? 'Synced' : 'Syncing') : 'Local'}</small>
        </div>
        <button type="button" data-close>Close</button>
      </div>
      <div class="review-panel-list">
        <section class="review-panel-section">
          <div class="review-panel-section-title">To Do</div>
          ${openItems.length ? renderItems(openItems) : '<p class="review-panel-empty">No open comments.</p>'}
        </section>
        <details class="review-panel-section review-panel-resolved" ${openItems.length ? '' : 'open'}>
          <summary>Completed <span>${resolvedItems.length}</span></summary>
          ${resolvedItems.length ? renderItems(resolvedItems) : '<p class="review-panel-empty">Nothing resolved yet.</p>'}
        </details>
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
      const reviewId = jump.dataset.jump;
      const page = jump.dataset.jumpPage || PAGE;
      if (page && page !== PAGE) {
        sessionStorage.setItem(PENDING_JUMP_KEY, JSON.stringify({ page, reviewId }));
        window.location.href = page;
        return;
      }
      scrollToReviewTarget(reviewId);
    }
    const resolve = event.target.closest('[data-resolve]');
    if (resolve) {
      const items = storageAdapter.load().map(item => {
        if (item.id === resolve.dataset.resolve) {
          const nextStatus = item.status === 'resolved' ? 'open' : 'resolved';
          return {
            ...item,
            status: nextStatus,
            resolvedAt: nextStatus === 'resolved' ? new Date().toISOString() : null
          };
        }
        return item;
      });
      storageAdapter.save(items);
      const updated = items.find(item => item.id === resolve.dataset.resolve);
      if (HAS_SUPABASE && updated) {
        supabaseRequest(`review_comments?id=eq.${encodeURIComponent(updated.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: updated.status,
            resolved_at: updated.resolvedAt
          })
        }).catch(error => {
          console.warn('Could not update comment status in Supabase.', error);
          showNotice('Could not sync status. Try again later.');
        });
      }
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
    handlePendingJump();
    loadRemoteComments();
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

  window.BlanchetReview = { promptMode, initReviewTools, comments: localComments, saveComments: saveLocalComments };
  document.addEventListener('blanchet:unlocked', initReviewTools);

  if (document.readyState !== 'loading' && !document.documentElement.classList.contains('auth-lock')) {
    initReviewTools();
  }
})();
