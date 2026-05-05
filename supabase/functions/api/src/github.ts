const CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET")!;

// -----------------------------
// 1. Redirect to GitHub Login
// -----------------------------
export function githubLogin(): Response {
  const redirectUrl =
    `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=user:email`;

  return Response.redirect(redirectUrl, 302);
}

// -----------------------------
// 2. GitHub OAuth Callback
// -----------------------------
export async function githubCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return json({ error: "Missing code" }, 400);
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code
    })
  });

  const jsonData = await tokenRes.json();

  if (!jsonData.access_token) {
    console.error("GitHub Token Error:", jsonData);
    return json({ error: "Failed to obtain access token" }, 500);
  }

  const token = jsonData.access_token;

  // Redirect back to your app
  return Response.redirect(
    `geoweather://auth/callback?token=${token}`,
    302
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
