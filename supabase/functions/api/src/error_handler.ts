export function handleError(err: any, req: Request): Response {
  console.error("EDGE ERROR:", {
    message: err?.message,
    stack: err?.stack,
    url: req.url,
    method: req.method
  });

  return new Response(
    JSON.stringify({
      error: "Internal Server Error",
      detail: err?.message ?? "unknown"
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
