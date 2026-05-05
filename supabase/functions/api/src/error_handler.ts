export function handleError(error: unknown, req: Request): Response {
  const err = error instanceof Error ? error : new Error(String(error));

  console.error("Error Handler:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  const isProd = Deno.env.get("NODE_ENV") === "production";

  return new Response(
    JSON.stringify({
      message: "Internal server error",
      ...(isProd ? { error: err.message } : { stack: err.stack })
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" }
    }
  );
}
