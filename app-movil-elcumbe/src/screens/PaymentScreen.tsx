import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
// Usar la clave de Culqi desde las variables de entorno de Next/Expo o el fallback de desarrollo
const CULQI_PUBLIC_KEY = process.env.EXPO_PUBLIC_CULQI_PUBLIC_KEY || process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY || 'pk_test_lkYsEtGV030Goa3V';

type RootStackParamList = {
  PassengerForm: undefined;
  Payment: { tripId: string; asientosPasajeros: any[]; amount: number; guestToken: string };
  ClienteDashboard: undefined;
};

type PaymentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;

interface Props {
  navigation: PaymentScreenNavigationProp;
  route: PaymentScreenRouteProp;
}

export default function PaymentScreen({ navigation, route }: Props) {
  const { tripId, asientosPasajeros, amount, guestToken } = route.params;

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState(''); // MM/AA
  const [cvv, setCvv] = useState('');
  const [cardEmail, setCardEmail] = useState('');
  
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user_data');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setUserEmail(u.correo);
          setCardEmail(u.correo); // Auto-rellenar email de tarjeta con el del usuario
        }
      } catch (e) {}
    };
    fetchUser();
  }, []);

  const handlePay = async () => {
    // 1. Validaciones básicas locales
    if (!cardNumber || !expiry || !cvv || !cardEmail) {
      Alert.alert('Datos incompletos', 'Por favor ingresa todos los datos de tu tarjeta.');
      return;
    }

    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      Alert.alert('Tarjeta inválida', 'El número de tarjeta debe tener entre 13 y 19 dígitos.');
      return;
    }

    const expiryParts = expiry.split('/');
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      Alert.alert('Expiración inválida', 'La fecha de expiración debe tener el formato MM/AA (ej. 12/28).');
      return;
    }

    const month = parseInt(expiryParts[0], 10);
    const year = parseInt('20' + expiryParts[1], 10);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (month < 1 || month > 12) {
      Alert.alert('Expiración inválida', 'El mes de expiración debe ser entre 01 y 12.');
      return;
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      Alert.alert('Tarjeta expirada', 'La tarjeta ingresada ya ha vencido.');
      return;
    }

    if (cvv.length < 3 || cvv.length > 4) {
      Alert.alert('CVV inválido', 'El código CVV debe tener 3 o 4 dígitos.');
      return;
    }

    if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(cardEmail)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico de contacto válido.');
      return;
    }

    setLoading(true);

    try {
      // 2. Tokenizar la tarjeta con Culqi API directa
      console.log("Tokenizando tarjeta con llave pública:", CULQI_PUBLIC_KEY);
      const tokenResponse = await fetch('https://secure.culqi.com/v2/tokens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CULQI_PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_number: cleanCard,
          cvv: cvv,
          expiration_month: month,
          expiration_year: year,
          email: cardEmail,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Error tokenización Culqi:", tokenData);
        Alert.alert('Pago declinado', tokenData.user_message || 'Los datos de la tarjeta son incorrectos.');
        setLoading(false);
        return;
      }

      const tokenId = tokenData.id;
      console.log("Token generado con éxito:", tokenId);

      const token = await AsyncStorage.getItem('@auth_token');
      const response = await fetch(`${API_URL}/api/movil/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tokenId,
          viajeId: tripId,
          asientosPasajeros,
          amount,
          email: userEmail || null,
          guestToken
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          '¡Compra Exitosa!',
          'Tus pasajes han sido emitidos con éxito. Puedes verlos en la sección "Mis Boletos".',
          [
            { 
              text: 'Aceptar', 
              onPress: () => {
                // Redirigir al dashboard cliente y forzar recarga
                navigation.navigate('ClienteDashboard');
              } 
            }
          ]
        );
      } else {
        Alert.alert('Error en compra', data.error || 'No se pudo completar el registro del pasaje.');
      }

    } catch (e) {
      console.error(e);
      Alert.alert('Error de conexión', 'No se pudo establecer comunicación con los servidores de pago.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardNumberChange = (text: string) => {
    // Formatear agrupando de 4 en 4 dígitos
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/.{1,4}/g);
    setCardNumber(match ? match.join(' ') : cleaned);
  };

  const handleExpiryChange = (text: string) => {
    // Formatear como MM/AA
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setExpiry(cleaned);
    }
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
          <Text style={styles.headerTitle}>Método de Pago</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.paymentBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#10b981" />
            <Text style={styles.paymentBadgeText}>Pago 100% seguro encriptado vía Culqi</Text>
          </View>

          {/* TARJETA DE CRÉDITO VISUAL DE REFERENCIA */}
          <View style={styles.creditCardVisual}>
            <Text style={styles.cardBrand}>VISA / MASTERCARD</Text>
            <Text style={styles.visualNumber}>
              {cardNumber || '•••• •••• •••• ••••'}
            </Text>
            <View style={styles.visualRow}>
              <View>
                <Text style={styles.visualLabel}>EXPIRACIÓN</Text>
                <Text style={styles.visualValue}>{expiry || 'MM/AA'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.visualLabel}>CVV</Text>
                <Text style={styles.visualValue}>{cvv || '•••'}</Text>
              </View>
            </View>
          </View>

          {/* FORMULARIO */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Número de Tarjeta</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.inputInside}
                placeholder="4111 1111 1111 1111"
                placeholderTextColor="#94a3b8"
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>Expiración (MM/AA)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputInside}
                    placeholder="12/28"
                    placeholderTextColor="#94a3b8"
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>Código CVV</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputInside}
                    placeholder="123"
                    placeholderTextColor="#94a3b8"
                    value={cvv}
                    onChangeText={setCvv}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Correo de Contacto</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.inputInside}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#94a3b8"
                value={cardEmail}
                onChangeText={setCardEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </ScrollView>

        {/* FOOTER COBRO */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>Monto total a pagar</Text>
            <Text style={styles.footerPrice}>S/ {formatPrice(amount)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.payBtn, loading && styles.disabledPayBtn]} 
            onPress={handlePay}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.payBtnText}>Confirmar Pago</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </>
            )}
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
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
  },
  paymentBadgeText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  creditCardVisual: {
    backgroundColor: '#1e293b', // slate-800
    borderRadius: 24,
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  cardBrand: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  visualNumber: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 10,
  },
  visualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visualLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  visualValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputInside: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#334155',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
  },
  payBtn: {
    backgroundColor: '#10b981', // Verde éxito
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledPayBtn: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  payBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  }
});
