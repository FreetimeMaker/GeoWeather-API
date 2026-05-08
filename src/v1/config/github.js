const https = require("https");
const querystring = require("querystring");

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

function githubLogin(req, res) {
    const redirect = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=user:email`;
    res.redirect(redirect);
}

function githubCallback(req, res) {
    const code = req.query.code;

    const postData = querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code
    });

    const options = {
        hostname: "github.com",
        path: "/login/oauth/access_token",
        method: "POST",
        headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData)
        }
    };

    const request = https.request(options, (response) => {
        let data = "";

        response.on("data", (chunk) => {
        data += chunk;
        });

        response.on("end", () => {
        try {
            const json = JSON.parse(data);

            if (!json.access_token) {
            console.error("GitHub Token Error:", json);
            return res.status(500).json({ error: "Failed to obtain access token" });
            }

            const token = json.access_token;

            return res.redirect(`geoweather://auth/callback?token=${token}`);
        } catch (err) {
            console.error("GitHub OAuth parse error:", err);
            return res.status(500).json({ error: "OAuth failed" });
        }
        });
    });

    request.on("error", (err) => {
        console.error("GitHub OAuth request error:", err);
        res.status(500).json({ error: "OAuth request failed" });
    });

    request.write(postData);
    request.end();
}

module.exports = { githubLogin, githubCallback };