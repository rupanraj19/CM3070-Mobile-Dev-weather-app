import { OPENWEATHER_API_KEY } from '../config';

export const fetchWeatherDataByCity = async (cityName) => {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('City not found');
    return await res.json();
  } catch (err) {
    console.error('Error fetching weather for', cityName, err);
    return null;
  }
};

// Only returns 5 forecast entries, each for the day AFTER today, each at (or nearest to) 12:00 local time
export const fetchForecastDataByCity = async (cityName) => {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error('City forecast not found');
    const timezoneOffsetMs = data.city.timezone * 1000;

    const nowUTC = new Date();
    const cityNow = new Date(nowUTC.getTime() + timezoneOffsetMs);
    const todayLocal = cityNow.toISOString().split('T')[0];

    console.log('Today local:', todayLocal);

    // Use a Map to group by date to guarantee uniqueness
    const groupMap = new Map();

    for (const entry of data.list) {
      const utcDate = new Date(entry.dt_txt + 'Z');
      const localDateObj = new Date(utcDate.getTime() + timezoneOffsetMs);
      // Convert date object to clean ISO string date only (YYYY-MM-DD)
      const localDate = localDateObj.toISOString().split('T')[0];

      if (localDate <= todayLocal) continue;  // skip today and past

      if (!groupMap.has(localDate)) {
        groupMap.set(localDate, []);
      }
      groupMap.get(localDate).push({ entry, localHour: localDateObj.getHours() });
    }

    const uniqueDates = Array.from(groupMap.keys()).sort((a, b) => new Date(a) - new Date(b));
    console.log('Grouped unique dates:', uniqueDates);

    // For each date pick the entry closest to 12:00
    const selectedEntries = uniqueDates.slice(0, 5).map(date => {
      const arr = groupMap.get(date);
      return arr.reduce((a, b) =>
        Math.abs(a.localHour - 12) < Math.abs(b.localHour - 12) ? a : b
      ).entry;
    });

    console.log('Selected forecast entries:', selectedEntries.map(e => ({
      date: new Date(e.dt_txt + 'Z').toISOString(),
      temp: e.main.temp,
      dt_txt: e.dt_txt
    })));

    return selectedEntries;
  } catch (err) {
    console.error('Error fetching forecast for', cityName, err);
    return [];
  }
};


