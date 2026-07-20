import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import OperadorDashboardScreen from './src/screens/OperadorDashboardScreen';
import ConductorDashboardScreen from './src/screens/ConductorDashboardScreen';
import ConductorViajesScreen from './src/screens/ConductorViajesScreen';
import ConductorViajeDetalleScreen from './src/screens/ConductorViajeDetalleScreen';
import ConductorNovedadesScreen from './src/screens/ConductorNovedadesScreen';
import ConductorAlertasScreen from './src/screens/ConductorAlertasScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ClienteTabNavigator from './src/navigation/ClienteTabNavigator';
import BusSeatSelectionScreen from './src/screens/BusSeatSelectionScreen';
import PassengerFormScreen from './src/screens/PassengerFormScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import ReclamacionesScreen from './src/screens/ReclamacionesScreen';
import QuienesSomosScreen from './src/screens/QuienesSomosScreen';
import AyudaScreen from './src/screens/AyudaScreen';

export type RootStackParamList = {
  Login: undefined;
  OperadorDashboard: undefined;
  ConductorDashboard: undefined;
  ConductorViajes: undefined;
  ConductorViajeDetalle: { viajeId: string };
  ConductorNovedades: undefined;
  ConductorAlertas: undefined;
  QRScanner: undefined;
  Register: undefined;
  ClienteDashboard: undefined;
  BusSeatSelection: { tripId: string; price: number; busDetails: any };
  PassengerForm: { tripId: string; selectedSeats: any[]; price: number; guestToken: string };
  Payment: { tripId: string; asientosPasajeros: any[]; amount: number; guestToken: string };
  Perfil: undefined;
  Reclamaciones: undefined;
  QuienesSomos: undefined;
  Ayuda: undefined;
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
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OperadorDashboard" component={OperadorDashboardScreen} />
        <Stack.Screen name="ConductorDashboard" component={ConductorDashboardScreen} />
        <Stack.Screen name="ConductorViajes" component={ConductorViajesScreen} />
        <Stack.Screen name="ConductorViajeDetalle" component={ConductorViajeDetalleScreen} />
        <Stack.Screen name="ConductorNovedades" component={ConductorNovedadesScreen} />
        <Stack.Screen name="ConductorAlertas" component={ConductorAlertasScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ClienteDashboard" component={ClienteTabNavigator} />
        <Stack.Screen name="BusSeatSelection" component={BusSeatSelectionScreen} />
        <Stack.Screen name="PassengerForm" component={PassengerFormScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="Perfil" component={PerfilScreen} />
        <Stack.Screen name="Reclamaciones" component={ReclamacionesScreen} />
        <Stack.Screen name="QuienesSomos" component={QuienesSomosScreen} />
        <Stack.Screen name="Ayuda" component={AyudaScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}