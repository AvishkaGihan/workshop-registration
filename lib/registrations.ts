import { Prisma, type Registration } from "@prisma/client";
import { prisma } from "./db";
import { ApiError } from "./http";
import { toWorkshopView } from "./workshops";

const WITH_NAMES = {
  registeredBy: { select: { name: true } },
  cancelledBy: { select: { name: true } },
} satisfies Prisma.RegistrationInclude;

type RegistrationRow = Registration & {
  registeredBy: { name: string };
  cancelledBy: { name: string } | null;
};

export function toRegistrationView(r: RegistrationRow) {
  return {
    id: r.id,
    workshopId: r.workshopId,
    attendeeName: r.attendeeName,
    attendeeEmail: r.attendeeEmail,
    status: r.status,
    registeredBy: r.registeredBy.name,
    registeredAt: r.registeredAt.toISOString(),
    cancelledBy: r.cancelledBy?.name ?? null,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    cancelReason: r.cancelReason,
  };
}
export type RegistrationView = ReturnType<typeof toRegistrationView>;

/** Every row for a workshop, active and cancelled, newest first. This is also the History tab. */
export async function listRegistrations(
  workshopId: string,
): Promise<RegistrationView[]> {
  const rows = await prisma.registration.findMany({
    where: { workshopId },
    include: WITH_NAMES,
    orderBy: { registeredAt: "desc" },
  });
  return rows.map(toRegistrationView);
}

/**
 * REGISTER (capacity-safe).
 *
 * 1. One atomic UPDATE claims a seat only if the workshop is open AND not full.
 *    Postgres locks the workshop row for the rest of the transaction, so any other
 *    request for the same workshop waits here, then re-checks against the new count.
 *    There is no gap between "check" and "write".
 * 2. 0 rows updated => full or not open => roll back and return 409.
 * 3. Otherwise insert the registration in the same transaction and commit.
 *
 * Backstops in the database: CHECK (active_count <= capacity) and the partial unique
 * index on (workshop_id, lower(attendee_email)) WHERE status = 'active'.
 */
export async function registerAttendee(
  workshopId: string,
  input: { attendeeName: string; attendeeEmail: string },
  actorId: string,
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.$executeRaw`
          UPDATE workshops
             SET active_count = active_count + 1
           WHERE id = ${workshopId}
             AND status = 'open'
             AND active_count < capacity`;

        if (claimed === 0) {
          const workshop = await tx.workshop.findUnique({
            where: { id: workshopId },
            select: { status: true },
          });
          if (!workshop)
            throw new ApiError(404, "We couldn't find that workshop.");
          if (workshop.status !== "open") {
            throw new ApiError(
              409,
              "This workshop isn't open for registration right now.",
            );
          }
          throw new ApiError(409, "Sorry, this workshop just filled up.");
        }

        // We hold the workshop row lock now, so this check can't race with another registration.
        const duplicate = await tx.registration.findFirst({
          where: {
            workshopId,
            status: "active",
            attendeeEmail: { equals: input.attendeeEmail, mode: "insensitive" },
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new ApiError(
            409,
            `${input.attendeeEmail} is already registered for this workshop.`,
          );
        }

        const registration = await tx.registration.create({
          data: {
            workshopId,
            attendeeName: input.attendeeName,
            attendeeEmail: input.attendeeEmail,
            registeredById: actorId,
          },
          include: WITH_NAMES,
        });
        const workshop = await tx.workshop.findUniqueOrThrow({
          where: { id: workshopId },
        });

        return {
          registration: toRegistrationView(registration),
          workshop: toWorkshopView(workshop),
        };
      },
      { maxWait: 10_000, timeout: 10_000 },
    );
  } catch (err) {
    // The unique index is the last line of defence against a duplicate email.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ApiError(
        409,
        `${input.attendeeEmail} is already registered for this workshop.`,
      );
    }
    throw err;
  }
}

/**
 * CANCEL. Nothing is deleted.
 * The row flips from 'active' to 'cancelled' only WHERE status = 'active'.
 * If a row changed, the seat is released. A second cancel changes 0 rows,
 * so it can never free a second seat (G7).
 */
export async function cancelRegistration(
  registrationId: string,
  actorId: string,
  reason?: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.registration.findUnique({
        where: { id: registrationId },
        select: { workshopId: true },
      });
      if (!existing)
        throw new ApiError(404, "We couldn't find that registration.");

      const changed = await tx.$executeRaw`
        UPDATE registrations
           SET status = 'cancelled',
               cancelled_by = ${actorId},
               cancelled_at = now(),
               cancel_reason = ${reason ?? null}
         WHERE id = ${registrationId}
           AND status = 'active'`;

      if (changed === 1) {
        await tx.$executeRaw`
          UPDATE workshops SET active_count = active_count - 1 WHERE id = ${existing.workshopId}`;
      }

      const registration = await tx.registration.findUniqueOrThrow({
        where: { id: registrationId },
        include: WITH_NAMES,
      });
      const workshop = await tx.workshop.findUniqueOrThrow({
        where: { id: existing.workshopId },
      });

      return {
        registration: toRegistrationView(registration),
        workshop: toWorkshopView(workshop),
        alreadyCancelled: changed === 0,
      };
    },
    { maxWait: 10_000, timeout: 10_000 },
  );
}
