# Setup Guide - Workshop Registration Service

> 🌐 **Live Application:** [https://workshop-registration.vercel.app/](https://workshop-registration.vercel.app/)

This document provides step-by-step instructions for getting the **Workshop Registration Service** up and running on your local machine, as well as deploying to production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Setup (TL;DR)](#2-quick-setup-tldr)
3. [Step-by-Step Installation](#3-step-by-step-installation)
   - [Step 1: Clone & Install Dependencies](#step-1-clone--install-dependencies)
   - [Step 2: Configure Environment Variables](#step-2-configure-environment-variables)
   - [Step 3: Start PostgreSQL with Docker](#step-3-start-postgresql-with-docker)
   - [Step 4: Run Migrations & Generate Prisma Client](#step-4-run-migrations--generate-prisma-client)
   - [Step 5: Seed the Database](#step-5-seed-the-database)
   - [Step 6: Start the Development Server](#step-6-start-the-development-server)
4. [Sample Accounts](#4-sample-accounts)
5. [Running Tests](#5-running-tests)
6. [Available Scripts](#6-available-scripts)
7. [Troubleshooting & Common Issues](#7-troubleshooting--common-issues)
8. [Deploying to Vercel (with Neon PostgreSQL)](#8-deploying-to-vercel-with-neon-postgresql)

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your system:

- **Node.js**: Version **20.x** or higher (LTS recommended)
- **npm**: Version **10.x** or higher (bundled with Node.js)
- **Docker & Docker Compose**: Docker Desktop (Windows/macOS) or Docker Engine with Docker Compose plugin (Linux)
- **Git**: For version control

---

## 2. Quick Setup (TL;DR)

If you already have Node.js and Docker installed and running:

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Generate a secure session secret and update .env
# (See Step 2 for details)

# 4. Start PostgreSQL container
npm run db:up

# 5. Run Prisma migrations and generate client
npm run db:migrate
npx prisma generate

# 6. Seed initial data (users & sample workshops)
npm run seed

# 7. Start the dev server
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 3. Step-by-Step Installation

### Step 1: Clone & Install Dependencies

Clone the repository and install the project dependencies:

```bash
git clone https://github.com/AvishkaGihan/workshop-registration.git
cd workshop-registration
npm install
```

### Step 2: Configure Environment Variables

Create a local `.env` file by copying `.env.example`:

```bash
# On Windows PowerShell:
Copy-Item .env.example .env

# On Linux/macOS or bash:
cp .env.example .env
```

Open `.env` in your editor and configure the following:

1. **`DATABASE_URL`**: Defaults to PostgreSQL on `localhost:5432`:
   ```env
   DATABASE_URL="postgresql://workshops:workshops@localhost:5432/workshops?schema=public"
   ```
2. **`SESSION_SECRET`**: Must be a random string of at least 32 characters. Generate one using Node.js:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Paste the generated string into `SESSION_SECRET`:
   ```env
   SESSION_SECRET="your-generated-base64-secret"
   ```
3. **`NEXT_PUBLIC_CENTRE_TIMEZONE`**: Set to the training centre's IANA time zone (e.g. `Europe/London`, `America/New_York`, `Asia/Colombo`):
   ```env
   NEXT_PUBLIC_CENTRE_TIMEZONE="Europe/London"
   ```
4. **`SEED_PASSWORD`**: Development password used when seeding sample accounts (default: `Workshop123!`).

### Step 3: Start PostgreSQL with Docker

Start the PostgreSQL database service configured in `docker-compose.yml`:

```bash
npm run db:up
# or: docker compose up -d
```

Verify that the container is healthy and running:

```bash
docker compose ps
```

You should see `workshops-db` running and bound to port `5432`.

### Step 4: Run Migrations & Generate Prisma Client

Apply database schema migrations and generate the Prisma Client:

```bash
# Apply migrations:
npm run db:migrate

# If deploying without interactive prompts:
npx prisma migrate deploy

# Generate Prisma Client:
npx prisma generate
```

### Step 5: Seed the Database

Populate the database with sample locations, user accounts across different roles, workshops with varying capacities/statuses, and registrations:

```bash
npm run seed
```

> **Tip:** Whenever you want to reset the database back to clean seed data, run:
> ```bash
> npm run db:reset
> ```

### Step 6: Start the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be accessible at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 4. Sample Accounts

The seed script creates three accounts for testing different role permissions:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Workshop123!` | Create users, change roles, deactivate users |
| **Manager** | `manager@example.com` | `Workshop123!` | Create & edit workshops, manage attendees, view history |
| **Staff** | `staff@example.com` | `Workshop123!` | Register attendees, cancel registrations, view workshops |

---

## 5. Running Tests

The application includes automated integration test suites for role-based permissions, database constraints, business rules, and race-condition concurrency:

Make sure the dev server is running (`npm run dev`) before executing tests:

```bash
# Run all tests in sequence
npm run test:all

# Run specific test suites:
npm run test:permissions   # Validates 401/403 access control across all roles
npm run test:concurrency   # Fires 20 concurrent requests for 5 seats to prove zero overbooking
npm run test:rules         # Validates duplicate emails, capacity limits, re-registrations
```

Code quality and type checks:

```bash
# Run ESLint
npm run lint

# Run TypeScript compiler check
npx tsc --noEmit
```

---

## 6. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Webpack |
| `npm run build` | Builds the production bundle |
| `npm run start` | Starts the production server |
| `npm run lint` | Runs ESLint checks |
| `npm run db:up` | Starts the PostgreSQL Docker container in the background |
| `npm run db:migrate` | Runs Prisma development migrations |
| `npm run db:reset` | Resets the database and reseeds from scratch |
| `npm run seed` | Seeds the database with default accounts and workshops |
| `npm run test:permissions` | Tests role-based access control matrix |
| `npm run test:concurrency` | Tests race conditions & atomic concurrency |
| `npm run test:rules` | Tests business logic constraints |
| `npm run test:all` | Runs all integration tests |

---

## 7. Troubleshooting & Common Issues

### 1. Port 3000 is already in use
If another application or previous dev server is using port 3000:
- **Windows (PowerShell)**:
  ```powershell
  # Find PID using port 3000:
  Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  # Kill process by PID:
  Stop-Process -Id <PID> -Force
  ```
- **macOS / Linux**:
  ```bash
  lsof -ti:3000 | xargs kill -9
  ```

### 2. Database connection refused (`P1001`)
If Prisma cannot connect to PostgreSQL:
1. Check if Docker is running: `docker compose ps`
2. Start the database if stopped: `npm run db:up`
3. Verify your `DATABASE_URL` in `.env` matches port `5432` and credentials `workshops:workshops`.
4. If a local PostgreSQL instance is already running on port 5432 on your host machine, stop the local service or change the exposed host port in `docker-compose.yml`.

### 3. Windows Native SWC / Webpack mode
Next.js dev and build scripts use `--webpack` (`next dev --webpack`) to ensure consistent PostCSS and Tailwind CSS compilation across Windows and environments where native Turbopack SWC binaries encounter platform-specific bindings.

### 4. Browser extension hydration warnings
If you see console warnings like:
```text
A tree hydrated but some attributes of the server rendered HTML didn't match...
data-new-gr-c-s-check-loaded
data-gr-ext-installed
```
These are caused by browser extensions (such as Grammarly) injecting DOM attributes into `<body>` before React hydration finishes. The root layout has `suppressHydrationWarning` applied to prevent these third-party extension attributes from breaking page hydration.

---

## 8. Deploying to Vercel (with Neon PostgreSQL)

This application is ready to deploy to **Vercel** with **Neon Serverless Postgres** via the Vercel Marketplace integration.

### Step 1: Push Code to GitHub

Ensure all changes (including `prisma/migrations/`, `prisma/schema.prisma`, `package.json`, and `lib/db.ts`) are committed:

```bash
git add -A
git commit -m "Prepare for Vercel deployment"
git push origin main
```

*(Verify that `.env` is never committed; it is excluded in `.gitignore`.)*

### Step 2: Import Project into Vercel

1. In your [Vercel Dashboard](https://vercel.com/dashboard), click **Add New → Project**.
2. Select your repository (`AvishkaGihan/workshop-registration`).
3. Ensure Framework is detected as **Next.js**.
4. **Before deploying**, open **Build and Output Settings** and override the **Build Command** with:
   ```bash
   if [ "$VERCEL_ENV" = "production" ]; then npx prisma migrate deploy; fi && npm run build
   ```
   *(This ensures database migrations only run on production deployments.)*

### Step 3: Add Neon PostgreSQL Storage

1. Inside your Vercel project dashboard, navigate to the **Storage** tab.
2. Choose **Neon Serverless Postgres** and click **Connect**.
3. Select a region close to your users (and matching your Vercel functions).
4. Connect it to your project for all environments.
5. Vercel automatically injects:
   - `DATABASE_URL` (pooled connection for runtime queries)
   - `DATABASE_URL_UNPOOLED` (direct connection for Prisma migrations)

### Step 4: Configure Production Environment Variables

In **Settings → Environment Variables**, add the following production variables:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `SESSION_SECRET` | A new random 32+ character string | Generate via: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXT_PUBLIC_CENTRE_TIMEZONE` | Your centre's IANA time zone | e.g. `Europe/London` or `America/New_York` (baked in at build time) |

### Step 5: Deploy

Click **Deploy** in Vercel.
The build process will:
1. Run `npm install` and the `postinstall` hook (`prisma generate`).
2. Run database migrations via `npx prisma migrate deploy`.
3. Compile the Next.js production build (`npm run build`).

Once deployed, your application will be live at `https://<your-project>.vercel.app`.

### Step 6: Seed the Production Database

Since the production database is empty initially, seed it from your local machine using the unpooled connection string:

1. Copy `DATABASE_URL_UNPOOLED` from **Vercel → Settings → Environment Variables** (or from the Neon console).
2. Choose a strong production password for the accounts.

**PowerShell (Windows):**
```powershell
$env:DATABASE_URL="<unpooled-url>"; $env:DATABASE_URL_UNPOOLED="<unpooled-url>"; $env:SEED_PASSWORD="<strong-password>"; npm run seed
```

**Bash (Linux / macOS):**
```bash
DATABASE_URL="<unpooled-url>" DATABASE_URL_UNPOOLED="<unpooled-url>" SEED_PASSWORD="<strong-password>" npm run seed
```

### Step 7: Verify Live Site

1. Open your live Vercel URL and sign in as `admin@example.com` with the password you configured.
2. Create real staff accounts and deactivate or update credentials for the sample accounts.
3. Test permission access and workshop registration flows on the live deployment.

