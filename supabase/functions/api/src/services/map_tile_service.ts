// ---------------------------------------------------------
// MapTileService (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

const OPENWEATHER_KEY = Deno.env.get("OPENWEATHER_API_KEY") ?? "";

// ---------------------------------------------------------
// Helper: Replace {z}/{x}/{y}
// ---------------------------------------------------------
function tile(url: string, zoom: number, x: number, y: number): string {
  return url
    .replace("{z}", zoom.toString())
    .replace("{x}", x.toString())
    .replace("{y}", y.toString());
}

export const MapTileService = {
  // -------------------------------------------------------
  // Radar Layer
  // -------------------------------------------------------
  getRadarTileUrl(zoom: number, x: number, y: number) {
    return tile(
      `https://maps.openweathermap.org/maps/2.0/radar/{z}/{x}/{y}?appid=${OPENWEATHER_KEY}`,
      zoom,
      x,
      y
    );
  },

  // -------------------------------------------------------
  // Satellite Layer
  // -------------------------------------------------------
  getSatelliteTileUrl(zoom: number, x: number, y: number) {
    return tile(
      `https://tile.openweathermap.org/map/clouds/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
      zoom,
      x,
      y
    );
  },

  // -------------------------------------------------------
  // Temperature Heatmap
  // -------------------------------------------------------
  getTemperatureHeatmapUrl(zoom: number, x: number, y: number) {
    return tile(
      `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`,
      zoom,
      x,
      y
    );
  },

  // -------------------------------------------------------
  // Wind Layer (static)
  // -------------------------------------------------------
  getWindLayerUrl() {
    return `https://earth.nullschool.net/current/wind/surface/level/orthographic`;
  },

  // -------------------------------------------------------
  // Freemium Map Layers
  // -------------------------------------------------------
  async getFreemiumMapLayers(latitude: number, longitude: number, zoom: number) {
    return {
      radar: this.getRadarTileUrl(zoom, 0, 0),
      satellite: this.getSatelliteTileUrl(zoom, 0, 0),
      temperature: this.getTemperatureHeatmapUrl(zoom, 0, 0),
      wind: this.getWindLayerUrl(),
      alerts: await this.getAlertLocations(latitude, longitude)
    };
  },

  // -------------------------------------------------------
  // Premium Map Layers (identisch, aber erweiterbar)
  // -------------------------------------------------------
  async getPremiumMapLayers(latitude: number, longitude: number, zoom: number) {
    return {
      radar: this.getRadarTileUrl(zoom, 0, 0),
      satellite: this.getSatelliteTileUrl(zoom, 0, 0),
      temperature: this.getTemperatureHeatmapUrl(zoom, 0, 0),
      wind: this.getWindLayerUrl(),
      alerts: await this.getAlertLocations(latitude, longitude),

      // Premium‑Only Layers (optional)
      // airQuality: "...",
      // lightning: "...",
      // pollution: "...",
    };
  },

  // -------------------------------------------------------
  // Weather Alerts (placeholder)
  // -------------------------------------------------------
  async getAlertLocations(latitude: number, longitude: number, radiusKm = 100) {
    // TODO: Integration mit NOAA / MeteoSwiss / OpenWeather Alerts
    return [];
  }
};
