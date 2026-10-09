import { NextResponse } from "next/server";
import { parseJson, route } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { cancelSchema } from "@/lib/validation";
import { cancelRegistration } from "@/lib/registrations";
import { seatsLabel } from "@/lib/format";

export const POST = route(async (req, { params }: { params: { id: string } }) => {
  const actor = await requireRole(["manager", "staff"]); // role is checked before anything is looked up
  const { reason } = await parseJson(req, cancelSchema);
  const { registration, workshop, alreadyCancelled } = await cancelRegistration(params.id, actor.id, reason || undefined);

  const message = alreadyCancelled
    ? `${registration.attendeeName}'s registration was already cancelled, so no extra seat was freed.`
    : `Cancelled ${registration.attendeeName}'s registration. ${seatsLabel(workshop.seatsLeft)}. The record is kept in history.`;

  return NextResponse.json({ registration, workshop, alreadyCancelled, message });
});