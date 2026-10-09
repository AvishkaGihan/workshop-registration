import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Ctx<P> = { params: P };

/** Wrap a route handler so thrown errors become clean JSON responses. */
export function route<
  P extends Record<string, string> = Record<string, string>,
>(handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { message: err.message },
          { status: err.status },
        );
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { message: "That already exists." },
          { status: 409 },
        );
      }
      console.error(err);
      return NextResponse.json(
        { message: "Something went wrong on our side. Please try again." },
        { status: 500 },
      );
    }
  };
}

export function firstMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue.message.endsWith(".")) return issue.message;
  const field = issue.path.join(".") || "Request";
  return `${field}: ${issue.message}`;
}

function validate<S extends z.ZodTypeAny>(
  schema: S,
  raw: unknown,
): z.output<S> {
  const result = schema.safeParse(raw);
  if (!result.success) throw new ApiError(400, firstMessage(result.error));
  return result.data;
}

/** Parse and validate a JSON body. A missing or invalid body is treated as {}. */
export async function parseJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    // empty or invalid body: validation below will explain what is missing
  }
  return validate(schema, raw);
}

/** Parse and validate query string parameters (empty values are ignored). */
export function parseQuery<S extends z.ZodTypeAny>(
  req: NextRequest,
  schema: S,
): z.output<S> {
  const entries = [...req.nextUrl.searchParams.entries()].filter(
    ([, v]) => v !== "",
  );
  return validate(schema, Object.fromEntries(entries));
}
