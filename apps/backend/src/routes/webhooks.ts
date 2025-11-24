import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

function verifySignature(provider: string, rawBody: string, signature: string | undefined) {
  // Stub verification; replace with provider-specific logic (e.g., HMAC with shared secret)
  if (!signature) return false;
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return computed === signature;
}

router.post('/webhooks/google', (req, res) => {
  const sig = req.header('x-signature');
  const raw = JSON.stringify(req.body);
  if (!verifySignature('google', raw, sig)) {
    return res.status(400).json({ error: 'invalid signature' });
  }
  // TODO: process event payload
  return res.json({ status: 'ok' });
});

router.post('/webhooks/notion', (req, res) => {
  const sig = req.header('x-signature');
  const raw = JSON.stringify(req.body);
  if (!verifySignature('notion', raw, sig)) {
    return res.status(400).json({ error: 'invalid signature' });
  }
  // TODO: process event payload
  return res.json({ status: 'ok' });
});

export default router;
