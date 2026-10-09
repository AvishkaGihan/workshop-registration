# Workshop Registration Service

A small web app for a community training centre (three locations, about 15 staff) to manage workshops and take registrations **without ever overbooking**. It replaces a shared spreadsheet and phone bookings.

**Stack:** Next.js 14 (App Router, TypeScript), PostgreSQL, Prisma, Zod, Tailwind CSS.

## Run it locally

You need Node.js 20+ and Docker.

```bash
cp .env.example .env        # then set SESSION_SECRET (see below)
npm install
docker compose up -d        # starts PostgreSQL
npx prisma migrate deploy   # creates tables, constraints and indexes
npx prisma generate
npm run seed                # sample users and workshops
npm run dev                 # http://localhost:3000
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set `NEXT_PUBLIC_CENTRE_TIMEZONE` in `.env` to the centre's time zone (for example `America/New_York`). All times are stored in UTC and shown in that zone.

## Sample logins (development only)

| Role    | Email               | Password     |
| ------- | ------------------- | ------------ |
| Admin   | admin@example.com   | Workshop123! |
| Manager | manager@example.com | Workshop123! |
| Staff   | staff@example.com   | Workshop123! |

The seed also creates eight workshops across three locations (open, draft, completed, cancelled, one almost full, one full) and a few registrations, including a cancelled one.

## Who can do what (enforced by the API)

| Action                                    | Admin | Manager | Staff |
| ----------------------------------------- | ----- | ------- | ----- |
| Create users, set roles, deactivate users | Yes   | No      | No    |
| Create and edit workshops                 | No    | Yes     | No    |
| Register and cancel attendees             | No    | Yes     | Yes   |
| View workshops, registrations and history | No    | Yes     | Yes   |

Anything else returns 403. Signed-out requests return 401.

## Tests

Start `npm run dev` in one terminal, then in another:

```bash
npm run test:permissions   # role matrix, 401 and 403 on every route
npm run test:concurrency   # 20 parallel registrations for 5 seats: exactly 5 succeed, 15 get 409
npm run test:rules         # duplicates, re-registering, history, capacity, filters
npm run test:all
```

`npm run db:reset` returns the database to clean seed data.

## How overbooking is prevented

Registering runs in one transaction. First a single conditional `UPDATE` claims a seat:

```sql
UPDATE workshops SET active_count = active_count + 1
WHERE id = $1 AND status = 'open' AND active_count < capacity
```

If zero rows change, the workshop is full (or not open) and the request gets a 409. Otherwise the registration row is inserted in the same transaction. Postgres serialises concurrent updates to the same row, so two requests can never both take the last seat. As a backstop, the database has `CHECK (active_count >= 0 AND active_count <= capacity)` and a partial unique index on `(workshop_id, lower(attendee_email)) WHERE status = 'active'`.

Cancelling flips a row from `active` to `cancelled` only `WHERE status = 'active'`, and only then decrements the counter, so cancelling twice frees one seat.

## Project layout

- `app/api/...` thin route handlers (each starts with `requireRole`)
- `lib/auth.ts` sessions and `requireRole`; `lib/registrations.ts` the transactional register and cancel logic
- `lib/validation.ts` Zod schemas; `lib/workshops.ts` and `lib/users.ts` data functions
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations`
- `scripts/` the test scripts
