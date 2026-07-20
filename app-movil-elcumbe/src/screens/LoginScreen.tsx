import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type RootStackParamList = {
  Login: undefined;
  OperadorDashboard: undefined;
  ConductorDashboard: undefined;
  ClienteDashboard: undefined;
  Register: undefined;
};

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-login si ya existe token
  useEffect(() => {
    const checkToken = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user_data');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.rol === 'operador' || user.rol === 'operario') {
            navigation.replace('OperadorDashboard');
          } else if (user.rol === 'conductor') {
            navigation.replace('ConductorDashboard');
          } else if (user.rol === 'cliente') {
            navigation.replace('ClienteDashboard');
          }
        }
      } catch (e) {
        // Ignorar
      }
    };
    checkToken();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_URL}/api/movil/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await AsyncStorage.setItem('@auth_token', data.token);
        await AsyncStorage.setItem('@user_data', JSON.stringify(data.user));

        if (data.user.rol === 'operador' || data.user.rol === 'operario') {
          navigation.replace('OperadorDashboard');
        } else if (data.user.rol === 'conductor') {
          navigation.replace('ConductorDashboard');
        } else {
          // Clientes, Admins, Gerentes y Vendedores caen por defecto al panel general (ClienteDashboard)
          navigation.replace('ClienteDashboard');
        }
      } else {
        setErrorMsg(data.error || 'Credenciales incorrectas o acceso denegado.');
      }
    } catch (error) {
      setErrorMsg('Error de conexión. Verifica tu internet o la URL del servidor.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
        <ImageBackground 
          source={require('../../assets/images/banner.png')} 
          style={styles.banner}
        >
          <View style={styles.overlay} />
        </ImageBackground>

        <View style={styles.formContainer}>
          <View style={styles.loginBox}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            
            <Text style={styles.title}>Inicia Sesión</Text>
            <Text style={styles.subtitle}>Portal El Cumbe</Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Contraseña"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                 <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 20 }} 
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={{ color: '#f07639', fontWeight: '600', fontSize: 14 }}>
                ¿No tienes cuenta? Regístrate aquí
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  banner: {
    width: '100%',
    height: 250,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  formContainer: {
    flex: 1,
    marginTop: -50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  loginBox: {
    backgroundColor: '#ffffff',
    margin: 24,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
  },
  logoImage: {
    width: 120,
    height: 50,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#334155',
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#f07639',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
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
    width: '100%',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 14,
  },
});
