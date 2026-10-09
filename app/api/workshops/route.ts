import { NextResponse } from "next/server";
import { parseJson, parseQuery, route } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { createWorkshopSchema, workshopQuerySchema } from "@/lib/validation";
import { createWorkshop, listWorkshops } from "@/lib/workshops";

export const GET = route(async (req) => {
  await requireRole(["manager", "staff"]);
  const filters = parseQuery(req, workshopQuerySchema);
  return NextResponse.json({ workshops: await listWorkshops(filters) });
});

export const POST = route(async (req) => {
  const actor = await requireRole(["manager"]);
  const input = await parseJson(req, createWorkshopSchema);
  const workshop = await createWorkshop(input, actor.id);
  return NextResponse.json({ workshop }, { status: 201 });
});
