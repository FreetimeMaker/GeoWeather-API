// ---------------------------------------------------------
// GeoWeather API — Supabase Edge Functions (Deno)
// ---------------------------------------------------------

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Controllers
import { AuthController } from "./src/auth.ts";
import { LocationsController } from "./src/locations.ts";
import { SubscriptionController } from "./src/subscriptions.ts";
import { FreemiumController } from "./src/freemium.ts";
import { PremiumController } from "./src/premium.ts";
import { OxaPayController } from "./src/oxapay.ts";

// Middleware
import { authenticate } from "./src/auth_middleware.ts";
import { optionalAuth } from "./src/optional_auth.ts";

// Error handler
import { handleError } from "./src/error_handler.ts";

// ---------------------------------------------------------
// Supabase Client
// ---------------------------------------------------------
function dbClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ---------------------------------------------------------
// JSON helper
// ---------------------------------------------------------
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// ---------------------------------------------------------
// Health Check (Edge Version)
// ---------------------------------------------------------
async function healthCheck(): Promise<Response> {
  const result: any = {
    status: "ok",
    service: "GeoWeather API",
    timestamp: new Date().toISOString(),
    version: Deno.env.get("VERCEL_GIT_COMMIT_SHA") ?? "local-dev",
    checks: {}
  };

  // 1) Liveness
  result.checks.live = true;

  // 2) Database readiness
  try {
    const db = dbClient();
    const { error } = await db.from("users").select("id").limit(1);
    result.checks.database = error ? "disconnected" : "connected";
    if (error) result.status = "degraded";
  } catch (err) {
    result.checks.database = `error: ${err.message}`;
    result.status = "degraded";
  }

  // 3) OxaPay API check
  try {
    const res = await fetch("https://api.oxapay.com/v1/common/monitor", {
      method: "HEAD"
    });
    result.checks.oxapay = res.ok ? "reachable" : "unreachable";
    if (!res.ok) result.status = "degraded";
  } catch (err) {
    result.checks.oxapay = `error: ${err.message}`;
    result.status = "degraded";
  }

  // 4) Environment info
  result.checks.environment = {
    region: Deno.env.get("VERCEL_REGION") ?? "local",
    runtime: "supabase-edge"
  };

  return json(result, result.status === "ok" ? 200 : 503);
}

// ---------------------------------------------------------
// Root Route
// ---------------------------------------------------------
function rootRoute(): Response {
  return json({
    message: "Welcome to the GeoWeather API!",
    version: "1.0.0",
    endpoints: {
      health: "/v1/health",
      auth: "/v1/auth",
      github: "/v1/auth/github",
      locations: "/v1/locations",
      weatherHistory: "/v1/weather-history",
      subscriptions: "/v1/subscriptions",
      freemium: "/v1/freemium",
      premium: "/v1/premium"
    }
  });
}

// ---------------------------------------------------------
// Main Router
// ---------------------------------------------------------
serve(async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    let path = url.pathname.replace(/^\/functions\/api/, "");
    const method = req.method;
    const db = dbClient();

    // -----------------------------
    // HEALTH CHECK
    // -----------------------------
    if (method === "GET" && path === "/v1/health") {
      return await healthCheck();
    }

    // -----------------------------
    // ROOT
    // -----------------------------
    if (method === "GET" && path === "/") {
      return rootRoute();
    }

    // -----------------------------
    // AUTH ROUTES
    // -----------------------------
    if (path.startsWith("/v1/auth")) {
      if (method === "POST" && path === "/v1/auth/register") {
        return AuthController.register(req, db);
      }
      if (method === "POST" && path === "/v1/auth/login") {
        return AuthController.login(req, db);
      }
      if (method === "GET" && path === "/v1/auth/github") {
        return AuthController.githubAuth();
      }
      if (method === "GET" && path === "/v1/auth/github/callback") {
        return AuthController.githubCallback(req, db);
      }
    }

    // -----------------------------
    // LOCATIONS (optionalAuth)
    // -----------------------------
    if (path.startsWith("/v1/locations")) {
      const { user, isAnonymous } = await optionalAuth(req);

      if (method === "POST" && path === "/v1/locations") {
        return LocationsController.create(req, db, { ...user, isAnonymous });
      }
      if (method === "GET" && path === "/v1/locations") {
        return LocationsController.getAll(req, db, user);
      }
      if (method === "GET" && path.startsWith("/v1/locations/")) {
        const id = path.split("/").pop()!;
        return LocationsController.getById(req, db, user, id);
      }
      if (method === "PUT" && path.startsWith("/v1/locations/")) {
        const id = path.split("/").pop()!;
        return LocationsController.update(req, db, user, id);
      }
      if (method === "DELETE" && path.startsWith("/v1/locations/")) {
        const id = path.split("/").pop()!;
        return LocationsController.delete(req, db, user, id);
      }
      if (method === "POST" && path === "/v1/locations/sync") {
        return LocationsController.sync(req, db, user);
      }
    }

    // -----------------------------
    // SUBSCRIPTIONS (auth required)
    // -----------------------------
    if (path.startsWith("/v1/subscriptions")) {
      const auth = await authenticate(req);
      if (!auth.ok) return auth.response;

      const user = auth.user;

      if (method === "POST" && path === "/v1/subscriptions") {
        return SubscriptionController.create(req, db, user);
      }
      if (method === "GET" && path === "/v1/subscriptions") {
        return SubscriptionController.get(req, db, user);
      }
      if (method === "PUT" && path === "/v1/subscriptions") {
        return SubscriptionController.upgrade(req, db, user);
      }
      if (method === "GET" && path === "/v1/subscriptions/pricing") {
        return SubscriptionController.pricing();
      }
      if (method === "GET" && path === "/v1/subscriptions/upgrade-pricing") {
        return SubscriptionController.upgradePricing(req, db, user);
      }
      if (method === "POST" && path === "/v1/subscriptions/upgrade") {
        return SubscriptionController.upgradeOneTime(req, db, user);
      }
      if (method === "POST" && path === "/v1/subscriptions/buy") {
        return OxaPayController.buy(req, db, user);
      }
      if (method === "POST" && path === "/v1/subscriptions/oxapay/callback") {
        return OxaPayController.callback(req, db);
      }
      if (method === "GET" && path === "/v1/subscriptions/oxapay/return") {
        return OxaPayController.return(req);
      }
    }

    // -----------------------------
    // FREEMIUM (auth required)
    // -----------------------------
    if (path.startsWith("/v1/freemium")) {
      const auth = await authenticate(req);
      if (!auth.ok) return auth.response;

      const user = auth.user;

      if (method === "POST" && path === "/v1/freemium/weather-sources") {
        return FreemiumController.weatherSources(req, db, user);
      }
      if (method === "GET" && path === "/v1/freemium/map-layers") {
        return FreemiumController.mapLayers(req, db, user);
      }
      if (method === "POST" && path === "/v1/freemium/weather-alert") {
        return FreemiumController.weatherAlert(req, db, user);
      }
    }

    // -----------------------------
    // PREMIUM (auth required)
    // -----------------------------
    if (path.startsWith("/v1/premium")) {
      const auth = await authenticate(req);
      if (!auth.ok) return auth.response;

      const user = auth.user;

      if (method === "POST" && path === "/v1/premium/weather-sources") {
        return PremiumController.weatherSources(req, db, user);
      }
      if (method === "GET" && path === "/v1/premium/map-layers") {
        return PremiumController.mapLayers(req, db, user);
      }
      if (method === "POST" && path === "/v1/premium/weather-alert") {
        return PremiumController.weatherAlert(req, db, user);
      }
    }

    // -----------------------------
    // 404
    // -----------------------------
    return json({ message: "Route not found" }, 404);

  } catch (err) {
    return handleError(err, req);
  }
});
