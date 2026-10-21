import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/enquiry.mjs';
import { resolveConfig, validateEnquiry, isBot, buildNotificationEmail } from '../lib/enquiry-core.mjs';

const env = { SMTP_USER: 'info@northeastdampproofers.co.uk', SMTP_PASS: 'x' };

function res() {
  const r = { code: 0, headers: {}, body: '' };
  r.status = (c) => { r.code = c; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; return r; };
  r.send = (b) => { r.body = b; return r; };
  return r;
}
const fakeTx = () => { const sent = []; return { sent, sendMail: async (m) => { sent.push(m); return { messageId: 'id' }; } }; };

test('config needs SMTP_USER and SMTP_PASS', () => {
  assert.deepEqual(resolveConfig({}).missing, ['SMTP_USER', 'SMTP_PASS']);
  const r = resolveConfig(env);
  assert.equal(r.ok, true);
  assert.equal(r.config.toEmail, env.SMTP_USER);
  assert.equal(r.config.host, 'smtp.ionos.co.uk');
});

test('booking needs phone, contact needs message', () => {
  assert.equal(validateEnquiry({ kind: 'booking', name: 'A', email: 'a@b.co' }).ok, false);
  assert.equal(validateEnquiry({ kind: 'contact', name: 'A', email: 'a@b.co' }).ok, false);
  assert.equal(validateEnquiry({ kind: 'booking', name: 'A', email: 'a@b.co', phone: '1' }).ok, true);
  assert.equal(validateEnquiry({ kind: 'contact', name: 'A', email: 'a@b.co', details: 'hi' }).ok, true);
});

test('honeypot detected', () => {
  assert.equal(isBot({ hp: 'x' }), true);
  assert.equal(isBot({ hp: '' }), false);
});

test('notification escapes html and prevents header injection', () => {
  const { config } = resolveConfig(env);
  const lead = validateEnquiry({ kind: 'booking', name: 'Bob\r\nBcc: x@y.z', email: 'a@b.co', phone: '1', details: '<script>' , requestType: 'Free Damp Inspection' }).lead;
  const m = buildNotificationEmail(lead, config);
  assert.ok(!/[\r\n]/.test(m.subject));
  assert.ok(m.subject.startsWith('FREE INSPECTION request'));
  assert.ok(!m.html.includes('<script>'));
});

test('handler: 405 on GET, 503 when unconfigured, 200 and sends when configured', async () => {
  let r = res(); await handler({ method: 'GET', headers: {} }, r, { env }); assert.equal(r.code, 405);
  r = res(); await handler({ method: 'POST', headers: {}, body: { kind: 'booking', name: 'A', email: 'a@b.co', phone: '1' } }, r, { env: {} }); assert.equal(r.code, 503);
  const tx = fakeTx();
  r = res(); await handler({ method: 'POST', headers: {}, body: { kind: 'booking', name: 'A', email: 'a@b.co', phone: '1' } }, r, { env, transporter: tx });
  assert.equal(r.code, 200); assert.equal(tx.sent.length, 1);
  assert.equal(tx.sent[0].to, env.SMTP_USER);
  assert.equal(tx.sent[0].replyTo.address, 'a@b.co');
});

test('handler: honeypot returns 200 and sends nothing; bad input is 400', async () => {
  const tx = fakeTx();
  let r = res(); await handler({ method: 'POST', headers: {}, body: { hp: 'bot', name: 'A', email: 'a@b.co', phone: '1' } }, r, { env, transporter: tx });
  assert.equal(r.code, 200); assert.equal(tx.sent.length, 0);
  r = res(); await handler({ method: 'POST', headers: {}, body: { kind: 'contact', name: '' } }, r, { env, transporter: tx });
  assert.equal(r.code, 400);
});

test('ack email sent only when ENQUIRY_SEND_ACK=1', async () => {
  const tx = fakeTx();
  const r = res(); await handler({ method: 'POST', headers: {}, body: { kind: 'contact', name: 'Al', email: 'a@b.co', details: 'hi' } }, r, { env: { ...env, ENQUIRY_SEND_ACK: '1' }, transporter: tx });
  assert.equal(tx.sent.length, 2);
});
