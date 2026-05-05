import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID")!;
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET")!;
const REFRESH_SECRET = `${JWT_SECRET}_refresh`;

// ---------------------------------------------------------
// JWT Helpers
// ---------------------------------------------------------
async function generateToken(user: any) {
  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      userId: user.id,
      username: user.username,
      avatar: user.avatar_url,
      exp: getNumericDate(60 * 60 * 24 * 7)
    },
    JWT_SECRET
  );
}

async function generateRefreshToken(user: any) {
  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      userId: user.id,
      exp: getNumericDate(60 * 60 * 24 * 30)
    },
    REFRESH_SECRET
  );
}

// ---------------------------------------------------------
// GitHub OAuth – Start
// ---------------------------------------------------------
export function githubAuth(): Response {
  const redirect = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email`;
  return Response.redirect(redirect, 302);
}

// ---------------------------------------------------------
// GitHub OAuth – Callback (Deep Link Redirect)
// ---------------------------------------------------------
export async function githubCallback(req: Request, db: any): Promise<Response> {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) return json({ message: "Missing code" }, 400);

    const token = await exchangeCodeForToken(code);
    const ghUser = await fetchGitHubUser(token);

    let user = await findUserByUsername(db, ghUser.login);

    if (!user) {
      user = await createOAuthUser(db, ghUser.login, ghUser.name || ghUser.login, ghUser.avatar_url);
    }

    const jwt = await generateToken(user);
    const refreshToken = await generateRefreshToken(user);

    const avatar = encodeURIComponent(user.avatar_url || "");

    return Response.redirect(
      `geoweather://auth/callback?token=${jwt}&avatar=${avatar}`,
      302
    );

  } catch (error) {
    return json({ message: "OAuth failed", error: error.message }, 500);
  }
}

// ---------------------------------------------------------
// GitHub OAuth – Mobile JSON Callback
// ---------------------------------------------------------
export async function githubMobileCallback(req: Request, db: any): Promise<Response> {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) return json({ message: "Missing code" }, 400);

    const token = await exchangeCodeForToken(code);
    const ghUser = await fetchGitHubUser(token);

    let user = await findUserByUsername(db, ghUser.login);

    if (!user) {
      user = await createOAuthUser(db, ghUser.login, ghUser.name || ghUser.login, ghUser.avatar_url);
    }

    const jwt = await generateToken(user);
    const refreshToken = await generateRefreshToken(user);

    return json({
      success: true,
      message: "GitHub authentication successful",
      user,
      token: jwt,
      refreshToken
    });

  } catch (error) {
    return json({ success: false, message: error.message }, 500);
  }
}

// ---------------------------------------------------------
// Registrierung
// ---------------------------------------------------------
export async function register(req: Request, db: any): Promise<Response> {
  try {
    const { username, password, name } = await req.json();

    if (!username || !password || !name) {
      return json({ message: "Username, password and name required" }, 400);
    }

    const existing = await findUserByUsername(db, username);
    if (existing) return json({ message: "Username already taken" }, 400);

    const user = await createUser(db, username, password, name);

    const token = await generateToken(user);
    const refreshToken = await generateRefreshToken(user);

    return json({
      message: "User successfully registered",
      user,
      token,
      refreshToken
    }, 201);

  } catch (error) {
    return json({ message: error.message }, 500);
  }
}

// ---------------------------------------------------------
// Login
// ---------------------------------------------------------
export async function login(req: Request, db: any): Promise<Response> {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return json({ message: "Username and password required" }, 400);
    }

    const user = await findUserByUsername(db, username);
    if (!user) return json({ message: "Invalid credentials" }, 401);

    const valid = await verifyPassword(password, user.password);
    if (!valid) return json({ message: "Invalid credentials" }, 401);

    const token = await generateToken(user);
    const refreshToken = await generateRefreshToken(user);

    return json({
      message: "Successfully logged in",
      user,
      token,
      refreshToken
    });

  } catch (error) {
    return json({ message: error.message }, 500);
  }
}

// ---------------------------------------------------------
// Logout
// ---------------------------------------------------------
export function logout(): Response {
  return json({ message: "Successfully logged out" });
}

// ---------------------------------------------------------
// Helper: Exchange GitHub Code for Access Token
// ---------------------------------------------------------
async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code
    })
  });

  const json = await res.json();
  if (!json.access_token) throw new Error("No access token");

  return json.access_token;
}

// ---------------------------------------------------------
// Helper: Fetch GitHub User
// ---------------------------------------------------------
async function fetchGitHubUser(token: string): Promise<any> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      "User-Agent": "GeoWeather-App",
      "Authorization": `Bearer ${token}`
    }
  });

  return await res.json();
}

// ---------------------------------------------------------
// User DB Helpers (Supabase)
// ---------------------------------------------------------
async function findUserByUsername(db: any, username: string) {
  const { data } = await db.from("users").select("*").eq("username", username).single();
  return data;
}

async function createOAuthUser(db: any, username: string, name: string, avatar: string) {
  const { data } = await db.from("users").insert({
    username,
    name,
    avatar_url: avatar,
    password: null
  }).select().single();

  return data;
}

async function createUser(db: any, username: string, password: string, name: string) {
  const { data } = await db.from("users").insert({
    username,
    password,
    name
  }).select().single();

  return data;
}

async function verifyPassword(input: string, hash: string) {
  return input === hash; // TODO: ersetze durch bcrypt für Deno
}

// ---------------------------------------------------------
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
