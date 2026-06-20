import "server-only";

import { createHash } from "crypto";
import { isIP } from "net";
import { Redis } from "@upstash/redis";

type RateLimitOptions = {
  endpoint: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitAllowedResult = {
  allowed: true;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  ipHash: string;
  error?: unknown;
};

type RateLimitBlockedResult = {
  allowed: false;
  limit: number;
  remaining: 0;
  resetAt: number;
  retryAfter: number;
  ipHash: string;
};

export type RateLimitResult =
  | RateLimitAllowedResult
  | RateLimitBlockedResult;

let redisClient: Redis | null = null;

function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error("Missing Upstash Redis rate limit environment variables");
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function cleanIpCandidate(value: string) {
  let candidate = value.trim().replace(/^"|"$/g, "");

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(":"));
  }

  return candidate;
}

function getClientIp(headers: Headers) {
  const candidates = [
    ...(headers.get("x-forwarded-for")?.split(",") ?? []),
    headers.get("x-real-ip"),
  ].filter((value): value is string => typeof value === "string");

  for (const candidate of candidates) {
    const ip = cleanIpCandidate(candidate);

    if (isIP(ip)) {
      return ip;
    }
  }

  return "unknown";
}

function hashIp(ip: string) {
  const hashSecret =
    process.env.RATE_LIMIT_IP_HASH_SECRET ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    "amipet-rate-limit";

  return createHash("sha256")
    .update(`${hashSecret}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

function createFailOpenResult(
  headers: Headers,
  options: RateLimitOptions,
  error: unknown,
): RateLimitAllowedResult {
  const now = Date.now();
  const resetAt =
    Math.floor(now / (options.windowSeconds * 1000) + 1) *
    options.windowSeconds *
    1000;

  return {
    allowed: true,
    limit: options.limit,
    remaining: options.limit,
    resetAt,
    retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    ipHash: hashIp(getClientIp(headers)),
    error,
  };
}

export async function rateLimitByIp(
  headers: Headers,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient();
    const ipHash = hashIp(getClientIp(headers));
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;
    const windowId = Math.floor(now / windowMs);
    const resetAt = (windowId + 1) * windowMs;
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
    const key = `rate:${options.endpoint}:${ipHash}:${windowId}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, options.windowSeconds + 60);
    }

    if (count > options.limit) {
      return {
        allowed: false,
        limit: options.limit,
        remaining: 0,
        resetAt,
        retryAfter,
        ipHash,
      };
    }

    return {
      allowed: true,
      limit: options.limit,
      remaining: options.limit - count,
      resetAt,
      retryAfter,
      ipHash,
    };
  } catch (error) {
    return createFailOpenResult(headers, options, error);
  }
}

export function createRateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfter),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
