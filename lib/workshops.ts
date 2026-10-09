import { Prisma, type Workshop } from "@prisma/client";
import { prisma } from "./db";
import { ApiError } from "./http";
import { diffFields, writeAudit } from "./audit";
import { CENTRE_TZ, dayStartUtc, nextDayStartUtc } from "./time";
import type {
  CreateWorkshopInput,
  UpdateWorkshopInput,
  WorkshopFilters,
} from "./validation";

export function toWorkshopView(w: Workshop) {
  const seatsLeft = Math.max(w.capacity - w.activeCount, 0);
  return {
    id: w.id,
    code: w.code,
    title: w.title,
    instructor: w.instructor,
    startsAt: w.startsAt.toISOString(),
    durationMinutes: w.durationMinutes,
    location: w.location,
    description: w.description,
    capacity: w.capacity,
    activeCount: w.activeCount,
    status: w.status,
    seatsLeft,
    isFull: seatsLeft === 0,
  };
}
export type WorkshopView = ReturnType<typeof toWorkshopView>;

export async function listWorkshops(
  filters: WorkshopFilters,
): Promise<WorkshopView[]> {
  const where: Prisma.WorkshopWhereInput = {};

  if (filters.from || filters.to) {
    const range: Prisma.DateTimeFilter = {};
    if (filters.from) range.gte = dayStartUtc(filters.from, CENTRE_TZ);
    if (filters.to) range.lt = nextDayStartUtc(filters.to, CENTRE_TZ);
    where.startsAt = range;
  }
  if (filters.status) where.status = filters.status;
  // "Has seats" = fewer active registrations than capacity (compares two columns in SQL).
  if (filters.hasSeats)
    where.activeCount = { lt: prisma.workshop.fields.capacity };

  const rows = await prisma.workshop.findMany({
    where,
    orderBy: [{ startsAt: "asc" }, { code: "asc" }],
  });
  return rows.map(toWorkshopView);
}

export async function getWorkshop(id: string): Promise<WorkshopView | null> {
  const row = await prisma.workshop.findUnique({ where: { id } });
  return row ? toWorkshopView(row) : null;
}

const duplicateCode = (code?: string) =>
  new ApiError(
    409,
    code
      ? `The code ${code} is already used by another workshop. Please choose a different one.`
      : "That workshop code is already used. Please choose a different one.",
  );

export async function createWorkshop(
  input: CreateWorkshopInput,
  actorId: string,
): Promise<WorkshopView> {
  try {
    return await prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.create({
        data: { ...input, createdById: actorId, updatedById: actorId },
      });
      await writeAudit(tx, {
        actorId,
        action: "workshop.create",
        entityType: "workshop",
        entityId: workshop.id,
        changes: {
          code: workshop.code,
          title: workshop.title,
          capacity: workshop.capacity,
        },
      });
      return toWorkshopView(workshop);
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    )
      throw duplicateCode(input.code);
    throw err;
  }
}

export async function updateWorkshop(
  id: string,
  input: UpdateWorkshopInput,
  actorId: string,
): Promise<WorkshopView> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the row so a registration can't sneak in between our check and our update (W4).
      const rows = await tx.$queryRaw<{ active_count: number }[]>`
        SELECT active_count FROM workshops WHERE id = ${id} FOR UPDATE`;
      if (rows.length === 0)
        throw new ApiError(404, "We couldn't find that workshop.");

      const activeCount = rows[0].active_count;
      if (input.capacity !== undefined && input.capacity < activeCount) {
        throw new ApiError(
          409,
          `${activeCount} ${activeCount === 1 ? "person is" : "people are"} already registered, so capacity can't go below ${activeCount}.`,
        );
      }

      const before = await tx.workshop.findUniqueOrThrow({ where: { id } });
      const updated = await tx.workshop.update({
        where: { id },
        data: { ...input, updatedById: actorId },
      });

      const changes = diffFields(before, input);
      if (Object.keys(changes).length > 0) {
        await writeAudit(tx, {
          actorId,
          action: "workshop.update",
          entityType: "workshop",
          entityId: id,
          changes,
        });
      }
      return toWorkshopView(updated);
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    )
      throw duplicateCode(input.code);
    throw err;
  }
}
