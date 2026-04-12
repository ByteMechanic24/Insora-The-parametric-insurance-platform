const axios = require('axios');
const { getEnvConfig } = require('../../config/env');

function getOpenWeatherConfig() {
  const config = getEnvConfig();
  return {
    apiKey: config.openWeather.apiKey,
    baseUrl: config.openWeather.baseUrl.replace(/\/+$/, ''),
  };
}

async function openWeatherGet(pathname, params = {}, timeout = 7000) {
  const { apiKey, baseUrl } = getOpenWeatherConfig();

  if (!apiKey) {
    throw new Error('OPENWEATHERMAP_API_KEY_MISSING');
  }

  const response = await axios.get(`${baseUrl}${pathname}`, {
    params: {
      ...params,
      appid: apiKey,
    },
    timeout,
  });

  return response.data;
}

async function reverseGeocode(lat, lon, limit = 1) {
  return openWeatherGet('/geo/1.0/reverse', { lat, lon, limit });
}

async function getCurrentWeather(lat, lon) {
  return openWeatherGet('/data/2.5/weather', { lat, lon, units: 'metric' });
}

async function getCurrentAqi(lat, lon) {
  return openWeatherGet('/data/2.5/air_pollution', { lat, lon });
}

module.exports = {
  getOpenWeatherConfig,
  reverseGeocode,
  getCurrentWeather,
  getCurrentAqi,
};
