import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../App';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ConductorDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConductorDashboard'>;

interface Props {
  navigation: ConductorDashboardNavigationProp;
}

export default function ConductorDashboardScreen({ navigation }: Props) {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    viajesHoy: 0,
    enRuta: 0,
    completados: 0,
    historialTotal: 0
  });
  const [loading, setLoading] = useState(true);

  const getPeruDateStr = (dateInput: Date | string) => {
    return new Date(dateInput).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUser(u);
        const personaId = u.persona_id || u.id;

        const res = await fetch(`${API_URL}/api/movil/conductor/viajes?personaId=${personaId}`);
        const data = await res.json();

        if (data.success && data.viajes) {
          const viajes: any[] = data.viajes;
          const hoyPeruStr = getPeruDateStr(new Date());

          const vHoy = viajes.filter((v) => v.estado !== 'cancelado' && getPeruDateStr(v.fecha_salida) === hoyPeruStr).length;
          const vEnRuta = viajes.filter((v) => v.estado === 'en_ruta' || v.estado === 'en curso').length;
          const vCompletados = viajes.filter((v) => v.estado === 'completado' || v.estado === 'finalizado').length;

          setStats({
            viajesHoy: vHoy,
            enRuta: vEnRuta,
            completados: vCompletados,
            historialTotal: viajes.length
          });
        }
      }
    } catch (e) {
      console.error("Error al cargar estadísticas del conductor:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@auth_token');
    await AsyncStorage.removeItem('@user_data');
    navigation.replace('Login');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const firstName = user?.nombres ? user.nombres.split(' ')[0] : 'Conductor';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER TOP BAR */}
      <View style={styles.header}>
        <View style={styles.headerProfileInfo}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.greetingText}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.roleText}>Panel del Conductor</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* BANNER DE BIENVENIDA CORPORATIVO */}
        <View style={styles.heroBanner}>
          <View style={styles.heroStatusRow}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>En servicio</Text>
            </View>
            <View style={styles.dateChip}>
              <Ionicons name="calendar-outline" size={14} color="#f07639" style={{ marginRight: 4 }} />
              <Text style={styles.dateChipText}>
                {new Date().toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Lima" })}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{getGreeting()}, <Text style={{ color: '#f07639' }}>{firstName}</Text></Text>
          <Text style={styles.heroSubtitle}>Gestiona tus rutas, novedades y alertas de servicio.</Text>

          {/* RESUMEN DE ESTADÍSTICAS (4 TARJETAS) */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{loading ? '-' : stats.viajesHoy}</Text>
              <Text style={styles.statBoxLabel}>Viajes de Hoy</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxNum, { color: '#f07639' }]}>{loading ? '-' : stats.enRuta}</Text>
              <Text style={styles.statBoxLabel}>En Ruta</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{loading ? '-' : stats.completados}</Text>
              <Text style={styles.statBoxLabel}>Completados</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{loading ? '-' : stats.historialTotal}</Text>
              <Text style={styles.statBoxLabel}>Historial Total</Text>
            </View>
          </View>
        </View>

        {/* SECCIÓN MÓDULOS DE NAVEGACIÓN */}
        <Text style={styles.sectionTitle}>Acciones y Módulos</Text>

        {/* 1. MIS VIAJES */}
        <TouchableOpacity
          style={styles.primaryActionCard}
          onPress={() => navigation.navigate('ConductorViajes')}
          activeOpacity={0.8}
        >
          <View style={styles.primaryActionContent}>
            <Ionicons name="map-outline" size={32} color="#ffffff" />
            <View style={styles.primaryActionText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.primaryActionTitle}>Mis Viajes</Text>
                {stats.viajesHoy > 0 && (
                  <View style={styles.badgeHoy}>
                    <Text style={styles.badgeHoyText}>{stats.viajesHoy} hoy</Text>
                  </View>
                )}
              </View>
              <Text style={styles.primaryActionSubtitle}>Consulta tus rutas asignadas, pasajeros y estados</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* 2. NOVEDADES MECÁNICAS */}
        <TouchableOpacity
          style={styles.secondaryActionCard}
          onPress={() => navigation.navigate('ConductorNovedades')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="construct-outline" size={24} color="#d97706" />
          </View>
          <View style={styles.secondaryActionText}>
            <Text style={styles.secondaryActionTitle}>Novedades Mecánicas</Text>
            <Text style={styles.secondaryActionSubtitle}>Informa y revisa fallas técnicas o reportes del bus</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* 3. ALERTAS DE CENTRAL */}
        <TouchableOpacity
          style={styles.secondaryActionCard}
          onPress={() => navigation.navigate('ConductorAlertas')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="notifications-outline" size={24} color="#dc2626" />
          </View>
          <View style={styles.secondaryActionText}>
            <Text style={styles.secondaryActionTitle}>Alertas de la Central</Text>
            <Text style={styles.secondaryActionSubtitle}>Bandeja de avisos y notificaciones de servicio</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* 4. COMPRAR PASAJES VISTA CLIENTE */}
        <TouchableOpacity
          style={[styles.secondaryActionCard, { borderColor: '#f07639', borderWidth: 1 }]}
          onPress={() => navigation.navigate('ClienteDashboard')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="cart-outline" size={24} color="#f07639" />
          </View>
          <View style={styles.secondaryActionText}>
            <Text style={[styles.secondaryActionTitle, { color: '#f07639' }]}>Comprar Pasajes (Vista Cliente)</Text>
            <Text style={styles.secondaryActionSubtitle}>Ir al módulo de venta de boletos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#f07639" />
        </TouchableOpacity>

        {/* INFORMACIÓN DE SERVICIO */}
        <View style={styles.serviceInfoCard}>
          <Text style={styles.serviceInfoTitle}>Información de Servicio</Text>
          <View style={styles.serviceInfoRow}>
            <Ionicons name="person-circle-outline" size={20} color="#f07639" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.serviceInfoLabel}>Rol de Usuario</Text>
              <Text style={styles.serviceInfoValue}>Conductor</Text>
            </View>
          </View>
          <View style={styles.serviceInfoRow}>
            <Ionicons name="mail-outline" size={20} color="#f07639" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.serviceInfoLabel}>Correo Electrónico</Text>
              <Text style={styles.serviceInfoValue}>{user?.correo || 'conductor@cumbe.com'}</Text>
            </View>
          </View>
          <View style={styles.serviceInfoRow}>
            <Ionicons name="bus-outline" size={20} color="#f07639" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.serviceInfoLabel}>Compañía</Text>
              <Text style={styles.serviceInfoValue}>Transportes El Cumbe S.A.</Text>
            </View>
          </View>
        </View>

        {/* BOTÓN CERRAR SESIÓN */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  roleText: {
    fontSize: 12,
    color: '#f07639',
    fontWeight: '600',
  },
  logoutIcon: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 36,
  },
  heroBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 118, 57, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(240, 118, 57, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  statusText: {
    color: '#f07639',
    fontSize: 11,
    fontWeight: '700',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statBoxNum: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  statBoxLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 14,
  },
  primaryActionCard: {
    backgroundColor: '#f07639',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  primaryActionText: {
    marginLeft: 14,
    flex: 1,
  },
  primaryActionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  badgeHoy: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeHoyText: {
    color: '#f07639',
    fontSize: 10,
    fontWeight: '800',
  },
  primaryActionSubtitle: {
    color: '#ffedd5',
    fontSize: 11,
    marginTop: 2,
  },
  secondaryActionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionText: {
    flex: 1,
    marginLeft: 14,
  },
  secondaryActionTitle: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  serviceInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  serviceInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  serviceInfoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 1,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  }
});
