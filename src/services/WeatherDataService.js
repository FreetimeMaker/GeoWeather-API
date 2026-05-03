const axios = require('axios');

const WeatherDataService = {
  // OpenWeather API Integration
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

  // WeatherAPI Integration
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

  // Open-Meteo API Integration (Free, no API key needed)
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
        humidity: null, // Not available in free tier
        pressure: null, // Not available in free tier  
        windSpeed: data.windspeed,
        conditions: 'Clear', // Derive from weathercode if needed
        description: 'Powered by Open-Meteo',
        weathercode: data.weathercode,
      };
    } catch (error) {
      console.error('Open-Meteo API Error:', error);
      throw error;
    }
  },

  // QWeather API Integration (China-focused, high accuracy)
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

  // Aggregiere Daten von mehreren Quellen (Freemium Feature)
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
        } else if (source === 'openmeteo') {
          results.openmeteo = await this.getWeatherFromOpenMeteo(
            latitude,
            longitude
          );
        } else if (source === 'qweather') {
          results.qweather = await this.getWeatherFromQWeather(
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
