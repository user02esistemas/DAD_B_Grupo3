import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../App';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type OperadorDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OperadorDashboard'>;

interface Props {
  navigation: OperadorDashboardNavigationProp;
}

export default function OperadorDashboardScreen({ navigation }: Props) {
  const [user, setUser] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalViajes: 0,
    totalPasajeros: 0,
    totalAbordados: 0,
    totalPendientes: 0
  });
  const [viajes, setViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Pasajeros / Control de Abordaje
  const [selectedViaje, setSelectedViaje] = useState<any>(null);
  const [pasajeros, setPasajeros] = useState<any[]>([]);
  const [loadingPasajeros, setLoadingPasajeros] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      if (storedUser) setUser(JSON.parse(storedUser));

      const res = await fetch(`${API_URL}/api/movil/operario/viajes`);
      const data = await res.json();

      if (data.success) {
        setMetrics(data.metrics);
        setViajes(data.viajes || []);
      }
    } catch (e) {
      console.error("Error al cargar viajes de operario:", e);
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

  const openPasajerosModal = async (viaje: any) => {
    try {
      setSelectedViaje(viaje);
      setLoadingPasajeros(true);
      const res = await fetch(`${API_URL}/api/movil/operario/pasajeros?viajeId=${viaje.id}`);
      const data = await res.json();

      if (data.success) {
        setPasajeros(data.pasajes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPasajeros(false);
    }
  };

  const toggleAbordajePasajero = async (pasajeId: string, actualAbordado: boolean) => {
    try {
      const nuevoAbordado = !actualAbordado;
      const res = await fetch(`${API_URL}/api/movil/operario/pasajeros`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasajeId, abordado: nuevoAbordado }),
      });
      const data = await res.json();

      if (data.success) {
        setPasajeros(pasajeros.map(p => p.id === pasajeId ? { ...p, abordado: nuevoAbordado } : p));
        loadData();
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar el abordaje.");
    }
  };

  const firstName = user?.nombres ? user.nombres.split(' ')[0] : 'Operador';

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
            <Text style={styles.greetingText}>Hola, {firstName}</Text>
            <Text style={styles.roleText}>Panel de Control de Abordaje</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TARJETAS DE MÉTRICAS EN VIVO */}
        <Text style={styles.sectionTitle}>Métricas de Embarque</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="clipboard-outline" size={22} color="#f07639" />
            </View>
            <Text style={styles.statNumber}>{loading ? '-' : metrics.totalViajes}</Text>
            <Text style={styles.statLabel}>Viajes Salidas</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#16a34a" />
            </View>
            <Text style={styles.statNumber}>
              {loading ? '-' : metrics.totalAbordados}
              <Text style={{ fontSize: 13, color: '#94a3b8' }}> / {metrics.totalPasajeros}</Text>
            </Text>
            <Text style={styles.statLabel}>A Bordo</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="people-outline" size={22} color="#2563eb" />
            </View>
            <Text style={styles.statNumber}>{loading ? '-' : metrics.totalPendientes}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
        </View>

        {/* ACCIÓN PRINCIPAL ESCANEAR QR */}
        <TouchableOpacity
          style={styles.primaryActionCard}
          onPress={() => navigation.navigate('QRScanner')}
          activeOpacity={0.85}
        >
          <View style={styles.primaryActionContent}>
            <Ionicons name="qr-code-outline" size={36} color="#ffffff" />
            <View style={styles.primaryActionText}>
              <Text style={styles.primaryActionTitle}>Escanear Boleto (QR)</Text>
              <Text style={styles.primaryActionSubtitle}>Validar boleto digital de abordaje del pasajero</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* LISTADO DE PRÓXIMAS SALIDAS */}
        <Text style={styles.sectionTitle}>Próximas Salidas (Control de Embarque)</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#f07639" />
            <Text style={styles.loadingText}>Cargando salidas programadas...</Text>
          </View>
        ) : viajes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bus-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No hay viajes programados</Text>
            <Text style={styles.emptySub}>No hay salidas registradas para hoy en el sistema.</Text>
          </View>
        ) : (
          viajes.map((viaje) => {
            const porcentaje = viaje.total_pasajeros > 0
              ? Math.round((viaje.total_abordados / viaje.total_pasajeros) * 100)
              : 0;

            const dateStr = viaje.fecha_salida
              ? new Date(viaje.fecha_salida).toLocaleString('es-PE', {
                  timeZone: 'America/Lima',
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '-';

            const asientosLibres = Math.max(0, (viaje.bus?.capacidad || 40) - viaje.total_pasajeros);

            return (
              <View key={viaje.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <View style={styles.busBadge}>
                    <Ionicons name="bus-outline" size={14} color="#f07639" style={{ marginRight: 4 }} />
                    <Text style={styles.busBadgeText}>Bus: {viaje.bus?.placa}</Text>
                  </View>
                  <Text style={styles.tripIdText}>ID: #{viaje.id}</Text>
                </View>

                <Text style={styles.routeName}>
                  {viaje.ruta?.origen?.nombre} ➔ {viaje.ruta?.destino?.nombre}
                </Text>

                <View style={styles.dateRow}>
                  <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.dateText}>Salida: {dateStr}</Text>
                </View>

                {/* BARRA DE PROGRESO DE ABORDAJE */}
                <View style={styles.progressBox}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressTitle}>Progreso de Abordaje</Text>
                    <Text style={styles.progressCount}>{viaje.total_abordados} / {viaje.total_pasajeros} ({porcentaje}%)</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${porcentaje}%` }]} />
                  </View>
                </View>

                {/* PIE DE TARJETA CON BOTÓN */}
                <View style={styles.tripFooter}>
                  <Text style={styles.asientosLibresText}>{asientosLibres} Libres</Text>
                  <TouchableOpacity style={styles.btnControl} onPress={() => openPasajerosModal(viaje)}>
                    <Text style={styles.btnControlText}>Controlar Abordaje</Text>
                    <Ionicons name="arrow-forward" size={14} color="#f07639" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* COMPRAR PASAJES VISTA CLIENTE */}
        <TouchableOpacity
          style={[styles.secondaryActionCard, { borderColor: '#f07639', borderWidth: 1 }]}
          onPress={() => navigation.navigate('ClienteDashboard')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#fff7ed', marginBottom: 0 }]}>
            <Ionicons name="cart-outline" size={22} color="#f07639" />
          </View>
          <View style={styles.secondaryActionText}>
            <Text style={[styles.secondaryActionTitle, { color: '#f07639' }]}>Comprar Pasajes (Vista Cliente)</Text>
            <Text style={styles.secondaryActionSubtitle}>Ir al módulo de venta de boletos</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#f07639" />
        </TouchableOpacity>

      </ScrollView>

      {/* MODAL LISTA DE PASAJEROS DEL VIAJE */}
      <Modal visible={!!selectedViaje} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Lista de Pasajeros</Text>
                <Text style={styles.modalSub}>
                  {selectedViaje?.ruta?.origen?.nombre} ➔ {selectedViaje?.ruta?.destino?.nombre} (Bus {selectedViaje?.bus?.placa})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedViaje(null)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {loadingPasajeros ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#f07639" />
                <Text style={{ marginTop: 10, color: '#64748b' }}>Cargando lista de pasajeros...</Text>
              </View>
            ) : pasajeros.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={36} color="#94a3b8" />
                <Text style={{ marginTop: 8, color: '#94a3b8', fontSize: 13 }}>No hay pasajeros con boleto en este viaje.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {pasajeros.map((p) => {
                  const nombrePasajero = p.pasajero ? `${p.pasajero.nombres} ${p.pasajero.apellidos}` : 'Pasajero';
                  const dniPasajero = p.pasajero?.dni || 'N/A';
                  const numAsiento = p.asiento_viaje?.numero_asiento || '-';
                  const isAbordado = p.abordado;

                  return (
                    <View key={p.id} style={styles.pasajeroCard}>
                      <View style={styles.seatNumBadge}>
                        <Text style={styles.seatNumText}>A-{numAsiento}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.pasajeroName}>{nombrePasajero}</Text>
                        <Text style={styles.pasajeroDni}>DNI: {dniPasajero}</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.btnAbordajeToggle, isAbordado ? styles.btnAbordadoDone : styles.btnAbordadoPending]}
                        onPress={() => toggleAbordajePasajero(p.id, isAbordado)}
                      >
                        <Ionicons name={isAbordado ? "checkmark-circle" : "ellipse-outline"} size={16} color={isAbordado ? "#fff" : "#64748b"} style={{ marginRight: 4 }} />
                        <Text style={[styles.btnAbordajeText, { color: isAbordado ? "#fff" : "#334155" }]}>
                          {isAbordado ? "A bordo" : "Pendiente"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  headerProfileInfo: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 10 },
  greetingText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  roleText: { fontSize: 12, color: '#f07639', fontWeight: '600' },
  logoutIcon: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 12 },
  scrollContent: { padding: 18, paddingBottom: 36 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  iconWrapper: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 2, textAlign: 'center', textTransform: 'uppercase' },
  primaryActionCard: {
    backgroundColor: '#f07639',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryActionContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  primaryActionText: { marginLeft: 14, flex: 1 },
  primaryActionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  primaryActionSubtitle: { color: '#ffedd5', fontSize: 11, marginTop: 2 },
  tripCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  busBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  busBadgeText: { fontSize: 11, fontWeight: '800', color: '#f07639' },
  tripIdText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  routeName: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dateText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  progressBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressTitle: { fontSize: 11, fontWeight: '700', color: '#475569' },
  progressCount: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  progressBarTrack: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 4 },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  asientosLibresText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  btnControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ffedd5' },
  btnControlText: { fontSize: 12, fontWeight: '800', color: '#f07639' },
  secondaryActionCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  secondaryActionText: { flex: 1, marginLeft: 14 },
  secondaryActionTitle: { color: '#1e293b', fontSize: 14, fontWeight: '700' },
  secondaryActionSubtitle: { color: '#94a3b8', fontSize: 11, marginTop: 1 },
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 13, fontWeight: '600' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 10 },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeModalBtn: { padding: 4 },
  pasajeroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  seatNumBadge: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  seatNumText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  pasajeroName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  pasajeroDni: { fontSize: 11, color: '#64748b', marginTop: 1 },
  btnAbordajeToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  btnAbordadoDone: { backgroundColor: '#16a34a' },
  btnAbordadoPending: { backgroundColor: '#e2e8f0' },
  btnAbordajeText: { fontSize: 11, fontWeight: '800' }
});
