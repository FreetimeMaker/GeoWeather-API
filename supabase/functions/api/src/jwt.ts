import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SECRET = Deno.env.get("JWT_SECRET")!;
const REFRESH_SECRET = `${SECRET}_refresh`;

export async function generateToken(user: any) {
  const payload = {
    userId: user.id,
    username: user.username,
    avatar: user.avatar_url,
    exp: getNumericDate(60 * 60 * 24 * 7) // 7 Tage
  };

  return await create({ alg: "HS256", typ: "JWT" }, payload, SECRET);
}

export async function generateRefreshToken(user: any) {
  const payload = {
    userId: user.id,
    exp: getNumericDate(60 * 60 * 24 * 30) // 30 Tage
  };

  return await create({ alg: "HS256", typ: "JWT" }, payload, REFRESH_SECRET);
}

export async function verifyToken(token: string) {
  try {
    return await verify(token, SECRET, "HS256");
  } catch {
    return null;
  }
}
