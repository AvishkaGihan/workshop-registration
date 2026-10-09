import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { destroySession } from "@/lib/auth";

export const POST = route(async () => {
  destroySession();
  return NextResponse.json({ ok: true });
});
