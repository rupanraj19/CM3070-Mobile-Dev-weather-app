import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENWEATHER_API_KEY } from '../config';

// Ensure notification permissions are granted
export async function ensureNotificationPermissions() {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.status !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      if (status !== 'granted') {
        console.warn('Notification permissions not granted!');
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error ensuring notification permissions:', error);
    return false;
  }
}

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Set up Android notification channel
export async function configureNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('weather-notifications', {
      name: 'Weather Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

// Fetch current location's weather data (for hydrate and sunset notifications)
export async function getCurrentLocationWeather() {
  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log('Location permission status:', status);
    if (status !== 'granted') {
      console.log('Location permission not granted');
      return null;
    }

    // Get current coordinates
    const location = await Location.getCurrentPositionAsync({});
    console.log('Location retrieved:', location);
    const { latitude, longitude } = location.coords;

    // Fetch weather data for coordinates
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );
    const data = await res.json();
    console.log('OpenWeather API response:', data);

    if (data?.main && data?.sys) {
      return {
        feels_like: data.main.feels_like,
        sunset: data.sys.sunset * 1000, // Convert to milliseconds
        sunrise: data.sys.sunrise * 1000,
        city: data.name ? `${data.name}, ${data.sys.country}` : 'Unknown Location',
      };
    }
    console.log('Invalid weather data received');
    return null;
  } catch (error) {
    console.error('Error getting current location weather:', error);
    return null;
  }
}

// Schedule daily summary notification at 17:00 PM with static message
export async function scheduleDailySummaryNotification() {
  try {
    // Cancel existing daily notification if any
    const storedId = await AsyncStorage.getItem('dailyNotificationId');
    if (storedId) {
      await Notifications.cancelScheduledNotificationAsync(storedId);
      await AsyncStorage.removeItem('dailyNotificationId');
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Daily Weather Reminder",
        body: "Tap here for today's weather updates!",
        sound: true,
        data: { type: "daily_summary" },
      },
      trigger: { hour: 17, minute: 10, repeats: true },
    });

    await AsyncStorage.setItem('dailyNotificationId', id);
    console.log('Daily summary notification scheduled with ID:', id);
    return id;
  } catch (error) {
    console.error('Error scheduling daily summary notification:', error);
  }
}

export async function cancelDailySummaryNotification() {
  try {
    const storedId = await AsyncStorage.getItem('dailyNotificationId');
    if (storedId) {
      await Notifications.cancelScheduledNotificationAsync(storedId);
      await AsyncStorage.removeItem('dailyNotificationId');
      console.log('Daily summary notification cancelled');
    }
  } catch (error) {
    console.error('Error cancelling daily summary notification:', error);
  }
}

// Schedule hydrate alert if feels_like > 30°C
export async function scheduleHydrateAlert() {
  try {
    // Cancel existing hydrate notification if any
    const storedId = await AsyncStorage.getItem('hydrateNotificationId');
    if (storedId) {
      await Notifications.cancelScheduledNotificationAsync(storedId);
      await AsyncStorage.removeItem('hydrateNotificationId');
    }

    // Fetch weather data
    const weatherData = await getCurrentLocationWeather();
    if (!weatherData || weatherData.feels_like <= 30) {
      console.log('Hydrate alert not scheduled: feels_like <= 30°C or no weather data');
      return;
    }

    const alertMessage = `It's hot outside in ${weatherData.city} with feels like ${weatherData.feels_like.toFixed(1)}°C. Remember to hydrate!`;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hydration Alert",
        body: alertMessage,
        sound: true,
        data: { type: "hydrate_alert" },
      },
      trigger: { seconds: 15 },
    });

    await AsyncStorage.setItem('hydrateNotificationId', id);
    console.log('Hydrate notification scheduled with ID:', id);
    return id;
  } catch (error) {
    console.error('Error scheduling hydrate notification:', error);
  }
}

export async function cancelHydrateAlert() {
  try {
    const storedId = await AsyncStorage.getItem('hydrateNotificationId');
    if (storedId) {
      await Notifications.cancelScheduledNotificationAsync(storedId);
      await AsyncStorage.removeItem('hydrateNotificationId');
      console.log('Hydrate notification cancelled');
    }
  } catch (error) {
    console.error('Error cancelling hydrate notification:', error);
  }
}

// Schedule sunset notification 30 minutes before sunset
export async function scheduleSunsetNotification() {
  try {
    // Cancel existing sunset notification if any
    const storedId = await AsyncStorage.getItem('sunsetNotificationId');
    if (storedId) {
      await Notifications.cancelScheduledNotificationAsync(storedId);
      await AsyncStorage.removeItem('sunsetNotificationId');
    }

    // Fetch weather data
    const weatherData = await getCurrentLocationWeather();
    if (!weatherData || !weatherData.sunset) {
      console.log('Sunset notification not scheduled: no sunset data');
      return;
    }

    const now = new Date();
    const triggerTime = new Date(weatherData.sunset - 30 * 60 * 1000); // 30min before
    if (triggerTime <= now) {
      console.log('Sunset notification not scheduled: trigger time is in the past');
      return;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Sunset Soon",
        body: `Sun sets in 30 minutes in ${weatherData.city}. Enjoy the view!`,
        sound: true,
        data: { type: "sunset_alert" },
      },
      trigger: { type: 'date', date: triggerTime },
    });

    await AsyncStorage.setItem('sunsetNotificationId', id);
    console.log('Sunset notification scheduled with ID:', id);
    return id;
  } catch (error) {
    console.error('Error scheduling sunset notification:', error);
  }
}

export async function cancelSunsetNotification() {
  try {
    const storedId = await AsyncStorage.getItem('sunsetNotificationId');
    if (storedId) {
      await Notifications.cancelScheduledNotificationAsync(storedId);
      await AsyncStorage.removeItem('sunsetNotificationId');
      console.log('Sunset notification cancelled');
    }
  } catch (error) {
    console.error('Error cancelling sunset notification:', error);
  }
}

// Cancel all weather notifications
export async function cancelAllWeatherNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem('dailyNotificationId');
    await AsyncStorage.removeItem('hydrateNotificationId');
    await AsyncStorage.removeItem('sunsetNotificationId');
    console.log('All weather notifications cancelled');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}