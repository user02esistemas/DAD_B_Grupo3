import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import OperadorDashboardScreen from './src/screens/OperadorDashboardScreen';
import ConductorDashboardScreen from './src/screens/ConductorDashboardScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';

export type RootStackParamList = {
  Login: undefined;
  OperadorDashboard: undefined;
  ConductorDashboard: undefined;
  QRScanner: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OperadorDashboard" component={OperadorDashboardScreen} />
        <Stack.Screen name="ConductorDashboard" component={ConductorDashboardScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}