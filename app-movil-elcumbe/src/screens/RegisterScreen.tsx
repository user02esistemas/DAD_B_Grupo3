import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  SafeAreaView,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type RootStackParamList = {
  Login: undefined;
  ClienteDashboard: undefined;
  Register: undefined;
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

// Función evaluadora de fortaleza de contraseña
function getPasswordStrength(pwd: string) {
  if (!pwd) return { score: 0, label: '', color: '#94a3b8' };
  let score = 0;
  
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 9) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  
  if (score <= 2) {
    return { score: 1, label: 'Débil', color: '#ef4444' };
  } else if (score <= 4) {
    return { score: 2, label: 'Media', color: '#eab308' };
  } else {
    return { score: 3, label: 'Alta', color: '#10b981' };
  }
}

// Componente reutilizable de Input con Etiqueta Flotante Premium, Ojo para contraseña y Manejo de Errores
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
  const [secure, setSecure] = useState(secureTextEntry);
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
      <View style={{ position: 'relative', width: '100%' }}>
        <TextInput
          style={[
            styles.textInput,
            isFocused && { borderColor: '#f07639', borderWidth: 1.5 },
            error && { borderColor: '#ef4444', borderWidth: 1.5 },
            secureTextEntry && { paddingRight: 48 } // Espacio para el ojito
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setSecure(!secure)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={error ? '#ef4444' : isFocused ? '#f07639' : '#64748b'}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

export default function RegisterScreen({ navigation }: Props) {
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [errors, setErrors] = useState<any>({});

  const handleRegister = async () => {
    setErrors({});
    setErrorMsg('');

    const newErrors: any = {};
    if (!nombres.trim()) {
      newErrors.nombres = 'El nombre es obligatorio.';
    } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(nombres.trim())) {
      newErrors.nombres = 'Solo se permiten letras en el nombre.';
    }

    if (!apellidos.trim()) {
      newErrors.apellidos = 'Los apellidos son obligatorios.';
    } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(apellidos.trim())) {
      newErrors.apellidos = 'Solo se permiten letras en los apellidos.';
    }

    if (!dni.trim()) {
      newErrors.dni = 'El DNI es obligatorio.';
    } else if (!/^\d{8}$/.test(dni)) {
      newErrors.dni = 'Debe tener exactamente 8 dígitos numéricos.';
    }

    if (telefono && !/^\d{9}$/.test(telefono)) {
      newErrors.telefono = 'Debe tener exactamente 9 dígitos numéricos.';
    }

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)) {
      newErrors.email = 'Ingresa un formato de correo electrónico válido.';
    }

    if (!password) {
      newErrors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Por favor confirma tu contraseña.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/movil/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombres,
          apellidos,
          correo: email,
          contrasena: password,
          dni,
          telefono: telefono || null
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const loginResponse = await fetch(`${API_URL}/api/movil/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ correo: email, contrasena: password }),
        });
        
        const loginData = await loginResponse.json();
        if (loginResponse.ok && loginData.success) {
          await AsyncStorage.setItem('@auth_token', loginData.token);
          await AsyncStorage.setItem('@user_data', JSON.stringify(loginData.user));
          navigation.replace('ClienteDashboard');
        } else {
          navigation.replace('Login');
        }
      } else {
        const errorText = data.error || 'Ocurrió un error al registrar el usuario.';
        if (errorText.toLowerCase().includes('dni')) {
          setErrors((prev: any) => ({ ...prev, dni: errorText }));
        } else if (errorText.toLowerCase().includes('correo') || errorText.toLowerCase().includes('email')) {
          setErrors((prev: any) => ({ ...prev, email: errorText }));
        } else {
          setErrorMsg(errorText);
        }
      }
    } catch (error) {
      setErrorMsg('Error de conexión. Verifica tu internet o la URL del servidor.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: string) => {
    setErrors((prev: any) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const strength = getPasswordStrength(password);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>Crea tu Cuenta</Text>
            <Text style={styles.subtitle}>Viaja cómodo y seguro con El Cumbe</Text>
          </View>

          <View style={styles.formCard}>
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <FloatingLabelInput
              label="Nombres"
              value={nombres}
              onChangeText={(val) => {
                setNombres(val);
                clearError('nombres');
              }}
              autoCapitalize="words"
              error={errors.nombres}
            />

            <FloatingLabelInput
              label="Apellidos"
              value={apellidos}
              onChangeText={(val) => {
                setApellidos(val);
                clearError('apellidos');
              }}
              autoCapitalize="words"
              error={errors.apellidos}
            />

            <FloatingLabelInput
              label="DNI"
              value={dni}
              onChangeText={(val) => {
                setDni(val);
                clearError('dni');
              }}
              keyboardType="numeric"
              maxLength={8}
              error={errors.dni}
            />

            <FloatingLabelInput
              label="Celular"
              value={telefono}
              onChangeText={(val) => {
                setTelefono(val);
                clearError('telefono');
              }}
              keyboardType="phone-pad"
              maxLength={9}
              error={errors.telefono}
            />

            <FloatingLabelInput
              label="Correo electrónico"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                clearError('email');
              }}
              keyboardType="email-address"
              error={errors.email}
            />

            <FloatingLabelInput
              label="Contraseña"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                clearError('password');
              }}
              secureTextEntry
              error={errors.password}
            />

            {/* Indicador de Fortaleza de Contraseña */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarRow}>
                  <View style={[styles.strengthSegment, strength.score >= 1 && { backgroundColor: strength.color }]} />
                  <View style={[styles.strengthSegment, strength.score >= 2 && { backgroundColor: strength.color }]} />
                  <View style={[styles.strengthSegment, strength.score >= 3 && { backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthLabelText, { color: strength.color }]}>
                  Seguridad de contraseña: <Text style={{ fontWeight: '800' }}>{strength.label}</Text>
                </Text>
              </View>
            )}

            <FloatingLabelInput
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={(val) => {
                setConfirmPassword(val);
                clearError('confirmPassword');
              }}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.registerButtonText}>Registrarse</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 20, alignItems: 'center' }} 
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={{ color: '#64748b', fontSize: 14 }}>
                ¿Ya tienes una cuenta? <Text style={{ color: '#f07639', fontWeight: '600' }}>Inicia Sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  logoImage: {
    width: 120,
    height: 50,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
    paddingTop: 32,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 20,
    paddingTop: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#334155',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 6,
    fontWeight: '600',
  },
  strengthContainer: {
    marginTop: -8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  strengthBarRow: {
    flexDirection: 'row',
    height: 5,
    gap: 6,
    marginBottom: 8,
  },
  strengthSegment: {
    flex: 1,
    height: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
  },
  strengthLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#f07639',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    textAlign: 'center',
    overflow: 'hidden',
    fontWeight: '500',
    fontSize: 14,
  }
});
