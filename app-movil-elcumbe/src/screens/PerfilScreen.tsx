import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function PerfilScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>Atrás</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Mi Perfil</Text>
      <Text style={styles.subtitle}>Pantalla en construcción...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', paddingTop: 60 },
  backButton: { marginBottom: 20 },
  backText: { color: '#f07639', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 10 }
});
