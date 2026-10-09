import { PrismaClient } from "@prisma/client";
import { call, check, finish, loginAs, newWorkshopPayload, uniqueCode } from "./helpers";

const prisma = new PrismaClient();
const SEATS = 5;
const ATTEMPTS = 20;

async function assertConsistent(label: string, workshopId: string) {
  const [workshop, activeRows] = await Promise.all([
    prisma.workshop.findUniqueOrThrow({ where: { id: workshopId } }),
    prisma.registration.count({ where: { workshopId, status: "active" } }),
  ]);
  check(`${label}: active_count matches the real number of active rows`, workshop.activeCount === activeRows, `counter ${workshop.activeCount}, rows ${activeRows}`);
  check(`${label}: never above capacity`, activeRows <= workshop.capacity, `${activeRows} > ${workshop.capacity}`);
}

async function main() {
  const manager = await loginAs("manager@example.com");
  const staff = await loginAs("staff@example.com");

  // ---- 1. 20 parallel registrations for 5 seats ----
  const created = await call("POST", "/api/workshops", manager, newWorkshopPayload(uniqueCode("CONC"), SEATS));
  const workshopId: string = created.body.workshop.id;

  const results = await Promise.all(
    Array.from({ length: ATTEMPTS }, (_, i) =>
      call("POST", `/api/workshops/${workshopId}/registrations`, staff, {
        attendeeName: `Tester ${i + 1}`,
        attendeeEmail: `tester${i + 1}@example.com`,
      })
    )
  );
  const succeeded = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409);
  console.log(`\nCapacity ${SEATS}, ${ATTEMPTS} parallel requests: ${succeeded.length} succeeded, ${conflicts.length} got 409.\n`);

  check(`exactly ${SEATS} requests succeeded`, succeeded.length === SEATS, `got ${succeeded.length}`);
  check(`exactly ${ATTEMPTS - SEATS} requests got 409`, conflicts.length === ATTEMPTS - SEATS, `got ${conflicts.length}`);
  check("409 explains what happened", conflicts.every((r) => /filled up/i.test(r.body.message)));
  await assertConsistent("after registering", workshopId);

  // ---- 2. Cancelling twice (in parallel) frees exactly one seat ----
  const registrationId: string = succeeded[0].body.registration.id;
  const cancels = await Promise.all([
    call("POST", `/api/registrations/${registrationId}/cancel`, staff, { reason: "Test" }),
    call("POST", `/api/registrations/${registrationId}/cancel`, staff, { reason: "Test again" }),
  ]);
  check("both cancel calls return 200", cancels.every((r) => r.status === 200));
  check("exactly one cancel changed anything", cancels.filter((r) => r.body.alreadyCancelled === false).length === 1);
  const afterCancel = await call("GET", `/api/workshops/${workshopId}`, staff);
  check(`cancelling twice freed exactly one seat (seatsLeft = 1)`, afterCancel.body.workshop.seatsLeft === 1, `seatsLeft ${afterCancel.body.workshop.seatsLeft}`);
  await assertConsistent("after cancelling twice", workshopId);

  // ---- 3. 10 parallel requests for the single freed seat ----
  const lastSeat = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      call("POST", `/api/workshops/${workshopId}/registrations`, staff, {
        attendeeName: `Late ${i + 1}`,
        attendeeEmail: `late${i + 1}@example.com`,
      })
    )
  );
  check("the last seat went to exactly one person", lastSeat.filter((r) => r.status === 201).length === 1);
  await assertConsistent("after the last-seat race", workshopId);

  // ---- 4. The same email, 5 requests at once, plenty of seats ----
  const second = await call("POST", "/api/workshops", manager, newWorkshopPayload(uniqueCode("DUPE"), 10));
  const secondId: string = second.body.workshop.id;
  const dupes = await Promise.all(
    Array.from({ length: 5 }, () =>
      call("POST", `/api/workshops/${secondId}/registrations`, staff, {
        attendeeName: "Same Person",
        attendeeEmail: "same.person@example.com",
      })
    )
  );
  check("the same email can only be active once", dupes.filter((r) => r.status === 201).length === 1);
  await assertConsistent("after the duplicate-email race", secondId);

  await prisma.$disconnect();
  finish();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});