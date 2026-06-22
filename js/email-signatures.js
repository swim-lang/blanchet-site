(function() {
  const PUBLIC_BASE_URL = 'https://swim-lang.github.io/blanchet-site/';
  const LOGO_URL = PUBLIC_BASE_URL + 'assets/logos/Logo-Color.png';
  const SITE_URL = 'https://swim-lang.github.io/blanchet-site/';
  let selectedLayout = 'classic';

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
    data.websiteLabel = normalizeWebsite(data.website) || 'blanchetlaw.com';
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
    return `<span style="color:#7a858b;">${safeLabel}</span> ${content}`;
  }

  function metaRows(data) {
    const rows = [
      line('D', data.phone),
      line('M', data.mobile),
      line('E', data.email, data.email ? `mailto:${escapeHtml(data.email)}` : ''),
      line('W', data.websiteLabel, data.websiteHref),
      line('L', data.linkedin, hrefForExternal(data.linkedin))
    ].filter(Boolean);

    return rows.join('<span style="color:#c9d0d3;"> &nbsp;|&nbsp; </span>');
  }

  function legalFooter() {
    return 'This message may contain privileged or confidential information. If you received it in error, please notify the sender and delete it.';
  }

  function renderClassic(data) {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#0c222c;">
  <tr>
    <td style="vertical-align:top;padding:0 18px 0 0;">
      <img src="${LOGO_URL}" width="58" height="58" alt="Blanchet LLP" style="display:block;width:58px;height:58px;border:0;outline:none;text-decoration:none;">
    </td>
    <td style="vertical-align:top;border-left:2px solid #0c222c;padding:0 0 0 18px;">
      <div style="font-size:16px;line-height:20px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:#0c222c;">${escapeHtml(data.name || 'Name')}</div>
      <div style="font-size:12px;line-height:18px;letter-spacing:1.4px;text-transform:uppercase;color:#5d6a70;">${escapeHtml(data.title || 'Title')}</div>
      <div style="font-size:12px;line-height:19px;color:#314956;margin-top:9px;">${metaRows(data)}</div>
      <div style="font-size:12px;line-height:18px;color:#6b767b;margin-top:7px;">${escapeHtml(data.office || '')}${data.office && data.address ? '<span style="color:#c9d0d3;"> &nbsp;|&nbsp; </span>' : ''}${escapeHtml(data.address || '')}</div>
      <div style="font-size:10px;line-height:15px;color:#9aa3a7;margin-top:11px;max-width:560px;">${legalFooter()}</div>
    </td>
  </tr>
</table>`.trim();
  }

  function renderCompact(data) {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#0c222c;">
  <tr>
    <td style="vertical-align:middle;padding:0 12px 0 0;">
      <img src="${LOGO_URL}" width="34" height="34" alt="Blanchet LLP" style="display:block;width:34px;height:34px;border:0;outline:none;text-decoration:none;">
    </td>
    <td style="vertical-align:middle;padding:0;">
      <span style="font-size:14px;line-height:18px;font-weight:bold;letter-spacing:0.4px;text-transform:uppercase;color:#0c222c;">${escapeHtml(data.name || 'Name')}</span>
      <span style="font-size:12px;line-height:18px;color:#7a858b;"> &nbsp;/&nbsp; ${escapeHtml(data.title || 'Title')}</span>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding:9px 0 0 0;font-size:12px;line-height:19px;color:#314956;">${metaRows(data)}</td>
  </tr>
  <tr>
    <td colspan="2" style="padding:4px 0 0 0;font-size:12px;line-height:18px;color:#6b767b;">${escapeHtml(data.office || '')}${data.office && data.address ? '<span style="color:#c9d0d3;"> &nbsp;|&nbsp; </span>' : ''}${escapeHtml(data.address || '')}</td>
  </tr>
  <tr>
    <td colspan="2" style="padding:9px 0 0 0;font-size:10px;line-height:15px;color:#9aa3a7;max-width:560px;">${legalFooter()}</td>
  </tr>
</table>`.trim();
  }

  function renderStacked(data) {
    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#0c222c;">
  <tr>
    <td style="padding:0 0 12px 0;border-bottom:1px solid #d9dee1;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="vertical-align:middle;padding:0 10px 0 0;">
            <img src="${LOGO_URL}" width="42" height="42" alt="Blanchet LLP" style="display:block;width:42px;height:42px;border:0;outline:none;text-decoration:none;">
          </td>
          <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:18px;font-weight:bold;letter-spacing:1.8px;text-transform:uppercase;color:#0c222c;">BLANCHET LLP</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:13px 0 0 0;">
      <div style="font-size:17px;line-height:21px;font-weight:bold;letter-spacing:0.6px;text-transform:uppercase;color:#0c222c;">${escapeHtml(data.name || 'Name')}</div>
      <div style="font-size:12px;line-height:18px;letter-spacing:1.4px;text-transform:uppercase;color:#5d6a70;">${escapeHtml(data.title || 'Title')}</div>
      <div style="font-size:12px;line-height:19px;color:#314956;margin-top:8px;">${metaRows(data)}</div>
      <div style="font-size:12px;line-height:18px;color:#6b767b;margin-top:6px;">${escapeHtml(data.office || '')}${data.office && data.address ? '<span style="color:#c9d0d3;"> &nbsp;|&nbsp; </span>' : ''}${escapeHtml(data.address || '')}</div>
      <div style="font-size:10px;line-height:15px;color:#9aa3a7;margin-top:11px;max-width:560px;">${legalFooter()}</div>
    </td>
  </tr>
</table>`.trim();
  }

  function renderSignature() {
    const data = getData();
    if (selectedLayout === 'compact') return renderCompact(data);
    if (selectedLayout === 'stacked') return renderStacked(data);
    return renderClassic(data);
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

  document.querySelectorAll('[data-layout-option]').forEach(button => {
    button.addEventListener('click', () => {
      selectedLayout = button.dataset.layoutOption;
      document.querySelectorAll('[data-layout-option]').forEach(option => {
        option.classList.toggle('active', option === button);
      });
      updatePreview();
    });
  });

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
