import { call, check, finish, loginAs, newWorkshopPayload, uniqueCode } from "./helpers";

type WorkshopSummary = {
  status: string;
  seatsLeft: number;
  startsAt: string;
};

type RegistrationSummary = {
  id: string;
  cancelledBy?: unknown;
  cancelledAt?: string | null;
  cancelReason?: string | null;
};

async function main() {
  const manager = await loginAs("manager@example.com");
  const staff = await loginAs("staff@example.com");

  const created = await call("POST", "/api/workshops", manager, newWorkshopPayload(uniqueCode("RULE"), 3));
  const id: string = created.body.workshop.id;
  const register = (email: string) =>
    call("POST", `/api/workshops/${id}/registrations`, staff, { attendeeName: "Rule Tester", attendeeEmail: email });

  // Duplicate codes
  const dupCode = await call("POST", "/api/workshops", manager, newWorkshopPayload(created.body.workshop.code, 3));
  check("duplicate workshop code -> 409 with a friendly message", dupCode.status === 409 && /already used/i.test(dupCode.body.message));

  // Duplicate emails (case-insensitive) and re-registering after a cancel
  const first = await register("Rule@Example.com");
  check("first registration -> 201", first.status === 201);
  const dup = await register("rule@example.com");
  check("same email, different capitalisation -> 409", dup.status === 409, `got ${dup.status}`);

  const cancel = await call("POST", `/api/registrations/${first.body.registration.id}/cancel`, staff, { reason: "Changed their mind" });
  check("cancel -> 200", cancel.status === 200);

  const again = await register("rule@example.com");
  check("re-registering after a cancel -> 201", again.status === 201);
  check("re-registering creates a NEW row", again.body.registration.id !== first.body.registration.id);

  // History keeps everything
  const history = await call("GET", `/api/workshops/${id}/registrations`, staff);
  const rows: RegistrationSummary[] = history.body.registrations;
  const cancelled = rows.find((r) => r.id === first.body.registration.id);
  check("history has both rows", rows.length === 2, `got ${rows.length}`);
  check("cancelled row says who, when and why", Boolean(cancelled?.cancelledBy && cancelled?.cancelledAt && cancelled?.cancelReason === "Changed their mind"));

  // Lowering capacity
  await register("second@example.com"); // now 2 active
  const tooLow = await call("PATCH", `/api/workshops/${id}`, manager, { capacity: 1 });
  check("capacity below active count is rejected (409)", tooLow.status === 409, `got ${tooLow.status}`);
  const fine = await call("PATCH", `/api/workshops/${id}`, manager, { capacity: 2 });
  check("capacity equal to active count is allowed", fine.status === 200 && fine.body.workshop.seatsLeft === 0);
  const full = await register("third@example.com");
  check("registering when full -> 409", full.status === 409);

  // Registration only while open
  await call("PATCH", `/api/workshops/${id}`, manager, { status: "completed", capacity: 5 });
  const closed = await register("fourth@example.com");
  check("registering for a non-open workshop -> 409", closed.status === 409 && /isn't open/i.test(closed.body.message));

  // Filters, alone and combined
  const byStatus = await call("GET", "/api/workshops?status=open", staff);
  check("status filter only returns that status", byStatus.body.workshops.every((w: WorkshopSummary) => w.status === "open"));

  const bySeats = await call("GET", "/api/workshops?hasSeats=true", staff);
  check("hasSeats filter only returns workshops with seats left", bySeats.body.workshops.every((w: WorkshopSummary) => w.seatsLeft > 0));

  const emptyRange = await call("GET", "/api/workshops?from=2000-01-01&to=2000-01-02", staff);
  check("a date range with nothing in it returns an empty list", emptyRange.body.workshops.length === 0);

  const today = new Date().toISOString().slice(0, 10);
  const combined = await call("GET", `/api/workshops?status=open&hasSeats=true&from=${today}`, staff);
  const start = Date.now() - 36 * 60 * 60 * 1000; // generous: the centre's day may start before UTC's
  check(
    "combined filters all apply together",
    combined.status === 200 &&
      combined.body.workshops.every((w: WorkshopSummary) => w.status === "open" && w.seatsLeft > 0 && new Date(w.startsAt).getTime() >= start)
  );

  const sorted = combined.body.workshops.map((w: WorkshopSummary) => w.startsAt);
  check("default sort is soonest first", [...sorted].sort().join() === sorted.join());

  const bad = await call("GET", "/api/workshops?status=bogus", staff);
  check("an invalid filter -> 400 with a message", bad.status === 400 && typeof bad.body.message === "string");

  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});