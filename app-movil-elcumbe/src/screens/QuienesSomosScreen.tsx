import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function QuienesSomosScreen({ navigation }: Props) {
  const terminals = [
    {
      city: 'Cajamarca',
      address: 'Av. Atahualpa N° 320 (Frente al C.C. El Quinde)',
      phone: '(076) 36-4510',
      hours: 'Lun - Dom: 06:00 AM - 10:30 PM'
    },
    {
      city: 'Trujillo',
      address: 'Av. América Sur N° 1420 (Terminal Terrestre El Cumbe)',
      phone: '(044) 28-9012',
      hours: 'Lun - Dom: 05:30 AM - 11:00 PM'
    },
    {
      city: 'Chiclayo',
      address: 'Av. Bolognesi N° 850 (Terminal Terrestre Central)',
      phone: '(074) 23-1190',
      hours: 'Lun - Dom: 06:00 AM - 10:00 PM'
    },
    {
      city: 'Chimbote',
      address: 'Av. Víctor Raúl Haya de la Torre N° 400',
      phone: '(043) 32-8840',
      hours: 'Lun - Dom: 06:30 AM - 09:30 PM'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER NAVBAR */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Quiénes Somos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BRAND HERO CARD */}
        <View style={styles.heroCard}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.companyTitle}>Empresa de Transportes El Cumbe S.A.</Text>
          <Text style={styles.companySubtitle}>Conectando el norte del Perú con seguridad, comodidad y puntualidad desde 2012.</Text>
        </View>

        {/* MISIÓN Y VISIÓN */}
        <View style={styles.gridContainer}>
          <View style={styles.missionCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="rocket" size={24} color="#f07639" />
            </View>
            <Text style={styles.cardTitle}>Nuestra Misión</Text>
            <Text style={styles.cardText}>
              Brindar un servicio de transporte interprovincial de pasajeros y encomiendas seguro, puntual e innovador, garantizando la satisfacción total de nuestros clientes.
            </Text>
          </View>

          <View style={styles.missionCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="eye" size={24} color="#2563eb" />
            </View>
            <Text style={styles.cardTitle}>Nuestra Visión</Text>
            <Text style={styles.cardText}>
              Ser la empresa líder en transporte terrestre del norte peruano, reconocida por la excelencia tecnológica en flota, bioseguridad y atención al cliente.
            </Text>
          </View>
        </View>

        {/* FLOTA Y COMODIDADES */}
        <Text style={styles.sectionTitle}>Nuestra Flota y Comodidades</Text>
        <View style={styles.featuresCard}>
          <View style={styles.featureRow}>
            <Ionicons name="bus" size={20} color="#f07639" style={styles.featureIcon} />
            <Text style={styles.featureText}>Buses de 1 y 2 pisos (Volvo & Scania 2024)</Text>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureRow}>
            <Ionicons name="snow" size={20} color="#3b82f6" style={styles.featureIcon} />
            <Text style={styles.featureText}>Aire Acondicionado y Calefacción Climatizada</Text>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureRow}>
            <Ionicons name="flash" size={20} color="#eab308" style={styles.featureIcon} />
            <Text style={styles.featureText}>Asientos Reclinables a 140° y 160° con Cargadores USB</Text>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureRow}>
            <Ionicons name="wifi" size={20} color="#10b981" style={styles.featureIcon} />
            <Text style={styles.featureText}>Wi-Fi a bordo y Entretenimiento HD</Text>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureRow}>
            <Ionicons name="shield-checkmark" size={20} color="#6366f1" style={styles.featureIcon} />
            <Text style={styles.featureText}>Monitoreo por GPS 24/7 y Control de Velocidad</Text>
          </View>
        </View>

        {/* DIRECTORIO DE TERMINALES */}
        <Text style={styles.sectionTitle}>Directorio de Terminales</Text>
        {terminals.map((item, index) => (
          <View key={index} style={styles.terminalCard}>
            <View style={styles.terminalHeader}>
              <Ionicons name="location" size={20} color="#f07639" />
              <Text style={styles.terminalCity}>Terminal {item.city}</Text>
            </View>

            <Text style={styles.terminalAddress}>{item.address}</Text>

            <View style={styles.terminalRow}>
              <Ionicons name="call-outline" size={16} color="#64748b" />
              <Text style={styles.terminalText}>{item.phone}</Text>
            </View>

            <View style={styles.terminalRow}>
              <Ionicons name="time-outline" size={16} color="#64748b" />
              <Text style={styles.terminalText}>{item.hours}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  logoImage: {
    width: 64,
    height: 64,
    marginBottom: 12,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  companySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  gridContainer: {
    marginBottom: 20,
  },
  missionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  featuresCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  featureDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  terminalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  terminalCity: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 8,
  },
  terminalAddress: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
  },
  terminalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  terminalText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500',
  },
});
