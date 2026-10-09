import { NextResponse } from "next/server";
import { ApiError, parseJson, route } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { updateWorkshopSchema } from "@/lib/validation";
import { getWorkshop, updateWorkshop } from "@/lib/workshops";

export const GET = route(
  async (_req, { params }: { params: { id: string } }) => {
    await requireRole(["manager", "staff"]);
    const workshop = await getWorkshop(params.id);
    if (!workshop) throw new ApiError(404, "We couldn't find that workshop.");
    return NextResponse.json({ workshop });
  },
);

export const PATCH = route(
  async (req, { params }: { params: { id: string } }) => {
    const actor = await requireRole(["manager"]);
    const input = await parseJson(req, updateWorkshopSchema);
    const workshop = await updateWorkshop(params.id, input, actor.id);
    return NextResponse.json({ workshop });
  },
);
