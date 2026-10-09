import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { requireRole } from "@/lib/auth";

export const GET = route(async () => {
  const user = await requireRole(["admin", "manager", "staff"]);
  return NextResponse.json({ user });
});
