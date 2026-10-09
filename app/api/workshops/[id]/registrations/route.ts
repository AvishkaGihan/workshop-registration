import { NextResponse } from "next/server";
import { ApiError, parseJson, route } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { getWorkshop } from "@/lib/workshops";
import { listRegistrations, registerAttendee } from "@/lib/registrations";
import { seatsLabel } from "@/lib/format";

export const GET = route(
  async (_req, { params }: { params: { id: string } }) => {
    await requireRole(["manager", "staff"]);
    const workshop = await getWorkshop(params.id);
    if (!workshop) throw new ApiError(404, "We couldn't find that workshop.");
    return NextResponse.json({
      registrations: await listRegistrations(params.id),
    });
  },
);

export const POST = route(
  async (req, { params }: { params: { id: string } }) => {
    const actor = await requireRole(["manager", "staff"]);
    const input = await parseJson(req, registerSchema);
    const { registration, workshop } = await registerAttendee(
      params.id,
      input,
      actor.id,
    );
    return NextResponse.json(
      {
        registration,
        workshop,
        message: `Registered ${registration.attendeeName}. ${seatsLabel(workshop.seatsLeft)}.`,
      },
      { status: 201 },
    );
  },
);
