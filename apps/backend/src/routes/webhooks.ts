import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// NOTE: For real HMAC validation you need the raw request body (not parsed JSON).
// Configure Express to keep raw body for these routes or use a separate raw parser middleware.
function verifySignature(provider: string, rawBody: string, signature?: string | null) {
  if (!signature) return false;
  const secrets: Record<string, string | undefined> = {
    google: process.env.GOOGLE_WEBHOOK_TOKEN, // Google channels use token you set when creating the channel
    notion: process.env.NOTION_SIGNING_SECRET,
    asana: process.env.ASANA_WEBHOOK_SECRET,
    linear: process.env.LINEAR_SIGNING_SECRET,
    default: process.env.WEBHOOK_SECRET
  };
  const secret = secrets[provider] || secrets.default;
  if (!secret) return false;
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return computed === signature;
}

router.post('/webhooks/google', (req, res) => {
  // Google push notifications typically validate via the channel token you set; here we HMAC-check if provided.
  const sig = req.header('x-signature');
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  if (!verifySignature('google', raw, sig)) {
    return res.status(400).json({ error: 'invalid signature' });
  }
  // TODO: process Google Calendar event notifications
  return res.json({ status: 'ok' });
});

router.post('/webhooks/notion', (req, res) => {
  const sig = req.header('x-notion-signature') || req.header('x-signature');
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  if (!verifySignature('notion', raw, sig)) {
    return res.status(400).json({ error: 'invalid signature' });
  }
  // TODO: process Notion webhook payload
  return res.json({ status: 'ok' });
});

router.post('/webhooks/asana', (req, res) => {
  // Asana handshake uses X-Hook-Secret echoed back; signature here is a placeholder.
  const sig = req.header('x-hook-signature') || req.header('x-signature');
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  if (!verifySignature('asana', raw, sig)) {
    return res.status(400).json({ error: 'invalid signature' });
  }
  return res.json({ status: 'ok' });
});

router.post('/webhooks/linear', (req, res) => {
  const sig = req.header('x-linear-signature') || req.header('x-signature');
  const raw = (req as any).rawBody || JSON.stringify(req.body);
  if (!verifySignature('linear', raw, sig)) {
    return res.status(400).json({ error: 'invalid signature' });
  }
  // TODO: process Linear webhook payload
  return res.json({ status: 'ok' });
});

export default router;
