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

type ConductorAlertasNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConductorAlertas'>;

interface Props {
  navigation: ConductorAlertasNavigationProp;
}

export default function ConductorAlertasScreen({ navigation }: Props) {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlertas = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const personaId = user.persona_id || user.id;

      const res = await fetch(`${API_URL}/api/movil/conductor/alertas?conductorId=${personaId}`);
      const data = await res.json();

      if (data.success) {
        setAlertas(data.alertas || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlertas();
  }, []);

  const handleMarcarLeida = async (alertaId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/movil/conductor/alertas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertaId }),
      });
      const data = await res.json();
      if (data.success) {
        loadAlertas();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const dateStr = item.created_at
      ? new Date(item.created_at).toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : '-';

    return (
      <View style={[styles.card, !item.leido && styles.cardUnread]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrapper}>
            <Ionicons name="notifications-outline" size={20} color="#f07639" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardTitle}>Comunicado Central</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          {!item.leido && (
            <View style={styles.unreadDot} />
          )}
        </View>

        <Text style={styles.mensajeText}>{item.mensaje}</Text>

        {item.viaje?.ruta && (
          <View style={styles.routeBox}>
            <Ionicons name="map-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.routeText}>
              Ruta: {item.viaje.ruta.origen?.nombre} ➔ {item.viaje.ruta.destino?.nombre}
            </Text>
          </View>
        )}

        {!item.leido && (
          <TouchableOpacity style={styles.markReadBtn} onPress={() => handleMarcarLeida(item.id)}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.markReadText}>Marcar como Leído</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alertas de Central</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#f07639" />
          <Text style={styles.loadingText}>Cargando alertas...</Text>
        </View>
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAlertas(); }} colors={['#f07639']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Sin alertas pendientes</Text>
              <Text style={styles.emptySubtitle}>No tienes notificaciones de la oficina central en este momento.</Text>
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
  listContent: { padding: 16, paddingBottom: 32 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUnread: { borderColor: '#fed7aa', backgroundColor: '#fff7ed' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconWrapper: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ea580c' },
  mensajeText: { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 10 },
  routeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  routeText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  markReadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 6 },
  markReadText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }
});
