(function() {
  const LOGO_URL = 'https://blanchetllp.com/assets/favicon/favicon-192.png';
  const SITE_URL = 'https://blanchetllp.com/';

  const form = document.querySelector('[data-signature-form]');
  const preview = document.querySelector('[data-signature-preview]');
  const htmlOutput = document.querySelector('[data-signature-html]');
  const status = document.querySelector('[data-signature-status]');
  const clientPreview = document.querySelector('[data-signature-client]');

  if (!form || !preview || !htmlOutput || !status || !clientPreview) return;

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
    return cleaned ? cleaned.replace(/^https?:\/\//i, '').replace(/\/+$/, '') : '';
  }

  function hrefForWebsite(value) {
    const cleaned = normalizeWebsite(value);
    return cleaned ? `https://${escapeHtml(cleaned)}` : SITE_URL;
  }

  function hrefForExternal(value) {
    const cleaned = clean(value);
    if (!cleaned) return '';
    return /^https?:\/\//i.test(cleaned) ? escapeHtml(cleaned) : `https://${escapeHtml(cleaned)}`;
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
    const content = href
      ? `<a href="${href}" style="color:#314956;text-decoration:none;">${escapeHtml(value)}</a>`
      : escapeHtml(value);
    return label
      ? `<span style="color:#7a858b;">${escapeHtml(label)}</span> ${content}`
      : content;
  }

  function metaRows(data) {
    return [
      line('O', data.phone),
      line('M', data.mobile),
      line('', data.email, data.email ? `mailto:${escapeHtml(data.email)}` : ''),
      line('', data.websiteLabel, data.websiteHref),
      line('L', data.linkedin, hrefForExternal(data.linkedin))
    ].filter(Boolean).join('<span style="color:#c9d0d3;"> &nbsp;|&nbsp; </span>');
  }

  function renderSignature(data) {
    const firmAndOffice = [escapeHtml(data.address), escapeHtml(data.office)].filter(Boolean).join('<span style="color:#c9d0d3;"> &nbsp;|&nbsp; </span>');
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#0c222c;">
  <tr>
    <td width="58" style="width:58px;max-width:58px;vertical-align:top;padding:0;">
      <img src="${LOGO_URL}" width="58" alt="Blanchet LLP" style="display:block;width:100%;max-width:58px;height:auto;border:0;outline:none;text-decoration:none;">
    </td>
    <td width="18" style="width:18px;min-width:18px;padding:0;font-size:0;line-height:0;">&nbsp;</td>
    <td style="vertical-align:top;border-left:2px solid #0c222c;padding:0 0 0 18px;">
      <div style="font-size:16px;line-height:20px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:#0c222c;">${escapeHtml(data.name || 'Name')}</div>
      <div style="font-size:12px;line-height:18px;letter-spacing:1.4px;text-transform:uppercase;color:#5d6a70;">${escapeHtml(data.title || 'Title')}</div>
      <div style="font-size:12px;line-height:19px;color:#314956;margin-top:9px;">${metaRows(data)}</div>
      <div style="font-size:12px;line-height:18px;color:#6b767b;margin-top:7px;">${firmAndOffice}</div>
      <div style="font-size:10px;line-height:15px;color:#9aa3a7;margin-top:11px;max-width:420px;">This message may be privileged and confidential. If received in error, delete it and notify the sender.</div>
    </td>
  </tr>
</table>`.trim();
  }

  function currentSignature() {
    return renderSignature(getData());
  }

  function updatePreview() {
    const html = currentSignature();
    preview.innerHTML = html;
    htmlOutput.value = html;
  }

  function setStatus(message) {
    status.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      status.textContent = '';
    }, 2800);
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
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([preview.textContent || html], { type: 'text/plain' })
        })
      ]);
      return;
    }

    const holder = document.createElement('div');
    holder.contentEditable = 'true';
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

  function downloadHtml() {
    const documentHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Blanchet LLP Email Signature</title></head><body>${currentSignature()}</body></html>`;
    const url = URL.createObjectURL(new Blob([documentHtml], { type: 'text/html' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'blanchet-email-signature-v2.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('V2 HTML downloaded.');
  }

  form.addEventListener('input', updatePreview);

  document.querySelectorAll('[data-preview-theme]').forEach(button => {
    button.addEventListener('click', () => {
      const theme = button.dataset.previewTheme;
      clientPreview.dataset.theme = theme;
      document.querySelectorAll('[data-preview-theme]').forEach(item => {
        item.setAttribute('aria-pressed', String(item === button));
      });
    });
  });

  document.querySelector('[data-copy-signature]').addEventListener('click', async () => {
    try {
      await copyRichHtml(currentSignature());
      setStatus('V2 signature copied. Paste it into Outlook signature settings.');
    } catch (error) {
      setStatus('Copy failed. Try Copy HTML instead.');
    }
  });

  document.querySelector('[data-copy-html]').addEventListener('click', async () => {
    try {
      await copyPlainText(currentSignature());
      htmlOutput.focus();
      htmlOutput.select();
      setStatus('V2 HTML copied.');
    } catch (error) {
      setStatus('Copy failed. Select the HTML field and copy manually.');
    }
  });

  document.querySelector('[data-download-html]').addEventListener('click', downloadHtml);
  updatePreview();
})();
