import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  BusSeatSelection: undefined;
  PassengerForm: { tripId: string; selectedSeats: any[]; price: number; guestToken: string };
  Payment: { tripId: string; asientosPasajeros: any[]; amount: number; guestToken: string };
};

type PassengerFormScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PassengerForm'>;
type PassengerFormScreenRouteProp = RouteProp<RootStackParamList, 'PassengerForm'>;

interface Props {
  navigation: PassengerFormScreenNavigationProp;
  route: PassengerFormScreenRouteProp;
}

interface PasajeroInput {
  seatId: string;
  numero_asiento: number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
}

// Componente de Input con Etiqueta Flotante y Errores
interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
}

function FloatingLabelInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'none',
  error
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelColor = error ? '#ef4444' : isFocused ? '#f07639' : '#94a3b8';

  const labelStyle = {
    position: 'absolute' as const,
    left: 14,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, -10],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 12],
    }),
    color: labelColor,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    zIndex: 1,
    fontWeight: '600' as const,
  };

  return (
    <View style={styles.inputContainer}>
      <Animated.Text style={labelStyle}>
        {label}
      </Animated.Text>
      <TextInput
        style={[
          styles.textInput,
          isFocused && { borderColor: '#f07639', borderWidth: 1.5 },
          error && { borderColor: '#ef4444', borderWidth: 1.5 }
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

export default function PassengerFormScreen({ navigation, route }: Props) {
  const { tripId, selectedSeats, price, guestToken } = route.params;

  const [passengers, setPassengers] = useState<PasajeroInput[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estado para capturar errores de validación por pasajero e input index
  // Estructura: { [passengerIndex]: { nombres?: string, apellidos?: string, dni?: string, telefono?: string } }
  const [errors, setErrors] = useState<any>({});

  // Inicializar formularios de pasajeros e intentar auto-rellenar el primero con los datos del usuario logueado
  useEffect(() => {
    const init = async () => {
      let storedUserParsed: any = null;
      try {
        const storedUser = await AsyncStorage.getItem('@user_data');
        if (storedUser) {
          storedUserParsed = JSON.parse(storedUser);
          setCurrentUser(storedUserParsed);
        }
      } catch (e) {}

      const initialPassengers = selectedSeats.map((seat, index) => {
        // Auto-rellenar el primer pasajero con los datos de la cuenta activa si existen
        if (index === 0 && storedUserParsed) {
          const fullName = storedUserParsed.nombres || '';
          const nameParts = fullName.trim().split(/\s+/);
          const first = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(" ");
          const last = nameParts.slice(Math.ceil(nameParts.length / 2)).join(" ") || "-";

          return {
            seatId: seat.id,
            numero_asiento: seat.numero_asiento,
            nombres: first,
            apellidos: last,
            dni: storedUserParsed.dni || '',
            telefono: '',
          };
        }

        return {
          seatId: seat.id,
          numero_asiento: seat.numero_asiento,
          nombres: '',
          apellidos: '',
          dni: '',
          telefono: '',
        };
      });

      setPassengers(initialPassengers);
    };

    init();
  }, [selectedSeats]);

  const handleInputChange = (index: number, field: keyof PasajeroInput, value: string) => {
    setPassengers(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });

    // Limpiar el error de este campo al escribir
    setErrors((prev: any) => {
      const updated = { ...prev };
      if (updated[index]) {
        delete updated[index][field];
      }
      return updated;
    });
  };

  const handleContinue = () => {
    const newErrors: any = {};
    let hasValidationError = false;

    // 1. Validar todos los campos locales
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const passengerErrors: any = {};

      if (!p.nombres.trim()) {
        passengerErrors.nombres = 'El nombre es obligatorio.';
      } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(p.nombres.trim())) {
        passengerErrors.nombres = 'Solo se permiten letras.';
      }

      if (!p.apellidos.trim()) {
        passengerErrors.apellidos = 'Los apellidos son obligatorios.';
      } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(p.apellidos.trim())) {
        passengerErrors.apellidos = 'Solo se permiten letras.';
      }

      if (!p.dni.trim()) {
        passengerErrors.dni = 'El DNI es obligatorio.';
      } else if (!/^\d{8}$/.test(p.dni)) {
        passengerErrors.dni = 'Debe tener exactamente 8 números.';
      }

      if (p.telefono && !/^\d{9}$/.test(p.telefono)) {
        passengerErrors.telefono = 'Debe tener exactamente 9 números.';
      }

      if (Object.keys(passengerErrors).length > 0) {
        newErrors[i] = passengerErrors;
        hasValidationError = true;
      }
    }

    if (hasValidationError) {
      setErrors(newErrors);
      Alert.alert('Datos inválidos', 'Por favor corrige los campos marcados en rojo antes de continuar.');
      return;
    }

    // 2. Mapear al formato esperado por el backend
    const asientosPasajeros = passengers.map(p => ({
      seatId: p.seatId,
      pasajeroData: {
        nombres: p.nombres.trim(),
        apellidos: p.apellidos.trim(),
        dni: p.dni.trim(),
        telefono: p.telefono ? p.telefono.trim() : undefined
      }
    }));

    const amount = price * selectedSeats.length;

    navigation.navigate('Payment', {
      tripId,
      asientosPasajeros,
      amount,
      guestToken
    });
  };

  const formatPrice = (p: number) => {
    return p.toFixed(2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Datos de Pasajeros</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {passengers.map((passenger, index) => {
            const pErrors = errors[index] || {};

            return (
              <View key={passenger.seatId} style={styles.passengerCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person-outline" size={20} color="#f07639" />
                  <Text style={styles.cardTitle}>
                    Pasajero {index + 1} - Asiento {passenger.numero_asiento}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <FloatingLabelInput
                    label="Nombres"
                    value={passenger.nombres}
                    onChangeText={(val) => handleInputChange(index, 'nombres', val)}
                    autoCapitalize="words"
                    error={pErrors.nombres}
                  />

                  <FloatingLabelInput
                    label="Apellidos"
                    value={passenger.apellidos}
                    onChangeText={(val) => handleInputChange(index, 'apellidos', val)}
                    autoCapitalize="words"
                    error={pErrors.apellidos}
                  />

                  <FloatingLabelInput
                    label="DNI"
                    value={passenger.dni}
                    onChangeText={(val) => handleInputChange(index, 'dni', val)}
                    keyboardType="numeric"
                    maxLength={8}
                    error={pErrors.dni}
                  />

                  <FloatingLabelInput
                    label="Celular"
                    value={passenger.telefono}
                    onChangeText={(val) => handleInputChange(index, 'telefono', val)}
                    keyboardType="phone-pad"
                    maxLength={9}
                    error={pErrors.telefono}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* BOTTOM ACCION */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>Total a Pagar</Text>
            <Text style={styles.footerPrice}>S/ {formatPrice(price * selectedSeats.length)}</Text>
          </View>
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Ir a Pagar</Text>
            <Ionicons name="card-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  passengerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 2,
    paddingTop: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 8,
  },
  cardBody: {},
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 16,
    paddingTop: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#334155',
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 6,
    fontWeight: '600',
  },
  footer: {
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
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
  },
  continueBtn: {
    backgroundColor: '#f07639',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  }
});
