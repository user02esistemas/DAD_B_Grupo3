import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function PerfilScreen({ navigation }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ ticketsCount: 0, encomiendasCount: 0 });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const storedUser = await AsyncStorage.getItem('@user_data');
      const token = await AsyncStorage.getItem('@auth_token');

      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Cargar estadísticas reales desde el backend
        if (parsed.correo && token) {
          const res = await fetch(`${API_URL}/api/movil/compras?email=${parsed.correo}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setStats({
              ticketsCount: (data.tickets || []).length,
              encomiendasCount: (data.encomiendas || []).length
            });
          }
        }
      }
    } catch (e) {
      console.error("Error al cargar perfil:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Salir',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@auth_token');
            await AsyncStorage.removeItem('@user_data');
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER NAVBAR */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Mi Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f07639" />
          <Text style={styles.loadingText}>Cargando información del usuario...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* USER AVATAR CARD */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={48} color="#ffffff" />
            </View>
            <Text style={styles.userName}>{user ? `${user.nombres}` : 'Pasajero El Cumbe'}</Text>
            <Text style={styles.userEmail}>{user ? user.correo : 'usuario@elcumbe.com'}</Text>

            <View style={styles.roleBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" style={{ marginRight: 6 }} />
              <Text style={styles.roleBadgeText}>
                {user ? `Cuenta ${user.rol.toUpperCase()} Verificada` : 'Cliente Verificado'}
              </Text>
            </View>
          </View>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="ticket-outline" size={26} color="#f07639" />
              <Text style={styles.statNumber}>{stats.ticketsCount}</Text>
              <Text style={styles.statLabel}>Boletos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="cube-outline" size={26} color="#3b82f6" />
              <Text style={styles.statNumber}>{stats.encomiendasCount}</Text>
              <Text style={styles.statLabel}>Encomiendas</Text>
            </View>
          </View>

          {/* DATOS PERSONALES */}
          <Text style={styles.sectionTitle}>Información Personal</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="card-outline" size={20} color="#64748b" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>DNI / Documento</Text>
                <Text style={styles.infoValue}>{user?.dni || 'No registrado'}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="mail-outline" size={20} color="#64748b" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Correo Electrónico</Text>
                <Text style={styles.infoValue}>{user?.correo || 'No registrado'}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="call-outline" size={20} color="#64748b" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Teléfono / Celular</Text>
                <Text style={styles.infoValue}>{user?.telefono || '987 654 321'}</Text>
              </View>
            </View>
          </View>

          {/* AJUSTES Y SEGURIDAD */}
          <Text style={styles.sectionTitle}>Seguridad y Cuenta</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => Alert.alert('Seguridad', 'Para cambiar tu contraseña dirígete a la plataforma web o solicita recuperación por correo.')}
            >
              <View style={styles.infoIconWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
              </View>
              <Text style={styles.actionRowText}>Cambiar Contraseña</Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* BOTÓN CERRAR SESIÓN */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f07639',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '700',
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 8,
    marginBottom: 40,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
});
