import supabase from '../supabase';

// Existing function to fill NULL sunrise/sunset values for a city and date
export async function databaseCleanUp(cityName, date) {
  // 1. Get the first non-null sunrise/sunset row for the date+city
  const { data: filledRow, error: fetchError } = await supabase
    .from('weather_metrics')
    .select('sunrise, sunset')
    .eq('city', cityName)
    .eq('date', date)
    .not('sunrise', 'is', null)
    .not('sunset', 'is', null)
    .limit(1)
    .single();

  if (fetchError || !filledRow) {
    return;
  }

  // 2. Update all nulls for this city/date
  const { error: updateError } = await supabase
    .from('weather_metrics')
    .update({
      sunrise: filledRow.sunrise,
      sunset: filledRow.sunset,
    })
    .eq('city', cityName)
    .eq('date', date)
    .is('sunrise', null)
    .is('sunset', null);
}

// New function to delete weather data older than 7 days
export async function deleteOldWeatherData(cityName) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const cutoffDate = oneWeekAgo.toISOString().split('T')[0];

  const { error } = await supabase
    .from('weather_metrics')
    .delete()
    .eq('city', cityName)
    .lt('date', cutoffDate);

}