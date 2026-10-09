import { PrismaClient } from "@prisma/client";

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (url && url.includes("-pooler") && !url.includes("pgbouncer=")) {
    return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  }
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
