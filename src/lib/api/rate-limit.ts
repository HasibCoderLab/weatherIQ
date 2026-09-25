/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for a single serverless instance / dev. For multi-instance
 * production deployments, swap the store for Redis/Upstash (PRD §38)
 * — the interface is intentionally compatible with that move.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Opportunistic cleanup to avoid unbounded growth.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.hits.length === 0 || now - (b.hits[b.hits.length - 1] ?? 0) > windowMs) {
        buckets.delete(k);
      }
    }
  }

  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

/** Best-effort client identity from proxy headers. */
export function clientKey(request: Request, route: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "local";
  return `${route}:${ip}`;
}
