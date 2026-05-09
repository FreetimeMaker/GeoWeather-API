const https = require("https");

const CLIENT_ID = process.env.MODRINTH_CLIENT_ID;
const CLIENT_SECRET = process.env.MODRINTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.MODRINTH_REDIRECT_URI;

function modrinthLogin(req, res) {
    const redirect =
        `https://modrinth.com/auth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=USER_READ_EMAIL`;

    res.redirect(redirect);
}

function exchangeModrinthCodeForToken(code) {
    const postData = JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
    });

    const options = {
        hostname: "api.modrinth.com",
        path: "/_internal/oauth/token",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const request = https.request(options, (response) => {
            let data = "";

            response.on("data", (chunk) => data += chunk);
            response.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    if (!json.access_token) return reject(new Error("No access token"));
                    resolve(json.access_token);
                } catch (err) {
                    reject(err);
                }
            });
        });

        request.on("error", reject);
        request.write(postData);
        request.end();
    });
}

function fetchModrinthUser(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.modrinth.com",
            path: "/v2/user",
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        };

        const request = https.request(options, (response) => {
            let data = "";

            response.on("data", (chunk) => data += chunk);
            response.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        });

        request.on("error", reject);
        request.end();
    });
}

module.exports = {
    modrinthLogin,
    exchangeModrinthCodeForToken,
    fetchModrinthUser
};
