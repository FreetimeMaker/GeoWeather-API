const axios = require('axios');

const WeatherDataService = {
  // ---------------------------------------------------------
  // OpenWeather API Integration
  // ---------------------------------------------------------
  async getWeatherFromOpenWeather(latitude, longitude, apiKey) {
    try {
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat: latitude,
          lon: longitude,
          appid: apiKey,
          units: 'metric',
        },
      });

      return {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        windSpeed: response.data.wind.speed,
        conditions: response.data.weather[0].main,
        description: response.data.weather[0].description,
      };
    } catch (error) {
      console.error('OpenWeather API Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // WeatherAPI Current
  // ---------------------------------------------------------
  async getWeatherFromWeatherAPI(latitude, longitude, apiKey) {
    try {
      const response = await axios.get('https://api.weatherapi.com/v1/current.json', {
        params: {
          q: `${latitude},${longitude}`,
          key: apiKey,
          aqi: 'yes',
        },
      });

      return {
        temperature: response.data.current.temp_c,
        humidity: response.data.current.humidity,
        pressure: response.data.current.pressure_mb,
        windSpeed: response.data.current.wind_kph,
        conditions: response.data.current.condition.text,
        feelsLike: response.data.current.feelslike_c,
        uv: response.data.current.uv,
      };
    } catch (error) {
      console.error('WeatherAPI Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // WeatherAPI Forecast
  // ---------------------------------------------------------
  async getWeatherAPIForecast(latitude, longitude, apiKey, days = 3) {
    try {
      const response = await axios.get('https://api.weatherapi.com/v1/forecast.json', {
        params: {
          q: `${latitude},${longitude}`,
          key: apiKey,
          days,
          aqi: 'yes',
          alerts: 'yes',
        },
      });

      return response.data;
    } catch (error) {
      console.error('WeatherAPI Forecast Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // Open-Meteo Current Weather
  // ---------------------------------------------------------
  async getWeatherFromOpenMeteo(latitude, longitude) {
    try {
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude,
          longitude,
          current_weather: true,
          temperature_unit: 'celsius',
          windspeed_unit: 'kmh',
          precipitation_unit: 'mm',
          timezone: 'auto',
        },
      });

      const data = response.data.current_weather;
      return {
        temperature: data.temperature,
        humidity: null,
        pressure: null,
        windSpeed: data.windspeed,
        conditions: 'Clear',
        description: 'Powered by Open-Meteo',
        weathercode: data.weathercode,
      };
    } catch (error) {
      console.error('Open-Meteo API Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // Open-Meteo Geocoding Search
  // ---------------------------------------------------------
  async searchLocation(query) {
    try {
      const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: query, count: 10, language: 'en' },
      });

      return response.data;
    } catch (error) {
      console.error('Open-Meteo Geocoding Search Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // Open-Meteo Reverse Geocoding
  // ---------------------------------------------------------
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get('https://geocoding-api.open-meteo.com/v1/reverse', {
        params: { latitude, longitude, language: 'en' },
      });

      return response.data;
    } catch (error) {
      console.error('Open-Meteo Reverse Geocoding Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // Open-Meteo Archive API
  // ---------------------------------------------------------
  async getHistoricalWeather(latitude, longitude, startDate, endDate) {
    try {
      const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude,
          longitude,
          start_date: startDate,
          end_date: endDate,
          temperature_unit: 'celsius',
          windspeed_unit: 'kmh',
          precipitation_unit: 'mm',
          hourly: 'temperature_2m,relativehumidity_2m,pressure_msl,windspeed_10m',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Open-Meteo Archive Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // Open-Meteo Air Quality API
  // ---------------------------------------------------------
  async getAirQuality(latitude, longitude) {
    try {
      const response = await axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
        params: {
          latitude,
          longitude,
          hourly: 'pm10,pm2_5,carbon_monoxide,ozone,nitrogen_dioxide,sulphur_dioxide',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Open-Meteo Air Quality Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // QWeather API Integration
  // ---------------------------------------------------------
  async getWeatherFromQWeather(latitude, longitude, apiKey) {
    try {
      const response = await axios.get('https://api.qweather.com/v7/weather/now', {
        params: {
          location: `${latitude},${longitude}`,
          key: apiKey,
        },
      });

      const data = response.data.now;
      return {
        temperature: parseFloat(data.temp),
        humidity: parseInt(data.humidity),
        pressure: parseFloat(data.pres),
        windSpeed: parseInt(data.windSpeed),
        conditions: data.text,
        description: data.fx,
        vis: data.vis,
      };
    } catch (error) {
      console.error('QWeather API Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // QWeather Astronomy / Moon API
  // ---------------------------------------------------------
  async getMoonPhase(latitude, longitude, apiKey, date = null) {
    try {
      const response = await axios.get('https://devapi.qweather.com/v7/astronomy/moon', {
        params: {
          location: `${latitude},${longitude}`,
          date: date || new Date().toISOString().split('T')[0],
          key: apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('QWeather Moon API Error:', error);
      throw error;
    }
  },

  // ---------------------------------------------------------
  // Aggregated Weather (Freemium Feature)
  // ---------------------------------------------------------
  async getAggregatedWeather(latitude, longitude, sources) {
    const results = {};

    for (const source of sources) {
      try {
        if (source === 'openweather') {
          results.openweather = await this.getWeatherFromOpenWeather(
            latitude,
            longitude,
            process.env.OPENWEATHER_API_KEY
          );
        } else if (source === 'weatherapi') {
          results.weatherapi = await this.getWeatherFromWeatherAPI(
            latitude,
            longitude,
            process.env.WEATHER_API_KEY
          );
        } else if (source === 'weatherapi_forecast') {
          results.weatherapi_forecast = await this.getWeatherAPIForecast(
            latitude,
            longitude,
            process.env.WEATHER_API_KEY
          );
        } else if (source === 'openmeteo') {
          results.openmeteo = await this.getWeatherFromOpenMeteo(latitude, longitude);
        } else if (source === 'airquality') {
          results.airquality = await this.getAirQuality(latitude, longitude);
        } else if (source === 'qweather') {
          results.qweather = await this.getWeatherFromQWeather(
            latitude,
            longitude,
            process.env.QWEATHER_API_KEY
          );
        } else if (source === 'moon') {
          results.moon = await this.getMoonPhase(
            latitude,
            longitude,
            process.env.QWEATHER_API_KEY
          );
        }
      } catch (error) {
        console.error(`Error fetching from ${source}:`, error);
      }
    }

    return results;
  },
};

module.exports = WeatherDataService;
