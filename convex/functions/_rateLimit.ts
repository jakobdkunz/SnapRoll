import type { Id } from "../_generated/dataModel";

interface RateLimitResult {
  allowed: boolean;
  attempts: number;
  limit: number;
  resetAt?: number;
}

/**
 * A simple, generous rate limiter using the existing `rateLimits` table pattern.
 * It prevents accidental infinite loops from burning quotas while being human-friendly.
 */
export async function checkAndIncrementRateLimit(
  ctx: any,
  userId: Id<"users">,
  key: string,
  windowMs: number,
  maxAttempts: number,
  blockMs?: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const buckets = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_key", (q: any) => q.eq("userId", userId).eq("key", key))
    .order("desc")
    .collect();

  let bucket = buckets.find((b: any) => now - b.windowStart < windowMs) || null;

  // If any active block exists, deny
  const blocked = buckets.find((b: any) => b.blockedUntil && b.blockedUntil > now);
  if (blocked) {
    return {
      allowed: false,
      attempts: (bucket?.count ?? 0),
      limit: maxAttempts,
      resetAt: blocked.blockedUntil,
    };
  }

  if (!bucket) {
    const id = await ctx.db.insert("rateLimits", {
      userId,
      key,
      windowStart: now,
      count: 0,
      blockedUntil: undefined as number | undefined,
    });
    bucket = await ctx.db.get(id);
  }

  const attempts = (bucket as any).count + 1;
  if (attempts > maxAttempts) {
    const blockedUntil = blockMs ? now + blockMs : undefined;
    await ctx.db.patch((bucket as any)._id, {
      count: attempts,
      blockedUntil,
    });
    return { allowed: false, attempts, limit: maxAttempts, resetAt: blockedUntil };
  }

  await ctx.db.patch((bucket as any)._id, { count: attempts });
  return { allowed: true, attempts, limit: maxAttempts };
}


