import { NextResponse } from "next/server";
import { parseJson, route } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { createUserSchema } from "@/lib/validation";
import { createUser, listUsers } from "@/lib/users";

export const GET = route(async () => {
  await requireRole(["admin"]);
  return NextResponse.json({ users: await listUsers() });
});

export const POST = route(async (req) => {
  const actor = await requireRole(["admin"]);
  const input = await parseJson(req, createUserSchema);
  const user = await createUser(input, actor.id);
  return NextResponse.json({ user }, { status: 201 });
});