import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Claim {
  id: string;
  codigo: string;
  tipo: 'reclamo' | 'queja';
  detalle: string;
  fecha: string;
  estado: 'Pendiente' | 'En Proceso' | 'Resuelto';
}

export default function ReclamacionesScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'nuevo' | 'mis_reclamos'>('nuevo');
  
  // Form State
  const [tipo, setTipo] = useState<'reclamo' | 'queja'>('reclamo');
  const [codigoDocumento, setCodigoDocumento] = useState('');
  const [detalle, setDetalle] = useState('');
  const [solicitud, setSolicitud] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdClaimCode, setCreatedClaimCode] = useState<string | null>(null);

  // Lista de reclamos guardados en sesión
  const [claimsList, setClaimsList] = useState<Claim[]>([
    {
      id: '1',
      codigo: 'REC-2026-0891',
      tipo: 'reclamo',
      detalle: 'Retraso de 30 minutos en la partida del bus de Cajamarca a Chiclayo.',
      fecha: '18/07/2026',
      estado: 'Resuelto'
    }
  ]);

  const handleSubmit = () => {
    if (!detalle.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor describe el detalle de tu reclamo o queja.');
      return;
    }
    if (!solicitud.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor indica qué solicitud o solución esperas.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newCode = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newClaim: Claim = {
        id: Date.now().toString(),
        codigo: newCode,
        tipo,
        detalle: detalle.trim(),
        fecha: new Date().toLocaleDateString('es-ES'),
        estado: 'Pendiente'
      };

      setClaimsList(prev => [newClaim, ...prev]);
      setCreatedClaimCode(newCode);
      setIsSubmitting(false);

      // Limpiar formulario
      setCodigoDocumento('');
      setDetalle('');
      setSolicitud('');
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER NAVBAR */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Libro de Reclamaciones</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SEGMENTED TAB SWITCHER */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'nuevo' && styles.tabBtnActive]}
          onPress={() => setActiveTab('nuevo')}
        >
          <Ionicons name="document-text-outline" size={18} color={activeTab === 'nuevo' ? '#f07639' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeTab === 'nuevo' && styles.tabBtnTextActive]}>Registrar Reclamo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'mis_reclamos' && styles.tabBtnActive]}
          onPress={() => setActiveTab('mis_reclamos')}
        >
          <Ionicons name="time-outline" size={18} color={activeTab === 'mis_reclamos' ? '#f07639' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeTab === 'mis_reclamos' && styles.tabBtnTextActive]}>Mis Reclamos ({claimsList.length})</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'nuevo' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* BANNER OFICIAL */}
          <View style={styles.officialBanner}>
            <Ionicons name="shield-checkmark" size={24} color="#f07639" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Libro de Reclamaciones Virtual</Text>
              <Text style={styles.bannerSubtitle}>Conforme al D.S. N° 011-2011-PCM del Reglamento del Libro de Reclamaciones del Perú.</Text>
            </View>
          </View>

          {/* SELECTOR DE TIPO */}
          <Text style={styles.fieldLabel}>Tipo de Incidencia</Text>
          <View style={styles.typeSelectorContainer}>
            <TouchableOpacity
              style={[styles.typeBox, tipo === 'reclamo' && styles.typeBoxActive]}
              onPress={() => setTipo('reclamo')}
            >
              <Ionicons name="alert-circle" size={22} color={tipo === 'reclamo' ? '#f07639' : '#94a3b8'} />
              <Text style={[styles.typeTitle, tipo === 'reclamo' && styles.typeTitleActive]}>Reclamo</Text>
              <Text style={styles.typeDesc}>Disconformidad relacionada a los servicios prestados.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBox, tipo === 'queja' && styles.typeBoxActive]}
              onPress={() => setTipo('queja')}
            >
              <Ionicons name="chatbox-ellipses" size={22} color={tipo === 'queja' ? '#f07639' : '#94a3b8'} />
              <Text style={[styles.typeTitle, tipo === 'queja' && styles.typeTitleActive]}>Queja</Text>
              <Text style={styles.typeDesc}>Malestar o desacuerdo respecto a la atención al público.</Text>
            </TouchableOpacity>
          </View>

          {/* CAMPO BOLETO / ENCOMIENDA (OPCIONAL) */}
          <Text style={styles.fieldLabel}>N° de Boleto o Encomienda (Opcional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ej: CUM-9482 o ENC-1029"
            placeholderTextColor="#94a3b8"
            value={codigoDocumento}
            onChangeText={setCodigoDocumento}
          />

          {/* CAMPO DETALLE DE LA INCIDENCIA */}
          <Text style={styles.fieldLabel}>Detalle del Reclamo o Queja *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe lo sucedido detallando la fecha, horario y lugar de la incidencia..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            value={detalle}
            onChangeText={setDetalle}
          />

          {/* CAMPO SOLICITUD DEL CONSUMIDOR */}
          <Text style={styles.fieldLabel}>Pedido o Solicitud del Consumidor *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Indica qué solución o atención esperas recibir de la empresa..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            value={solicitud}
            onChangeText={setSolicitud}
          />

          {/* BOTÓN SUBMIT */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Ionicons name="send" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnText}>{isSubmitting ? 'Enviando Reclamo...' : 'Enviar Reclamo / Queja'}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* VISTA LISTA DE MIS RECLAMOS */
        <FlatList
          data={claimsList}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.claimCard}>
              <View style={styles.claimHeader}>
                <Text style={styles.claimCode}>{item.codigo}</Text>
                <View style={[
                  styles.statusBadge,
                  item.estado === 'Resuelto' && { backgroundColor: '#dcfce7' },
                  item.estado === 'En Proceso' && { backgroundColor: '#dbeafe' },
                  item.estado === 'Pendiente' && { backgroundColor: '#ffedd5' },
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    item.estado === 'Resuelto' && { color: '#16a34a' },
                    item.estado === 'En Proceso' && { color: '#2563eb' },
                    item.estado === 'Pendiente' && { color: '#ea580c' },
                  ]}>{item.estado}</Text>
                </View>
              </View>

              <Text style={styles.claimType}>Tipo: {item.tipo.toUpperCase()}</Text>
              <Text style={styles.claimDetalle}>{item.detalle}</Text>
              <Text style={styles.claimFecha}>Fecha de registro: {item.fecha}</Text>
            </View>
          )}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN CON CÓDIGO */}
      <Modal visible={!!createdClaimCode} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-sharp" size={48} color="#16a34a" />
            </View>
            <Text style={styles.modalTitle}>¡Reclamo Registrado!</Text>
            <Text style={styles.modalMessage}>
              Hemos recepcionado tu incidencia de forma oficial. Tu código de seguimiento es:
            </Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{createdClaimCode}</Text>
            </View>

            <Text style={styles.modalSubmessage}>
              Nos pondremos en contacto contigo en un plazo no mayor a 15 días hábiles conforme a ley.
            </Text>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setCreatedClaimCode(null)}>
              <Text style={styles.closeModalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginHorizontal: 4,
  },
  tabBtnActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  tabBtnTextActive: {
    color: '#f07639',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  officialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  typeBoxActive: {
    borderColor: '#f07639',
    backgroundColor: '#fff7ed',
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 6,
  },
  typeTitleActive: {
    color: '#f07639',
  },
  typeDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f07639',
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 16,
    marginBottom: 40,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  claimCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  claimCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  claimType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  claimDetalle: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 10,
  },
  claimFecha: {
    fontSize: 11,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  successIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  codeBox: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f07639',
    letterSpacing: 1,
  },
  modalSubmessage: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeModalBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
