import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { ApiError } from "./http";

const COOKIE_NAME = "wrs_session";
const SESSION_HOURS = 8;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10); // keeps login timing similar for unknown emails

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

export async function verifyPassword(password: string, hash?: string | null): Promise<boolean> {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return Boolean(hash) && matches;
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export function destroySession() {
  cookies().delete(COOKIE_NAME);
}

/** The signed-in, active user, or null. Always reads the latest role and status from the database. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return user && user.isActive ? user : null;
  } catch {
    return null;
  }
}

/**
 * THE access-control helper. Every API route calls this first.
 * 401 = not signed in, 403 = signed in but the role isn't allowed.
 */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  if (!roles.includes(user.role)) throw new ApiError(403, "You don't have access to do that.");
  return user;
}