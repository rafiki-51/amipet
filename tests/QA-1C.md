# QA-1C: canceled is terminal for reminder and medication actions

## Approved contract and implementation

Business approval makes `canceled` terminal for complete/reopen reminders and
complete/pause/reopen medications. Resuming a canceled item requires a new record.
No UI, schema, RLS, RPC or migrations were changed.

Only these production functions were changed:

- `completePetReminder`, `reopenPetReminder` in `src/actions/pet-reminders.ts`.
- `completePetMedication`, `pausePetMedication`, `reopenPetMedication` in
  `src/actions/pet-medications.ts`.

Each function keeps the existing authenticated customer, owner and archived-pet
checks. A previously read canceled record returns the existing operation-specific
error redirect before UPDATE. Each UPDATE retains `id`, `pet_id` and `user_id`
equality filters and adds `.neq("status", "canceled")`. Returned `id` is requested
using `.select("id").maybeSingle()`; a database result error or no returned row
uses the existing `complete`, `pause` or `reopen` error redirect. This avoids
reporting success for a zero-row conditional update.

Other non-canceled source states retain their prior behavior, including repeated
actions. This does not introduce an additional state machine. Update payloads,
timestamps and success destinations remain unchanged.

## Isolated verification

The query spy now records and evaluates `neq`, models an empty returned mutation,
and permits a synthetic `beforeQuery` interleaving. It applies no implicit RLS or
ownership constraints. Zero-row updates no longer count as committed mock writes.

For each of the five actions, tests verify:

- Already canceled: existing error redirect, no UPDATE emitted, unchanged data.
- Every existing non-canceled source state: target state and payload preserved.
- UPDATE contains the canceled exclusion and all three ownership filters.
- Synthetic cancellation after read: UPDATE matches no rows, no timestamp/notes
  changes, existing error redirect (not a success redirect).
- Synthetic record disappearance: zero-row UPDATE returns controlled error.
- Supabase result error: existing error redirect without a partial mock write.
- Foreign record, foreign pet and archived pet: rejected without mutation.

Full isolated suite: **318 passed, 0 failed, 0 skipped, 0 canceled, 0 todo**.
Twenty tests were added to the prior 298-test suite, and the five previously
failing state regressions now pass. The original JSON-root API regressions and
other existing tests remain in the full run.

No services or real data are used; no environment files are loaded. These mocks
prove the query predicate and application handling under simulated interleavings,
not PostgreSQL atomicity, real concurrency, deployed RLS, returned-row visibility
or transaction semantics. Validate conditional UPDATE and RETURNING behavior in
an independently verified disposable database before claiming integration QA.
The archival and ownership pre-read checks are preserved, not converted into a
new transaction or race-proof locking mechanism by this change.

QA-1.md and QA-1B.md are historical snapshots. Their pending business decision was
resolved by the explicit QA-1C approval; this report records the new result.
