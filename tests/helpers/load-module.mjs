import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';
import ts from 'typescript';

// Fail closed at the transport boundary. No dotenv/Next env loader is imported.
const denyNetwork = () => { throw new Error('External network prohibited in tests'); };
globalThis.fetch = denyNetwork;
net.Socket.prototype.connect = denyNetwork;
http.request = http.get = https.request = https.get = denyNetwork;
tls.connect = dgram.createSocket = denyNetwork;
// Keep named ESM imports of built-in transports consistent with these guards.
syncBuiltinESMExports();

export const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

export function clock() {
  let now = 0;
  let id = 0;
  const timers = new Map();
  return {
    now: () => now,
    pending: () => timers.size,
    setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; },
    clearTimeout(key) { timers.delete(key); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
      }
      now = end; await flush();
    },
  };
}

export function load(file, imports = {}, globals = {}, javascript = false) {
  const source = readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
  const code = javascript ? source : ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  const context = vm.createContext({
    module: loadedModule, exports: loadedModule.exports,
    require(name) {
      if (Object.hasOwn(imports, name)) return imports[name];
      if (name === 'crypto' || name === 'uncrypto') return crypto;
      if (name === 'net') return { isIP: net.isIP };
      if (name === 'server-only') return {};
      throw new Error('Unmocked import prohibited: ' + name);
    },
    process: { env: {}, version: process.version },
    fetch: denyNetwork, console: { warn() {}, error() {}, log() {} },
    Headers, Request, Response, AbortController, AbortSignal, Blob, EventTarget, Event,
    TextDecoder, TextEncoder, Buffer, URL, atob, btoa,
    setTimeout, clearTimeout, performance,
    ...globals,
  });
  new vm.Script(code, { filename: file }).runInContext(context);
  return loadedModule.exports;
}

export const fakeEnv = {
  UPSTASH_REDIS_REST_URL: 'https://redis.invalid',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-token',
  RATE_LIMIT_IP_HASH_SECRET: 'synthetic-hash-secret',
};
export const options = { endpoint: '/api/orders', limit: 10, windowSeconds: 600 };
export const headers = new Headers({ 'x-forwarded-for': '192.0.2.1' });

export function limiter(Redis, time = clock(), env = fakeEnv) {
  class FakeDate extends Date { static now() { return time.now(); } }
  return { time, ...load('src/lib/rate-limit.ts', { '@upstash/redis': { Redis } }, {
    process: { env }, performance: { now: time.now }, Date: FakeDate,
    setTimeout: time.setTimeout, clearTimeout: time.clearTimeout,
  }) };
}

export function sdk(fetch, time) {
  return load('node_modules/@upstash/redis/nodejs.js', {}, {
    fetch, setTimeout: time.setTimeout, clearTimeout: time.clearTimeout,
  }, true).Redis;
}
