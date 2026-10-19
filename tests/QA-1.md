# QA-1: isolated security and validation tests

## Execution and scope

Run `npm.cmd test`. The suite uses Node's built-in test runner, strict assertions,
the installed TypeScript transpiler, and the existing VM module loader. No new
dependencies or production changes are required. The original 19 tests remain.
With this batch there are 281 tests including nested subtests: 274 pass, 7 fail,
0 skipped, 0 canceled, 0 todo in the recorded QA-1 run.
Final `npm.cmd run lint` and TypeScript (`--noEmit --incremental false`) pass.
The original 19 tests pass as part of the expanded run. Seven files were created
inside `tests/` and only the existing `tests/helpers/load-module.mjs` was modified;
the production tree is unchanged relative to the batch baseline.

The seven failures below are regression expectations, intentionally left visible.
Do not convert them to skipped/todo tests or change assertions to bless current
behavior. Production fixes need separate authorization.

## Isolation

- `helpers/load-module.mjs` replaces fetch, TCP connect, HTTP(S) requests, TLS and
  UDP entry points with guards that throw before external transport. Named ESM
  built-in imports are synchronized with the guarded exports.
- Tested modules receive an empty process environment or explicit synthetic
  values. No dotenv/Next environment loader or `.env.local` is imported/read.
- The VM rejects imports that are not explicitly mocked (apart from the narrow
  existing crypto/net/server-only allowlist).
- `helpers/scenario.mjs` provides synthetic users and an in-memory query spy.
  It does not implement RLS or automatically add ownership filters. Tests inspect
  explicit filters and seed foreign rows so missing filters are observable.
- All Server Action writes affect only in-memory arrays. Redirects throw a
  synthetic exception. RPCs return explicit synthetic data/errors and are spies.
- The installed Upstash SDK in the original tests uses mocked fetch only.
- Boundary tests exercise denied transports and imports. No server is started,
  no deployed endpoint is called, and no real form is submitted.

## Coverage

| File | Coverage |
| --- | --- |
| `auth-security.test.mjs` | Anonymous/expired/invalid session, customer/admin/operator, missing/invalid/error profile; real role and API/page/action guards; profile lookup scope; isolation guards. |
| `checkout-validation.test.mjs` | Invalid fields/items/quantities/payment, malformed JSON, mocked zone/product/stock/idempotency RPC errors, role restrictions, server-derived user ID and hash, duplicate item normalization, no RPC on rejection. |
| `customer-orders.test.mjs` | Actual query helper plus API guards, own/foreign/missing orders, explicit ownership filters, amounts, invalid ID, query errors. |
| `expediente-actions.test.mjs` | Actual six action modules with composed customer guard; valid create/update/delete, required/type/date/weight validation, foreign pet/record, record from different pet, archived pet, query/write errors, protected state preservation, archive and transitions. |
| `admin-api.test.mjs` | Actual role guards plus listing/status/payment/manual-link routes; four filters, pagination, cancellation reason, RPC arguments/actor and error mapping, invalid payloads and access rejection. |

## Confirmed failing expectations

### State transition consistency: important

Direct calls by the owning customer mutate a canceled record even though the UI
does not offer these actions. The tests assert zero mutation calls and observe
one update. Ownership checks still apply; these results do not show cross-user
access. A database integration test is still needed to establish any deployed
constraint/trigger behavior.

- `completePetReminder`: `src/actions/pet-reminders.ts:465`, update at 509.
- `reopenPetReminder`: `src/actions/pet-reminders.ts:525`, update at 569.
- `completePetMedication`: `src/actions/pet-medications.ts:398`, update at 445.
- `pausePetMedication`: `src/actions/pet-medications.ts:458`, update at 505.
- `reopenPetMedication`: `src/actions/pet-medications.ts:518`, update at 565.

All five tests are named `SECURITY: <action> must not transition a canceled record
via direct action`. This expected restriction follows the existing UI rules and
should be reviewed/confirmed before authorizing a production correction. Other
unsupported source-state transitions and races remain outside this batch.

### JSON null handling: important

- `SECURITY: checkout JSON null must return controlled 400 without RPC`:
  `src/app/api/orders/route.ts:283` dereferences `payload.customer` when the parsed
  payload is null. The actual isolated handler rejects with TypeError.
- `SECURITY: admin status JSON null must return controlled 400 without RPC`:
  `src/app/api/admin/orders/[id]/status/route.ts:107` dereferences `payload.status`
  when the parsed payload is null. The actual isolated handler rejects with
  TypeError after admin authorization.

These fail before RPC execution. HTTP 400 is the regression expectation; no
controlled HTTP response is returned by these isolated handlers. A framework
integration would be needed to observe the final network response (typically a
server error). No data mutation or privilege escalation was demonstrated here.

## Limits and next batch

These tests do not execute PostgreSQL, RLS, triggers, SQL migrations, real Auth,
Redis Lua, network retries, or concurrent inventory transactions. A mocked RPC
business-error response proves API mapping, not that the database enforces the
rule. The query spy does not reproduce projections, joins, ordering semantics,
transactionality or database constraints; query ordering/filter arguments are
checked explicitly where tested.

Browser rendering, React events, localStorage/cart persistence, login/signup/
logout UI, cookies/session refresh, reader announcements, focus, and responsive
layout remain untested. Server-rendered pages, middleware, every error branch,
all clinical state transitions and concurrency races are not fully covered.

Recommended next step: review and authorize fixes for the seven failures, using
these tests as regression checks. Then prepare browser tests with fully mocked
services; validate SQL/RLS/stock/idempotency separately in a verified disposable
database with synthetic data. Never point this QA process at production.
