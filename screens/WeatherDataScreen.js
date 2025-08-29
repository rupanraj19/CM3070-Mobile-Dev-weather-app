import React from "react";
import { ScrollView, Text, View, Linking } from "react-native";
import tw from "twrnc";

export default function WeatherDataScreen() {
  return (
    <ScrollView style={tw`flex-1 bg-black px-6 py-8`}>
      {/* Introduction */}
      <Text style={tw`text-white text-3xl font-bold mb-6`}>
        About Weather Data
      </Text>
      <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-8`}>
        This page explains the weather information shown in the app, what each
        metric means, and where the data comes from.
      </Text>

      {/* Forecast Data */}
      <View style={tw`mb-8`}>
        <Text style={tw`text-white text-xl font-semibold mb-2`}>
          Forecast Data
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-2`}>
          • Current weather conditions such as temperature, humidity, wind, and pressure
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-2`}>
          • 5-day forecast with updates every 3 hours
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2`}>
          • Forecasts are estimates and may not reflect minute-by-minute changes
        </Text>
      </View>

      {/* Weather Metrics Explained */}
      <View style={tw`mb-8`}>
        <Text style={tw`text-white text-xl font-semibold mb-2`}>
          Weather Metrics Explained
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-4`}>
          • Temperature — Measures how hot or cold the air is, in °C.
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-4`}>
          • Feels Like — A calculated value that considers humidity and wind, which
          can make it feel warmer or cooler than the actual temperature.
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-4`}>
          • Humidity — The amount of water vapor in the air, expressed as a percentage.
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-4`}>
          • Wind Speed — How fast the air is moving, usually measured in meters
          per second (m/s).
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-4`}>
          • Pressure — The weight of the air above us. Falling pressure often
          signals rain or storms, while rising pressure means fair weather.
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2`}>
          • Sunrise & Sunset — Times when the sun rises in the morning and sets in
          the evening, depending on your location and season.
        </Text>
      </View>

      {/* Historical Data */}
      <View style={tw`mb-8`}>
        <Text style={tw`text-white text-xl font-semibold mb-2`}>
          Historical Data
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-2`}>
          • Weather data will be fetched and recorded in Supabase for history
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2`}>
          • Users can tap a card to view weekly forecasts and 3-hour interval data for each day
        </Text>
      </View>

      {/* Not Included */}
      <View style={tw`mb-8`}>
        <Text style={tw`text-white text-xl font-semibold mb-2`}>
          Not Included
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-2`}>
          • Air quality information (e.g., AQI, pollutants)
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-2`}>
          • UV index
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-2`}>
          • Minute-by-minute or hourly real-time forecasts
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2`}>
          • Official long-term historical weather archives
        </Text>
      </View>

      {/* Data Sources */}
      <View style={tw`mb-8`}>
        <Text style={tw`text-white text-xl font-semibold mb-2`}>
          Data Sources
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-2`}>
          • Forecast and current weather data:{" "}
          <Text
            style={tw`text-blue-400 underline`}
            onPress={() => Linking.openURL("https://openweathermap.org/api")}
          >
            OpenWeather API
          </Text>
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2 mb-2`}>
          • Flag images:{" "}
          <Text
            style={tw`text-blue-400 underline`}
            onPress={() => Linking.openURL("https://www.countryflags.io/")}
          >
            Flag API
          </Text>
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2`}>
          • Historical weather data: stored in Supabase database
        </Text>
      </View>

      {/* Future Enhancements */}
      <View style={tw`mb-8`}>
        <Text style={tw`text-white text-xl font-semibold mb-2`}>
          Future Enhancements
        </Text>
        <Text style={tw`text-gray-300 text-base leading-snug ml-2`}>
          • We plan to expand features such as air quality data, severe weather
          alerts, and longer forecast ranges when available.
        </Text>
      </View>
    </ScrollView>
  );
}
