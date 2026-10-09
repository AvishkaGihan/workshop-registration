import { call, check, finish, loginAs } from "./helpers";

async function main() {
  const admin = await loginAs("admin@example.com");
  const manager = await loginAs("manager@example.com");
  const staff = await loginAs("staff@example.com");

  const list = await call("GET", "/api/workshops", manager);
  const workshopId: string = list.body.workshops[0].id;

  const workshopBody = {
    code: "PERM-TEST",
    title: "Permission check",
    instructor: "Test",
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    durationMinutes: 60,
    location: "Riverside Centre",
    description: "",
    capacity: 5,
    status: "draft",
  };
  const userBody = { name: "Perm Test", email: "perm-test@example.com", password: "Temp-pass-1", role: "staff" };
  const attendeeBody = { attendeeName: "Perm Test", attendeeEmail: "perm@example.com" };

  type Case = [who: string, cookie: string | undefined, method: string, path: string, expected: number, body?: unknown];
  const cases: Case[] = [
    // Signed out: everything protected returns 401
    ["signed out", undefined, "GET", "/api/auth/me", 401],
    ["signed out", undefined, "GET", "/api/users", 401],
    ["signed out", undefined, "POST", "/api/users", 401, userBody],
    ["signed out", undefined, "PATCH", "/api/users/anything", 401, { isActive: false }],
    ["signed out", undefined, "GET", "/api/workshops", 401],
    ["signed out", undefined, "POST", "/api/workshops", 401, workshopBody],
    ["signed out", undefined, "GET", `/api/workshops/${workshopId}`, 401],
    ["signed out", undefined, "PATCH", `/api/workshops/${workshopId}`, 401, { title: "x" }],
    ["signed out", undefined, "GET", `/api/workshops/${workshopId}/registrations`, 401],
    ["signed out", undefined, "POST", `/api/workshops/${workshopId}/registrations`, 401, attendeeBody],
    ["signed out", undefined, "POST", "/api/registrations/anything/cancel", 401],

    // Staff: can read and register, cannot manage workshops or users
    ["staff", staff, "GET", "/api/workshops", 200],
    ["staff", staff, "GET", `/api/workshops/${workshopId}`, 200],
    ["staff", staff, "GET", `/api/workshops/${workshopId}/registrations`, 200],
    ["staff", staff, "POST", "/api/workshops", 403, workshopBody],
    ["staff", staff, "PATCH", `/api/workshops/${workshopId}`, 403, { title: "x" }],
    ["staff", staff, "GET", "/api/users", 403],
    ["staff", staff, "POST", "/api/users", 403, userBody],
    ["staff", staff, "PATCH", "/api/users/anything", 403, { isActive: false }],

    // Manager: workshops yes, users no
    ["manager", manager, "GET", "/api/workshops", 200],
    ["manager", manager, "GET", `/api/workshops/${workshopId}/registrations`, 200],
    ["manager", manager, "GET", "/api/users", 403],
    ["manager", manager, "POST", "/api/users", 403, userBody],
    ["manager", manager, "PATCH", "/api/users/anything", 403, { isActive: false }],

    // Admin: users yes, workshop data no
    ["admin", admin, "GET", "/api/users", 200],
    ["admin", admin, "GET", "/api/workshops", 403],
    ["admin", admin, "POST", "/api/workshops", 403, workshopBody],
    ["admin", admin, "GET", `/api/workshops/${workshopId}`, 403],
    ["admin", admin, "PATCH", `/api/workshops/${workshopId}`, 403, { title: "x" }],
    ["admin", admin, "GET", `/api/workshops/${workshopId}/registrations`, 403],
    ["admin", admin, "POST", `/api/workshops/${workshopId}/registrations`, 403, attendeeBody],
    ["admin", admin, "POST", "/api/registrations/anything/cancel", 403],
  ];

  for (const [who, cookie, method, path, expected, body] of cases) {
    const res = await call(method, path, cookie, body);
    check(`${who.padEnd(10)} ${method.padEnd(5)} ${path} -> ${expected}`, res.status === expected, `got ${res.status}`);
  }

  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});