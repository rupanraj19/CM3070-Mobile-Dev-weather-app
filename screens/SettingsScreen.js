import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { theme } from '../theme/index';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENWEATHER_API_KEY } from '../config';
import {
  ensureNotificationPermissions,
  scheduleDailySummaryNotification,
  scheduleHydrateAlert,
  scheduleSunsetNotification,
  cancelDailySummaryNotification,
  cancelHydrateAlert,
  cancelSunsetNotification,
} from '../components/Notifications';

export default function SettingsScreen() {
  // Notifications toggles
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(false);
  const [hydrateEnabled, setHydrateEnabled] = useState(false);
  const [sunsetEnabled, setSunsetEnabled] = useState(false);

  // Location suggestion logic
  const [showSearch, toggleSearch] = useState(false);
  const [locations, setLocations] = useState([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Helper function to extract country code from city string
  const getCountryCode = (city) => {
    if (typeof city === 'object' && city.country) {
      return city.country.toLowerCase();
    }
    if (typeof city === 'string') {
      const parts = city.split(',').map((part) => part.trim());
      return parts[parts.length - 1].toLowerCase(); // Country code is the last part
    }
    return null;
  };

  // Load saved cities on mount
  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedCities');
      if (saved) {
        const parsedCities = JSON.parse(saved);
        // Convert any object entries to strings
        const normalizedCities = parsedCities.map((city) =>
          typeof city === 'object' && city.name && city.country
            ? `${city.name}${city.state ? `, ${city.state}` : ''}, ${city.country}`
            : city
        );
        setLocations(normalizedCities);
      }
    } catch (error) {
      console.log('Error loading cities:', error);
    }
  };

  const saveCities = async (newCities) => {
    try {
      await AsyncStorage.setItem('savedCities', JSON.stringify(newCities));
    } catch (error) {
      console.log('Error saving cities:', error);
    }
  };

  // Fetch city suggestions from OpenWeather Geocoding API
  const fetchCitySuggestions = async (text) => {
    if (!text) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `http://api.openweathermap.org/geo/1.0/direct?q=${text}&limit=5&appid=${OPENWEATHER_API_KEY}`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
      setSuggestions([]);
    }
  };

  // Select a city from suggestions and save
  const handleSelectCity = (city) => {
    const cityName =
      city.name +
      (city.state ? `, ${city.state}` : '') +
      `, ${city.country}`;
    if (locations.includes(cityName)) {
      Alert.alert('City already saved');
      return;
    }
    const newCities = [...locations, cityName];
    setLocations(newCities);
    saveCities(newCities);
    setQuery('');
    setSuggestions([]);
    toggleSearch(false);
    Alert.alert('Success', `${cityName} has been added.`);
  };

  const handleLocation = (loc) => {
    console.log('Selected location:', loc);
    // You can fetch weather for loc here
  };

  // Delete a saved city
  const handleDeleteCity = (cityName) => {
    Alert.alert(
      'Delete City',
      `Are you sure you want to delete "${
        typeof cityName === 'object'
          ? `${cityName.name}${cityName.state ? `, ${cityName.state}` : ''}, ${cityName.country}`
          : cityName
      }"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedCities = locations.filter((loc) =>
              typeof loc === 'object'
                ? `${loc.name}${loc.state ? `, ${loc.state}` : ''}, ${loc.country}` !==
                  `${cityName.name}${cityName.state ? `, ${cityName.state}` : ''}, ${cityName.country}`
                : loc !== cityName
            );
            setLocations(updatedCities);
            saveCities(updatedCities);
          },
        },
      ]
    );
  };

  // --- Load/Save Switch States ---
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('notificationToggles');
      if (stored) {
        const { daily, hydrate, sunset } = JSON.parse(stored);
        setDailySummaryEnabled(daily ?? false);
        setHydrateEnabled(hydrate ?? false);
        setSunsetEnabled(sunset ?? false);
      }
      loadCities();
    })();
  }, []);

  // Whenever switches change, save
  useEffect(() => {
    AsyncStorage.setItem(
      'notificationToggles',
      JSON.stringify({
        daily: dailySummaryEnabled,
        hydrate: hydrateEnabled,
        sunset: sunsetEnabled,
      })
    );
  }, [dailySummaryEnabled, hydrateEnabled, sunsetEnabled]);

  // --- Notification Scheduling Handlers ---
  const handleDailySummaryToggle = async (value) => {
    setDailySummaryEnabled(value);
    await ensureNotificationPermissions();
    if (value) {
      try {
        await scheduleDailySummaryNotification();
        Alert.alert('Daily summary notifications enabled!');
      } catch (error) {
        Alert.alert('Error', 'Failed to enable daily summary notifications.');
      }
    } else {
      try {
        await cancelDailySummaryNotification();
        Alert.alert('Daily summary notifications disabled!');
      } catch (error) {
        Alert.alert('Error', 'Failed to disable daily summary notifications.');
      }
    }
  };

  const handleHydrateToggle = async (value) => {
    setHydrateEnabled(value);
    await ensureNotificationPermissions();
    console.log('Hydrate toggle changed:', value);
    if (value) {
      try {
        await scheduleHydrateAlert();
        Alert.alert('Hydrate notifications enabled!');
      } catch (error) {
        console.error('Error enabling hydrate notifications:', error);
        Alert.alert('Error', 'Failed to enable hydrate notifications.');
      }
    } else {
      try {
        await cancelHydrateAlert();
        Alert.alert('Hydrate notifications disabled!');
      } catch (error) {
        Alert.alert('Error', 'Failed to disable hydrate notifications.');
      }
    }
  };

  const handleSunsetToggle = async (value) => {
    setSunsetEnabled(value);
    await ensureNotificationPermissions();
    console.log('Sunset toggle changed:', value);
    if (value) {
      try {
        await scheduleSunsetNotification();
        Alert.alert('Sunset notifications enabled!');
      } catch (error) {
        Alert.alert('Error', 'Failed to enable sunset notifications.');
      }
    } else {
      try {
        await cancelSunsetNotification();
        Alert.alert('Sunset notifications disabled!');
      } catch (error) {
        Alert.alert('Error', 'Failed to disable sunset notifications.');
      }
    }
  };

  // -----------UI RENDER---------------------//
  return (
    <View style={tw`flex-1 p-4 bg-gray-900`}>
      {/* Search Bar */}
      <View style={[{ height: '7%' }, tw`flex-row justify-end relative z-50 items-center`]}>
        {showSearch && (
          <TextInput
            placeholder="Search city"
            placeholderTextColor="lightgray"
            style={tw`pl-4 h-10 flex-1 text-base text-white bg-gray-700 rounded-full`}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              fetchCitySuggestions(text);
            }}
          />
        )}
        <TouchableOpacity
          onPress={() => {
            toggleSearch(!showSearch);
            setSuggestions([]);
          }}
          style={[{ backgroundColor: theme.bgwhite(0.3) }, tw`rounded-full p-3 ml-2`]}
        >
          <Ionicons name="search-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Suggestions Dropdown */}
      {showSearch && suggestions.length > 0 && (
        <ScrollView style={tw`mt-2 bg-gray-300 rounded-lg max-h-60`} keyboardShouldPersistTaps="handled">
          {suggestions.map((city, index) => {
            const countryCode = getCountryCode(city);
            return (
              <TouchableOpacity
                key={index}
                style={tw`p-3 border-b border-gray-400`}
                onPress={() => handleSelectCity(city)}
              >
                <View style={tw`flex-row items-center`}>
                  {countryCode && (
                    <Image
                      source={{ uri: `https://flagcdn.com/w20/${countryCode}.png` }}
                      style={tw`w-5 h-3.75 mr-2`}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={tw`text-black`}>
                    {city.name}{city.state ? `, ${city.state}` : ''}, {city.country}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Saved Cities in Card Style */}
      <View style={tw`mt-5 flex-1`}>
        <Text style={tw`text-white font-bold text-lg mb-3`}>Saved Cities</Text>

        {locations.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {locations.map((loc, index) => {
              const countryCode = getCountryCode(loc);
              const displayName =
                typeof loc === 'object'
                  ? `${loc.name}${loc.state ? `, ${loc.state}` : ''}, ${loc.country}`
                  : loc;

              return (
                <View
                  key={index}
                  style={[
                    tw`flex-row items-center justify-between p-4 mb-3 rounded-2xl`,
                    {
                      backgroundColor: theme.bgwhite(0.15),
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 4,
                      elevation: 3,
                    },
                  ]}
                >
                  {/* Left Side */}
                  <TouchableOpacity
                    style={tw`flex-row items-center`}
                    onPress={() => handleLocation(displayName)}
                  >
                    <Ionicons name="location-outline" size={22} color="white" />
                    <View style={tw`flex-row items-center ml-2`}>
                      {countryCode && (
                        <Image
                          source={{ uri: `https://flagcdn.com/w20/${countryCode}.png` }}
                          style={tw`w-5 h-3.75 mr-2`}
                          resizeMode="contain"
                        />
                      )}
                      <Text style={tw`text-white font-medium`}>{displayName}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Right Side */}
                  <TouchableOpacity onPress={() => handleDeleteCity(loc)}>
                    <Ionicons name="trash-outline" size={22} color="red" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={tw`text-gray-400 mt-2`}>No cities saved yet.</Text>
        )}
      </View>

      {/* Notification Toggles */}
      <View style={tw`mb-6`}>
        <Text style={tw`text-white font-bold text-lg mb-2`}>Notification Settings</Text>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={tw`text-white text-base`}>Daily Reminder</Text>
          <Switch value={dailySummaryEnabled} onValueChange={handleDailySummaryToggle} />
        </View>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={tw`text-white text-base`}>Hydration Reminder</Text>
          <Switch value={hydrateEnabled} onValueChange={handleHydrateToggle} />
        </View>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={tw`text-white text-base`}>Sunset Reminder</Text>
          <Switch value={sunsetEnabled} onValueChange={handleSunsetToggle} />
        </View>
      </View>
    </View>
  );
}