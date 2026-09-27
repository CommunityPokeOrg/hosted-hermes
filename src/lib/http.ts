import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { ProvisionerError } from "@/lib/provision/types";
import { StoreError } from "@/lib/store/memory";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function parseBody<Output, Def extends ZodTypeDef, Input>(
  req: Request,
  schema: ZodType<Output, Def, Input>,
): Promise<Output> {
  const raw = await req.json().catch(() => {
    throw new ApiError("invalid JSON body", 400);
  });
  return schema.parseAsync(raw);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** Uniform error mapping for route handlers. */
export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) return jsonError(err.message, err.status);
  if (err instanceof ZodError) {
    return jsonError(
      err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      400,
    );
  }
  if (err instanceof StoreError) {
    return jsonError(err.message, err.code === "CONFLICT" ? 409 : 404);
  }
  if (err instanceof ProvisionerError) {
    return jsonError(err.message, err.statusCode === 404 ? 404 : err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502);
  }
  const message = err instanceof Error ? err.message : "internal error";
  return jsonError(message, 500);
}
