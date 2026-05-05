import { SubscriptionModel } from "./models/subscription.ts";
import { WeatherDataService } from "./services/weather_data_service.ts";
import { MapTileService } from "./services/map_tile_service.ts";
import { PushNotificationService } from "./services/push_notification_service.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export const PremiumController = {
  // -------------------------------------------------------
  // POST /v1/premium/weather-sources
  // -------------------------------------------------------
  async weatherSources(req: Request, db: any, user: any): Promise<Response> {
    try {
      const userId = user.userId;

      const hasAccess = await SubscriptionModel.checkFeatureAccess(
        db,
        userId,
        "multiple_sources"
      );

      if (!hasAccess) {
        return json({ message: "Feature requires Premium subscription" }, 403);
      }

      const { latitude, longitude, sources } = await req.json();

      if (!latitude || !longitude || !sources) {
        return json({ message: "Latitude, Longitude and sources required" }, 400);
      }

      const validSources = await SubscriptionModel.validateRequestedSources(
        db,
        userId,
        sources
      );

      const weatherData = await WeatherDataService.getAggregatedWeather(
        latitude,
        longitude,
        validSources
      );

      return json({
        message: "Aggregated weather data (tier-filtered)",
        requestedSources: sources,
        usedSources: validSources,
        availableProviders: await SubscriptionModel.getAvailableWeatherProviders(db, userId),
        data: weatherData
      });
    } catch (err) {
      return json({ message: err.message }, 500);
    }
  },

  // -------------------------------------------------------
  // GET /v1/premium/map-layers
  // -------------------------------------------------------
  async mapLayers(req: Request, db: any, user: any): Promise<Response> {
    try {
      const userId = user.userId;

      const hasAccess = await SubscriptionModel.checkFeatureAccess(
        db,
        userId,
        "map_layers"
      );

      if (!hasAccess) {
        return json({ message: "Feature requires Premium subscription" }, 403);
      }

      const url = new URL(req.url);
      const latitude = parseFloat(url.searchParams.get("latitude") ?? "");
      const longitude = parseFloat(url.searchParams.get("longitude") ?? "");
      const zoom = parseInt(url.searchParams.get("zoom") ?? "10");

      if (!latitude || !longitude) {
        return json({ message: "Latitude and Longitude required" }, 400);
      }

      const layers = await MapTileService.getPremiumMapLayers(
        latitude,
        longitude,
        zoom
      );

      return json({
        message: "Map layers retrieved",
        layers
      });
    } catch (err) {
      return json({ message: err.message }, 500);
    }
  },

  // -------------------------------------------------------
  // POST /v1/premium/weather-alert
  // -------------------------------------------------------
  async weatherAlert(req: Request, db: any, user: any): Promise<Response> {
    try {
      const userId = user.userId;

      const hasAccess = await SubscriptionModel.checkFeatureAccess(
        db,
        userId,
        "push_notifications"
      );

      if (!hasAccess) {
        return json({ message: "Feature requires Premium subscription" }, 403);
      }

      const { latitude, longitude, alertType, message, platform } = await req.json();

      if (!latitude || !longitude || !alertType) {
        return json({ message: "Coordinates and alert type required" }, 400);
      }

      const notification = await PushNotificationService.sendWeatherAlert(
        userId,
        latitude,
        longitude,
        alertType,
        message,
        platform ?? "unknown"
      );

      return json({
        message: "Notification sent",
        notification
      }, 201);
    } catch (err) {
      return json({ message: err.message }, 500);
    }
  }
};
