import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Linking,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../App';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ConductorViajeDetalleNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConductorViajeDetalle'>;
type ConductorViajeDetalleRouteProp = RouteProp<RootStackParamList, 'ConductorViajeDetalle'>;

interface Props {
  navigation: ConductorViajeDetalleNavigationProp;
  route: ConductorViajeDetalleRouteProp;
}

// Coordenadas fijas de paradas para geolocalización (Haversine)
type StopCoords = { lat: number; lng: number };
const STOP_COORDINATES: Record<string, StopCoords> = {
  "Jaén": { lat: -5.7088, lng: -78.8081 },
  "Chamaya": { lat: -5.7628, lng: -78.7478 },
  "Bagua Grande": { lat: -5.7562, lng: -78.4419 },
  "Olmos": { lat: -5.9849, lng: -79.7453 },
  "Chiclayo": { lat: -6.7714, lng: -79.8406 },
  "Trujillo": { lat: -8.1160, lng: -79.0300 },
  "Mocupe": { lat: -7.1481, lng: -79.6192 },
  "Guadalupe": { lat: -7.2483, lng: -79.4758 },
  "Pacasmayo": { lat: -7.4006, lng: -79.5714 },
  "Cajamarca": { lat: -7.1638, lng: -78.5003 },
  "Chilete": { lat: -7.2250, lng: -78.8475 },
  "Tembladera": { lat: -7.2536, lng: -79.1306 },
  "Ciudad de Dios": { lat: -7.3756, lng: -79.4128 },
  "Control A": { lat: -6.0000, lng: -79.0000 },
  "Control B": { lat: -6.3000, lng: -79.3000 }
};

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function ConductorViajeDetalleScreen({ navigation, route }: Props) {
  const { viajeId } = route.params;

  const [viaje, setViaje] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ruta' | 'encomiendas' | 'gastos' | 'bitacora'>('ruta');

  // Paradas completadas y GPS
  const [completedStops, setCompletedStops] = useState<string[]>([]);
  const [gpsActive, setGpsActive] = useState(false);

  // Formulario Gastos
  const [conceptoGasto, setConceptoGasto] = useState('Peaje');
  const [montoGasto, setMontoGasto] = useState('');
  const [submittingGasto, setSubmittingGasto] = useState(false);

  // Formulario Bitácora
  const [tipoOcurrencia, setTipoOcurrencia] = useState('Tránsito');
  const [gravedadOcurrencia, setGravedadOcurrencia] = useState('Baja');
  const [descripcionOcurrencia, setDescripcionOcurrencia] = useState('');
  const [retrasoMinutos, setRetrasoMinutos] = useState('0');
  const [submittingBitacora, setSubmittingBitacora] = useState(false);

  const loadViajeDetalle = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const personaId = user.persona_id || user.id;

      const res = await fetch(`${API_URL}/api/movil/conductor/viajes?personaId=${personaId}`);
      const data = await res.json();

      if (data.success && data.viajes) {
        const found = data.viajes.find((v: any) => v.id.toString() === viajeId.toString());
        if (found) setViaje(found);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadViajeDetalle();
  }, [viajeId]);

  const handleUpdateEstado = async (nuevoEstado: string) => {
    try {
      const res = await fetch(`${API_URL}/api/movil/conductor/viajes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId, estado: nuevoEstado }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Éxito', `Viaje actualizado a ${nuevoEstado.replace('_', ' ')}.`);
        loadViajeDetalle();
      } else {
        Alert.alert('Error', data.error || 'No se pudo actualizar el estado.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    }
  };

  const getParadas = () => {
    if (!viaje?.ruta) return ["Cajamarca", "Control A", "Control B", "Chiclayo"];
    const o = viaje.ruta.origen?.nombre || "Origen";
    const d = viaje.ruta.destino?.nombre || "Destino";

    if ((o.includes("Jaén") && d.includes("Chiclayo")) || (o.includes("Chiclayo") && d.includes("Jaén"))) {
      return ["Jaén", "Chamaya", "Bagua Grande", "Olmos", "Chiclayo"];
    } else if ((o.includes("Trujillo") && d.includes("Chiclayo")) || (o.includes("Chiclayo") && d.includes("Trujillo"))) {
      return ["Trujillo", "Mocupe", "Guadalupe", "Pacasmayo", "Chiclayo"];
    }
    return [o, "Control A", "Control B", d];
  };

  const toggleStopCompleted = (stopName: string) => {
    if (completedStops.includes(stopName)) {
      setCompletedStops(completedStops.filter(s => s !== stopName));
    } else {
      setCompletedStops([...completedStops, stopName]);
      Alert.alert("Parada Detectada / Marcada", `Se marcó la parada [${stopName}] como completada.`);
    }
  };

  const handleOpenGoogleMaps = () => {
    if (!viaje?.ruta) return;
    const origen = encodeURIComponent(viaje.ruta.origen?.nombre || "Cajamarca");
    const destino = encodeURIComponent(viaje.ruta.destino?.nombre || "Chiclayo");
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origen}&destination=${destino}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "No se pudo abrir Google Maps."));
  };

  const handleRegistrarGasto = async () => {
    if (!montoGasto || isNaN(parseFloat(montoGasto))) {
      Alert.alert("Atención", "Ingresa un monto válido.");
      return;
    }
    try {
      setSubmittingGasto(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      const user = storedUser ? JSON.parse(storedUser) : {};
      const conductorId = user.persona_id || user.id;

      const res = await fetch(`${API_URL}/api/movil/conductor/gastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId, conductorId, concepto: conceptoGasto, monto: montoGasto }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Éxito", "Gasto registrado correctamente.");
        setMontoGasto('');
        loadViajeDetalle();
      } else {
        Alert.alert("Error", data.error || "No se pudo guardar el gasto.");
      }
    } catch (e) {
      Alert.alert("Error", "Error de red.");
    } finally {
      setSubmittingGasto(false);
    }
  };

  const handleRegistrarBitacora = async () => {
    if (!descripcionOcurrencia.trim()) {
      Alert.alert("Atención", "Describe el incidente u ocurrencia.");
      return;
    }
    try {
      setSubmittingBitacora(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      const user = storedUser ? JSON.parse(storedUser) : {};
      const conductorId = user.persona_id || user.id;

      const res = await fetch(`${API_URL}/api/movil/conductor/bitacora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viajeId,
          conductorId,
          tipo: tipoOcurrencia,
          gravedad: gravedadOcurrencia,
          descripcion: descripcionOcurrencia.trim(),
          retraso_minutos: retrasoMinutos
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Éxito", "Ocurrencia registrada en bitácora.");
        setDescripcionOcurrencia('');
        setRetrasoMinutos('0');
        loadViajeDetalle();
      } else {
        Alert.alert("Error", data.error || "No se pudo guardar la ocurrencia.");
      }
    } catch (e) {
      Alert.alert("Error", "Error de red.");
    } finally {
      setSubmittingBitacora(false);
    }
  };

  const paradas = getParadas();

  if (loading || !viaje) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#f07639" />
          <Text style={styles.loadingText}>Cargando detalle del viaje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateStr = viaje.fecha_salida
    ? new Date(viaje.fecha_salida).toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '-';

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Viaje</Text>
        <View style={styles.gpsBadge}>
          <Ionicons name="navigate-outline" size={14} color="#10b981" style={{ marginRight: 4 }} />
          <Text style={styles.gpsText}>GPS: Activo</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HÉROE DEL VIAJE */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.busTag}>
              <Ionicons name="bus-outline" size={16} color="#f07639" style={{ marginRight: 6 }} />
              <Text style={styles.busPlacaText}>Bus: {viaje.bus?.placa}</Text>
            </View>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>

          <Text style={styles.routeNameText}>
            {viaje.ruta?.origen?.nombre} ➔ {viaje.ruta?.destino?.nombre}
          </Text>

          {/* ACCIONES DE ESTADO */}
          <View style={styles.statusActionBox}>
            {viaje.estado === 'programado' && (
              <TouchableOpacity style={[styles.btnActionHero, { backgroundColor: '#f07639' }]} onPress={() => handleUpdateEstado('en_ruta')}>
                <Ionicons name="play" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnActionHeroText}>INICIAR VIAJE</Text>
              </TouchableOpacity>
            )}

            {viaje.estado === 'en_ruta' && (
              <TouchableOpacity style={[styles.btnActionHero, { backgroundColor: '#16a34a' }]} onPress={() => handleUpdateEstado('completado')}>
                <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnActionHeroText}>FINALIZAR VIAJE</Text>
              </TouchableOpacity>
            )}

            {viaje.estado === 'completado' && (
              <View style={[styles.btnActionHero, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" style={{ marginRight: 6 }} />
                <Text style={[styles.btnActionHeroText, { color: '#15803d' }]}>VIAJE COMPLETADO</Text>
              </View>
            )}
          </View>
        </View>

        {/* TABS NAVEGACIÓN HORIZONTAL SCROLLABLE */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsScrollContent}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'ruta' && styles.tabBtnActive]} onPress={() => setActiveTab('ruta')}>
            <Ionicons name="map-outline" size={18} color={activeTab === 'ruta' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'ruta' && styles.tabBtnTextActive]}>Hoja de Ruta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabBtn, activeTab === 'encomiendas' && styles.tabBtnActive]} onPress={() => setActiveTab('encomiendas')}>
            <Ionicons name="cube-outline" size={18} color={activeTab === 'encomiendas' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'encomiendas' && styles.tabBtnTextActive]}>Encomiendas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabBtn, activeTab === 'gastos' && styles.tabBtnActive]} onPress={() => setActiveTab('gastos')}>
            <Ionicons name="cash-outline" size={18} color={activeTab === 'gastos' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'gastos' && styles.tabBtnTextActive]}>Gastos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.tabBtn, activeTab === 'bitacora' && styles.tabBtnActive]} onPress={() => setActiveTab('bitacora')}>
            <Ionicons name="clipboard-outline" size={18} color={activeTab === 'bitacora' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'bitacora' && styles.tabBtnTextActive]}>Bitácora</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* TAB 1: HOJA DE RUTA & GEOFENCING / PARADAS */}
        {activeTab === 'ruta' && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Progreso y Paradas del Viaje</Text>
            <Text style={styles.sectionSubtitle}>
              Visualización de Paradas de Control ({completedStops.length} de {paradas.length} completadas)
            </Text>

            <View style={styles.stopsProgressRow}>
              {paradas.map((p, idx) => {
                const isDone = completedStops.includes(p);
                return (
                  <TouchableOpacity key={p} style={styles.stopItem} onPress={() => toggleStopCompleted(p)}>
                    <View style={[styles.stopCircle, isDone && styles.stopCircleDone]}>
                      {isDone ? (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      ) : (
                        <Text style={styles.stopCircleNum}>{idx + 1}</Text>
                      )}
                    </View>
                    <Text style={[styles.stopName, isDone && styles.stopNameDone]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.btnGoogleMaps} onPress={handleOpenGoogleMaps}>
              <Ionicons name="navigate" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnGoogleMapsText}>Abrir Ruta en App de Google Maps (GPS)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 2: ENCOMIENDAS */}
        {activeTab === 'encomiendas' && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Encomiendas en este Viaje ({viaje.encomiendas?.length || 0})</Text>
            {(!viaje.encomiendas || viaje.encomiendas.length === 0) ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={36} color="#94a3b8" />
                <Text style={styles.emptyText}>No hay encomiendas asignadas a este bus.</Text>
              </View>
            ) : (
              viaje.encomiendas.map((enc: any) => {
                const nombreDest = enc.destinatario 
                  ? `${enc.destinatario.nombres} ${enc.destinatario.apellidos}` 
                  : (enc.nombre_destinatario || 'Juan Pérez Solís');
                const codigoStr = enc.codigo_seguimiento || enc.codigo_rastreo || `#${enc.id}`;
                const getBadgeStyle = (st: string) => {
                  if (st === 'en_destino' || st === 'listo_entrega') {
                    return { bg: '#dcfce7', color: '#15803d', text: 'EN DESTINO' };
                  }
                  if (st === 'entregado') {
                    return { bg: '#e0e7ff', color: '#3730a3', text: 'ENTREGADO' };
                  }
                  return { bg: 'rgba(240, 118, 57, 0.12)', color: '#f07639', text: (st || 'EN TRÁNSITO').replace('_', ' ').toUpperCase() };
                };
                const badgeInfo = getBadgeStyle(enc.estado);

                return (
                  <View key={enc.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <Text style={styles.itemCode}>Código: {codigoStr}</Text>
                      <View style={[styles.badgeState, { backgroundColor: badgeInfo.bg }]}>
                        <Text style={[styles.badgeStateText, { color: badgeInfo.color }]}>{badgeInfo.text}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemTitle}>Destinatario: {nombreDest}</Text>
                    {enc.descripcion && <Text style={styles.itemSub}>Detalle: {enc.descripcion}</Text>}
                    <Text style={styles.itemSub}>Destino: {enc.destino?.nombre || 'Sucursal Chiclayo'}</Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: GASTOS DE RUTA */}
        {activeTab === 'gastos' && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Registrar Gasto de Ruta</Text>
            <View style={styles.formRow}>
              {['Peaje', 'Combustible', 'Alimentación', 'Otro'].map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, conceptoGasto === c && styles.chipActive]} onPress={() => setConceptoGasto(c)}>
                  <Text style={[styles.chipText, conceptoGasto === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Monto en S/. (ej. 25.50)"
              keyboardType="numeric"
              value={montoGasto}
              onChangeText={setMontoGasto}
            />
            <TouchableOpacity style={styles.btnSubmit} onPress={handleRegistrarGasto} disabled={submittingGasto}>
              <Text style={styles.btnSubmitText}>{submittingGasto ? 'Guardando...' : 'Guardar Gasto'}</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Gastos Registrados ({viaje.gastos?.length || 0})</Text>
            {(!viaje.gastos || viaje.gastos.length === 0) ? (
              <Text style={styles.emptyText}>Sin gastos registrados en esta ruta.</Text>
            ) : (
              viaje.gastos.map((g: any) => (
                <View key={g.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <Text style={[styles.itemCode, { flex: 1, marginRight: 10 }]} numberOfLines={2}>{g.concepto}</Text>
                    <Text style={[styles.itemCode, { color: '#ef4444', fontWeight: '800' }]}>S/. {parseFloat(g.monto).toFixed(2)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: BITÁCORA / INCIDENTES */}
        {activeTab === 'bitacora' && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Reportar Ocurrencia / Incidente en Ruta</Text>
            <View style={styles.formRow}>
              {['Tránsito', 'Clima', 'Desvío', 'Mecánica'].map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, tipoOcurrencia === t && styles.chipActive]} onPress={() => setTipoOcurrencia(t)}>
                  <Text style={[styles.chipText, tipoOcurrencia === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Retraso estimado en minutos (ej. 15)"
              keyboardType="numeric"
              value={retrasoMinutos}
              onChangeText={setRetrasoMinutos}
            />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Descripción del evento..."
              multiline
              value={descripcionOcurrencia}
              onChangeText={setDescripcionOcurrencia}
            />
            <TouchableOpacity style={styles.btnSubmit} onPress={handleRegistrarBitacora} disabled={submittingBitacora}>
              <Text style={styles.btnSubmitText}>{submittingBitacora ? 'Guardando...' : 'Registrar en Bitácora'}</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Historial de Bitácora ({viaje.bitacoras?.length || 0})</Text>
            {(!viaje.bitacoras || viaje.bitacoras.length === 0) ? (
              <Text style={styles.emptyText}>Sin incidentes reportados.</Text>
            ) : (
              viaje.bitacoras.map((b: any) => (
                <View key={b.id} style={styles.itemCard}>
                  <View style={styles.itemCardHeader}>
                    <Text style={styles.itemCode}>{b.tipo} (Gravedad: {b.gravedad})</Text>
                    <Text style={styles.itemSub}>Retraso: +{b.retraso_minutos} min</Text>
                  </View>
                  <Text style={styles.itemTitle}>{b.descripcion}</Text>
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gpsText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14, fontWeight: '600' },
  heroCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  busTag: { flexDirection: 'row', alignItems: 'center' },
  busPlacaText: { fontSize: 13, fontWeight: '800', color: '#f07639' },
  dateText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  routeNameText: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  statusActionBox: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btnActionHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  btnActionHeroText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  tabsScroll: { marginBottom: 16 },
  tabsScrollContent: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  tabBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b', marginLeft: 6 },
  tabBtnTextActive: { color: '#ffffff' },
  sectionBox: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  stopsProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 8 },
  stopItem: { alignItems: 'center' },
  stopCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', marginBottom: 4 },
  stopCircleDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  stopCircleNum: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  stopName: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  stopNameDone: { color: '#10b981' },
  btnGoogleMaps: { backgroundColor: '#f07639', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnGoogleMapsText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#f07639' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 13, color: '#0f172a', marginBottom: 10 },
  btnSubmit: { backgroundColor: '#f07639', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnSubmitText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  itemCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemCode: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  itemBadge: { fontSize: 11, fontWeight: '700', color: '#f07639' },
  badgeState: { backgroundColor: 'rgba(240, 118, 57, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeStateText: { color: '#f07639', fontSize: 10, fontWeight: '800' },
  itemTitle: { fontSize: 13, fontWeight: '600', color: '#334155' },
  itemSub: { fontSize: 11, color: '#64748b', marginTop: 2 }
});
