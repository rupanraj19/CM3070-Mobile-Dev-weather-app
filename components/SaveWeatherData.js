import supabase from '../supabase';
import { fetchForecastDataByCity } from '../api/weather';
import { OPENWEATHER_API_KEY } from '../config';
import { databaseCleanUp, deleteOldWeatherData } from './DatabaseCleanUp';

/**
 * Save a daily weather snapshot for a given city and date (for history)
 */
export async function saveWeatherSnapshot(city, weatherData) {
  const snapshot = {
    city,
    date: new Date().toISOString().split('T')[0],
    hour: 12,
    feels_like: weatherData.main.feels_like,
    humidity: weatherData.main.humidity,
    pressure: weatherData.main.pressure,
    visibility: weatherData.visibility,
    wind_speed: weatherData.wind.speed,
    sunset: weatherData.sys.sunset * 1000,
    sunrise: weatherData.sys.sunrise * 1000,
  };

  const { error } = await supabase.from('weather_metrics').insert([snapshot]);

  if (error) {
    console.error('Error saving weather data to Supabase:', error);
  } else {
    // Always clean after saving: fill sunrise/sunset nulls and delete old data
    await databaseCleanUp(city, snapshot.date);
    await deleteOldWeatherData(city);
  }

}

/**
 * Save all 3-hourly forecast slots for the next 5 days into Supabase (for hourly charts)
 */
export async function saveForecast3HourlySnapshots(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      console.error(`[saveForecast3HourlySnapshots] Error: ${res.status} -- ${JSON.stringify(data)}`);
      throw new Error('City forecast not found');
    }

    const timezoneOffsetMs = data.city.timezone * 1000;
    const recordsToInsert = [];

    for (const entry of data.list) {
      const utcDate = new Date(entry.dt_txt + 'Z');
      const localDateObj = new Date(utcDate.getTime() + timezoneOffsetMs);
      const date = localDateObj.toISOString().split('T')[0];
      const hour = localDateObj.getHours();

      recordsToInsert.push({
        city,
        date,
        hour,
        feels_like: entry.main.feels_like,
        humidity: entry.main.humidity,
        pressure: entry.main.pressure,
        visibility: entry.visibility,
        wind_speed: entry.wind.speed,
        // sunrise and sunset handled separately by cleanup
      });
    }

    // Upsert all forecast records (avoid duplicates)
    const { error } = await supabase
      .from('weather_metrics')
      .upsert(recordsToInsert, { onConflict: ['city', 'date', 'hour'] });

    if (error) {
      console.error('Error saving 3-hour forecast data to Supabase:', error);
      return;
    }

    // Run cleanup for each unique date inserted (fill sunrise/sunset nulls)
    const uniqueDates = [...new Set(recordsToInsert.map(r => r.date))];
    for (const date of uniqueDates) {
      await databaseCleanUp(city, date);
    }

    // Delete old weather data older than 7 days for this city
    await deleteOldWeatherData(city);

  } catch (error) {
    console.error('Error fetching or saving 3-hour forecast data:', error);
  }
}

