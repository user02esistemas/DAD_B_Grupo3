import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  Platform
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
  BusSeatSelection: { tripId: string; price: number; busDetails: any };
};

type ClienteDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ClienteDashboard'>;

interface Props {
  navigation: ClienteDashboardNavigationProp;
}

export default function ClienteDashboardScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'buscar' | 'boletos' | 'encomiendas'>('buscar');
  const [user, setUser] = useState<any>(null);
  const [originalRole, setOriginalRole] = useState<string>('cliente');

  // Sucursales y búsqueda
  const [locations, setLocations] = useState<any[]>([]);
  const [origin, setOrigin] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Modals de selección
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Resultados
  const [trips, setTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Boletos
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  // Encomiendas
  const [encomiendas, setEncomiendas] = useState<any[]>([]);
  const [loadingEncomiendas, setLoadingEncomiendas] = useState(false);
  const [selectedEncomienda, setSelectedEncomienda] = useState<any>(null);

  // Cargar usuario y ubicaciones
  useEffect(() => {
    const init = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user_data');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setOriginalRole(parsed.rol);
        }

        // Cargar ubicaciones
        const response = await fetch(`${API_URL}/api/movil/viajes?type=locations`);
        const data = await response.json();
        if (response.ok && data.success) {
          setLocations(data.locations);
        }
      } catch (e) {
        console.error(e);
      }
    };
    init();

    // Establecer fecha por defecto (hoy) en formato AAAA-MM-DD
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setSelectedDate(formattedDate);
  }, []);

  // Recargar datos si cambiamos de pestaña
  useEffect(() => {
    if (activeTab === 'boletos' && user?.correo) {
      loadTickets();
    } else if (activeTab === 'encomiendas' && user?.correo) {
      loadEncomiendas();
    }
  }, [activeTab, user]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await fetch(`${API_URL}/api/movil/compras?email=${user.correo}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setTickets(data.tickets);
      } else {
        Alert.alert('Error', data.error || 'No se pudieron obtener tus pasajes.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Problema al conectar con el servidor.');
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadEncomiendas = async () => {
    setLoadingEncomiendas(true);
    try {
      const response = await fetch(`${API_URL}/api/movil/compras?email=${user.correo}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setEncomiendas(data.encomiendas || []);
      } else {
        Alert.alert('Error', data.error || 'No se pudieron obtener tus encomiendas.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Problema al conectar con el servidor.');
    } finally {
      setLoadingEncomiendas(false);
    }
  };

  const handleSearch = async () => {
    if (!origin) {
      Alert.alert('Faltan datos', 'Por favor selecciona el origen de tu viaje.');
      return;
    }
    if (!destination) {
      Alert.alert('Faltan datos', 'Por favor selecciona el destino de tu viaje.');
      return;
    }
    if (origin.id === destination.id) {
      Alert.alert('Ubicación inválida', 'El origen y el destino no pueden ser iguales.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Faltan datos', 'Por favor ingresa la fecha.');
      return;
    }

    setLoadingTrips(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `${API_URL}/api/movil/viajes?originId=${origin.id}&destinationId=${destination.id}&date=${selectedDate}`
      );
      const data = await response.json();
      if (response.ok && data.success) {
        setTrips(data.trips);
      } else {
        Alert.alert('Error', data.error || 'Ocurrió un error al buscar viajes.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@auth_token');
    await AsyncStorage.removeItem('@user_data');
    navigation.replace('Login');
  };

  const handleReturnToStaff = () => {
    if (originalRole === 'conductor') {
      navigation.replace('ConductorDashboard');
    } else if (originalRole === 'operador' || originalRole === 'operario') {
      navigation.replace('OperadorDashboard');
    }
  };

  // Generar fechas para el selector simple (hoy y los próximos 7 días)
  const getDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Hoy' : d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      dates.push({ dateString, label });
    }
    return dates;
  };

  const formatPrice = (price: any) => {
    return Number(price).toFixed(2);
  };

  const formatTime = (time: string) => {
    try {
      // El formato que devuelve departure_time_formatted es ej: "08:00 PM" o similar
      return time || 'Ver detalle';
    } catch (e) {
      return time;
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* BANNER DE RETORNO A MODO STAFF */}
      {originalRole !== 'cliente' && (
        <TouchableOpacity style={styles.staffBanner} onPress={handleReturnToStaff}>
          <Ionicons name="construct" size={16} color="#ffffff" />
          <Text style={styles.staffBannerText}>
            Modo Cliente Activo. Presiona aquí para volver al panel de {originalRole.toUpperCase()}.
          </Text>
        </TouchableOpacity>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerProfileInfo}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.headerLogo} 
            resizeMode="contain" 
          />
          <View>
            <Text style={styles.greetingText}>Hola, {user ? user.nombres.split(' ')[0] : 'Pasajero'}</Text>
            <Text style={styles.roleText}>Pasajero El Cumbe</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* TABS SELECTOR */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'buscar' && styles.activeTab]}
          onPress={() => setActiveTab('buscar')}
        >
          <Ionicons name="search" size={18} color={activeTab === 'buscar' ? '#f07639' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'buscar' && styles.activeTabText]}>Buscar Viaje</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'boletos' && styles.activeTab]}
          onPress={() => setActiveTab('boletos')}
        >
          <Ionicons name="ticket" size={18} color={activeTab === 'boletos' ? '#f07639' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'boletos' && styles.activeTabText]}>Boletos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'encomiendas' && styles.activeTab]}
          onPress={() => setActiveTab('encomiendas')}
        >
          <Ionicons name="cube" size={18} color={activeTab === 'encomiendas' ? '#f07639' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'encomiendas' && styles.activeTabText]}>Encomiendas</Text>
        </TouchableOpacity>
      </View>

      {/* TAB CONTENT: BUSCAR */}
      {activeTab === 'buscar' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.searchCard}>
            <Text style={styles.searchCardTitle}>Reserva tu Pasaje</Text>

            {/* Selector de Origen */}
            <TouchableOpacity style={styles.selectorField} onPress={() => setShowOriginModal(true)}>
              <View style={styles.selectorIconWrapper}>
                <Ionicons name="location-outline" size={22} color="#f07639" />
              </View>
              <View>
                <Text style={styles.selectorLabel}>Origen</Text>
                <Text style={styles.selectorValue}>
                  {origin ? origin.nombre : '¿Desde dónde viajas?'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Selector de Destino */}
            <TouchableOpacity style={styles.selectorField} onPress={() => setShowDestinationModal(true)}>
              <View style={styles.selectorIconWrapper}>
                <Ionicons name="flag-outline" size={22} color="#10b981" />
              </View>
              <View>
                <Text style={styles.selectorLabel}>Destino</Text>
                <Text style={styles.selectorValue}>
                  {destination ? destination.nombre : '¿A dónde quieres ir?'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Selector de Fecha */}
            <TouchableOpacity style={styles.selectorField} onPress={() => setShowDatePickerModal(true)}>
              <View style={styles.selectorIconWrapper}>
                <Ionicons name="calendar-outline" size={22} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.selectorLabel}>Fecha de Salida</Text>
                <Text style={styles.selectorValue}>
                  {selectedDate ? formatDateLabel(selectedDate) : 'Selecciona fecha'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>Buscar Salidas</Text>
            </TouchableOpacity>
          </View>

          {/* LISTA DE RESULTADOS */}
          {hasSearched && (
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Salidas disponibles</Text>

              {loadingTrips ? (
                <ActivityIndicator color="#f07639" size="large" style={{ marginTop: 20 }} />
              ) : trips.length === 0 ? (
                <View style={styles.noResultsCard}>
                  <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
                  <Text style={styles.noResultsText}>No se encontraron salidas programadas para la ruta o fecha seleccionada.</Text>
                </View>
              ) : (
                trips.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.tripCard}
                    onPress={() => {
                      if (item.available_seats === 0) {
                        Alert.alert('Bus Completo', 'Ya no quedan asientos disponibles para este viaje.');
                        return;
                      }
                      navigation.navigate('BusSeatSelection', {
                        tripId: item.id.toString(),
                        price: Number(item.ruta.precio_base),
                        busDetails: item.bus
                      });
                    }}
                  >
                    <View style={styles.tripCardHeader}>
                      <View style={styles.tripTimeContainer}>
                        <Ionicons name="time" size={16} color="#f07639" />
                        <Text style={styles.tripTime}>{formatTime(item.departure_time_formatted)}</Text>
                      </View>
                      <Text style={styles.tripPrice}>S/ {formatPrice(item.ruta.precio_base)}</Text>
                    </View>

                    <View style={styles.tripCardDivider} />

                    <View style={styles.tripCardBody}>
                      <View style={styles.tripDetailRow}>
                        <Ionicons name="bus-outline" size={16} color="#64748b" />
                        <Text style={styles.tripDetailText}>
                          Bus {item.bus.placa} ({item.bus.pisos} piso{item.bus.pisos > 1 ? 's' : ''})
                        </Text>
                      </View>
                      <View style={styles.tripDetailRow}>
                        <Ionicons name="people-outline" size={16} color="#64748b" />
                        <Text style={styles.tripDetailText}>
                          {item.available_seats} asientos disponibles
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.tripActionBadge, item.available_seats === 0 && { backgroundColor: '#cbd5e1' }]}>
                      <Text style={styles.tripActionBadgeText}>
                        {item.available_seats > 0 ? 'Seleccionar Asientos' : 'Agotado'}
                      </Text>
                      {item.available_seats > 0 && <Ionicons name="chevron-forward" size={16} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB CONTENT: BOLETOS */}
      {activeTab === 'boletos' && (
        <View style={{ flex: 1, padding: 24 }}>
          <Text style={styles.sectionTitle}>Tus Boletos Electrónicos</Text>

          {loadingTickets ? (
            <ActivityIndicator color="#f07639" size="large" style={{ marginTop: 20 }} />
          ) : tickets.length === 0 ? (
            <View style={styles.noResultsCard}>
              <Ionicons name="ticket-outline" size={48} color="#94a3b8" />
              <Text style={styles.noResultsText}>No has realizado compras de pasajes aún.</Text>
            </View>
          ) : (
            <FlatList
              data={tickets}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.ticketCard}
                  onPress={() => setSelectedTicket(item)}
                >
                  <View style={styles.ticketCardLeft}>
                    <Ionicons name="qr-code-outline" size={36} color="#f07639" />
                  </View>
                  <View style={styles.ticketCardCenter}>
                    <Text style={styles.ticketRoute}>
                      {item.asiento_viaje.viaje.ruta.origen.nombre} ➔ {item.asiento_viaje.viaje.ruta.destino.nombre}
                    </Text>
                    <Text style={styles.ticketDate}>
                      Fecha: {new Date(item.asiento_viaje.viaje.fecha_salida).toLocaleDateString()}
                    </Text>
                    <Text style={styles.ticketSeat}>
                      Asiento: {item.asiento_viaje.numero_asiento} (Piso {item.asiento_viaje.piso})
                    </Text>
                  </View>
                  <View style={styles.ticketCardRight}>
                    {item.abordado ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#16a34a' }]}>Abordado</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: '#ffedd5' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#ea580c' }]}>Activo</Text>
                      </View>
                    )}
                    <Text style={styles.ticketCost}>S/ {formatPrice(item.precio)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* TAB CONTENT: ENCOMIENDAS */}
      {activeTab === 'encomiendas' && (
        <View style={{ flex: 1, padding: 24 }}>
          <Text style={styles.sectionTitle}>Tus Encomiendas</Text>

          {loadingEncomiendas ? (
            <ActivityIndicator color="#f07639" size="large" style={{ marginTop: 20 }} />
          ) : encomiendas.length === 0 ? (
            <View style={styles.noResultsCard}>
              <Ionicons name="cube-outline" size={48} color="#94a3b8" />
              <Text style={styles.noResultsText}>No tienes envíos de encomiendas registrados.</Text>
            </View>
          ) : (
            <FlatList
              data={encomiendas}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isRemitente = item.remitente.dni === user?.dni;
                let statusBg = '#ffedd5';
                let statusColor = '#ea580c';
                if (item.estado === 'entregado') {
                  statusBg = '#dcfce7';
                  statusColor = '#16a34a';
                } else if (item.estado === 'en_camino' || item.estado === 'en transito') {
                  statusBg = '#dbeafe';
                  statusColor = '#2563eb';
                }

                return (
                  <TouchableOpacity
                    style={styles.ticketCard}
                    onPress={() => setSelectedEncomienda(item)}
                  >
                    <View style={styles.ticketCardLeft}>
                      <Ionicons name="cube-outline" size={36} color="#f07639" />
                    </View>
                    <View style={styles.ticketCardCenter}>
                      <Text style={styles.ticketRoute}>
                        Cód: {item.codigo_seguimiento}
                      </Text>
                      <Text style={styles.ticketDate}>
                        {item.origen.nombre} ➔ {item.destino.nombre}
                      </Text>
                      <Text style={styles.ticketSeat}>
                        {isRemitente ? `Destinatario: ${item.destinatario.nombres}` : `Remitente: ${item.remitente.nombres}`}
                      </Text>
                    </View>
                    <View style={styles.ticketCardRight}>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor, textTransform: 'capitalize' }]}>{item.estado}</Text>
                      </View>
                      <Text style={styles.ticketCost}>S/ {formatPrice(item.precio)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* MODAL SELECCION ORIGEN */}
      <Modal visible={showOriginModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona Origen</Text>
              <TouchableOpacity onPress={() => setShowOriginModal(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={locations}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalListItem}
                  onPress={() => {
                    setOrigin(item);
                    setShowOriginModal(false);
                  }}
                >
                  <Ionicons name="location" size={18} color="#f07639" style={{ marginRight: 12 }} />
                  <Text style={styles.modalListItemText}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL SELECCION DESTINO */}
      <Modal visible={showDestinationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona Destino</Text>
              <TouchableOpacity onPress={() => setShowDestinationModal(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={locations}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalListItem}
                  onPress={() => {
                    setDestination(item);
                    setShowDestinationModal(false);
                  }}
                >
                  <Ionicons name="flag" size={18} color="#10b981" style={{ marginRight: 12 }} />
                  <Text style={styles.modalListItemText}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL SELECTOR FECHA SIMPLE */}
      <Modal visible={showDatePickerModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona Fecha</Text>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getDates()}
              keyExtractor={(item) => item.dateString}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalListItem, selectedDate === item.dateString && { backgroundColor: '#fff7ed' }]}
                  onPress={() => {
                    setSelectedDate(item.dateString);
                    setShowDatePickerModal(false);
                  }}
                >
                  <Ionicons 
                    name="calendar" 
                    size={18} 
                    color={selectedDate === item.dateString ? "#f07639" : "#64748b"} 
                    style={{ marginRight: 12 }} 
                  />
                  <Text style={[styles.modalListItemText, selectedDate === item.dateString && { color: '#f07639', fontWeight: '700' }]}>
                    {item.label} ({formatDateLabel(item.dateString)})
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL DETALLE DE BOLETO CON QR */}
      {selectedTicket && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.ticketModalContent}>
              <View style={styles.ticketModalHeader}>
                <Text style={styles.ticketModalTitle}>Boleto de Viaje</Text>
                <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                  <Ionicons name="close" size={26} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.ticketScroll} showsVerticalScrollIndicator={false}>
                {/* QR CODE */}
                <View style={styles.qrContainer}>
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${selectedTicket.codigo_qr}` }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrCodeValue}>{selectedTicket.codigo_qr}</Text>
                  <Text style={styles.qrDisclaimer}>Presenta este QR al abordar el bus</Text>
                </View>

                {/* TICKET DETAILS */}
                <View style={styles.ticketDetailsBox}>
                  <Text style={styles.detailsLabel}>PASAJERO</Text>
                  <Text style={styles.detailsValue}>{selectedTicket.nombres} {selectedTicket.apellidos}</Text>
                  <Text style={styles.detailsValueDni}>DNI: {selectedTicket.dni}</Text>
                  
                  <View style={styles.detailsDivider} />

                  <Text style={styles.detailsLabel}>RUTA</Text>
                  <Text style={styles.detailsValue}>
                    {selectedTicket.asiento_viaje.viaje.ruta.origen.nombre} ➔ {selectedTicket.asiento_viaje.viaje.ruta.destino.nombre}
                  </Text>

                  <View style={styles.detailsRow}>
                    <View style={{ width: '50%' }}>
                      <Text style={styles.detailsLabel}>FECHA</Text>
                      <Text style={styles.detailsValue}>
                        {new Date(selectedTicket.asiento_viaje.viaje.fecha_salida).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={{ width: '50%' }}>
                      <Text style={styles.detailsLabel}>HORA</Text>
                      <Text style={styles.detailsValue}>
                        {formatTime(selectedTicket.asiento_viaje.viaje.departure_time_formatted)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={{ width: '50%' }}>
                      <Text style={styles.detailsLabel}>ASIENTO</Text>
                      <Text style={styles.detailsValue}>N° {selectedTicket.asiento_viaje.numero_asiento}</Text>
                      <Text style={styles.detailsValueSub}>Piso {selectedTicket.asiento_viaje.piso}</Text>
                    </View>
                    <View style={{ width: '50%' }}>
                      <Text style={styles.detailsLabel}>PLACA BUS</Text>
                      <Text style={styles.detailsValue}>{selectedTicket.asiento_viaje.viaje.bus.placa}</Text>
                    </View>
                  </View>

                  <View style={styles.detailsDivider} />

                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>TOTAL PAGADO</Text>
                    <Text style={styles.priceValue}>S/ {formatPrice(selectedTicket.precio)}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL DETALLE DE ENCOMIENDA CON SEGUIMIENTO */}
      {selectedEncomienda && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.ticketModalContent}>
              <View style={styles.ticketModalHeader}>
                <Text style={styles.ticketModalTitle}>Detalle de Encomienda</Text>
                <TouchableOpacity onPress={() => setSelectedEncomienda(null)}>
                  <Ionicons name="close" size={26} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.ticketScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.qrContainer}>
                  <Ionicons name="cube" size={64} color="#f07639" />
                  <Text style={styles.qrCodeValue}>{selectedEncomienda.codigo_seguimiento}</Text>
                  <Text style={styles.qrDisclaimer}>Código de Seguimiento</Text>
                </View>

                <View style={styles.ticketDetailsBox}>
                  <Text style={styles.detailsLabel}>ESTADO DE ENVÍO</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{
                      backgroundColor: selectedEncomienda.estado === 'entregado' ? '#16a34a' : '#f07639',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8
                    }}>
                      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, textTransform: 'uppercase' }}>
                        {selectedEncomienda.estado}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsDivider} />

                  <Text style={styles.detailsLabel}>REMITENTE</Text>
                  <Text style={styles.detailsValue}>{selectedEncomienda.remitente.nombres} {selectedEncomienda.remitente.apellidos}</Text>
                  <Text style={styles.detailsValueDni}>DNI: {selectedEncomienda.remitente.dni}</Text>

                  <View style={styles.detailsDivider} />

                  <Text style={styles.detailsLabel}>DESTINATARIO</Text>
                  <Text style={styles.detailsValue}>{selectedEncomienda.destinatario.nombres} {selectedEncomienda.destinatario.apellidos}</Text>
                  <Text style={styles.detailsValueDni}>DNI: {selectedEncomienda.destinatario.dni}</Text>
                  
                  <View style={styles.detailsDivider} />

                  <Text style={styles.detailsLabel}>RUTA</Text>
                  <Text style={styles.detailsValue}>
                    {selectedEncomienda.origen.nombre} ➔ {selectedEncomienda.destino.nombre}
                  </Text>

                  <View style={styles.detailsRow}>
                    <View style={{ width: '50%' }}>
                      <Text style={styles.detailsLabel}>PESO</Text>
                      <Text style={styles.detailsValue}>{Number(selectedEncomienda.peso_kg).toFixed(1)} Kg</Text>
                    </View>
                    <View style={{ width: '50%' }}>
                      <Text style={styles.detailsLabel}>REGISTRO</Text>
                      <Text style={styles.detailsValue}>
                        {new Date(selectedEncomienda.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {selectedEncomienda.descripcion ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.detailsLabel}>DESCRIPCIÓN</Text>
                      <Text style={styles.detailsValueSub}>{selectedEncomienda.descripcion}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailsDivider} />

                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>COSTO DE ENVÍO</Text>
                    <Text style={styles.priceValue}>S/ {formatPrice(selectedEncomienda.precio)}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  staffBanner: {
    backgroundColor: '#1e293b',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  roleText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  logoutIcon: {
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#f07639',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#f07639',
  },
  tabContent: {
    flex: 1,
    padding: 24,
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  searchCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  selectorIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '700',
  },
  searchBtn: {
    backgroundColor: '#f07639',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#f07639',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  searchBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  resultsContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  noResultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  tripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.01,
    shadowRadius: 8,
    elevation: 1,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripTime: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 6,
  },
  tripPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  tripCardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  tripCardBody: {
    marginBottom: 14,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tripDetailText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
    fontWeight: '500',
  },
  tripActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f07639',
    borderRadius: 12,
    paddingVertical: 10,
  },
  tripActionBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ticketCardLeft: {
    padding: 10,
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    marginRight: 14,
  },
  ticketCardCenter: {
    flex: 1,
  },
  ticketRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  ticketDate: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  ticketSeat: {
    fontSize: 12,
    color: '#f07639',
    fontWeight: '600',
  },
  ticketCardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketCost: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalListItemText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '600',
  },
  ticketModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    height: '92%',
  },
  ticketModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  ticketModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  ticketScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrImage: {
    width: 180,
    height: 180,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 16,
  },
  qrCodeValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#f07639',
    marginTop: 14,
    letterSpacing: 1.5,
  },
  qrDisclaimer: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },
  ticketDetailsBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 20,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
    letterSpacing: 1,
  },
  detailsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  detailsValueDni: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  detailsValueSub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
  }
});
