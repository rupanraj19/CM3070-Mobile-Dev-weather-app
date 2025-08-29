import React, { useState, useEffect, forwardRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import ActionSheet from 'react-native-actions-sheet';
import tw from 'twrnc';
import supabase from '../supabase';

const screenWidth = Dimensions.get('window').width;

const UNIVERSAL_HOURS = [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22];

const METRIC_CONFIG = {
  feels_like: {
    name: 'Feels Like',
    icon: require('../assets/feelslike.png'),
    unit: '°C',
    color: 'rgba(253,224,71,',
  },
  humidity: {
    name: 'Humidity',
    icon: require('../assets/humidity.png'),
    unit: '%',
    color: 'rgba(56,189,248,',
  },
  pressure: {
    name: 'Pressure',
    icon: require('../assets/pressure.png'),
    unit: 'hPa',
    color: 'rgba(248,113,113,',
  },
  visibility: {
    name: 'Visibility',
    icon: require('../assets/view.png'),
    unit: 'km',
    color: 'rgba(74,222,128,',
  },
  wind_speed: {
  name: 'Wind Speed',
  icon: require('../assets/wind.png'), 
  unit: 'm/s',
  color: 'rgba(100,149,237,', 
},

  
};

function forwardFill(arr) {
  let lastValid = null;
  return arr.map((val) => {
    if (typeof val === 'number' && !isNaN(val)) {
      lastValid = val;
      return val;
    }
    return lastValid !== null ? lastValid : 0;
  });
}

async function fetchAvailableDaysNoonClosest(city, metric) {
  const today = new Date().toISOString().substring(0, 10);
  const { data, error } = await supabase
    .from('weather_metrics')
    .select(`date, hour, ${metric}`)
    .eq('city', city)
    .gte('date', today) // Only dates from today forward
    .order('date', { ascending: true })
    .order('hour', { ascending: true });

  if (error) {
    console.error('Error loading noon data:', error);
    return [];
  }
  const days = [];
  let currentDay = null;
  let bestRow = null;
  for (let row of data) {
    if (row.date !== currentDay) {
      if (bestRow) days.push(bestRow);
      currentDay = row.date;
      bestRow = row;
    } else if (
      typeof row[metric] === 'number' &&
      typeof bestRow[metric] === 'number' &&
      Math.abs(row.hour - 12) < Math.abs(bestRow.hour - 12)
    ) {
      bestRow = row;
    }
  }
  if (bestRow) days.push(bestRow);
  return days;
}

async function fetchForecastDates(city) {
  const today = new Date().toISOString().substring(0, 10);
  const { data, error } = await supabase
    .from('weather_metrics')
    .select('date')
    .eq('city', city)
    .gte('date', today) // Only future/present dates
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching forecast dates:', error);
    return [];
  }
  return Array.from(new Set(data.map((d) => d.date))).sort();
}

async function fetchHourlyMetricStandardized(city, date, metric) {
  const { data, error } = await supabase
    .from('weather_metrics')
    .select(`hour, ${metric}`)
    .eq('city', city)
    .eq('date', date)
    .order('hour', { ascending: true });

  if (error) {
    console.error('Error fetching hourly metric:', error);
    return { labels: [], values: [] };
  }

  const dataByHour = {};
  data.forEach((r) => {
    dataByHour[Number(r.hour)] =
      typeof r[metric] === 'number' ? r[metric] : Number(r[metric]);
  });

  const labels = UNIVERSAL_HOURS.map((h) => String(h).padStart(2, '0'));
  const rawValues = UNIVERSAL_HOURS.map((h) => {
    const v = dataByHour[h];
    if (typeof v === 'number' && !isNaN(v)) {
      return metric === 'visibility' ? +(v / 1000).toFixed(1) : Math.round(v);
    }
    return null;
  });

  const values = forwardFill(rawValues);

  return { labels, values };
}

const MetricBottomSheet = forwardRef(
  ({ city, initialDate, metric = 'feels_like', onClose }, ref) => {
    const metricKey = metric in METRIC_CONFIG ? metric : 'feels_like';
    const config = METRIC_CONFIG[metricKey];
    const [availableDays, setAvailableDays] = useState([]);
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [metricData, setMetricData] = useState({ labels: [], values: [] });
    const [loading, setLoading] = useState(false);
    const [touchedPoint, setTouchedPoint] = useState(null);

    // Fetch noons filtered from today forward
    useEffect(() => {
      async function fetchDays() {
        if (!city) return;
        const days = await fetchAvailableDaysNoonClosest(city, metricKey);
        setAvailableDays(days || []);
        // Ensure selectedDate is today or later
        const today = new Date().toISOString().substring(0, 10);
        if ((!selectedDate || !days.some((d) => d.date === selectedDate)) && days.length > 0) {
          const validDate = days.find(d => d.date >= today) || days[0];
          setSelectedDate(validDate.date);
        }
      }
      fetchDays();
      // eslint-disable-next-line
    }, [city, metricKey]);

    // Fetch forecast dates from today onward
    useEffect(() => {
      async function fetchDates() {
        if (!city) return;
        const days = await fetchForecastDates(city);
        setDates(days);
        const today = new Date().toISOString().substring(0, 10);
        if ((!selectedDate || !days.includes(selectedDate)) && days.length > 0) {
          const validDate = days.find(d => d >= today) || days[0];
          setSelectedDate(validDate);
        }
      }
      fetchDates();
      // eslint-disable-next-line
    }, [city]);

    // Fetch hourly metric data for selected date
    useEffect(() => {
      async function fetchData() {
        if (!city || !selectedDate) return;
        setLoading(true);
        const { labels, values } = await fetchHourlyMetricStandardized(
          city,
          selectedDate,
          metricKey
        );
        setMetricData({ labels, values });
        setLoading(false);
      }
      fetchData();
    }, [city, selectedDate, metricKey]);

    if (!city || !selectedDate) return null;

    const rawWeekValues = availableDays.map((d) => {
      const v = d[metricKey];
      if (typeof v === 'number' && !isNaN(v)) {
        return metricKey === 'visibility'
          ? +(v / 1000).toFixed(1)
          : Math.round(v);
      }
      return null;
    });

    const weekValuesClean = forwardFill(rawWeekValues);

    const weekLabelsClean = availableDays.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
    );

    return (
      <ActionSheet
        ref={ref}
        gestureEnabled={true}
        onClose={onClose}
        containerStyle={tw`bg-[#1e1e1e] rounded-t-2xl`}
      >
        <View style={tw`p-4 mb-30`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Image source={config.icon} style={tw`h-6 w-6 mr-2`} />
            <Text style={tw`text-white text-lg font-bold`}>
              {config.name} ({city})
            </Text>
          </View>

          {/* WEEKLY CHART */}
          {weekLabelsClean.length > 1 && weekValuesClean.length > 1 ? (
            <>
              <Text style={tw`text-white font-semibold text-lg mb-1`}>
                Weekly Forecast
              </Text>
              <LineChart
                data={{
                  labels: weekLabelsClean,
                  datasets: [{ data: weekValuesClean }],
                }}
                width={screenWidth - 48}
                height={160}
                chartConfig={{
                  backgroundGradientFrom: '#1e1e1e',
                  backgroundGradientTo: '#1e1e1e',
                  color: (opacity = 1) => config.color + opacity + ')',
                  labelColor: () => '#fff',
                  propsForDots: { r: '6', strokeWidth: '2', stroke: '#fbbf24' },
                  decimalPlaces: metricKey === 'visibility' ? 1 : 0,
                  propsForBackgroundLines: { stroke: '#333' },
                }}
                bezier
                withInnerLines
                style={{ marginVertical: 6, borderRadius: 16 }}
              />
            </>
          ) : (
            <Text style={tw`text-gray-400 text-sm mt-6`}>
              No daily forecast data.
            </Text>
          )}

          {/* DATE SELECTOR */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw`my-3`}
            contentContainerStyle={tw`px-2`}
          >
            {dates.map((date) => (
              <TouchableOpacity
                key={date}
                onPress={() => setSelectedDate(date)}
                style={[
                  tw`py-2 px-4 rounded-xl mx-2`,
                  selectedDate === date ? tw`bg-yellow-500` : tw`bg-gray-700`,
                ]}
              >
                <Text style={tw`text-white font-semibold`}>
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* HOURLY CHART */}
          <Text style={tw`text-white font-semibold text-lg mb-1`}>
            3-hourly (
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : ''}
            )
          </Text>
          {loading ? (
            <Text style={tw`text-gray-400 text-sm`}>Loading...</Text>
          ) : metricData.labels.length > 0 ? (
            <>
              {touchedPoint && (
                <View style={tw`mb-2 items-center`}>
                  <Text style={tw`text-yellow-400 font-bold text-lg`}>
                    {metricData.labels[touchedPoint.index]}: {touchedPoint.value}
                    {config.unit}
                  </Text>
                </View>
              )}
              <LineChart
                data={{
                  labels: metricData.labels,
                  datasets: [{ data: metricData.values }],
                }}
                width={screenWidth - 48}
                height={180}
                chartConfig={{
                  backgroundGradientFrom: '#1e1e1e',
                  backgroundGradientTo: '#1e1e1e',
                  color: (opacity = 1) => config.color + opacity + ')',
                  labelColor: () => '#ccc',
                  propsForDots: { r: '5', strokeWidth: '2', stroke: '#fff' },
                  decimalPlaces: metricKey === 'visibility' ? 1 : 0,
                  propsForBackgroundLines: { stroke: '#333' },
                }}
                bezier
                withInnerLines
                style={{ marginVertical: 8, borderRadius: 16 }}
                onDataPointClick={({ value, index }) =>
                  setTouchedPoint({ value, index })
                }
                getDotProps={(value, index) => ({
                  r: touchedPoint && touchedPoint.index === index ? '10' : '7',
                  stroke:
                    touchedPoint && touchedPoint.index === index
                      ? '#fff000'
                      : '#fbbf24',
                  strokeWidth: touchedPoint && touchedPoint.index === index ? 3 : 2,
                  fill: touchedPoint && touchedPoint.index === index ? '#ffd700' : '#fff',
                  onPressOut: () => setTouchedPoint(null),
                })}
              />
            </>
          ) : (
            <Text style={tw`text-gray-400 text-sm`}>No data available</Text>
          )}
        </View>
      </ActionSheet>
    );
  }
);

export default MetricBottomSheet;
