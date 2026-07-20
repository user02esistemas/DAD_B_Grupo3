import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importaremos las pantallas (las crearemos/refactorizaremos a continuación)
import ClienteDashboardScreen from '../screens/ClienteDashboardScreen';
import MisBoletosScreen from '../screens/MisBoletosScreen';
import SeguimientoScreen from '../screens/SeguimientoScreen';
import MasScreen from '../screens/MasScreen';

const Tab = createBottomTabNavigator();

export default function ClienteTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#f07639', // Color naranja corporativo
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 15, // Aumentado para separar del borde
          paddingTop: 5,
          height: 70, // Aumentado para más área clickeable
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Mis Viajes') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Encomiendas') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Más') {
            iconName = focused ? 'menu' : 'menu-outline';
          }

          return <Ionicons name={iconName as any} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={ClienteDashboardScreen} />
      <Tab.Screen name="Mis Viajes" component={MisBoletosScreen} />
      <Tab.Screen name="Encomiendas" component={SeguimientoScreen} />
      <Tab.Screen name="Más" component={MasScreen} />
    </Tab.Navigator>
  );
}
