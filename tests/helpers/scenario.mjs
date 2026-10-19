import assert from 'node:assert/strict';
import { load } from './load-module.mjs';

export const USER = '00000000-0000-4000-8000-000000000001';
export const OTHER = '00000000-0000-4000-8000-000000000002';
export const PET = '00000000-0000-4000-8000-000000000003';
export const RECORD = '00000000-0000-4000-8000-000000000004';
export const NOW = '2025-03-15T12:00:00.000Z';
export const roles = load('src/lib/auth/roles.ts');
export const payment = load('src/config/payment.ts');
export const paymentStatus = load('src/config/payment-status.ts');
export const ordersConfig = load('src/config/orders.ts');
export const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
export const quietConsole = { error() {}, warn() {}, log() {}, info() {} };

export class Redirect extends Error {
  constructor(path) { super('Synthetic redirect'); this.path = path; }
}
export const redirect = (path) => { throw new Redirect(path); };
export const form = (fields) => {
  const value = new FormData();
  for (const [key, entry] of Object.entries(fields)) value.set(key, String(entry));
  return value;
};
export async function redirected(action, expected) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof Redirect, String(error));
    if (expected instanceof RegExp) assert.match(error.path, expected);
    else if (expected !== undefined) assert.equal(error.path, expected);
    return true;
  });
}

// In-memory query spy, not a Supabase implementation. No implicit RLS/ownership
// is applied: omitted filters expose rows and cause the ownership tests to fail.
export function database({ tables = {}, user = { id: USER }, authError = null, fail = null, beforeQuery = null } = {}) {
  const rows = structuredClone(tables);
  const queries = [];
  const mutations = [];
  const committed = [];
  const authCalls = [];
  const client = {
    auth: { getUser: async () => { authCalls.push('getUser'); return { data: { user }, error: authError }; } },
    from(table) {
      assert.ok(Object.hasOwn(rows, table), 'Unmocked table prohibited: ' + table);
      const query = { table, op: 'select', filters: [], notEquals: [], orders: [], payload: null };
      let single = false;
      let cached;
      const api = {
        select(columns, options) { query.columns = columns; query.options = options; return api; },
        eq(key, value) { query.filters.push([key, value]); return api; },
        neq(key, value) { query.notEquals.push([key, value]); return api; },
        order(key, options) { query.orders.push([key, options]); return api; },
        limit(value) { query.limit = value; return api; },
        range(from, to) { query.range = [from, to]; return api; },
        maybeSingle() { single = true; return api; },
        single() { single = true; return api; },
        returns() { return api; },
        insert(payload) { query.op = 'insert'; query.payload = structuredClone(payload); return api; },
        update(payload) { query.op = 'update'; query.payload = structuredClone(payload); return api; },
        delete() { query.op = 'delete'; return api; },
        then(resolve, reject) {
          cached ??= Promise.resolve().then(() => {
            queries.push(query);
            if (query.op !== 'select') mutations.push(query);
            if (fail?.(query)) return { data: null, error: { message: 'synthetic database failure' }, count: null };
            beforeQuery?.(query, rows);
            const matched = rows[table].filter(row => query.filters.every(([key, value]) => row[key] === value)
              && query.notEquals.every(([key, value]) => row[key] !== null && row[key] !== undefined && row[key] !== value));
            if (query.op === 'insert') rows[table].push(structuredClone(query.payload));
            if (query.op === 'update') for (const row of matched) Object.assign(row, structuredClone(query.payload));
            if (query.op === 'delete') rows[table] = rows[table].filter(row => !matched.includes(row));
            if (query.op !== 'select' && (query.op === 'insert' || matched.length > 0)) committed.push(query);
            const count = matched.length;
            let data = matched;
            if (query.range) data = data.slice(query.range[0], query.range[1] + 1);
            if (query.limit) data = data.slice(0, query.limit);
            return { data: single ? structuredClone(data[0] ?? null) : structuredClone(data), error: null, count };
          });
          return cached.then(resolve, reject);
        },
      };
      return api;
    },
  };
  return { client, rows, queries, mutations, committed, authCalls };
}

export function fixture(options = {}) {
  const { role = 'customer', profileMissing = false, tables = {}, ...rest } = options;
  return database({ ...rest, tables: { profiles: profileMissing ? [] : [{ id: USER, role }], ...tables } });
}
export function authModules(db) {
  const imports = { '@/lib/auth/roles': roles, '@/lib/supabase/server': { createClient: async () => db.client } };
  const server = load('src/lib/auth/server.ts', imports);
  const base = { 'next/server': next, '@/lib/auth/roles': roles, '@/lib/auth/server': server };
  return {
    server,
    customer: load('src/lib/account/auth.ts', base),
    admin: load('src/lib/admin/auth.ts', base),
    action: load('src/lib/auth/customer-actions.ts', { ...imports, 'next/navigation': { redirect } }),
    page: load('src/lib/auth/customer-pages.ts', { ...imports, 'next/navigation': { redirect } }),
  };
}
export function actionModule(file, db) {
  const auth = authModules(db);
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [NOW])); }
    static now() { return Date.parse(NOW); }
  }
  return load(file, {
    'next/navigation': { redirect },
    '@/lib/auth/customer-actions': auth.action,
    '@/lib/supabase/server': { createClient: async () => db.client },
  }, { Date: FixedDate });
}
export function assertScope(query, table, id, petId = null) {
  assert.equal(query.table, table);
  for (const [key, value] of [['id', id], ['user_id', USER], ...(petId ? [['pet_id', petId]] : [])]) {
    assert.ok(query.filters.some(([k, v]) => k === key && v === value), 'Missing filter ' + key);
  }
}
export const request = (method, payload, path = '/api/orders') => new Request('https://synthetic.invalid' + path, {
  method, ...(method === 'GET' ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }),
});
