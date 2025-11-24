import { Request, Response, NextFunction } from 'express';

// Simple in-memory token bucket per user/key. Replace with Redis for multi-instance.
const buckets: Record<string, { tokens: number; reset: number }> = {};

export function rateLimit(options: { key: string; tokens: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.userId || req.ip;
    const bucketKey = `${userId}:${options.key}`;
    const now = Date.now();
    const bucket = buckets[bucketKey];
    if (!bucket || bucket.reset < now) {
      buckets[bucketKey] = { tokens: options.tokens - 1, reset: now + options.windowMs };
      return next();
    }
    if (bucket.tokens <= 0) {
      const retry = Math.max(0, Math.floor((bucket.reset - now) / 1000));
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfterSeconds: retry });
    }
    bucket.tokens -= 1;
    return next();
  };
}
