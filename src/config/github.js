// src/config/github.js

let OAuthApp;

(async () => {
  const module = await import("@octokit/oauth-app");
  OAuthApp = module.OAuthApp;
})();

function createApp() {
  return new OAuthApp({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  });
}

async function githubLogin(req, res) {
  const app = createApp();

  const { url } = app.getWebFlowAuthorizationUrl({
    scopes: ["user:email"]
  });

  res.redirect(url);
}

async function githubCallback(req, res) {
  try {
    const app = createApp();
    const { code } = req.query;

    const tokenData = await app.createToken({ code });
    const accessToken = tokenData.authentication.token;

    res.redirect(`geoweather://auth/callback?token=${accessToken}`);
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    res.status(500).json({ message: "OAuth failed", error: err.message });
  }
}

module.exports = { githubLogin, githubCallback };
