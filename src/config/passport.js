console.log(">>> USING PASSPORT FILE:", __filename);

const { OAuthApp } = require("@octokit/oauth-app");

const app = new OAuthApp({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET
});

module.exports.githubLogin = async (req, res) => {
  const url = app.getAuthorizationUrl({
    scopes: ["user:email"]
  });

  res.redirect(url);
};

module.exports.githubCallback = async (req, res) => {
  try {
    const { code } = req.query;

    const token = await app.createToken({ code });

    // token.authentication.token = access_token
    // token.authentication.scopes = scopes

    res.redirect(
      `geoweather://auth/callback?token=${token.authentication.token}`
    );
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    res.status(500).json({ message: "OAuth failed", error: err.message });
  }
};

console.log("GITHUB_CLIENT_ID:", process.env.GITHUB_CLIENT_ID);
console.log("GITHUB_CLIENT_SECRET:", process.env.GITHUB_CLIENT_SECRET ? "LOADED" : "MISSING");

module.exports = passport;
