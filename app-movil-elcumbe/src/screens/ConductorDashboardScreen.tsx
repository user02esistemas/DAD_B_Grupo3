import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  OperadorDashboard: undefined;
  ConductorDashboard: undefined;
};

type ConductorDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConductorDashboard'>;

interface Props {
  navigation: ConductorDashboardNavigationProp;
}

export default function ConductorDashboardScreen({ navigation }: Props) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('@auth_token');
    await AsyncStorage.removeItem('@user_data');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel del Conductor</Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f07639', // Color primario de la marca
    marginBottom: 40,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#ef4444', // red-500
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  }
});
