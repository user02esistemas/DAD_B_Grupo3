import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function AyudaScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('1');

  const faqs: FAQItem[] = [
    {
      id: '1',
      category: 'Pasajes',
      question: '¿Cómo realizo la compra de mi pasaje en la app?',
      answer: 'Ingresa a la pestaña "Inicio", selecciona tu ciudad de origen, destino y fecha. Escoge la salida disponible, selecciona tus asientos en el croquis interactivo y completa los datos del pasajero para realizar el pago seguro con tarjeta.'
    },
    {
      id: '2',
      category: 'Pasajes',
      question: '¿Cómo presento mi boleto al momento de abordar?',
      answer: 'Dirígete a la pestaña "Mis Boletos" en la app y presiona tu pasaje activo para mostrar el código QR. El conductor u operario escaneará tu pantalla al abordar el bus.'
    },
    {
      id: '3',
      category: 'Encomiendas',
      question: '¿Cómo puedo rastrear mi encomienda?',
      answer: 'En la pestaña "Encomiendas" podrás ver el historial completo de tus envíos y su estado en tiempo real (Recepcionado, En Camino o Entregado). También puedes consultar por tu código de seguimiento.'
    },
    {
      id: '4',
      category: 'Equipaje',
      question: '¿Cuál es el límite de equipaje permitido por pasajero?',
      answer: 'Cada pasajero tiene derecho a transportar hasta 20 Kg de equipaje sin costo en la bodega del bus, además de un bolso de mano personal que quepa en los compartimentos superiores.'
    },
    {
      id: '5',
      category: 'Políticas',
      question: '¿Puedo reprogramar o anular mi pasaje?',
      answer: 'Sí, la reprogramación o postergación se solicita con al menos 24 horas de anticipación a la partida del viaje presentando tu DNI en cualquiera de nuestras agencias o mediante atención al cliente.'
    },
    {
      id: '6',
      category: 'Menores',
      question: '¿Qué documentos necesitan los menores de edad para viajar?',
      answer: 'Todo menor de edad debe viajar portando su DNI físico. Si viaja sin la compañía de sus padres, debe presentar un Permiso Notarial de Viaje firmado conforme a la ley peruana.'
    }
  ];

  const filteredFaqs = faqs.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenPhone = () => {
    Linking.openURL('tel:076364510').catch(() => {
      Alert.alert('Contacto', 'Central Telefónica: (076) 36-4510');
    });
  };

  const handleOpenWhatsApp = () => {
    const phone = '51987654321';
    const msg = encodeURIComponent('Hola El Cumbe, necesito ayuda con mi consulta.');
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`).catch(() => {
      Alert.alert('WhatsApp', 'Número de atención: +51 987 654 321');
    });
  };

  const handleOpenEmail = () => {
    Linking.openURL('mailto:atencion@elcumbe.com').catch(() => {
      Alert.alert('Correo', 'Contacto: atencion@elcumbe.com');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER NAVBAR */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Centro de Ayuda</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO BUSCADOR */}
        <View style={styles.searchHeroCard}>
          <Text style={styles.heroTitle}>¿En qué te podemos ayudar?</Text>
          <Text style={styles.heroSubtitle}>Encuentra respuestas rápidas a tus dudas o comunícate con nosotros.</Text>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar pregunta o tema..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CANALES DE CONTACTO RÁPIDO */}
        <Text style={styles.sectionTitle}>Canales de Atención Directa</Text>
        <View style={styles.contactContainer}>
          <TouchableOpacity style={styles.contactCard} onPress={handleOpenWhatsApp}>
            <View style={[styles.contactIconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#16a34a" />
            </View>
            <Text style={styles.contactTitle}>WhatsApp</Text>
            <Text style={styles.contactValue}>Atención Inmediata</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleOpenPhone}>
            <View style={[styles.contactIconCircle, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="call" size={24} color="#f07639" />
            </View>
            <Text style={styles.contactTitle}>Central</Text>
            <Text style={styles.contactValue}>(076) 36-4510</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleOpenEmail}>
            <View style={[styles.contactIconCircle, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="mail" size={24} color="#2563eb" />
            </View>
            <Text style={styles.contactTitle}>Soporte</Text>
            <Text style={styles.contactValue}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* PREGUNTAS FRECUENTES (ACORDEÓN) */}
        <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>

        {filteredFaqs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="help-circle-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No se encontraron preguntas que coincidan con tu búsqueda.</Text>
          </View>
        ) : (
          filteredFaqs.map(item => {
            const isExpanded = expandedId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={isExpanded ? '#f07639' : '#94a3b8'}
                  />
                </View>

                {isExpanded && (
                  <View style={styles.faqBody}>
                    <View style={styles.faqDivider} />
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
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
  searchHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  contactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  contactCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  faqCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  faqCardExpanded: {
    borderColor: '#fed7aa',
    backgroundColor: '#ffffff',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    paddingRight: 12,
    lineHeight: 20,
  },
  faqBody: {
    marginTop: 10,
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
  },
});
