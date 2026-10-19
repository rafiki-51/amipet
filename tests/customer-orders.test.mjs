import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/load-module.mjs';
import { USER, OTHER, RECORD, fixture, authModules, next, request, assertScope } from './helpers/scenario.mjs';

function setup(options = {}) {
  const db = fixture({ tables: { orders: [
    { id: RECORD, user_id: USER, order_number: 'OWN', total: 15, subtotal: 10, delivery_fee: 5, order_items: [{ id: 'item', product_name: 'Synthetic', quantity: 2, unit_price: 5, subtotal: 10 }] },
    { id: OTHER, user_id: OTHER, order_number: 'FOREIGN', total: 99, order_items: [] },
  ] }, ...options });
  const auth = authModules(db);
  const queries = load('src/lib/account/orders.ts', { '@/lib/supabase/admin': { supabaseAdmin: db.client } });
  const imports = { 'next/server': next, '@/lib/account/auth': auth.customer, '@/lib/account/orders': queries };
  return {
    db, queries,
    list: load('src/app/api/account/orders/route.ts', imports),
    detail: load('src/app/api/account/orders/[id]/route.ts', imports),
  };
}
const context = id => ({ params: Promise.resolve({ id }) });
test('customer orders list returns only own records using explicit user filter', async () => {
  const r = setup(), response = await r.list.GET();
  assert.equal(response.status, 200);
  const body = await response.json(); assert.equal(body.orders.length, 1); assert.equal(body.orders[0].orderNumber, 'OWN');
  assert.equal(body.orders[0].itemCount, 2); assert.equal(body.orders[0].total, 15);
  const query = r.db.queries.find(q => q.table === 'orders');
  assert.ok(query.filters.some(([key, value]) => key === 'user_id' && value === USER));
  assert.equal(query.orders[0][0], 'created_at'); assert.ok(query.limit > 0);
});
test('customer order detail preserves amounts and has id plus ownership filters', async () => {
  const r = setup(), response = await r.detail.GET(request('GET', null), context(RECORD));
  assert.equal(response.status, 200); const { order } = await response.json();
  assert.equal(order.total, 15); assert.equal(order.subtotal, 10); assert.equal(order.deliveryFee, 5); assert.equal(order.items[0].quantity, 2);
  assertScope(r.db.queries.find(q => q.table === 'orders'), 'orders', RECORD);
});
test('foreign and nonexistent order both return 404 without exposing data', async () => {
  for (const id of [OTHER, '00000000-0000-4000-8000-000000000099']) {
    const r = setup(), response = await r.detail.GET(request('GET', null), context(id));
    assert.equal(response.status, 404); assert.equal((await response.json()).code, 'ORDER_NOT_FOUND');
    assertScope(r.db.queries.find(q => q.table === 'orders'), 'orders', id);
  }
});
test('invalid order id is rejected before data query', async () => {
  const r = setup(); assert.equal((await r.detail.GET(request('GET', null), context('invalid'))).status, 400);
  assert.equal(r.db.queries.filter(q => q.table === 'orders').length, 0);
});
for (const [name, options, expected] of [['anonymous', { user: null }, 401], ['admin', { role: 'admin' }, 403], ['operator', { role: 'operator' }, 403], ['missing profile', { profileMissing: true }, 403], ['profile error', { fail: q => q.table === 'profiles' }, 500]]) {
  test('customer orders APIs reject ' + name + ' before order queries', async () => {
    const r = setup(options);
    assert.equal((await r.list.GET()).status, expected);
    assert.equal((await r.detail.GET(request('GET', null), context(RECORD))).status, expected);
    assert.equal(r.db.queries.filter(q => q.table === 'orders').length, 0);
  });
}
test('customer orders APIs expose controlled 500 on query failure', async () => {
  const r = setup({ fail: q => q.table === 'orders' });
  assert.equal((await r.list.GET()).status, 500);
  assert.equal((await r.detail.GET(request('GET', null), context(RECORD))).status, 500);
});
