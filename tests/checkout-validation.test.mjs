import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/load-module.mjs';
import { USER, PET, RECORD, fixture, roles, payment, next, request } from './helpers/scenario.mjs';

const valid = () => ({ customer: { name: 'Synthetic Customer', phone: '00000000' }, delivery: { zoneName: 'Synthetic Zone', address: 'Synthetic address' }, paymentMethod: 'sinpe-movil', honeypot: '', idempotencyKey: RECORD, items: [{ productId: PET, quantity: 1 }] });
function checkout({ rpcResult = { data: [{ order_id: RECORD, order_number: 'SYNTHETIC', subtotal: 1, delivery_fee: 0, total: 1, status: 'recibido' }], error: null }, rpcThrow = false, allowed = true, ...options } = {}) {
  const db = fixture({ user: null, ...options }), calls = [];
  const loaded = load('src/app/api/orders/route.ts', {
    'next/server': next, '@/config/payment': payment, '@/lib/auth/roles': roles,
    '@/lib/supabase/server': { createClient: async () => db.client },
    '@/lib/supabase/admin': { supabaseAdmin: { rpc: async (...args) => { calls.push(args); if (rpcThrow) throw new Error('Synthetic RPC failure'); return rpcResult; } } },
    '@/lib/rate-limit': { REDIS_BUDGET_MS: 1000, rateLimitByIp: async () => ({ allowed, limit: 10, remaining: 0, reset: 600 }), createRateLimitHeaders: () => ({ 'Retry-After': '600' }) },
  });
  return { ...loaded, db, calls };
}

const invalids = [
  ['missing customer', p => { delete p.customer; }], ['short name', p => { p.customer.name = ' a '; }],
  ['phone', p => { p.customer.phone = '123'; }], ['missing zone', p => { p.delivery.zoneName = ''; }],
  ['short address', p => { p.delivery.address = 'short'; }], ['payment method', p => { p.paymentMethod = 'invalid'; }],
  ['honeypot', p => { p.honeypot = 'synthetic-bot'; }], ['idempotency key', p => { p.idempotencyKey = 'invalid'; }],
  ['no products', p => { p.items = []; }], ['missing product id', p => { p.items[0].productId = ''; }],
  ...[0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1, 1000000000].map(q => ['quantity ' + q, p => { p.items[0].quantity = q; }]),
];
for (const [name, change] of invalids) test('checkout rejects ' + name + ' without RPC', async () => {
  const p = valid(); change(p); const r = checkout();
  const response = await r.POST(request('POST', p));
  assert.equal(response.status, 400); assert.equal((await response.json()).code, 'INVALID_PAYLOAD'); assert.equal(r.calls.length, 0);
});
test('checkout malformed JSON returns 400 without RPC', async () => {
  const r = checkout(); const response = await r.POST(new Request('https://synthetic.invalid/api/orders', { method: 'POST', body: '{' }));
  assert.equal(response.status, 400); assert.equal((await response.json()).code, 'INVALID_JSON'); assert.equal(r.calls.length, 0);
});
test('SECURITY: checkout JSON null must return controlled 400 without RPC', async () => {
  const r = checkout();
  const response = await r.POST(request('POST', null));
  assert.equal(response.status, 400); assert.equal((await response.json()).code, 'INVALID_PAYLOAD');
  assert.equal(r.calls.length, 0); assert.equal(r.db.authCalls.length, 0);
});
for (const payload of [[], ['synthetic'], '', 'synthetic', 0, 1, false, true]) {
  test('checkout rejects incompatible JSON root ' + JSON.stringify(payload), async () => {
    const r = checkout(), response = await r.POST(request('POST', payload));
    assert.equal(response.status, 400); assert.equal((await response.json()).code, 'INVALID_PAYLOAD');
    assert.equal(r.calls.length, 0); assert.equal(r.db.authCalls.length, 0);
  });
}
for (const [code, status] of [['INVALID_PAYLOAD', 400], ['DELIVERY_ZONE_NOT_FOUND', 404], ['PRODUCT_NOT_FOUND', 404], ['INSUFFICIENT_STOCK', 409], ['IDEMPOTENCY_CONFLICT', 409], ['synthetic internal', 500]]) {
  test('checkout maps simulated RPC ' + code, async () => {
    const r = checkout({ rpcResult: { data: null, error: { message: code } } });
    const response = await r.POST(request('POST', valid()));
    assert.equal(response.status, status); assert.equal((await response.json()).code, status === 500 ? 'INTERNAL_ERROR' : code);
    assert.equal(r.calls.length, 1);
  });
}
for (const options of [{ rpcThrow: true }, { rpcResult: { data: null, error: null } }]) test('checkout RPC missing/throwing result returns 500 ' + JSON.stringify(options), async () => {
  const r = checkout(options); assert.equal((await r.POST(request('POST', valid()))).status, 500); assert.equal(r.calls.length, 1);
});
for (const role of ['admin', 'operator', 'invalid']) test('checkout rejects authenticated role ' + role, async () => {
  const r = checkout({ user: { id: USER }, role });
  assert.equal((await r.POST(request('POST', valid()))).status, 403); assert.equal(r.calls.length, 0);
});
for (const [name, options, status] of [
  ['missing profile', { user: { id: USER }, profileMissing: true }, 403],
  ['profile error', { user: { id: USER }, fail: q => q.table === 'profiles' }, 500],
  ['invalid auth', { authError: { name: 'AuthApiError' } }, 500],
]) test('checkout rejects ' + name, async () => {
  const r = checkout(options); assert.equal((await r.POST(request('POST', valid()))).status, status); assert.equal(r.calls.length, 0);
});
test('checkout authenticated customer sends session ownership and server-computed payload hash', async () => {
  const r = checkout({ user: { id: USER } }), p = valid();
  p.userId = 'attacker-supplied'; p.items[0].price = 0.01;
  assert.equal((await r.POST(request('POST', p))).status, 201);
  const [name, args] = r.calls[0]; assert.equal(name, 'create_checkout_order'); assert.equal(args.p_user_id, USER);
  assert.equal(args.p_idempotency_key, RECORD); assert.match(args.p_idempotency_payload_hash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(args.p_items).includes('price'), false);
  assert.ok(r.db.queries.every(q => q.filters.some(([k, v]) => k === 'id' && v === USER)));
});
test('checkout duplicate product quantities normalize independently of payload order', async () => {
  const p = valid(); p.items.push({ productId: PET, quantity: 2 });
  const r = checkout(); assert.equal((await r.POST(request('POST', p))).status, 201);
  assert.equal(r.calls[0][1].p_items.length, 1); assert.equal(r.calls[0][1].p_items[0].quantity, 3);
});
test('checkout simulated rate rejection stops parsing/authentication/RPC', async () => {
  const r = checkout({ allowed: false }); const response = await r.POST(request('POST', {}));
  assert.equal(response.status, 429); assert.equal(r.calls.length, 0); assert.equal(r.db.authCalls.length, 0);
});
