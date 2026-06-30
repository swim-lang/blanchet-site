(function() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const submit = form.querySelector('[data-contact-submit]');
  const status = form.querySelector('[data-contact-status]');
  const defaultSubmitText = submit ? submit.textContent : 'Submit';

  function setStatus(message, type) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = type || '';
  }

  function setBusy(isBusy) {
    if (!submit) return;
    submit.disabled = isBusy;
    submit.textContent = isBusy ? 'Sending...' : defaultSubmitText;
  }

  function fieldValue(formData, name) {
    return String(formData.get(name) || '').trim();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      firstName: fieldValue(formData, 'firstName'),
      lastName: fieldValue(formData, 'lastName'),
      email: fieldValue(formData, 'email'),
      phone: fieldValue(formData, 'phone'),
      company: fieldValue(formData, 'company'),
      message: fieldValue(formData, 'message'),
      website: fieldValue(formData, 'website'),
      sourceUrl: window.location.href
    };

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.message) {
      setStatus('Please complete your name, email, and message.', 'error');
      return;
    }

    setBusy(true);
    setStatus('Sending your message...', 'pending');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'The message could not be sent.');
      }

      form.reset();
      setStatus('Message sent. The firm will review it and respond as appropriate.', 'success');
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'The request timed out. Please try again.'
        : error.message || 'The message could not be sent. Please try again.';
      setStatus(message, 'error');
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  });
})();
