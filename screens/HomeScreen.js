import {
  View,
  Text,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENWEATHER_API_KEY } from '../config';
import {
  fetchWeatherDataByCity,
  fetchForecastDataByCity,
} from '../api/weather';
import WindCompass from '../components/WindCompass';
import PressureMeter from '../components/PressureMeter';
import MetricBottomSheet from '../components/MetricBottomSheet';
import {
  saveWeatherSnapshot,
  saveForecast3HourlySnapshots,
} from '../components/SaveWeatherData';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [cities, setCities] = useState([]);
  const [cityWeather, setCityWeather] = useState({});
  const [cityForecast, setCityForecast] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);

  // State for 3-hourly chart modal
  const metricSheetRef = useRef(null);
  const [metricSheetMetric, setMetricSheetMetric] = useState('feels_like');
  const [metricSheetCity, setMetricSheetCity] = useState(null);
  const [metricSheetDate, setMetricSheetDate] = useState(null);

  const cardStyle = tw`rounded-3xl p-4 mb-4 bg-white bg-opacity-20 mx-4`;

  // On mount: check GPS permission, get city name by reverse geocode or use Singapore
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let savedCitiesRaw = await AsyncStorage.getItem('savedCities');
        let savedCities = savedCitiesRaw ? JSON.parse(savedCitiesRaw) : [];

        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;

          // Reverse geocode city name via OpenWeather API
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`
          );
          const data = await res.json();
          const currentCity = `${data.name}, ${data.sys.country}` || 'Singapore, SG';

          if (!savedCities.includes(currentCity)) {
            savedCities = [currentCity, ...savedCities];
            await AsyncStorage.setItem(
              'savedCities',
              JSON.stringify(savedCities)
            );
          }
        } else {
          // Fallback
          if (!savedCities.includes('Singapore, SG')) {
            savedCities.unshift('Singapore, SG');
            await AsyncStorage.setItem(
              'savedCities',
              JSON.stringify(savedCities)
            );
          }
        }

        setCities(savedCities.length ? savedCities : ['Singapore, SG']);
      } catch (error) {
        console.error('Error loading GPS/cities:', error);
        setCities(['Singapore, SG']);
      }
    })();
  }, []);

  // Fetch weather + SAVE to Supabase
  useEffect(() => {
    cities.forEach(async (city) => {
      const wData = await fetchWeatherDataByCity(city);
      if (wData) {
        // Store in local state for UI
        setCityWeather((prev) => ({ ...prev, [city]: wData }));

        // Save today's snapshot to Supabase for history
        await saveWeatherSnapshot(city, wData);
      }

      const fData = await fetchForecastDataByCity(city);
      if (fData) {
        setCityForecast((prev) => ({ ...prev, [city]: fData }));
        // Call to save all 3-hourly forecast slots into Supabase
        await saveForecast3HourlySnapshots(city);
      }
    });
  }, [cities]);

  // Reload cities when screen gets focus
  useFocusEffect(
    useCallback(() => {
      const loadCities = async () => {
        try {
          const saved = await AsyncStorage.getItem('savedCities');
          let list = saved ? JSON.parse(saved) : [];

          // Fallback to Singapore if empty
          if (!list.length) {
            list = ['Singapore, SG'];
          }

          setCities(list);
        } catch (e) {
          console.log('Error loading cities', e);
          setCities(['Singapore, SG']);
        }
      };
      loadCities();
    }, [])
  );

  function getDefaultMetricSheetDate(cityWeather, cityForecast, cityName) {
    const forecast = cityForecast[cityName]?.list || [];
    if (forecast.length > 0 && forecast[0].dt) {
      return new Date(forecast[0].dt * 1000).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }

  // Render one city page with full weather UI
  const renderCityPage = ({ item }) => {
    const weather = cityWeather[item];
    const forecast = cityForecast[item]
     || [];

    return (
      <ScrollView
        style={{ width }}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <SafeAreaView style={tw`flex-1 px-4`}>
          {weather ? (
            <>
              {/* City Name */}
              <Text style={tw`text-white text-center text-2xl font-bold`}>
                {weather.name},{' '}
                <Text style={tw`text-lg text-gray-300`}>
                  {weather.sys.country}
                </Text>
              </Text>

              {/* Weather Icon */}
              <View style={tw`flex-row justifyrobot.com justify-center mt-4`}>
                <Image
                  source={{
                    uri: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`,
                  }}
                  style={tw`w-36 h-36`}
                />
              </View>

              {/* Temp & High/Low */}
              <Text style={tw`text-center font-bold text-white text-6xl mb-2`}>
                {Math.round(weather.main.temp)}°C
              </Text>
              <Text style={tw`text-center text-white font-medium mb-2`}>
                {weather.weather[0].description}
              </Text>
              <Text style={tw`text-center text-gray-300 text-lg mb-2`}>
                <Text style={tw`text-red-200`}>H: {Math.round(weather.main.temp_max)}° </Text>
                <Text style={tw`text-green-200`}>L: {Math.round(weather.main.temp_min)}°</Text>
              </Text>

              {/* Sunrise & Sunset */}
              <View style={tw`flex-row mx-13`}>
                <View style={tw`flex-1 mr-2 flex-row items-center`}>
                  <Image
                    source={require('../assets/sunrise.png')}
                    style={tw`h-6 w-6 mr-2`}
                  />
                  <View>
                    <Text style={tw`text-white font-bold`}>Sunrise</Text>
                    <Text style={tw`text-white`}>
                      {new Date(weather.sys.sunrise * 1000).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </Text>
                  </View>
                </View>
                <View style={tw`flex-1 ml-20 flex-row items-center`}>
                  <Image
                    source={require('../assets/sunset.png')}
                    style={tw`h-6 w-6 mr-2`}
                  />
                  <View>
                    <Text style={tw`text-white font-bold`}>Sunset</Text>
                    <Text style={tw`text-white`}>
                      {new Date(weather.sys.sunset * 1000).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Forecast */}
              <View style={tw`mt-6 mb-5 mx-4`}>
                <View style={tw`flex-row items-center mb-3`}>
                  <Ionicons name="calendar-outline" size={20} color="white" />
                  <Text style={tw`text-white ml-2`}>Next 5 Days Forecast</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {forecast.map((day, idx) => {
                    const date = new Date(day.dt * 1000);
                    const dayName = date.toLocaleDateString('en-US', {
                      weekday: 'short',
                    });
                    const temp = Math.round(day.main.temp);
                    return (
                      <View
                        key={idx}
                        style={[
                          tw`items-center justify-center p-4 w-24 rounded-3xl mr-3`,
                          { backgroundColor: theme.bgwhite(0.15) },
                        ]}
                      >
                        <Image
                          source={{
                            uri: `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`,
                          }}
                          style={tw`h-12 w-12`}
                        />
                        <Text style={tw`text-white`}>{dayName}</Text>
                        <Text style={tw`text-white font-semibold`}>
                          {temp}°C
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
              
              {/* information */}
              <Text style={tw`text-white text-center px-3 mb-4`}>Cards with the <Ionicons name="analytics-outline" size={18} color="red" /> icon let you double‑tap to view metric charts for weekly and daily trends, including a 3‑hour forecast</Text>

              {/* Feels Like */}
              <View style={tw`flex-row mx-2 justify-between`}>
                {/* Feels Like Card */}
                <TouchableOpacity
                  style={[cardStyle, tw`flex-1 mr-2 mb-5`]}
                  onPress={() => {
                    setMetricSheetCity(item);
                    setMetricSheetDate(
                      getDefaultMetricSheetDate(cityWeather, cityForecast, item)
                    );
                    setMetricSheetMetric('feels_like');
                    metricSheetRef.current?.setModalVisible(true);
                  }}
                >
                  <View style={tw`flex-row items-center mb-2`}>
                    <Image
                      source={require('../assets/feelslike.png')}
                      style={tw`h-6 w-6 mr-2`}
                    />
                    <Text style={tw`text-white text-lg font-bold`}>Feels Like</Text>
                   
                  </View>
                  <Text style={tw`text-white text-2xl text-center`}>
                    {Math.round(weather.main.feels_like)}°C
                  </Text>
                  {(() => {
                    const diff = weather.main.feels_like - weather.main.temp;
                    if (diff > 1) {
                      return (
                        <Text style={tw`text-white mt-1`}>
                          It feels warmer than the actual temperature.
                        </Text>
                      );
                    }
                    if (diff < -1) {
                      return (
                        <Text style={tw`text-white mt-1`}>
                          It feels colder than the actual temperature.
                        </Text>
                      );
                    }
                    return (
                      <Text style={tw`text-white mt-1`}>
                        It feels about the same as the actual temperature.
                      </Text>
                    );
                  })()}
                  <Ionicons name="analytics-outline" size={18} color="red" />
                </TouchableOpacity>

                {/* Precipitation Card */}
                <TouchableOpacity style={[cardStyle, tw`flex-1 ml-2`]}>
                  <View style={tw`flex-row items-center mb-2`}>
                    <Image
                      source={require('../assets/waterdrop.png')}
                      style={tw`h-6 w-6 mr-2`}
                    />
                    <Text style={tw`text-white text-lg font-bold`}>Precipitation</Text>
                  </View>
                  <Text style={tw`text-white text-xl`}>
                    {weather.rain && weather.rain['1h'] ? `${weather.rain['1h']} mm` : 'No rainfall registered for last 1hr'}
                  </Text>
                  <Ionicons name="analytics-outline" size={18} color="red" />
                </TouchableOpacity>
              </View>

              {/* Wind */}
              <TouchableOpacity
                style={cardStyle}
                onPress={() => {
                  setMetricSheetCity(item);
                  setMetricSheetDate(
                    getDefaultMetricSheetDate(cityWeather, cityForecast, item)
                  );
                  setMetricSheetMetric('wind_speed');
                  metricSheetRef.current?.setModalVisible(true);
                }}
              >
                <View style={tw`flex-row items-center mb-2`}>
                  <Image
                    source={require('../assets/wind.png')}
                    style={tw`h-6 w-6 mr-2`}
                  />
                  <Text style={tw`text-white text-lg font-bold`}>Wind</Text>
                </View>
                <View style={tw`flex-row items-center`}>
                  <View style={tw`flex-1`}>
                    <Text
                      style={tw`text-white border-b border-gray-100 font-medium py-2 px-2`}
                    >
                      Speed: {weather.wind.speed} m/s
                    </Text>
                    <Text
                      style={tw`text-white border-b border-gray-100 font-medium py-2 px-2`}
                    >
                      Gusts: {weather.wind.gust ?? '--'} m/s
                    </Text>
                    <Text
                      style={tw`text-white border-b border-gray-100 font-medium py-2 px-2`}
                    >
                      Direction: {weather.wind.deg}°
                    </Text>
                  </View>
                  <View style={tw`ml-4 justify-center`}>
                    <WindCompass degree={weather.wind.deg} size={96} />
                  </View>
                </View>
                <Ionicons name="analytics-outline" size={18} color="red" />
              </TouchableOpacity>

              {/* Humidity / Pressure */}
              <View style={tw`flex-row`}>
                <TouchableOpacity
                  style={[cardStyle, tw`flex-1 mr-2`]}
                  onPress={() => {
                    setMetricSheetCity(item);
                    setMetricSheetDate(
                      getDefaultMetricSheetDate(cityWeather, cityForecast, item)
                    );
                    setMetricSheetMetric('humidity');
                    metricSheetRef.current?.setModalVisible(true);
                  }}
                >
                  <View>
                    <View style={tw`flex-row items-center mb-2`}>
                      <Image
                        source={require('../assets/humidity.png')}
                        style={tw`h-6 w-6 mr-2`}
                      />
                      <Text style={tw`text-white font-semibold text-lg tracking-wide`}>
                        Humidity
                      </Text>
                    </View>
                    <Text style={tw`text-white text-center text-4xl font-bold mb-1 mt-4`}>
                      {weather.main.humidity}%
                    </Text>
                    {(() => {
                      const h = weather.main.humidity;
                      if (h < 30)
                        return (
                          <Text style={tw`text-white mt-1 text-base leading-snug`}>
                            Air is quite dry. Stay hydrated.
                          </Text>
                        );
                      if (h < 60)
                        return (
                          <Text style={tw`text-white mt-1`}>
                            Comfortable humidity level.
                          </Text>
                        );
                      if (h < 80)
                        return (
                          <Text style={tw`text-white mt-1`}>
                            A bit humid. Consider ventilation.
                          </Text>
                        );
                      return (
                        <Text style={tw`text-white mt-1`}>
                          High humidity—might feel sticky and warm.
                        </Text>
                      );
                    })()}
                    <Ionicons name="analytics-outline" size={18} color="red" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[cardStyle, tw`flex-1 ml-2`]}
                  onPress={() => {
                    setMetricSheetCity(item);
                    setMetricSheetDate(
                      getDefaultMetricSheetDate(cityWeather, cityForecast, item)
                    );
                    setMetricSheetMetric('pressure');
                    metricSheetRef.current?.setModalVisible(true);
                  }}
                >
                  <View>
                    <View style={tw`flex-row items-center mb-2`}>
                      <Image
                        source={require('../assets/pressure.png')}
                        style={tw`h-6 w-6 mr-2`}
                      />
                      <Text style={tw`text-white font-bold text-lg`}>
                        Pressure
                      </Text>
                    </View>
                    <PressureMeter pressure={weather.main.pressure} />
                    <Ionicons name="analytics-outline" size={18} color="red" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Sunset & Visibility */}
              {(() => {
                // Dynamic day/night logic for next event
                const nowSec = Date.now() / 1000;
                const sunrise = weather.sys.sunrise;
                const sunset = weather.sys.sunset;
                let isDay = nowSec >= sunrise && nowSec < sunset;
                let nextEventLabel, nextEventTimestamp;

                if (isDay) {
                  nextEventLabel = 'Sunset';
                  nextEventTimestamp = sunset;
                } else {
                  nextEventLabel = 'Sunrise';
                  nextEventTimestamp =
                    nowSec >= sunset ? sunrise + 24 * 3600 : sunrise;
                }

                const nowMs = Date.now();
                const nextEventDate = new Date(nextEventTimestamp * 1000);
                let diffMs = nextEventDate - nowMs;
                let hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
                let minsLeft = Math.floor((diffMs / (1000 * 60)) % 60);
                if (diffMs < 0) {
                  hoursLeft = 0;
                  minsLeft = 0;
                }

                return (
                  <View style={tw`flex-row`}>
                    {/* Sunset or Sunrise Card */}
                    <View style={[cardStyle, tw`flex-1 mr-2`]}>
                      <View style={tw`flex-row items-center mb-2 mb-10`}>
                        <Image
                          source={
                            nextEventLabel === 'Sunset'
                              ? require('../assets/sunset.png')
                              : require('../assets/sunrise.png')
                          }
                          style={tw`h-6 w-6 mr-2`}
                        />
                        <Text style={tw`text-white font-bold text-lg`}>
                          {nextEventLabel}
                        </Text>
                      </View>
                      <Text style={tw`text-white text-xl text-medium`}>
                        {nextEventDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Text style={tw`text-white mt-2 text-2xl mb-10`}>
                        in {hoursLeft}h {minsLeft}m
                      </Text>
                    </View>

                    {/* Visibility Card */}
                    <TouchableOpacity
                      style={[cardStyle, tw`flex-1 ml-2`]}
                      onPress={() => {
                        setMetricSheetCity(item);
                        setMetricSheetDate(
                          getDefaultMetricSheetDate(cityWeather, cityForecast, item)
                        );
                        setMetricSheetMetric('visibility');
                        metricSheetRef.current?.setModalVisible(true);
                      }}
                    >
                      <View>
                        <View style={tw`flex-row items-center mb-2`}>
                          <Image
                            source={require('../assets/view.png')}
                            style={tw`h-6 w-6 mr-2`}
                          />
                          <Text style={tw`text-white text-lg font-bold`}>
                            Visibility
                          </Text>
                        </View>
                        <Text style={tw`text-white text-2xl`}>
                          {(weather.visibility / 1000).toFixed(1)} km
                        </Text>
                        {(() => {
                          const v = weather.visibility / 1000;
                          if (v >= 10)
                            return (
                              <Text style={tw`text-white mt-4`}>
                                It is perfectly clear right now.
                              </Text>
                            );
                          if (v >= 5)
                            return (
                              <Text style={tw`text-white mt-4`}>
                                Visibility is good.
                              </Text>
                            );
                          if (v >= 2)
                            return (
                              <Text style={tw`text-white mt-4`}>
                                Visibility is moderate.
                              </Text>
                            );
                          return (
                            <Text style={tw`text-white mt-4`}>
                              Visibility is poor. Be cautious.
                            </Text>
                          );
                        })()}
                        <Ionicons name="analytics-outline" size={18} color="red" />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {/* Report an Issue */}
              <TouchableOpacity
                style={[
                  cardStyle,
                  tw`items-center bg-red-500 bg-opacity-80 mt-4 mb-4`,
                ]}
                onPress={() => navigation.navigate('Feedback')}
              >
                <Ionicons name="alert-circle-outline" size={24} color="white" />
                <Text style={tw`text-white font-bold mt-2`}>
                  Report an Issue
                </Text>
              </TouchableOpacity>

              {/* learn more text */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: 'white', textAlign: 'center' }}>
                learn more about{' '}
              </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('WeatherData')}
              >
                <Text style={{ color: '#d1d5db', textAlign: 'center', fontSize: 16 }}>
                  weather data
                </Text>
              </TouchableOpacity>
            </View>

            </>
          ) : (
            <Text style={tw`text-white text-center mt-20`}>
              Loading {typeof item === 'object' ? `${item.name}, ${item.country}` : item}...
            </Text>
          )}
        </SafeAreaView>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <Image
        source={require('../assets/bg.jpg')}
        style={tw`absolute h-full w-full`}
      />

      {/* Fixed Settings button */}
      <SafeAreaView style={tw`px-4 pt-2`}>
        <View style={tw`flex-row justify-end mt-2 mb-2 px-2`}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="cog-outline" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {cities.length > 0 ? (
        <>
          <FlatList
            data={cities}
            renderItem={renderCityPage}
            keyExtractor={(item) => item}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            extraData={cityWeather}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setActiveIndex(index);
            }}
          />

          {/* Pagination Dots */}
          <View style={tw`flex-row justify-center mt-2 mb-4`}>
            {cities.map((_, index) => (
              <View
                key={index}
                style={[
                  tw`h-2 w-2 rounded-full mx-1`,
                  {
                    backgroundColor:
                      index === activeIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                  },
                ]}
              />
            ))}
          </View>
          <MetricBottomSheet
            ref={metricSheetRef}
            city={metricSheetCity}
            initialDate={metricSheetDate}
            metric={metricSheetMetric}
            onClose={() => {
              setMetricSheetCity(null);
              setMetricSheetDate(null);
              setMetricSheetMetric('feels_like');
            }}
          />
        </>
      ) : (
        <Text style={tw`text-white text-center mt-20`}>Loading weather...</Text>
      )}
    </View>
  );
}