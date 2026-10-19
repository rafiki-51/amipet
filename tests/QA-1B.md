# QA-1B: controlled JSON root validation and state-contract review

## Implemented API fixes

- `src/app/api/orders/route.ts`: after JSON parsing and before accessing fields,
  reject roots that fail the existing `isRecord` helper. Keep rate limiting before
  parsing, and keep all subsequent validation/authentication/RPC behavior.
- `src/app/api/admin/orders/[id]/status/route.ts`: after the existing admin guard
  and JSON parsing, reject null, arrays and primitive roots. Both routes return
  HTTP 400 with the existing `INVALID_PAYLOAD` error format. Malformed JSON still
  returns `INVALID_JSON`; objects with invalid fields retain existing handling.
- Regression tests retain the original two null cases and add eight incompatible
  roots per endpoint plus an admin authentication-order test (17 new tests).
- Valid orders, status changes, cancellation reasons, rate-limit behavior and RPC
  payload/actor assertions remain covered by the full existing suite.

## Phase A: canceled is ambiguous for clinical records

No Server Actions or clinical tests were changed in QA-1B.

The repository calls `canceled` "Cancelado" and permits it as a status value:
`database/migrations/create_pet_reminders.sql:19` and
`database/migrations/create_pet_medications.sql:21`. These CHECKs constrain enum
membership, not transitions. They do not define cancellation as terminal, its
reason, or its clinical meaning. Documentation explicitly declaring cancellation
terminal pertains to orders, not reminders or medications.

The UI allows:

| Module | Source | Action/target |
| --- | --- | --- |
| Reminders | pending | complete -> completed |
| Reminders | completed | reopen -> pending |
| Medications | active | complete -> completed; pause -> paused |
| Medications | paused/completed | reopen -> active |
| Both | canceled | No transition controls shown |

Evidence: reminders edit page lines 268-285; medications edit page lines 335-363.
This defines the current user interface, not an explicit shared server/DB state
machine. The production functions currently allow all five actions on an owned,
nonarchived canceled record. They filter UPDATE by id, pet_id and user_id, but do
not filter source status. The existing five QA-1 tests introduce a backend
restriction inferred from the UI. They are not proof of an already established
business contract and remain failing, unskipped, pending explicit approval.

| Function | Current write | Existing controlled error |
| --- | --- | --- |
| completePetReminder (pet-reminders.ts:465) | completed + timestamp | ?error=complete |
| reopenPetReminder (pet-reminders.ts:525) | pending + completed_at null | ?error=reopen |
| completePetMedication (pet-medications.ts:398) | completed | ?error=complete |
| pausePetMedication (pet-medications.ts:458) | paused | ?error=pause |
| reopenPetMedication (pet-medications.ts:518) | active | ?error=reopen |

All five verify customer role, record/pet ownership and pet archival on the
server before writing. SDK result errors produce the module's error redirects;
Next redirects intentionally throw framework exceptions. There is no current
controlled error specifically for a forbidden canceled-state transition.
Unexpected thrown SDK errors are not generally caught by these functions.

## Approval needed before further production changes

Confirm whether `canceled` must forbid these five actions. If approved, guard the
state on the server and add a conditional UPDATE predicate excluding canceled,
preserving current id/pet/user predicates and existing error redirects. Test a
state changing to canceled between the read and UPDATE. Do not expand this into a
new transition matrix for other states without separate authorization. Checking
only the pre-read state would not protect that race. This proposal was not applied.

## Results and limits

Full isolated suite: 298 tests, 293 pass, 5 fail, 0 skipped/todo/canceled. The two
JSON null regressions now pass. The five clinical-state expectations above are
the only failures. TypeScript without emission passes. See final task report for
lint result and exact file scope.

No real services, secrets, records, SQL, RPC or RLS were used or changed. Mocks do
not establish deployed constraints, transactionality, clinical business intent,
or Next's final network response. Browser, disposable-DB integration, and clinical
state concurrency tests remain pending. QA-1.md records the historical baseline;
QA-1B is not a claim that the entire suite is green or ready for publication.
