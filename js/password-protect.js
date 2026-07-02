/* BLANCHET preview gate */
(function() {
  const PASSWORD_HASH = 'da6457ddc30c7e809d7defa0d022c938e42a23cd39f3dfd522bd7cc89d68a056';
  const STORAGE_KEY = 'blanchet-preview-auth';

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  function unlock() {
    document.documentElement.classList.remove('auth-lock');
    const gate = document.querySelector('.password-gate');
    if (gate) gate.remove();
    document.dispatchEvent(new CustomEvent('blanchet:unlocked'));
  }

  function showGate() {
    if (document.querySelector('.password-gate')) return;

    const gate = document.createElement('div');
    gate.className = 'password-gate';
    gate.innerHTML = `
      <form class="password-gate-card" autocomplete="off" aria-label="Password gate">
        <input id="preview-password" name="password" type="password" autocomplete="current-password" aria-label="Password" autofocus>
      </form>
    `;
    document.body.appendChild(gate);

    const form = gate.querySelector('form');
    const input = gate.querySelector('input');

    form.addEventListener('submit', async event => {
      event.preventDefault();
      input.removeAttribute('aria-invalid');
      const candidate = input.value.trim();
      if (!candidate) return;

      if (await sha256(candidate) === PASSWORD_HASH) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        unlock();
      } else {
        input.value = '';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      }
    });
  }

  async function init() {
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
      unlock();
      return;
    }

    document.documentElement.classList.add('auth-lock');
    showGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
