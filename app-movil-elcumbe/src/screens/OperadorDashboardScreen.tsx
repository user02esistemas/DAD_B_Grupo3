import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../App';

type OperadorDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OperadorDashboard'>;

interface Props {
  navigation: OperadorDashboardNavigationProp;
}

export default function OperadorDashboardScreen({ navigation }: Props) {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user_data');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserName(user.nombres.split(' ')[0]); // Solo el primer nombre
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@auth_token');
    await AsyncStorage.removeItem('@user_data');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerProfileInfo}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.headerLogo} 
            resizeMode="contain" 
          />
          <View>
            <Text style={styles.greetingText}>Hola, {userName}</Text>
            <Text style={styles.roleText}>Panel de Operador</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* RESUMEN DEL DÍA */}
        <Text style={styles.sectionTitle}>Resumen de Hoy</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="bus-outline" size={24} color="#d97706" />
            </View>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Viajes Asignados</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="people-outline" size={24} color="#16a34a" />
            </View>
            <Text style={styles.statNumber}>45</Text>
            <Text style={styles.statLabel}>Pasajeros Abordados</Text>
          </View>
        </View>

        {/* ACCIÓN PRINCIPAL */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        
        <TouchableOpacity 
          style={styles.primaryActionCard}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <View style={styles.primaryActionContent}>
            <Ionicons name="qr-code-outline" size={40} color="#ffffff" />
            <View style={styles.primaryActionText}>
              <Text style={styles.primaryActionTitle}>Escanear Boleto</Text>
              <Text style={styles.primaryActionSubtitle}>Validar el código QR del pasajero</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* COMPRAR PASAJES VISTA CLIENTE */}
        <TouchableOpacity 
          style={[styles.secondaryActionCard, { borderColor: '#f07639', borderWidth: 1 }]}
          onPress={() => navigation.navigate('ClienteDashboard')}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="cart-outline" size={24} color="#f07639" />
          </View>
          <View style={styles.secondaryActionText}>
            <Text style={[styles.secondaryActionTitle, { color: '#f07639' }]}>Comprar Pasajes</Text>
            <Text style={styles.secondaryActionSubtitle}>Alternar a la vista de cliente</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#f07639" />
        </TouchableOpacity>

        {/* OTRAS ACCIONES */}
        <TouchableOpacity 
          style={styles.secondaryActionCard}
          onPress={() => alert('Próximamente: Esta función estará disponible en la próxima actualización.')}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#f1f5f9' }]}>
            <Ionicons name="cube-outline" size={24} color="#64748b" />
          </View>
          <View style={styles.secondaryActionText}>
            <Text style={styles.secondaryActionTitle}>Recepción de Encomiendas</Text>
            <Text style={styles.secondaryActionSubtitle}>Registrar paquete entrante</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryActionCard}
          onPress={() => alert('Próximamente: Esta función estará disponible en la próxima actualización.')}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#f1f5f9' }]}>
            <Ionicons name="list-outline" size={24} color="#64748b" />
          </View>
          <View style={styles.secondaryActionText}>
            <Text style={styles.secondaryActionTitle}>Manifiesto de Pasajeros</Text>
            <Text style={styles.secondaryActionSubtitle}>Ver listado del viaje actual</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40, // Para dar espacio al notch/statusbar
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  roleText: {
    fontSize: 13,
    color: '#f07639',
    fontWeight: '600',
  },
  logoutIcon: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#ffffff',
    width: '48%',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  primaryActionCard: {
    backgroundColor: '#f07639',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  primaryActionText: {
    marginLeft: 16,
    flex: 1,
  },
  primaryActionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    color: '#ffedd5',
    fontSize: 13,
  },
  secondaryActionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  secondaryActionText: {
    flex: 1,
    marginLeft: 16,
  },
  secondaryActionTitle: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  secondaryActionSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
  }
});
