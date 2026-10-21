/**
 * enquiry-core.mjs — pure logic for the Northeast Damp Proofers booking and
 * contact forms. No network, no process.env reads at module scope.
 */

export const LIMITS = Object.freeze({
  name: 120, email: 254, phone: 40, address: 300, issue: 80, kind: 20,
  requestType: 80, date: 20, details: 4000,
});

export function resolveConfig(env = {}) {
  const missing = [];
  const warnings = [];

  const user = str(env.SMTP_USER);
  const pass = str(env.SMTP_PASS);
  if (!user) missing.push('SMTP_USER');
  else if (!isEmail(user)) missing.push('SMTP_USER (present but not a valid mailbox address)');
  if (!pass) missing.push('SMTP_PASS');

  const host = str(env.SMTP_HOST) || 'smtp.ionos.co.uk';
  const port = int(env.SMTP_PORT, 587, 1, 65535);
  if (port !== 587 && port !== 465) {
    warnings.push(`SMTP_PORT is ${port}; expected 587 (STARTTLS) or 465 (implicit TLS).`);
  }

  const toEmail = str(env.SMTP_TO) || str(env.ENQUIRY_TO_EMAIL) || user;
  if (toEmail && !isEmail(toEmail)) missing.push('SMTP_TO (present but not a valid address)');

  // From must be the authenticated mailbox; the customer goes in Reply-To.
  return {
    ok: missing.length === 0,
    missing,
    warnings,
    config: {
      host, port, secure: port === 465, user, pass, toEmail,
      fromEmail: user,
      fromName: str(env.ENQUIRY_FROM_NAME) || 'Northeast Damp Proofers Website',
      siteName: str(env.ENQUIRY_SITE_NAME) || 'Northeast Damp Proofers',
      replyPhone: str(env.ENQUIRY_PHONE) || '07446 522034',
      sendAck: str(env.ENQUIRY_SEND_ACK) === '1',
      timeoutMs: int(env.ENQUIRY_TIMEOUT_MS, 10_000, 1_000, 30_000),
      maxAttempts: int(env.ENQUIRY_MAX_ATTEMPTS, 3, 1, 5),
    },
  };
}

/** kind is "booking" (book.html) or "contact" (contact.html). */
export function validateEnquiry(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }
  const errors = [];
  const kind = str(raw.kind) === 'contact' ? 'contact' : 'booking';
  const name = trunc(str(raw.name), LIMITS.name);
  const email = trunc(str(raw.email), LIMITS.email).toLowerCase();
  const phone = trunc(str(raw.phone), LIMITS.phone);
  const details = trunc(str(raw.details), LIMITS.details);

  if (!name) errors.push('name is required');
  if (!email) errors.push('email is required');
  else if (!isEmail(email)) errors.push('email is not a valid address');
  if (kind === 'booking' && !phone) errors.push('phone is required');
  if (kind === 'contact' && !details) errors.push('message is required');
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    lead: {
      kind, name, email, phone, details,
      requestType: trunc(str(raw.requestType), LIMITS.requestType),
      address: trunc(str(raw.address), LIMITS.address),
      issue: trunc(str(raw.issue), LIMITS.issue),
      date: trunc(str(raw.date), LIMITS.date),
    },
  };
}

/** Honeypot: a hidden `hp` input that humans never fill. */
export function isBot(raw) {
  return typeof raw?.hp === 'string' && raw.hp.trim() !== '';
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
export function escapeHeader(v) {
  return String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
}

const FIELDS = [
  ['requestType', 'Request'],
  ['phone', 'Phone'],
  ['address', 'Property address'],
  ['issue', 'Type of damp'],
  ['date', 'Preferred date'],
];

export function buildNotificationEmail(lead, config, meta = {}) {
  const subjectBase = lead.kind === 'contact'
    ? 'Website contact message'
    : /^free/i.test(lead.requestType) ? 'FREE INSPECTION request'
    : lead.requestType ? 'PAID SURVEY request' : 'Booking request';
  const subject = escapeHeader(`${subjectBase} — ${lead.name}`);

  const rows = FIELDS.filter(([k]) => lead[k]).map(([k, label]) =>
    `<tr><td style="padding:4px 14px 4px 0;color:#6D7C7C;white-space:nowrap">${escapeHtml(label)}</td>` +
    `<td style="padding:4px 0"><b>${escapeHtml(lead[k])}</b></td></tr>`).join('');
  const details = lead.details
    ? `<p style="margin:16px 0 4px;color:#6D7C7C">${lead.kind === 'contact' ? 'Message' : 'Details'}</p>` +
      `<p style="margin:0;white-space:pre-wrap">${escapeHtml(lead.details)}</p>`
    : '';
  const footer = meta.receivedAt
    ? `<p style="margin:22px 0 0;font-size:12px;color:#9AA5A5">Received ${escapeHtml(meta.receivedAt)}${
        meta.requestId ? ` · req ${escapeHtml(meta.requestId)}` : ''}</p>`
    : '';

  const text = [`Name: ${lead.name}`, `Email: ${lead.email}`];
  for (const [k, label] of FIELDS) if (lead[k]) text.push(`${label}: ${lead[k]}`);
  if (lead.details) text.push('', lead.kind === 'contact' ? 'Message:' : 'Details:', lead.details);
  if (meta.receivedAt) text.push('', `Received ${meta.receivedAt}`);

  return {
    from: { name: escapeHeader(config.fromName), address: config.fromEmail },
    to: config.toEmail,
    replyTo: { name: escapeHeader(lead.name) || lead.email, address: lead.email },
    subject,
    html:
      `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#171A21">` +
      `<h2 style="margin:0 0 14px">${escapeHtml(subjectBase)}</h2>` +
      `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">` +
      `<tr><td style="padding:4px 14px 4px 0;color:#6D7C7C">Name</td><td style="padding:4px 0"><b>${escapeHtml(lead.name)}</b></td></tr>` +
      `<tr><td style="padding:4px 14px 4px 0;color:#6D7C7C">Email</td><td style="padding:4px 0"><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td></tr>` +
      rows + `</table>` + details + footer + `</div>`,
    text: text.join('\n'),
  };
}

export function buildAckEmail(lead, config) {
  const first = (lead.name || '').split(/\s+/)[0] || 'there';
  const body = lead.kind === 'contact'
    ? 'your message has reached us and we will come back to you as soon as we can.'
    : 'your request has reached us and we will be in touch to confirm the details.';
  return {
    from: { name: escapeHeader(config.siteName), address: config.fromEmail },
    to: { name: escapeHeader(lead.name) || lead.email, address: lead.email },
    replyTo: { name: escapeHeader(config.siteName), address: config.toEmail },
    subject: escapeHeader(`We've got your message — ${config.siteName}`),
    html:
      `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#171A21">` +
      `<p>Thanks ${escapeHtml(first)} — ${escapeHtml(body)}</p>` +
      `<p>If it's urgent, call <b>${escapeHtml(config.replyPhone)}</b> rather than waiting on email.</p>` +
      `<p style="margin-top:22px;font-size:13px;color:#6D7C7C">${escapeHtml(config.siteName)} — damp proofing across the North East.<br>` +
      `This is an automated acknowledgement; replies go to a monitored inbox.</p></div>`,
    text: `Thanks ${first} — ${body}\n\nIf it's urgent, call ${config.replyPhone} rather than waiting on email.\n\n${config.siteName}`,
  };
}

/** One-line JSON written to stderr before delivery so a lead survives a mail outage. */
export function leadRecord(lead, meta = {}) {
  return JSON.stringify({
    tag: 'LEAD_CAPTURE',
    receivedAt: meta.receivedAt ?? new Date().toISOString(),
    requestId: meta.requestId ?? null,
    lead,
  });
}

function str(v) { return typeof v === 'string' ? v.trim() : ''; }
function trunc(v, max) { return v.length > max ? v.slice(0, max) : v; }
function int(v, dflt, min, max) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
}

export function isEmail(v) {
  if (typeof v !== 'string' || v.length > LIMITS.email) return false;
  if (/[\s<>,;\r\n]/.test(v)) return false;
  const at = v.indexOf('@');
  if (at < 1 || at !== v.lastIndexOf('@')) return false;
  const domain = v.slice(at + 1);
  if (domain.length < 3 || !domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
  if (domain.startsWith('-') || domain.endsWith('-')) return false;
  return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(v.slice(0, at));
}
