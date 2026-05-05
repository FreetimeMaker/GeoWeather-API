import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

// ---------------------------------------------------------
// Extract Bearer token from Authorization header
// ---------------------------------------------------------
function getToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
}

// ---------------------------------------------------------
// Verify JWT and return user payload
// ---------------------------------------------------------
export async function authenticate(req: Request): Promise<
  | { ok: true; user: any }
  | { ok: false; response: Response }
> {
  const token = getToken(req);

  if (!token) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ message: "Token not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    };
  }

  try {
    const payload = await verify(token, JWT_SECRET, "HS256");

    return {
      ok: true,
      user: {
        userId: payload.userId,
        username: payload.username,
        avatar: payload.avatar,
        isAnonymous: payload.userId?.startsWith("anon_") ?? false
      }
    };
  } catch {
    return {
      ok: false,
      response: new Response(JSON.stringify({ message: "Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
}
