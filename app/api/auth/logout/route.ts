import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { destroySession } from "@/lib/auth";

export const POST = route(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
