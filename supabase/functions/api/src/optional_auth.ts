import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

// ---------------------------------------------------------
// Extract Bearer token
// ---------------------------------------------------------
function getToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  return parts[1];
}

// ---------------------------------------------------------
// Optional Authentication
// ---------------------------------------------------------
export async function optionalAuth(req: Request): Promise<{
  user: any;
  isAnonymous: boolean;
}> {
  const token = getToken(req);

  if (token) {
    try {
      const payload = await verify(token, JWT_SECRET, "HS256");

      return {
        user: {
          userId: payload.userId,
          username: payload.username,
          avatar: payload.avatar,
          isAnonymous: false
        },
        isAnonymous: false
      };
    } catch {
      // Token invalid → fall back to anonymous
    }
  }

  // Anonymous fallback
  const anonId = "anon_" + crypto.randomUUID().slice(0, 8);

  return {
    user: { userId: anonId },
    isAnonymous: true
  };
}
