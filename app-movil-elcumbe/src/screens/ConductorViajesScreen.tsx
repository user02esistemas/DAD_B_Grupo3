import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../App';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ConductorViajesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConductorViajes'>;

interface Props {
  navigation: ConductorViajesNavigationProp;
}

export default function ConductorViajesScreen({ navigation }: Props) {
  const [viajes, setViajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<'pendientes' | 'todos'>('pendientes');

  const loadViajes = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const personaId = user.persona_id || user.id;

      const res = await fetch(`${API_URL}/api/movil/conductor/viajes?personaId=${personaId}`);
      const data = await res.json();

      if (data.success) {
        setViajes(data.viajes || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadViajes();
  }, []);

  const handleUpdateEstado = async (viajeId: string, nuevoEstado: string) => {
    try {
      const res = await fetch(`${API_URL}/api/movil/conductor/viajes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viajeId, estado: nuevoEstado }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Éxito', `Estado del viaje actualizado a ${nuevoEstado.replace('_', ' ')}.`);
        loadViajes();
      } else {
        Alert.alert('Error', data.error || 'No se pudo actualizar el viaje.');
      }
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    }
  };

  const filteredViajes = viajes.filter((v) => {
    if (filtro === 'pendientes') {
      return v.estado === 'programado' || v.estado === 'en_ruta';
    }
    return true;
  });

  const getBadgeStyle = (estado: string) => {
    if (estado === 'programado') return { bg: '#dbeafe', color: '#1d4ed8', text: 'PROGRAMADO' };
    if (estado === 'en_ruta') return { bg: '#fef3c7', color: '#d97706', text: 'EN RUTA' };
    if (estado === 'completado') return { bg: '#dcfce7', color: '#15803d', text: 'COMPLETADO' };
    return { bg: '#f1f5f9', color: '#64748b', text: estado.toUpperCase() };
  };

  const renderItem = ({ item }: { item: any }) => {
    const badge = getBadgeStyle(item.estado);
    const dateStr = item.fecha_salida
      ? new Date(item.fecha_salida).toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '-';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ConductorViajeDetalle', { viajeId: item.id.toString() })}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
          <View style={styles.busInfo}>
            <Ionicons name="bus-outline" size={16} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.busPlaca}>{item.bus?.placa || 'Sin Bus'}</Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <Ionicons name="location-outline" size={20} color="#f07639" style={{ marginRight: 8 }} />
          <Text style={styles.routeName}>
            {item.ruta?.origen?.nombre} ➔ {item.ruta?.destino?.nombre}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.dateText}>Salida: {dateStr}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipText}>📦 Encomiendas: {item.encomiendas?.length || 0}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.statChipText, { color: '#2563eb' }]}>Ver Hoja de Ruta ➔</Text>
          </View>
        </View>

        {/* ACCIONES DEL CONDUCTOR */}
        {(item.estado === 'programado' || item.estado === 'en_ruta') && (
          <View style={styles.actionsRow}>
            {item.estado === 'programado' && (
              <TouchableOpacity
                style={[styles.btnAction, { backgroundColor: '#f07639' }]}
                onPress={() => handleUpdateEstado(item.id, 'en_ruta')}
              >
                <Ionicons name="play" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.btnActionText}>Iniciar Viaje</Text>
              </TouchableOpacity>
            )}

            {item.estado === 'en_ruta' && (
              <TouchableOpacity
                style={[styles.btnAction, { backgroundColor: '#16a34a' }]}
                onPress={() => handleUpdateEstado(item.id, 'completado')}
              >
                <Ionicons name="checkmark-done" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.btnActionText}>Finalizar Viaje</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Viajes Asignados</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* FILTROS */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, filtro === 'pendientes' && styles.filterBtnActive]}
          onPress={() => setFiltro('pendientes')}
        >
          <Text style={[styles.filterBtnText, filtro === 'pendientes' && styles.filterBtnTextActive]}>
            Pendientes / En Ruta
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, filtro === 'todos' && styles.filterBtnActive]}
          onPress={() => setFiltro('todos')}
        >
          <Text style={[styles.filterBtnText, filtro === 'todos' && styles.filterBtnTextActive]}>
            Historial Completo
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#f07639" />
          <Text style={styles.loadingText}>Cargando mis viajes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredViajes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadViajes(); }} colors={['#f07639']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bus-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No hay viajes asignados</Text>
              <Text style={styles.emptySubtitle}>No se encontraron viajes con el filtro seleccionado.</Text>
            </View>
          }
        />
      )}
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#f07639', borderColor: '#f07639' },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  filterBtnTextActive: { color: '#ffffff' },
  listContent: { padding: 16, paddingBottom: 32 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  busInfo: { flexDirection: 'row', alignItems: 'center' },
  busPlaca: { fontSize: 13, fontWeight: '700', color: '#334155' },
  routeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  routeName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnActionText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' }
});
