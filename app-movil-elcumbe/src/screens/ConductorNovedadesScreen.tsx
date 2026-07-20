import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../App';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ConductorNovedadesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ConductorNovedades'>;

interface Props {
  navigation: ConductorNovedadesNavigationProp;
}

export default function ConductorNovedadesScreen({ navigation }: Props) {
  const [novedades, setNovedades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [categoria, setCategoria] = useState('Motor');
  const [descripcion, setDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadNovedades = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const personaId = user.persona_id || user.id;

      const res = await fetch(`${API_URL}/api/movil/conductor/novedades?conductorId=${personaId}`);
      const data = await res.json();

      if (data.success) {
        setNovedades(data.novedades || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNovedades();
  }, []);

  const handleReportarFalla = async () => {
    if (!descripcion.trim()) {
      Alert.alert('Atención', 'Ingresa una descripción de la falla o novedad.');
      return;
    }

    try {
      setSubmitting(true);
      const storedUser = await AsyncStorage.getItem('@user_data');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const conductorId = user.persona_id || user.id;

      const res = await fetch(`${API_URL}/api/movil/conductor/novedades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conductorId,
          categoria,
          descripcion: descripcion.trim()
        }),
      });

      const data = await res.json();

      if (data.success) {
        Alert.alert('Éxito', 'Novedad mecánica registrada correctamente.');
        setModalOpen(false);
        setDescripcion('');
        loadNovedades();
      } else {
        Alert.alert('Error', data.error || 'No se pudo reportar la novedad.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo comunicar con el servidor.');
    } finally {
      setSubmitting(false);
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.categoriaTag}>
            <Ionicons name="construct-outline" size={14} color="#d97706" style={{ marginRight: 4 }} />
            <Text style={styles.categoriaText}>{item.categoria}</Text>
          </View>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        <Text style={styles.descripcionText}>{item.descripcion}</Text>

        {item.bus && (
          <View style={styles.busRow}>
            <Ionicons name="bus-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.busText}>Bus: {item.bus.placa} ({item.bus.modelo || 'Estándar'})</Text>
          </View>
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
        <Text style={styles.headerTitle}>Novedades Mecánicas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#f07639" />
          <Text style={styles.loadingText}>Cargando novedades...</Text>
        </View>
      ) : (
        <FlatList
          data={novedades}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNovedades(); }} colors={['#f07639']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="build-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Sin novedades registradas</Text>
              <Text style={styles.emptySubtitle}>Presiona el botón "+" para reportar una falla mecánica del bus.</Text>
            </View>
          }
        />
      )}

      {/* MODAL REGISTRAR NOVEDAD */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar Falla o Novedad</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Categoría</Text>
            <View style={styles.categoriasGrid}>
              {['Motor', 'Frenos', 'Llantas', 'Luces', 'Sistema Eléctrico', 'Otro'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, categoria === cat && styles.catChipActive]}
                  onPress={() => setCategoria(cat)}
                >
                  <Text style={[styles.catChipText, categoria === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Descripción de la Falla</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Detalla la ocurrencia o síntoma del vehículo..."
              multiline
              numberOfLines={4}
              value={descripcion}
              onChangeText={setDescripcion}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleReportarFalla}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Enviar Reporte</Text>
              )}
            </TouchableOpacity>
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
  addBtn: { backgroundColor: '#f07639', width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoriaTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoriaText: { fontSize: 12, fontWeight: '800', color: '#b45309' },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  descripcionText: { fontSize: 14, color: '#1e293b', lineHeight: 20, marginBottom: 10 },
  busRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  busText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 10 },
  categoriasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9' },
  catChipActive: { backgroundColor: '#f07639' },
  catChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  catChipTextActive: { color: '#ffffff' },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 20,
    height: 100,
  },
  submitBtn: { backgroundColor: '#f07639', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' }
});
