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
  failureReason?: "missing_config" | "timeout" | "redis_error" | "invalid_response";
  durationMs?: number;
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

export const REDIS_BUDGET_MS = 1000;

// One final write includes the TTL. Lua errors do not roll back earlier writes,
// so validate everything before SETEX instead of using INCR then EXPIRE.
const COUNTER_SCRIPT = `
local ttl = tonumber(ARGV[1])
if not ttl or ttl < 1 or ttl ~= math.floor(ttl) then
  return redis.error_reply("INVALID_TTL")
end
local raw = redis.call("GET", KEYS[1])
local count = 0
if raw then
  count = tonumber(raw)
  if not count or count < 1 or count ~= math.floor(count)
    or count >= 9007199254740991 then
    return redis.error_reply("INVALID_COUNTER")
  end
end
local next_count = count + 1
redis.call("SETEX", KEYS[1], ttl, string.format("%.0f", next_count))
return next_count
`;

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
  };
}

export async function rateLimitByIp(
  headers: Headers,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const startedAt = performance.now();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const failOpen = (
    failureReason: NonNullable<RateLimitAllowedResult["failureReason"]>,
  ) => ({
    ...createFailOpenResult(headers, options),
    failureReason,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
  });

  try {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token =
      process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    if (!url || !token) return failOpen("missing_config");

    const ipHash = hashIp(getClientIp(headers));
    const now = Date.now();
    const windowMs = options.windowSeconds * 1000;
    const windowId = Math.floor(now / windowMs);
    const resetAt = (windowId + 1) * windowMs;
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
    const key = `rate:${options.endpoint}:${ipHash}:${windowId}`;
    const deadline = new Promise<{ kind: "timeout" }>((resolve) => {
      timer = setTimeout(() => {
        // Resolve first so an abort rejection cannot override the timeout reason.
        resolve({ kind: "timeout" });
        controller.abort();
      }, Math.max(0, REDIS_BUDGET_MS - (performance.now() - startedAt)));
    });
    // Independent signal per checkout; never share an aborted client/controller.
    const redis = new Redis({
      url,
      token,
      signal: () => controller.signal,
      retry: { retries: 0 },
      enableAutoPipelining: false,
    });
    // Attach both handlers immediately: late completion/rejection is consumed.
    const operation = Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) throw new Error("Redis deadline elapsed");
        return redis.eval(COUNTER_SCRIPT, [key], [options.windowSeconds + 60]);
      })
      .then(
        (count) => ({ kind: "result" as const, count }),
        () => ({ kind: "error" as const }),
      );
    const outcome = await Promise.race([deadline, operation]);
    if (
      outcome.kind === "timeout" ||
      performance.now() - startedAt >= REDIS_BUDGET_MS
    ) {
      return failOpen("timeout");
    }
    if (outcome.kind === "error") return failOpen("redis_error");
    const count = outcome.count;
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) {
      return failOpen("invalid_response");
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
  } catch {
    return failOpen("redis_error");
  } finally {
    clearTimeout(timer);
    controller.abort();
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
