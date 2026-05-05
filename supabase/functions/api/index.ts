import { FreemiumController } from "./src/freemium.ts";
import { authenticate } from "./src/auth_middleware.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    let path = url.pathname.replace(/^\/functions\/api/, "");
    const method = req.method;

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Freemium routes require auth
    if (path.startsWith("/v1/freemium")) {
      const auth = await authenticate(req);
      if (!auth.ok) return auth.response;

      const user = auth.user;

      // POST /v1/freemium/weather-sources
      if (method === "POST" && path === "/v1/freemium/weather-sources") {
        return FreemiumController.weatherSources(req, db, user);
      }

      // GET /v1/freemium/map-layers
      if (method === "GET" && path === "/v1/freemium/map-layers") {
        return FreemiumController.mapLayers(req, db, user);
      }

      // POST /v1/freemium/weather-alert
      if (method === "POST" && path === "/v1/freemium/weather-alert") {
        return FreemiumController.weatherAlert(req, db, user);
      }
    }

    return new Response("Not found", { status: 404 });

  } catch (err) {
    return handleError(err, req);
  }
});
