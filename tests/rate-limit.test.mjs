import test from 'node:test';
import assert from 'node:assert/strict';
import { limiter, clock, options, headers, flush, fakeEnv, sdk } from './helpers/load-module.mjs';

test('external network is prohibited and environment is synthetic', async () => {
  assert.throws(() => fetch('https://example.com'), /prohibited/);
  const { connect } = await import('node:net');
  assert.throws(() => connect(443, 'example.com'), /prohibited/);
});

test('atomic EVAL; 1-10 allowed, 11 blocked, next window independent', async () => {
  const counts = new Map();
  class Redis {
    constructor(config) {
      assert.equal(config.retry.retries, 0);
      assert.equal(config.enableAutoPipelining, false);
    }
    async eval(script, keys, args) {
      assert.match(script, /redis.call\("SETEX"/);
      assert.doesNotMatch(script, /redis.call\("(?:INCR|EXPIRE)"/);
      assert.ok(script.indexOf('INVALID_COUNTER') < script.indexOf('redis.call("SETEX"'));
      assert.equal(args[0], 660);
      const count = (counts.get(keys[0]) ?? 0) + 1; counts.set(keys[0], count); return count;
    }
  }
  const l = limiter(Redis);
  for (let i = 1; i <= 11; i++) {
    const result = await l.rateLimitByIp(headers, options);
    assert.equal(result.allowed, i <= 10);
    assert.equal(result.remaining, Math.max(0, 10 - i));
  }
  await l.time.advance(600000);
  assert.equal((await l.rateLimitByIp(headers, options)).remaining, 9);
  assert.equal(l.time.pending(), 0);
});

test('missing configuration and KV fallback', async () => {
  class Redis { async eval() { return 1; } }
  assert.equal((await limiter(Redis, clock(), {}).rateLimitByIp(headers, options)).failureReason, 'missing_config');
  const env = { KV_REST_API_URL: fakeEnv.UPSTASH_REDIS_REST_URL, KV_REST_API_TOKEN: 'fake' };
  assert.equal((await limiter(Redis, clock(), env).rateLimitByIp(headers, options)).remaining, 9);
});

test('invalid counters fail open and clear timers', async () => {
  for (const value of [null, undefined, '1', {}, [], 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    class Redis { async eval() { return value; } }
    const l = limiter(Redis);
    const result = await l.rateLimitByIp(headers, options);
    assert.equal(result.allowed, true); assert.equal(result.failureReason, 'invalid_response');
    assert.equal(l.time.pending(), 0);
  }
});

test('connection/deleted database/SETEX failure fail open without leaking errors', async () => {
  for (const message of ['ECONNREFUSED', 'database deleted', 'SETEX failed synthetic-secret']) {
    class Redis { async eval() { throw new Error(message); } }
    const l = limiter(Redis); const result = await l.rateLimitByIp(headers, options);
    assert.equal(result.allowed, true); assert.equal(result.failureReason, 'redis_error');
    assert.ok(!JSON.stringify(result).includes(message)); assert.equal(l.time.pending(), 0);
  }
});

test('SDK HTTP errors 401/403/404/500 and malformed response; exactly one request', async () => {
  for (const status of [401, 403, 404, 500, 200]) {
    const time = clock(); let calls = 0;
    const Redis = sdk(async () => { calls++; return new Response(status === 200 ? 'invalid json' : '{"error":"synthetic"}', { status }); }, time);
    const l = limiter(Redis, time); const result = await l.rateLimitByIp(headers, options);
    assert.equal(result.allowed, true); assert.equal(result.failureReason, 'redis_error');
    assert.equal(calls, 1); assert.equal(time.pending(), 0);
  }
});

test('SDK successful EVAL and network rejection have no retries', async () => {
  for (const reject of [false, true]) {
    const time = clock(); let calls = 0;
    const Redis = sdk(async (_url, init) => {
      calls++; const body = JSON.parse(init.body); assert.equal(body[0], 'eval');
      if (reject) throw new Error('network failed');
      return new Response('{"result":1}');
    }, time);
    const result = await limiter(Redis, time).rateLimitByIp(headers, options);
    assert.equal(result.allowed, true); assert.equal(result.failureReason, reject ? 'redis_error' : undefined);
    assert.equal(calls, 1); assert.equal(time.pending(), 0);
  }
});

test('SDK never responds: deadline aborts active request at 1000ms', async () => {
  const time = clock(); let active = 0; let calls = 0;
  const Redis = sdk((_url, { signal }) => new Promise((_resolve, reject) => {
    calls++; active++;
    signal.addEventListener('abort', () => { active--; reject(new Error('aborted')); }, { once: true });
  }), time);
  const l = limiter(Redis, time); const pending = l.rateLimitByIp(headers, options);
  await flush(); assert.equal(active, 1);
  await time.advance(999); assert.equal(active, 1);
  await time.advance(1); const result = await pending;
  assert.equal(result.failureReason, 'timeout'); assert.equal(active, 0);
  assert.equal(calls, 1); assert.equal(time.pending(), 0);
});

test('body reading is also canceled by the same total deadline', async () => {
  const time = clock(); let active = 0;
  const Redis = sdk(async (_url, { signal }) => ({
    ok: true, headers: new Headers(), text: () => new Promise((_resolve, reject) => {
      active++; signal.addEventListener('abort', () => { active--; reject(new Error('aborted body')); }, { once: true });
    }),
  }), time);
  const pending = limiter(Redis, time).rateLimitByIp(headers, options);
  await flush(); await time.advance(1000);
  assert.equal((await pending).failureReason, 'timeout'); assert.equal(active, 0); assert.equal(time.pending(), 0);
});

test('late completion/rejection is consumed; no unhandled rejections', async () => {
  for (const reject of [false, true]) {
    let finish; let signal;
    class Redis {
      constructor(config) { signal = config.signal(); }
      eval() { return new Promise((resolve, fail) => { finish = reject ? fail : resolve; }); }
    }
    const l = limiter(Redis); const pending = l.rateLimitByIp(headers, options);
    await flush(); await l.time.advance(1000);
    const result = await pending; assert.equal(result.failureReason, 'timeout'); assert.equal(signal.aborted, true);
    finish(reject ? new Error('late error') : 99); await flush();
    assert.equal(result.allowed, true); assert.equal(l.time.pending(), 0);
  }
});

test('concurrent buyers have independent cancellation', async () => {
  const configs = [];
  class Redis {
    constructor(config) { this.config = config; configs.push(config); }
    eval() {
      if (configs.length === 1) return new Promise((_r, reject) => this.config.signal().addEventListener('abort', () => reject(new Error('abort')), { once: true }));
      return Promise.resolve(1);
    }
  }
  const l = limiter(Redis); const first = l.rateLimitByIp(headers, options); await flush();
  await l.time.advance(500);
  assert.equal((await l.rateLimitByIp(new Headers({ 'x-real-ip': '192.0.2.2' }), options)).allowed, true);
  assert.notEqual(configs[0].signal(), configs[1].signal());
  assert.equal(configs[0].signal().aborted, false);
  await l.time.advance(500); assert.equal((await first).failureReason, 'timeout'); assert.equal(l.time.pending(), 0);
});


test('slow SDK response is canceled and its scheduled delivery is cleared', async () => {
  const time = clock(); let active = 0; let deliveries = 0;
  const Redis = sdk((_url, { signal }) => new Promise((resolve, reject) => {
    active++;
    const timer = time.setTimeout(() => { active--; deliveries++; resolve(new Response('{"result":99}')); }, 1500);
    signal.addEventListener('abort', () => {
      time.clearTimeout(timer); active--; reject(new Error('aborted'));
    }, { once: true });
  }), time);
  const pending = limiter(Redis, time).rateLimitByIp(headers, options);
  await flush(); await time.advance(1000);
  assert.equal((await pending).failureReason, 'timeout');
  await time.advance(1000);
  assert.equal(active, 0); assert.equal(deliveries, 0); assert.equal(time.pending(), 0);
});

test('result arriving after budget is ignored even before timer callback runs', async () => {
  const time = clock(); let elapsed = 0;
  class Redis { async eval() { elapsed = 1001; return 99; } }
  const limiterModule = limiter(Redis, time);
  // The normal clock test above exercises timer callbacks. Here advance monotonic
  // time synchronously inside the operation, simulating a busy event loop.
  const custom = (await import('./helpers/load-module.mjs')).load('src/lib/rate-limit.ts', {
    '@upstash/redis': { Redis },
  }, {
    process: { env: fakeEnv }, performance: { now: () => elapsed },
    setTimeout: time.setTimeout, clearTimeout: time.clearTimeout,
  });
  assert.equal(limiterModule.REDIS_BUDGET_MS, 1000);
  const result = await custom.rateLimitByIp(headers, options);
  assert.equal(result.allowed, true); assert.equal(result.failureReason, 'timeout'); assert.equal(time.pending(), 0);
});
