import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getCurrentUser } from "./auth";

export async function requirePage(roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { user, allowed: roles.includes(user.role) };
}
