import test from 'node:test';
import assert from 'node:assert/strict';
import { load, limiter, headers, flush } from './helpers/load-module.mjs';

const payload = {
  customer: { name: 'Synthetic Customer', phone: '00000000' },
  delivery: { zoneName: 'Synthetic Zone', address: 'Synthetic address only' },
  paymentMethod: 'sinpe-movil', honeypot: '',
  idempotencyKey: '00000000-0000-4000-8000-000000000000',
  items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
};

function route(rateLimiter, rpc) {
  const logs = [];
  const routeModule = load('src/app/api/orders/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/config/payment': { paymentMethods: [{ id: 'sinpe-movil' }] },
    '@/lib/supabase/admin': { supabaseAdmin: { rpc } },
    '@/lib/auth/roles': { isCustomerRole: (role) => role === 'customer' },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }) },
    '@/lib/rate-limit': rateLimiter,
  }, { console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) } });
  return { ...routeModule, logs };
}

function request() {
  return new Request('https://checkout.invalid/api/orders', { method: 'POST', headers, body: JSON.stringify(payload) });
}

test('Redis fails: actual limiter continues to simulated RPC exactly once, sanitized logs', async () => {
  class Redis { async eval() { throw new Error('synthetic-secret URL token IP'); } }
  const l = limiter(Redis); let calls = 0;
  const r = route(l, async (name, args) => {
    calls++; assert.equal(name, 'create_checkout_order'); assert.equal(args.p_user_id, null);
    return { data: [{ order_id: 'synthetic', order_number: 'TEST', status: 'recibido', subtotal: 1, delivery_fee: 0, total: 1 }], error: null };
  });
  assert.equal((await r.POST(request())).status, 201); assert.equal(calls, 1);
  const logs = JSON.stringify(r.logs);
  for (const sensitive of ['synthetic-secret', '192.0.2.1', 'Synthetic Customer', 'Synthetic address', 'ipHash']) assert.ok(!logs.includes(sensitive));
  assert.match(logs, /redis_error/); assert.equal(l.time.pending(), 0);
});

test('valid count 11: 429 and no RPC', async () => {
  class Redis { async eval() { return 11; } }
  const l = limiter(Redis); let calls = 0;
  const r = route(l, async () => { calls++; throw new Error('must not run'); });
  const response = await r.POST(request());
  assert.equal(response.status, 429); assert.equal((await response.json()).code, 'RATE_LIMITED');
  assert.ok(response.headers.has('Retry-After')); assert.equal(calls, 0); assert.equal(l.time.pending(), 0);
});

test('timeout also reaches simulated RPC exactly once', async () => {
  class Redis { eval() { return new Promise(() => {}); } }
  const l = limiter(Redis); let calls = 0;
  const r = route(l, async () => { calls++; return { data: [{ order_id: 'synthetic' }], error: null }; });
  const pending = r.POST(request()); await l.time.advance(1000);
  assert.equal((await pending).status, 201); assert.equal(calls, 1); assert.equal(l.time.pending(), 0);
});

test('late Redis resolution or rejection after checkout success never repeats the RPC', async (t) => {
  for (const outcome of ['resolve', 'reject']) {
    await t.test(outcome, async () => {
      let settleRedis;
      let redisSignal;
      let redisSettled = false;
      let rpcCalls = 0;
      const unhandled = [];
      const onUnhandled = (reason) => unhandled.push(reason);
      process.on('unhandledRejection', onUnhandled);

      try {
        class Redis {
          constructor(config) { redisSignal = config.signal(); }
          eval() {
            // Deliberately ignore abort to exercise a dependency completing late.
            return new Promise((resolve, reject) => {
              settleRedis = () => {
                redisSettled = true;
                if (outcome === 'reject') reject(new Error('synthetic late rejection'));
                else resolve(99); // Would block if incorrectly reconsidered.
              };
            });
          }
        }
        const l = limiter(Redis);
        const r = route(l, async () => {
          rpcCalls++;
          return {
            data: [{ order_id: 'synthetic-late', order_number: 'TEST-LATE', status: 'recibido', subtotal: 1, delivery_fee: 0, total: 1 }],
            error: null,
          };
        });
        const pending = r.POST(request());
        await flush();
        await l.time.advance(999);
        assert.equal(rpcCalls, 0);
        assert.equal(redisSettled, false);
        await l.time.advance(2);

        const response = await pending;
        const body = await response.json();
        assert.equal(response.status, 201);
        assert.equal(body.orderId, 'synthetic-late');
        assert.equal(rpcCalls, 1);
        assert.equal(redisSettled, false);
        assert.equal(redisSignal.aborted, true);
        assert.match(JSON.stringify(r.logs), /timeout/);

        settleRedis();
        await flush();
        // Let Node reach its unhandled-rejection checkpoint, beyond microtasks.
        await new Promise((resolve) => setImmediate(resolve));
        await flush();
        assert.equal(redisSettled, true);
        assert.equal(response.status, 201);
        assert.equal(body.orderId, 'synthetic-late');
        assert.equal(rpcCalls, 1);
        assert.deepEqual(unhandled, []);
        assert.equal(l.time.pending(), 0);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });
  }
});
