(function() {
  const PUBLIC_BASE_URL = 'https://swim-lang.github.io/blanchet-site/';
  const LOGO_URL = PUBLIC_BASE_URL + 'assets/logos/Logo-Color.png';
  const SITE_URL = 'https://swim-lang.github.io/blanchet-site/';

  const form = document.querySelector('[data-signature-form]');
  const preview = document.querySelector('[data-signature-preview]');
  const htmlOutput = document.querySelector('[data-signature-html]');
  const status = document.querySelector('[data-signature-status]');

  if (!form || !preview || !htmlOutput) return;

  function clean(value) {
    return String(value || '').trim();
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeWebsite(value) {
    const cleaned = clean(value);
    if (!cleaned) return '';
    return cleaned.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  }

  function hrefForWebsite(value) {
    const cleaned = normalizeWebsite(value);
    return cleaned ? `https://${escapeHtml(cleaned)}` : SITE_URL;
  }

  function hrefForExternal(value) {
    const cleaned = clean(value);
    if (!cleaned) return '';
    if (/^https?:\/\//i.test(cleaned)) return escapeHtml(cleaned);
    return `https://${escapeHtml(cleaned)}`;
  }

  function getData() {
    const data = {};
    document.querySelectorAll('[data-signature-field]').forEach(field => {
      data[field.dataset.signatureField] = clean(field.value);
    });
    data.websiteLabel = normalizeWebsite(data.website) || 'blanchetllp.com';
    data.websiteHref = hrefForWebsite(data.website);
    return data;
  }

  function line(label, value, href) {
    if (!clean(value)) return '';
    const safeLabel = escapeHtml(label);
    const safeValue = escapeHtml(value);
    const content = href
      ? `<a href="${href}" style="color:#314956;text-decoration:none;">${safeValue}</a>`
      : safeValue;
    return safeLabel
      ? `<span style="color:#7a858b;">${safeLabel}</span> ${content}`
      : content;
  }

  function metaRows(data) {
    const rows = [
      line('O', data.phone),
      line('M', data.mobile),
      line('', data.email, data.email ? `mailto:${escapeHtml(data.email)}` : ''),
      line('', data.websiteLabel, data.websiteHref),
      line('L', data.linkedin, hrefForExternal(data.linkedin))
    ].filter(Boolean);

    return rows.join('<span style="color:#c9d0d3;"> &nbsp;|&nbsp; </span>');
  }

  function legalFooter() {
    return 'This message may be privileged and confidential. If received in error, delete it and notify the sender.';
  }

  function renderClassic(data) {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#0c222c;background-color:#ffffff;">
  <tr>
    <td style="vertical-align:top;padding:0 18px 0 0;">
      <img src="${LOGO_URL}" width="58" height="58" alt="Blanchet LLP" style="display:block;width:58px;height:58px;border:0;outline:none;text-decoration:none;">
    </td>
    <td style="vertical-align:top;border-left:2px solid #0c222c;padding:0 0 0 18px;">
      <div style="font-size:16px;line-height:20px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:#0c222c;">${escapeHtml(data.name || 'Name')}</div>
      <div style="font-size:12px;line-height:18px;letter-spacing:1.4px;text-transform:uppercase;color:#5d6a70;">${escapeHtml(data.title || 'Title')}</div>
      <div style="font-size:12px;line-height:19px;color:#314956;margin-top:9px;">${metaRows(data)}</div>
      <div style="font-size:12px;line-height:18px;color:#6b767b;margin-top:7px;">${escapeHtml(data.address || '')}${data.address && data.office ? '<span style="color:#c9d0d3;"> &nbsp;|&nbsp; </span>' : ''}${escapeHtml(data.office || '')}</div>
      <div style="font-size:10px;line-height:15px;color:#9aa3a7;margin-top:11px;max-width:420px;">${legalFooter()}</div>
    </td>
  </tr>
</table>`.trim();
  }

  function renderSignature() {
    return renderClassic(getData());
  }

  function updatePreview() {
    const html = renderSignature();
    preview.innerHTML = html;
    htmlOutput.value = html;
  }

  function setStatus(message) {
    status.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      status.textContent = '';
    }, 2600);
  }

  async function copyPlainText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    htmlOutput.focus();
    htmlOutput.select();
    document.execCommand('copy');
  }

  async function copyRichHtml(html) {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([preview.textContent || html], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        })
      ]);
      return;
    }

    const holder = document.createElement('div');
    holder.setAttribute('contenteditable', 'true');
    holder.style.position = 'fixed';
    holder.style.left = '-9999px';
    holder.innerHTML = html;
    document.body.appendChild(holder);
    const range = document.createRange();
    range.selectNodeContents(holder);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();
    holder.remove();
  }

  form.addEventListener('input', updatePreview);

  document.querySelector('[data-copy-signature]').addEventListener('click', async () => {
    try {
      await copyRichHtml(renderSignature());
      setStatus('Signature copied. Paste it into Outlook signature settings.');
    } catch (error) {
      setStatus('Copy failed. Try Copy HTML instead.');
    }
  });

  document.querySelector('[data-copy-html]').addEventListener('click', async () => {
    try {
      await copyPlainText(renderSignature());
      htmlOutput.focus();
      htmlOutput.select();
      setStatus('HTML copied.');
    } catch (error) {
      setStatus('Copy failed. Select the HTML field and copy manually.');
    }
  });

  updatePreview();
})();
