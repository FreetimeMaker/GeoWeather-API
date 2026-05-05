const fetch = require("node-fetch");

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

function githubLogin(req, res) {
  const redirect = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=user:email`;
  res.redirect(redirect);
}

async function githubCallback(req, res) {
  try {
    const code = req.query.code;

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json"
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("GitHub Token Error:", tokenData);
      return res.status(500).json({ error: "Failed to obtain access token" });
    }

    const accessToken = tokenData.access_token;

    // 2. Redirect to your app
    return res.redirect(`geoweather://auth/callback?token=${accessToken}`);

  } catch (err) {
    console.error("GitHub OAuth error:", err);
    res.status(500).json({ message: "OAuth failed", error: err.message });
  }
}

module.exports = { githubLogin, githubCallback };
