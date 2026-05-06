// ---------------------------------------------------------
// WeatherDataService (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

const OPENWEATHER_KEY = Deno.env.get("OPENWEATHER_API_KEY") ?? "";
const WEATHERAPI_KEY = Deno.env.get("WEATHER_API_KEY") ?? "";
const QWEATHER_KEY = Deno.env.get("QWEATHER_API_KEY") ?? "";

// Helper: fetch JSON with error handling
async function getJson(url: string, params: Record<string, any> = {}) {
    const query = new URL(url);
    Object.entries(params).forEach(([k, v]) => query.searchParams.set(k, String(v)));

    const res = await fetch(query.toString());
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return await res.json();
}

export const WeatherDataService = {
  // -------------------------------------------------------
  // OpenWeather
  // -------------------------------------------------------
    async getWeatherFromOpenWeather(latitude: number, longitude: number) {
        const data = await getJson("https://api.openweathermap.org/data/2.5/weather", {
        lat: latitude,
        lon: longitude,
        appid: OPENWEATHER_KEY,
        units: "metric"
        });

        return {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        conditions: data.weather[0].main,
        description: data.weather[0].description
        };
    },

    // -------------------------------------------------------
    // WeatherAPI Current
    // -------------------------------------------------------
    async getWeatherFromWeatherAPI(latitude: number, longitude: number) {
        const data = await getJson("https://api.weatherapi.com/v1/current.json", {
        q: `${latitude},${longitude}`,
        key: WEATHERAPI_KEY,
        aqi: "yes"
        });

        return {
        temperature: data.current.temp_c,
        humidity: data.current.humidity,
        pressure: data.current.pressure_mb,
        windSpeed: data.current.wind_kph,
        conditions: data.current.condition.text,
        feelsLike: data.current.feelslike_c,
        uv: data.current.uv
        };
    },

    // -------------------------------------------------------
    // WeatherAPI Forecast
    // -------------------------------------------------------
    async getWeatherAPIForecast(latitude: number, longitude: number, days = 3) {
        return await getJson("https://api.weatherapi.com/v1/forecast.json", {
        q: `${latitude},${longitude}`,
        key: WEATHERAPI_KEY,
        days,
        aqi: "yes",
        alerts: "yes"
        });
    },

    // -------------------------------------------------------
    // Open-Meteo Current
    // -------------------------------------------------------
    async getWeatherFromOpenMeteo(latitude: number, longitude: number) {
        const data = await getJson("https://api.open-meteo.com/v1/forecast", {
        latitude,
        longitude,
        current_weather: true,
        temperature_unit: "celsius",
        windspeed_unit: "kmh",
        precipitation_unit: "mm",
        timezone: "auto"
        });

        const w = data.current_weather;

        return {
        temperature: w.temperature,
        humidity: null,
        pressure: null,
        windSpeed: w.windspeed,
        conditions: "Clear",
        description: "Powered by Open-Meteo",
        weathercode: w.weathercode
        };
    },

    // -------------------------------------------------------
    // Open-Meteo Geocoding Search
    // -------------------------------------------------------
    async searchLocation(query: string) {
        return await getJson("https://geocoding-api.open-meteo.com/v1/search", {
        name: query,
        count: 10,
        language: "en"
        });
    },

    // -------------------------------------------------------
    // Open-Meteo Reverse Geocoding
    // -------------------------------------------------------
    async reverseGeocode(latitude: number, longitude: number) {
        return await getJson("https://geocoding-api.open-meteo.com/v1/reverse", {
        latitude,
        longitude,
        language: "en"
        });
    },

    // -------------------------------------------------------
    // Open-Meteo Archive
    // -------------------------------------------------------
    async getHistoricalWeather(latitude: number, longitude: number, startDate: string, endDate: string) {
        return await getJson("https://archive-api.open-meteo.com/v1/archive", {
        latitude,
        longitude,
        start_date: startDate,
        end_date: endDate,
        temperature_unit: "celsius",
        windspeed_unit: "kmh",
        precipitation_unit: "mm",
        hourly: "temperature_2m,relativehumidity_2m,pressure_msl,windspeed_10m"
        });
    },

    // -------------------------------------------------------
    // Open-Meteo Air Quality
    // -------------------------------------------------------
    async getAirQuality(latitude: number, longitude: number) {
        return await getJson("https://air-quality-api.open-meteo.com/v1/air-quality", {
        latitude,
        longitude,
        hourly: "pm10,pm2_5,carbon_monoxide,ozone,nitrogen_dioxide,sulphur_dioxide"
        });
    },

    // -------------------------------------------------------
    // QWeather
    // -------------------------------------------------------
    async getWeatherFromQWeather(latitude: number, longitude: number) {
        const data = await getJson("https://api.qweather.com/v7/weather/now", {
        location: `${latitude},${longitude}`,
        key: QWEATHER_KEY
        });

        const w = data.now;

        return {
        temperature: parseFloat(w.temp),
        humidity: parseInt(w.humidity),
        pressure: parseFloat(w.pres),
        windSpeed: parseInt(w.windSpeed),
        conditions: w.text,
        description: w.fx,
        vis: w.vis
        };
    },

    // -------------------------------------------------------
    // QWeather Moon Phase
    // -------------------------------------------------------
    async getMoonPhase(latitude: number, longitude: number, date: string | null = null) {
        return await getJson("https://devapi.qweather.com/v7/astronomy/moon", {
        location: `${latitude},${longitude}`,
        date: date ?? new Date().toISOString().split("T")[0],
        key: QWEATHER_KEY
        });
    },

    // -------------------------------------------------------
    // Aggregated Weather
    // -------------------------------------------------------
    async getAggregatedWeather(latitude: number, longitude: number, sources: string[]) {
        const results: Record<string, any> = {};

        for (const source of sources) {
        try {
            if (source === "openweather") {
            results.openweather = await this.getWeatherFromOpenWeather(latitude, longitude);
            } else if (source === "weatherapi") {
            results.weatherapi = await this.getWeatherFromWeatherAPI(latitude, longitude);
            } else if (source === "weatherapi_forecast") {
            results.weatherapi_forecast = await this.getWeatherAPIForecast(latitude, longitude);
            } else if (source === "openmeteo") {
            results.openmeteo = await this.getWeatherFromOpenMeteo(latitude, longitude);
            } else if (source === "airquality") {
            results.airquality = await this.getAirQuality(latitude, longitude);
            } else if (source === "qweather") {
            results.qweather = await this.getWeatherFromQWeather(latitude, longitude);
            } else if (source === "moon") {
            results.moon = await this.getMoonPhase(latitude, longitude);
            }
        } catch (err) {
            console.error(`Error fetching from ${source}:`, err);
        }
        }

        return results;
    }
};
