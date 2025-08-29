import React from 'react'
import {NavigationContainer} from '@react-navigation/native'
import { createNativeStackNavigator} from '@react-navigation/native-stack'
import HomeScreen from '../screens/HomeScreen'
import SettingsScreen from '../screens/SettingsScreen'
import FeedbackScreen from '../screens/FeedbackScreen'
import WeatherDataScreen from '../screens/WeatherDataScreen'
import {LogBox, Text, View} from 'react-native'

const Stack = createNativeStackNavigator();

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
])

export default function AppNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" options={{headerShown: false}} component={HomeScreen}/>
        <Stack.Screen name="Settings" component={SettingsScreen}/>
        <Stack.Screen name="Feedback" component={FeedbackScreen}/>
        <Stack.Screen name="WeatherData" component={WeatherDataScreen}/>
      </Stack.Navigator>
    </NavigationContainer>
  )
}