import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/load-module.mjs';
import { USER, fixture, authModules, redirected } from './helpers/scenario.mjs';

const scenarios = [
  ['anonymous', { user: null }, 'unauthenticated', 401, 401],
  ['expired', { user: null, authError: { name: 'AuthSessionMissingError' } }, 'unauthenticated', 401, 401],
  ['invalid session', { user: null, authError: { name: 'AuthApiError' } }, 'unauthenticated', 401, 401],
  ['customer', {}, 'authenticated', null, 403],
  ['admin', { role: 'admin' }, 'authenticated', 403, null],
  ['operator', { role: 'operator' }, 'authenticated', 403, null],
  ['missing profile', { profileMissing: true }, 'missing-profile', 403, 403],
  ['invalid role', { role: 'synthetic-invalid' }, 'invalid-role', 403, 403],
  ['profile query error', { fail: q => q.table === 'profiles' }, 'profile-error', 500, 403],
];
for (const [name, options, status, customerStatus, adminStatus] of scenarios) {
  test('auth matrix: ' + name, async () => {
    const db = fixture(options), auth = authModules(db);
    assert.equal((await auth.server.getAuthenticatedUserRole()).status, status);
    for (const [loaded, expected] of [[auth.customer, customerStatus], [auth.admin, adminStatus]]) {
      const result = await (loaded.getCustomerApiUser ?? loaded.getAdminApiUser)();
      if (expected === null) assert.equal(result.user.id, USER);
      else assert.equal(result.response.status, expected);
    }
    for (const q of db.queries) {
      assert.equal(q.table, 'profiles');
      assert.ok(q.filters.some(([key, value]) => key === 'id' && value === USER));
    }
    assert.equal(db.mutations.length, 0);
    if (options.user === null) assert.equal(db.queries.length, 0);
  });
}

for (const kind of ['page', 'action']) {
  for (const [name, options, target] of [
    ['anonymous', { user: null }, '/login?redirect=/synthetic'],
    ['admin', { role: 'admin' }, '/admin/pedidos'],
    ['operator', { role: 'operator' }, '/admin/pedidos'],
    ['missing profile', { profileMissing: true }, '/login'],
    ['invalid role', { role: 'invalid' }, '/login'],
  ]) test(kind + ' guard redirects ' + name, async () => {
    const db = fixture(options), loaded = authModules(db)[kind];
    await redirected(() => (loaded.requireCustomerPageUser ?? loaded.requireCustomerActionUser)({ redirectPath: '/synthetic', profileErrorLogMessage: 'synthetic' }), target);
    assert.equal(db.mutations.length, 0);
  });
}
test('customer guards allow owner and retain profile-error behavior', async () => {
  const db = fixture(), auth = authModules(db);
  for (const loaded of [auth.page, auth.action]) {
    const result = await (loaded.requireCustomerPageUser ?? loaded.requireCustomerActionUser)({ redirectPath: '/synthetic', profileErrorLogMessage: 'synthetic' });
    assert.equal(result.user.id, USER);
  }
  const failed = fixture({ fail: q => q.table === 'profiles' }), bad = authModules(failed);
  await redirected(() => bad.page.requireCustomerPageUser({ redirectPath: '/synthetic' }), '/login');
  assert.ok((await bad.action.requireCustomerActionUser({ redirectPath: '/synthetic' })).profileError);
});

test('isolation boundary rejects unmocked imports and external transports', async () => {
  assert.throws(() => load('src/lib/supabase/admin.ts'), /Unmocked import prohibited/);
  assert.throws(() => fetch('https://synthetic.invalid'), /prohibited/);
  for (const name of ['node:http', 'node:https']) {
    const loaded = await import(name);
    assert.throws(() => loaded.request((name.includes('https') ? 'https' : 'http') + '://synthetic.invalid'), /prohibited/);
  }
  const tls = await import('node:tls'), dgram = await import('node:dgram');
  assert.throws(() => tls.connect(443, 'synthetic.invalid'), /prohibited/);
  assert.throws(() => dgram.createSocket('udp4'), /prohibited/);
});
