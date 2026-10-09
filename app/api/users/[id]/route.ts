import { NextResponse } from "next/server";
import { parseJson, route } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validation";
import { updateUser } from "@/lib/users";

export const PATCH = route(async (req, { params }: { params: { id: string } }) => {
  const actor = await requireRole(["admin"]);
  const input = await parseJson(req, updateUserSchema);
  const user = await updateUser(params.id, input, actor.id);
  return NextResponse.json({ user });
});