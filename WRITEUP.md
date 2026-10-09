# Write-up: Workshop Registration Service

## Stack and why

- **Next.js (App Router, TypeScript):** one codebase for the UI and the API, easy to run and deploy.
- **PostgreSQL:** row-level locking, check constraints and partial unique indexes give real concurrency guarantees.
- **Prisma, with raw SQL for the seat claim:** typed models and migrations everywhere, exact control where correctness matters.
- **Zod:** every request body and query is validated, so errors are consistent 400s with readable messages.
- **Signed HTTP-only cookie sessions + bcrypt:** no external service, simple to explain. The user is re-loaded from the database on every request, so deactivation and role changes apply immediately.
- **Tailwind with a few design tokens:** a warm, calm, consistent look without a component library.

## How over-registration is prevented

One transaction: an atomic `UPDATE ... WHERE status = 'open' AND active_count < capacity` claims the seat. Zero rows updated means full, so the request rolls back with a 409. Otherwise the registration is inserted in the same transaction. Postgres locks the workshop row, so concurrent requests queue and each re-checks against the latest count. Backstops: a `CHECK (active_count <= capacity)` constraint and a partial unique index on active registrations per workshop and lowercased email. `npm run test:concurrency` fires 20 parallel requests at 5 seats and checks that exactly 5 succeed, that the counter matches the real rows, and that cancelling twice frees only one seat.

## Design decisions

- **Authorisation on the server:** every route handler calls `requireRole([...])` first. Middleware is not used for access control. The UI hides actions a role cannot use, but the backend refuses them anyway.
- **Nothing is deleted:** registrations are cancelled, users are deactivated. History always shows who did what and when.
- **"Full" is calculated** from seats left, never stored, so it cannot drift.
- **Filtering is done by the API** (date range, status, seats available) and reflected in the URL.
- **Wording and colour:** plain language, a neutral "Full" badge, errors that say what to do next, colour always paired with text.

## Trade-offs

- Seat count is a stored counter updated in the same transaction (fast reads, one row to lock) rather than a `COUNT(*)` on every read. The cost is that it must only change inside those transactions, which the tests check.
- Sessions are stateless JWTs with a database lookup per request. That costs one small query and buys instant revocation.
- No pagination: fine for the expected data size.

## Assumptions

One centre time zone for display; attendee emails are not verified and no emails are sent; registration is allowed only while a workshop is `open`; Admins manage accounts only and cannot see workshop data; a workshop with capacity 0 is valid but can never be registered for. Open questions were resolved simply: cancelling a workshop only changes its status (it does not cancel registrations), and registration does not close automatically at the start time.

## What I skipped

Waitlist, password reset and password change, email/SMS notifications, pagination, automated UI tests, rate limiting on login. The audit trail records workshop edits and account changes in the database but has no screen yet.
