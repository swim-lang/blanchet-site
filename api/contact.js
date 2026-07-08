const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const CONTACT_RECIPIENTS = [
  'Robert.Reagan@BlanchetLLP.com'
];
const INTERNAL_COPY_RECIPIENTS = [
  'sean@anchovies.agency'
];

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function clean(value, maxLength = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return clean(value, 8000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;

  let raw = '';
  for await (const chunk of request) raw += chunk;
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildPlainText(fields) {
  return [
    `Name: ${fields.firstName} ${fields.lastName}`.trim(),
    `Email: ${fields.email}`,
    fields.phone ? `Phone: ${fields.phone}` : '',
    fields.company ? `Company / Organization: ${fields.company}` : '',
    '',
    'Message:',
    fields.message,
    '',
    `Submitted from: ${fields.sourceUrl || 'Website contact form'}`
  ].filter(Boolean).join('\n');
}

function buildHtml(fields) {
  const rows = [
    ['Name', `${fields.firstName} ${fields.lastName}`.trim()],
    ['Email', fields.email],
    ['Phone', fields.phone],
    ['Company / Organization', fields.company],
    ['Submitted from', fields.sourceUrl || 'Website contact form']
  ].filter(([, value]) => value);

  const rowHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#5d6a70;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#0c222c;font-size:14px;">${escapeHtml(value)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0c222c;background:#ffffff;">
      <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;">New Blanchet LLP website inquiry</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:680px;margin-bottom:20px;">${rowHtml}</table>
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#5d6a70;margin-bottom:8px;">Message</div>
      <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;color:#0c222c;border-left:3px solid #0c222c;padding-left:14px;">${escapeHtml(fields.message)}</div>
    </div>
  `;
}

async function sendResendEmail(apiKey, payload) {
  const resendResponse = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    const error = new Error('Resend contact email failed.');
    error.result = result;
    throw error;
  }

  return result;
}

module.exports = async function contactHandler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { ok: false, message: 'Method not allowed.' });
  }

  const body = await readJsonBody(request);
  if (body === null) {
    return sendJson(response, 400, { ok: false, message: 'Invalid request body.' });
  }

  if (clean(body.website, 200)) {
    return sendJson(response, 200, { ok: true });
  }

  const fields = {
    firstName: clean(body.firstName, 80),
    lastName: clean(body.lastName, 80),
    email: clean(body.email, 160),
    phone: clean(body.phone, 80),
    company: clean(body.company, 160),
    message: clean(body.message, 4000),
    sourceUrl: clean(body.sourceUrl, 500)
  };

  if (!fields.firstName || !fields.lastName || !fields.email || !fields.message) {
    return sendJson(response, 400, { ok: false, message: 'Please complete your name, email, and message.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    return sendJson(response, 400, { ok: false, message: 'Please enter a valid email address.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = CONTACT_RECIPIENTS;
  const from = process.env.CONTACT_FROM_EMAIL || 'Blanchet LLP <onboarding@resend.dev>';

  if (!apiKey) {
    console.error('Contact form is missing RESEND_API_KEY.');
    return sendJson(response, 500, { ok: false, message: 'The contact form is not configured yet.' });
  }

  const subjectName = `${fields.firstName} ${fields.lastName}`.trim();
  const payload = {
    from,
    to,
    reply_to: fields.email,
    subject: `New website inquiry from ${subjectName}`,
    text: buildPlainText(fields),
    html: buildHtml(fields)
  };

  const internalPayload = {
    ...payload,
    to: INTERNAL_COPY_RECIPIENTS,
    subject: `[Internal copy] New website inquiry from ${subjectName}`
  };

  try {
    const [result, internalResult] = await Promise.all([
      sendResendEmail(apiKey, payload),
      sendResendEmail(apiKey, internalPayload)
    ]);
    return sendJson(response, 200, { ok: true, id: result.id, internalCopyId: internalResult.id });
  } catch (error) {
    console.error('Resend contact email failed:', error.result || error);
    return sendJson(response, 502, { ok: false, message: 'The message could not be sent. Please try again shortly.' });
  }
};
