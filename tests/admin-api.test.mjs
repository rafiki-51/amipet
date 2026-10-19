import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/load-module.mjs';
import { USER, OTHER, RECORD, fixture, authModules, next, request, payment, paymentStatus, ordersConfig, quietConsole } from './helpers/scenario.mjs';

const specs = [
  { path: 'status', verb: 'PATCH', body: { status: 'preparando' }, rpc: 'transition_order_status' },
  { path: 'payment-status', verb: 'PATCH', body: { paymentStatus: 'paid' }, rpc: 'transition_order_payment_status' },
  { path: 'link-customer', verb: 'POST', body: { userId: OTHER }, rpc: 'link_order_to_customer_manual' },
];
function admin(spec, { result = { data: [{ order_id: RECORD, status: 'preparando', payment_status: 'paid', user_id: OTHER, user_link_source: 'manual-support' }], error: null }, throwing = false, ...options } = {}) {
  const db = fixture({ role: 'admin', ...options }), calls = [], auth = authModules(db);
  const loaded = load('src/app/api/admin/orders/[id]/' + spec.path + '/route.ts', {
    'next/server': next, '@/config/orders': ordersConfig, '@/lib/admin/auth': auth.admin,
    '@/lib/supabase/admin': { supabaseAdmin: { rpc: async (...args) => { calls.push(args); if (throwing) throw new Error('synthetic'); return result; } } },
  }, { console: quietConsole });
  return { ...loaded, db, calls };
}
const context = (id = RECORD) => ({ params: Promise.resolve({ id }) });
for (const spec of specs) {
  for (const role of ['admin', 'operator']) test(spec.path + ': permits ' + role + ' and attributes actor', async () => {
    const r = admin(spec, { role }); const response = await r[spec.verb](request(spec.verb, spec.body), context());
    assert.equal(response.status, 200); assert.equal(r.calls.length, 1); assert.equal(r.calls[0][0], spec.rpc);
    assert.equal(r.calls[0][1].p_changed_by, USER); assert.equal(r.calls[0][1].p_order_id, RECORD);
  });
  for (const [name, options, status] of [['anonymous', { user: null }, 401], ['customer', { role: 'customer' }, 403], ['missing profile', { profileMissing: true }, 403], ['profile error', { fail: q => q.table === 'profiles' }, 403]]) test(spec.path + ': rejects ' + name + ' before RPC', async () => {
    const r = admin(spec, options); assert.equal((await r[spec.verb](request(spec.verb, spec.body), context())).status, status); assert.equal(r.calls.length, 0);
  });
  test(spec.path + ': rejects malformed JSON and invalid payload', async () => {
    const r = admin(spec);
    for (const req of [new Request('https://synthetic.invalid', { method: spec.verb, body: '{' }), request(spec.verb, {})]) {
      assert.equal((await r[spec.verb](req, context())).status, 400);
    }
    assert.equal(r.calls.length, 0);
  });
  for (const options of [{ result: { data: [], error: null } }, { throwing: true }]) test(spec.path + ': empty/throwing RPC fails closed ' + JSON.stringify(options), async () => {
    const r = admin(spec, options); assert.equal((await r[spec.verb](request(spec.verb, spec.body), context())).status, 500);
  });
}
test('cancelation requires nonempty reason and forwards trimmed reason', async () => {
  const r = admin(specs[0]);
  assert.equal((await r.PATCH(request('PATCH', { status: 'cancelado', cancellationReason: '  ' }), context())).status, 400);
  assert.equal(r.calls.length, 0);
  assert.equal((await r.PATCH(request('PATCH', { status: 'cancelado', cancellationReason: ' synthetic reason ' }), context())).status, 200);
  assert.equal(r.calls[0][1].p_cancellation_reason, 'synthetic reason');
});
test('SECURITY: admin status JSON null must return controlled 400 without RPC', async () => {
  const r = admin(specs[0]);
  const response = await r.PATCH(request('PATCH', null), context());
  assert.equal(response.status, 400); assert.equal((await response.json()).code, 'INVALID_PAYLOAD'); assert.equal(r.calls.length, 0);
});
for (const payload of [[], ['synthetic'], '', 'synthetic', 0, 1, false, true]) {
  test('admin status rejects incompatible JSON root ' + JSON.stringify(payload), async () => {
    const r = admin(specs[0]), response = await r.PATCH(request('PATCH', payload), context());
    assert.equal(response.status, 400); assert.equal((await response.json()).code, 'INVALID_PAYLOAD'); assert.equal(r.calls.length, 0);
  });
}
test('admin root validation does not bypass authentication or authorization', async () => {
  for (const [options, status] of [[{ user: null }, 401], [{ role: 'customer' }, 403]]) {
    const r = admin(specs[0], options);
    assert.equal((await r.PATCH(request('PATCH', null), context())).status, status);
    assert.equal(r.calls.length, 0);
  }
});
for (const [index, code, status] of [
  [0, 'INVALID_ORDER_TRANSITION', 409], [0, 'PAYMENT_REQUIRED', 409], [0, 'PAID_ORDER_CANNOT_BE_CANCELED', 409],
  [0, 'ORDER_NOT_FOUND', 404], [0, 'STOCK_RESTORE_FAILED', 500],
  [1, 'ORDER_CANCELED', 409], [1, 'INVALID_PAYMENT_TRANSITION', 409],
  [2, 'ORDER_ALREADY_LINKED', 409], [2, 'INVALID_TARGET_USER', 400],
]) test('admin maps simulated ' + code, async () => {
  const spec = specs[index], r = admin(spec, { result: { data: null, error: { message: code } } });
  const response = await r[spec.verb](request(spec.verb, spec.body), context());
  assert.equal(response.status, status); assert.equal((await response.json()).code, code);
});
test('payment only accepts paid and exact payload keys', async () => {
  const r = admin(specs[1]);
  for (const body of [{ paymentStatus: 'pending' }, { paymentStatus: 'paid', actor: OTHER }, null, []]) assert.equal((await r.PATCH(request('PATCH', body), context())).status, 400);
  assert.equal(r.calls.length, 0);
});
test('manual linking validates order/target UUID and exact keys', async () => {
  const r = admin(specs[2]);
  assert.equal((await r.POST(request('POST', { userId: OTHER }), context('invalid'))).status, 400);
  for (const body of [{ userId: 'invalid' }, { userId: OTHER, extra: true }, null]) assert.equal((await r.POST(request('POST', body), context())).status, 400);
  assert.equal(r.calls.length, 0);
});

function listing(options = {}) {
  const db = fixture({ role: 'admin', tables: { orders: [], delivery_zones: [] }, ...options });
  const auth = authModules(db);
  return { db, ...load('src/app/api/admin/orders/route.ts', {
    'next/server': next, '@/lib/admin/auth': auth.admin, '@/lib/supabase/admin': { supabaseAdmin: db.client },
    '@/config/payment': payment, '@/config/payment-status': paymentStatus, '@/config/orders': ordersConfig,
  }) };
}
test('admin listing applies four filters, stable ordering and pagination', async () => {
  const r = listing();
  const response = await r.GET(request('GET', null, '/api/admin/orders?page=2&limit=5&status=preparando&paymentStatus=pending&paymentMethod=sinpe-movil&zone=Synthetic'));
  assert.equal(response.status, 200); const q = r.db.queries.find(q => q.table === 'orders');
  assert.deepEqual(q.filters, [['status', 'preparando'], ['payment_status', 'pending'], ['payment_method', 'sinpe-movil'], ['addresses.delivery_zones.name', 'Synthetic']]);
  assert.deepEqual(q.range, [5, 9]); assert.equal(q.orders[0][0], 'created_at'); assert.equal(q.orders[1][0], 'id');
  const body = await response.json(); assert.equal(body.pagination.page, 2); assert.equal(body.pagination.limit, 5);
});
for (const query of ['page=0', 'limit=-1', 'status=invalid', 'paymentStatus=invalid', 'paymentMethod=invalid']) test('admin listing rejects ' + query, async () => {
  const r = listing(); assert.equal((await r.GET(request('GET', null, '/api/admin/orders?' + query))).status, 400);
  assert.equal(r.db.queries.filter(q => q.table === 'orders').length, 0);
});
test('admin listing never queries orders for customer or anonymous', async () => {
  for (const [options, status] of [[{ role: 'customer' }, 403], [{ user: null }, 401]]) {
    const r = listing(options); assert.equal((await r.GET(request('GET', null, '/api/admin/orders'))).status, status);
    assert.equal(r.db.queries.filter(q => q.table === 'orders').length, 0);
  }
});
test('admin listing handles query failure', async () => {
  const r = listing({ fail: q => q.table === 'orders' });
  assert.equal((await r.GET(request('GET', null, '/api/admin/orders'))).status, 500);
});
