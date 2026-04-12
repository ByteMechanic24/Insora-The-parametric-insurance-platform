const { getCurrentAqi, getCurrentWeather } = require('./providers/openWeatherClient');

function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function mapWeatherCategory(weather = {}) {
  const main = weather?.[0]?.main || null;
  const description = weather?.[0]?.description || null;
  const id = weather?.[0]?.id || null;
  return { main, description, id };
}

function scoreHeat(weather) {
  const temp = weather?.main?.temp ?? 0;
  const feelsLike = weather?.main?.feels_like ?? temp;
  if (feelsLike >= 44 || temp >= 42) return 1;
  if (feelsLike >= 40 || temp >= 39) return 0.82;
  if (feelsLike >= 36 || temp >= 36) return 0.58;
  return 0.15;
}

function scoreWeather(weather) {
  const details = mapWeatherCategory(weather.weather);
  const rainVolume = weather?.rain?.['1h'] ?? weather?.rain?.['3h'] ?? 0;
  const wind = weather?.wind?.speed ?? 0;

  if (details.main === 'Thunderstorm') return 1;
  if (details.main === 'Rain') return rainVolume >= 5 ? 0.92 : 0.72;
  if (details.main === 'Drizzle') return 0.48;
  if (wind >= 14) return 0.62;
  return 0.1;
}

function scoreFlood(weather) {
  const details = mapWeatherCategory(weather.weather);
  const rain1h = weather?.rain?.['1h'] ?? 0;
  const rain3h = weather?.rain?.['3h'] ?? 0;
  const rain = Math.max(rain1h, rain3h / 3);

  if (details.main === 'Thunderstorm' && rain >= 6) return 0.95;
  if (details.main === 'Rain' && rain >= 8) return 0.88;
  if (details.main === 'Rain' && rain >= 4) return 0.68;
  if (details.main === 'Drizzle') return 0.35;
  return 0.08;
}

function scoreAqi(aqiResponse) {
  const entry = aqiResponse?.list?.[0];
  const aqi = entry?.main?.aqi ?? 1;
  const pm25 = entry?.components?.pm2_5 ?? 0;

  if (aqi >= 5 || pm25 >= 90) return 1;
  if (aqi >= 4 || pm25 >= 60) return 0.82;
  if (aqi >= 3 || pm25 >= 35) return 0.58;
  return 0.15;
}

async function checkDisruptionSignals({ claimedGps, disruptionType }) {
  const [weatherResult, aqiResult] = await Promise.allSettled([
    getCurrentWeather(claimedGps.lat, claimedGps.lng),
    getCurrentAqi(claimedGps.lat, claimedGps.lng),
  ]);

  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const aqi = aqiResult.status === 'fulfilled' ? aqiResult.value : null;

  let score = 0.1;
  let autoEligible = false;
  const flags = [];

  if (disruptionType === 'weather') {
    score = scoreWeather(weather);
    autoEligible = score >= 0.75;
  } else if (disruptionType === 'heat') {
    score = scoreHeat(weather);
    autoEligible = score >= 0.75;
  } else if (disruptionType === 'aqi') {
    score = scoreAqi(aqi);
    autoEligible = score >= 0.75;
  } else if (disruptionType === 'flooding') {
    score = scoreFlood(weather);
  } else if (disruptionType === 'road_closure' || disruptionType === 'strike') {
    score = 0.35;
    flags.push('MANUAL_REVIEW_HEAVY_DISRUPTION_TYPE');
  } else {
    score = scoreWeather(weather);
  }

  if (!weather && disruptionType !== 'aqi') {
    flags.push('WEATHER_DATA_UNAVAILABLE');
  }
  if (!aqi && disruptionType === 'aqi') {
    flags.push('AQI_DATA_UNAVAILABLE');
  }

  let confidence = 'LOW';
  if (score >= 0.75) confidence = 'HIGH';
  else if (score >= 0.5) confidence = 'MEDIUM';

  return {
    checkName: 'disruption_validation',
    weight: 0.25,
    score: clampScore(score),
    confidence,
    hardReject: false,
    flags,
    data: {
      disruptionType,
      weather: weather
        ? {
            temp: weather.main?.temp ?? null,
            feelsLike: weather.main?.feels_like ?? null,
            humidity: weather.main?.humidity ?? null,
            windSpeed: weather.wind?.speed ?? null,
            rain1h: weather.rain?.['1h'] ?? null,
            rain3h: weather.rain?.['3h'] ?? null,
            condition: mapWeatherCategory(weather.weather),
          }
        : null,
      aqi: aqi
        ? {
            aqi: aqi.list?.[0]?.main?.aqi ?? null,
            components: aqi.list?.[0]?.components ?? null,
          }
        : null,
      autoEligible,
    },
    completedAt: new Date(),
  };
}

module.exports = {
  checkDisruptionSignals,
};
