import { Prisma, type User } from "@prisma/client";
import { prisma } from "./db";
import { ApiError } from "./http";
import { hashPassword } from "./auth";
import { diffFields, writeAudit } from "./audit";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type UserRow = Pick<
  User,
  "id" | "name" | "email" | "role" | "isActive" | "createdAt"
>;

export function toUserView(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}
export type UserView = ReturnType<typeof toUserView>;

export async function listUsers(): Promise<UserView[]> {
  const rows = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return rows.map(toUserView);
}

export async function createUser(
  input: { name: string; email: string; password: string; role: User["role"] },
  actorId: string,
): Promise<UserView> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash,
        },
        select: USER_SELECT,
      });
      await writeAudit(tx, {
        actorId,
        action: "user.create",
        entityType: "user",
        entityId: user.id,
        changes: { email: user.email, role: user.role },
      });
      return toUserView(user);
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ApiError(
        409,
        "Someone with that email address already has an account.",
      );
    }
    throw err;
  }
}

export async function updateUser(
  id: string,
  input: { role?: User["role"]; isActive?: boolean },
  actorId: string,
): Promise<UserView> {
  return prisma.$transaction(async (tx) => {
    // Lock all active admins so two people can't remove the last two admins at the same moment (A7).
    await tx.$queryRaw`SELECT id FROM users WHERE role = 'admin' AND is_active = true FOR UPDATE`;

    const target = await tx.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, "We couldn't find that user.");

    const nextRole = input.role ?? target.role;
    const nextActive = input.isActive ?? target.isActive;

    const losesAdminPower =
      target.role === "admin" &&
      target.isActive &&
      (nextRole !== "admin" || !nextActive);
    if (losesAdminPower) {
      const otherAdmins = await tx.user.count({
        where: { role: "admin", isActive: true, id: { not: id } },
      });
      if (otherAdmins === 0) {
        throw new ApiError(
          409,
          "There must always be at least one active Admin, so this change can't be made.",
        );
      }
    }

    const updated = await tx.user.update({
      where: { id },
      data: { role: nextRole, isActive: nextActive },
      select: USER_SELECT,
    });

    const changes = diffFields(
      { role: target.role, isActive: target.isActive },
      { role: nextRole, isActive: nextActive },
    );
    if (Object.keys(changes).length > 0) {
      await writeAudit(tx, {
        actorId,
        action: "user.update",
        entityType: "user",
        entityId: id,
        changes,
      });
    }
    return toUserView(updated);
  });
}
