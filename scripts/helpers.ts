export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
export const PASSWORD = process.env.SEED_PASSWORD ?? "Workshop123!";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Result = { status: number; body: any };

export async function call(method: string, path: string, cookie?: string, payload?: unknown): Promise<Result> {
  const headers: Record<string, string> = {};
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/** Signs in and returns the Cookie header value to send on later calls. */
export async function loginAs(email: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Could not sign in as ${email} (status ${res.status}). Did you run "npm run seed"?`);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

let failures = 0;

export function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  ->  ${detail}`}`);
  if (!ok) failures++;
}

export function finish() {
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

export function newWorkshopPayload(code: string, capacity: number, status = "open") {
  return {
    code,
    title: `Test workshop ${code}`,
    instructor: "Test Instructor",
    startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 60,
    location: "Riverside Centre",
    description: "Created by an automated test.",
    capacity,
    status,
  };
}

export const uniqueCode = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;