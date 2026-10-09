import type { Prisma } from "@prisma/client";

type AuditEntry = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Prisma.InputJsonValue;
};

export async function writeAudit(tx: Prisma.TransactionClient, entry: AuditEntry) {
  await tx.auditLog.create({ data: entry });
}

const normalise = (v: unknown) => (v instanceof Date ? v.toISOString() : v);

/** Returns { field: { from, to } } for every field in `after` whose value differs from `before`. */
export function diffFields(before: object, after: object): Prisma.InputJsonObject {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const prev = before as Record<string, unknown>;
  for (const [key, value] of Object.entries(after)) {
    const from = normalise(prev[key]);
    const to = normalise(value);
    if (from !== to) changes[key] = { from, to };
  }
  return changes as Prisma.InputJsonObject;
}