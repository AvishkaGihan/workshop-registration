import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, parseJson, route } from "@/lib/http";
import { createSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const { email, password } = await parseJson(req, loginSchema);

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await verifyPassword(password, user?.passwordHash);
  if (!user || !passwordOk) {
    throw new ApiError(
      401,
      "That email and password don't match. Please try again.",
    );
  }
  if (!user.isActive) {
    throw new ApiError(
      403,
      "This account has been deactivated. Please ask an Admin for help.",
    );
  }

  await createSession(user.id);
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
