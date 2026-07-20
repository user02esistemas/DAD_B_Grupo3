import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type RootStackParamList = {
  ClienteDashboard: undefined;
  BusSeatSelection: { tripId: string; price: number; busDetails: any };
  PassengerForm: { tripId: string; selectedSeats: any[]; price: number; guestToken: string };
};

type BusSeatSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BusSeatSelection'>;
type BusSeatSelectionScreenRouteProp = RouteProp<RootStackParamList, 'BusSeatSelection'>;

interface Props {
  navigation: BusSeatSelectionScreenNavigationProp;
  route: BusSeatSelectionScreenRouteProp;
}

export default function BusSeatSelectionScreen({ navigation, route }: Props) {
  const { tripId, price, busDetails } = route.params;

  const [seats, setSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user_data');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setUserEmail(u.correo);
        }
      } catch (e) {}
    };
    fetchUser();
    loadSeats();
  }, []);

  async function loadSeats() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/movil/viajes/asientos?tripId=${tripId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setSeats(data.seats);
      } else {
        Alert.alert('Error', data.error || 'No se pudieron cargar los asientos.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  }

  const handleSelectSeat = (seat: any) => {
    if (seat.estado !== 'disponible') return;

    const isSelected = selectedSeats.some(s => s.id === seat.id);

    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 6) {
        Alert.alert('Límite alcanzado', 'No puedes reservar más de 6 asientos por compra.');
        return;
      }
      setSelectedSeats(prev => [...prev, seat]);
    }
  };

  const handleConfirm = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Selecciona asientos', 'Por favor selecciona al menos un asiento.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const response = await fetch(`${API_URL}/api/movil/viajes/asientos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          seatIds: selectedSeats.map(s => s.id.toString()),
          email: userEmail || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        navigation.navigate('PassengerForm', {
          tripId,
          selectedSeats: selectedSeats.map(s => ({
            id: s.id.toString(),
            numero_asiento: s.numero_asiento,
            piso: s.piso
          })),
          price: price,
          guestToken: data.guestToken
        });
      } else {
        Alert.alert('Reserva fallida', data.error || 'No se pudo bloquear los asientos.');
        loadSeats(); // Recargar mapa
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Problema al procesar el bloqueo de asientos.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar asientos por piso activo
  const floorSeats = seats.filter(s => s.piso === activeFloor);

  // Agrupar los asientos en filas de 4 (asumiendo distribución clásica de bus: 2 a la izquierda, pasillo, 2 a la derecha)
  const renderSeatRows = () => {
    const rows = [];
    const seatsPerRow = 4;
    for (let i = 0; i < floorSeats.length; i += seatsPerRow) {
      rows.push(floorSeats.slice(i, i + seatsPerRow));
    }

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.seatRow}>
        {/* Asiento 1 y 2 (Izquierda) */}
        <View style={styles.seatPair}>
          {row[0] && renderSeatButton(row[0])}
          {row[1] && renderSeatButton(row[1])}
        </View>

        {/* Pasillo (Espacio) */}
        <View style={styles.aisleSpace} />

        {/* Asiento 3 y 4 (Derecha) */}
        <View style={styles.seatPair}>
          {row[2] && renderSeatButton(row[2])}
          {row[3] && renderSeatButton(row[3])}
        </View>
      </View>
    ));
  };

  const renderSeatButton = (seat: any) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    let seatColor = '#e2e8f0'; // Disponible (gris/verde suave)
    let textColor = '#334155';
    let borderColor = '#cbd5e1';

    if (seat.estado !== 'disponible') {
      seatColor = '#fee2e2'; // Ocupado/Vendido (rojo claro)
      textColor = '#ef4444';
      borderColor = '#fca5a5';
    } else if (isSelected) {
      seatColor = '#ffedd5'; // Seleccionado (naranja claro)
      textColor = '#f07639';
      borderColor = '#fdba74';
    }

    return (
      <TouchableOpacity
        key={seat.id}
        style={[
          styles.seatButton,
          { backgroundColor: seatColor, borderColor: borderColor },
          seat.estado !== 'disponible' && styles.disabledSeat
        ]}
        onPress={() => handleSelectSeat(seat)}
        disabled={seat.estado !== 'disponible'}
      >
        <Ionicons 
          name="ellipse" 
          size={8} 
          color={seat.estado !== 'disponible' ? '#ef4444' : isSelected ? '#f07639' : '#94a3b8'} 
          style={{ marginBottom: 2 }}
        />
        <Text style={[styles.seatText, { color: textColor }]}>
          {seat.numero_asiento}
        </Text>
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
        <Text style={styles.headerTitle}>Selecciona Asientos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* PISOS TABS (Solo si el bus tiene 2 pisos) */}
      {busDetails.pisos === 2 && (
        <View style={styles.floorTabs}>
          <TouchableOpacity
            style={[styles.floorTab, activeFloor === 1 && styles.activeFloorTab]}
            onPress={() => setActiveFloor(1)}
          >
            <Text style={[styles.floorTabText, activeFloor === 1 && styles.activeFloorTabText]}>Piso 1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floorTab, activeFloor === 2 && styles.activeFloorTab]}
            onPress={() => setActiveFloor(2)}
          >
            <Text style={[styles.floorTabText, activeFloor === 2 && styles.activeFloorTabText]}>Piso 2</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DETALLES DE REFERENCIA */}
      <View style={styles.referenceContainer}>
        <View style={styles.refItem}>
          <View style={[styles.refBox, { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' }]} />
          <Text style={styles.refLabel}>Libre</Text>
        </View>
        <View style={styles.refItem}>
          <View style={[styles.refBox, { backgroundColor: '#ffedd5', borderColor: '#fdba74' }]} />
          <Text style={styles.refLabel}>Elegido</Text>
        </View>
        <View style={styles.refItem}>
          <View style={[styles.refBox, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]} />
          <Text style={styles.refLabel}>Ocupado</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f07639" />
          <Text style={styles.loadingText}>Cargando mapa de asientos...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.busScroll} showsVerticalScrollIndicator={false}>
            {/* VOLANTE DE REFERENCIA (FRENTE DEL BUS) */}
            <View style={styles.busFront}>
              <View style={styles.steeringWheel}>
                <Ionicons name="cog-outline" size={24} color="#94a3b8" />
              </View>
              <Text style={styles.busFrontText}>Frente del Bus</Text>
            </View>

            {/* GRILLA DE ASIENTOS */}
            <View style={styles.seatsGrid}>
              {renderSeatRows()}
            </View>
          </ScrollView>

          {/* RESUMEN INFERIOR */}
          <View style={styles.checkoutFooter}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerLabel}>Asientos: {selectedSeats.map(s => s.numero_asiento).join(', ') || 'Ninguno'}</Text>
              <Text style={styles.footerPrice}>Total: S/ {(price * selectedSeats.length).toFixed(2)}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.confirmBtn, selectedSeats.length === 0 && styles.disabledConfirmBtn]} 
              onPress={handleConfirm}
              disabled={selectedSeats.length === 0}
            >
              <Text style={styles.confirmBtnText}>Reservar Asientos</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  floorTabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  floorTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFloorTab: {
    borderBottomColor: '#f07639',
  },
  floorTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeFloorTabText: {
    color: '#f07639',
    fontWeight: '700',
  },
  referenceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  refItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  refBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
  },
  refLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 10,
    fontWeight: '500',
  },
  busScroll: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 120,
  },
  busFront: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
  },
  steeringWheel: {
    marginRight: 10,
  },
  busFrontText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  seatsGrid: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seatPair: {
    flexDirection: 'row',
  },
  aisleSpace: {
    width: 32,
  },
  seatButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  disabledSeat: {
    opacity: 0.8,
  },
  seatText: {
    fontSize: 13,
    fontWeight: '800',
  },
  checkoutFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 6,
  },
  footerInfo: {
    flex: 1,
    marginRight: 16,
  },
  footerLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  footerPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  confirmBtn: {
    backgroundColor: '#f07639',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledConfirmBtn: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  }
});
