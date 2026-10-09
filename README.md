# Workshop Registration Service

A web application designed for a community training centre (three locations, about 15 staff members) to manage workshops and handle attendee registrations **without ever overbooking**. It replaces cumbersome shared spreadsheets and phone bookings with a reliable, role-enforced service.

**Tech Stack:**
- **Framework:** Next.js 16 (App Router, Webpack)
- **UI & Styling:** React 19, Tailwind CSS v4 (with PostCSS)
- **Database & ORM:** PostgreSQL 16 (Docker), Prisma 5
- **Validation & Auth:** Zod, Jose (JWT session cookies), bcryptjs
- **Language:** TypeScript 5

---

## Quick Start

For detailed installation steps and troubleshooting, see the [Setup Guide](SETUP.md).

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### 1-Minute Local Setup

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/AvishkaGihan/workshop-registration.git
cd workshop-registration
npm install

# 2. Configure environment
cp .env.example .env        # Generate & set SESSION_SECRET (see below)

# 3. Start database & apply migrations
npm run db:up               # starts PostgreSQL in Docker
npm run db:migrate          # creates tables, constraints & indexes
npx prisma generate
npm run seed                # seeds sample users & workshops

# 4. Run development server
npm run dev                 # http://localhost:3000
```

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Configure `NEXT_PUBLIC_CENTRE_TIMEZONE` in `.env` to the centre's time zone (e.g. `Europe/London` or `America/New_York`). All timestamps are stored in UTC and displayed in this configured zone.

---

## Sample Accounts (Development)

| Role | Email | Password | Default Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Workshop123!` | User management, role assignment, deactivation |
| **Manager** | `manager@example.com` | `Workshop123!` | Workshop creation & editing, attendee management |
| **Staff** | `staff@example.com` | `Workshop123!` | Register attendees, process cancellations |

The database seed also provisions sample workshops across multiple locations with diverse states (open, draft, completed, cancelled, near capacity, and sold out) alongside test registrations.

---

## Role Permissions (Enforced by API)

| Action | Admin | Manager | Staff |
| :--- | :---: | :---: | :---: |
| Create users, set roles, deactivate accounts | ✅ | ❌ | ❌ |
| Create and edit workshops | ❌ | ✅ | ❌ |
| Register and cancel attendees | ❌ | ✅ | ✅ |
| View workshops, registrations, and history | ❌ | ✅ | ✅ |

- Unauthorized requests without valid credentials return `401 Unauthorized`.
- Actions forbidden for a role return `403 Forbidden`.

---

## How Overbooking is Prevented

Registrations are executed within an atomic database transaction. Seat reservation relies on a conditional `UPDATE`:

```sql
UPDATE workshops
SET active_count = active_count + 1
WHERE id = $1 AND status = 'open' AND active_count < capacity;
```

1. **Atomic seat reservation**: If `0` rows are modified, the workshop is either full or not open; the API immediately returns `409 Conflict`.
2. **Row-level serialisation**: PostgreSQL serialises concurrent updates on the same row, preventing race conditions even under high concurrency.
3. **Database-level constraints**:
   - `CHECK (active_count >= 0 AND active_count <= capacity)` guarantees active count cannot exceed capacity.
   - Partial unique index on `(workshop_id, lower(attendee_email)) WHERE status = 'active'` prevents duplicate active registrations for the same person.
4. **Idempotent cancellations**: Cancelling updates status from `active` to `cancelled` only `WHERE status = 'active'`, and decrements `active_count` only once.

---

## Running Tests

Start `npm run dev` in one terminal, then run the test suites in another:

```bash
# Run all tests sequentially
npm run test:all

# Individual suites:
npm run test:permissions   # Role matrix, 401 and 403 on every route
npm run test:concurrency   # 20 parallel registrations for 5 seats (exactly 5 succeed, 15 get 409)
npm run test:rules         # Duplicate emails, re-registration after cancel, history, filters
```

To reset the database back to clean seed data at any time:
```bash
npm run db:reset
```

Type checking and linting:
```bash
npm run lint               # ESLint
npx tsc --noEmit           # TypeScript compiler check
```

---

## Project Structure

```text
├── app/
│   ├── (app)/             # Authenticated application views (workshops, users)
│   ├── (auth)/            # Login & authentication routes
│   └── api/               # Thin route handlers protected by requireRole
├── components/            # Reusable UI components & layouts
├── lib/
│   ├── auth.ts            # Session cookies, JWT verification, requireRole
│   ├── registrations.ts   # Transactional register & cancel seat logic
│   ├── workshops.ts       # Workshop data access & filtering
│   ├── users.ts           # User management data functions
│   └── validation.ts      # Zod validation schemas
├── prisma/
│   ├── schema.prisma      # PostgreSQL database schema & constraints
│   ├── migrations/        # SQL migration files
│   └── seed.ts            # Seed script for users & workshops
├── scripts/               # Automated test scripts (concurrency, permissions, rules)
├── SETUP.md               # Detailed setup & troubleshooting guide
└── docker-compose.yml     # PostgreSQL container configuration
```

---

## License

Private / Internal use for community training centre.
