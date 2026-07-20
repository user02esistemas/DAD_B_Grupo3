"use client";

import { useState, useEffect, useRef } from "react";
import { updateEstadoViaje, registrarGasto, registrarOcurrenciaRuta, marcarAlertaLeida, eliminarGasto, eliminarBitacora, resolverIncidente } from "@/app/(admin)/actions/conductor";
import { ArrowLeft, MapPin, Bus, Clock, Box, Play, CheckCircle, Receipt, Wrench, AlertCircle, Wifi, WifiOff, Navigation, ClipboardList, Trash2, CheckSquare, Camera, Eye, Image, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Coordenadas fijas de paradas para geolocalización
type StopCoords = {
  lat: number;
  lng: number;
};

const STOP_COORDINATES: Record<string, StopCoords> = {
  "Jaén": { lat: -5.7088, lng: -78.8081 },
  "Chamaya": { lat: -5.7628, lng: -78.7478 },
  "Bagua Grande": { lat: -5.7562, lng: -78.4419 },
  "Olmos": { lat: -5.9849, lng: -79.7453 },
  "Chiclayo": { lat: -6.7714, lng: -79.8406 },
  
  "Trujillo": { lat: -8.1160, lng: -79.0300 },
  "Mocupe": { lat: -7.1481, lng: -79.6192 },
  "Guadalupe": { lat: -7.2483, lng: -79.4758 },
  "Pacasmayo": { lat: -7.4006, lng: -79.5714 },

  "Cajamarca": { lat: -7.1638, lng: -78.5003 },
  "Chilete": { lat: -7.2250, lng: -78.8475 },
  "Tembladera": { lat: -7.2536, lng: -79.1306 },
  "Ciudad de Dios": { lat: -7.3756, lng: -79.4128 },
  
  "Control A": { lat: -6.0000, lng: -79.0000 },
  "Control B": { lat: -6.3000, lng: -79.3000 },
};

// Fórmula del Semiverseno (Haversine) para calcular distancia en km
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function ViajeDetalleConductorClient({ viaje, conductorId }: { viaje: any, conductorId: number }) {
  const router = useRouter();
  const watchIdRef = useRef<number | null>(null);
  
  const [activeTab, setActiveTab] = useState("ruta");
  const [isUpdating, setIsUpdating] = useState(false);
  const [gastoForm, setGastoForm] = useState({ concepto: "", monto: "" });
  const [novedadForm, setNovedadForm] = useState({ tipo: "Tránsito", gravedad: "Baja", descripcion: "", retraso_minutos: "0" });

  // Estados de conexión offline y sincronización
  const [mounted, setMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  // Listas locales temporales (para modo offline)
  const [localGastos, setLocalGastos] = useState<any[]>([]);
  const [localNovedades, setLocalNovedades] = useState<any[]>([]);
  
  // Paradas completadas en la hoja de ruta
  const [completedStops, setCompletedStops] = useState<string[]>([]);

  // Estado y handler de notificaciones flotantes (Toasts/Nubesitas)
  const [toast, setToast] = useState<{
    mostrar: boolean;
    mensaje: string;
    tipo: "exito" | "error" | "advertencia" | "info";
  }>({
    mostrar: false,
    mensaje: "",
    tipo: "info",
  });

  const showToast = (mensaje: string, tipo: "exito" | "error" | "advertencia" | "info" = "info") => {
    setToast({ mostrar: true, mensaje, tipo });
  };

  // Mantener showAlert apuntando a showToast para compatibilidad con las llamadas del flujo
  const showAlert = (mensaje: string, tipo: "exito" | "error" | "advertencia" | "info" = "info") => {
    showToast(mensaje, tipo);
  };

  useEffect(() => {
    if (toast.mostrar) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, mostrar: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.mostrar]);

  // Estado y handler de confirmaciones personalizadas
  const [modalConfirmar, setModalConfirmar] = useState<{
    mostrar: boolean;
    mensaje: string;
    onConfirm: () => void;
  }>({
    mostrar: false,
    mensaje: "",
    onConfirm: () => {},
  });

  const showConfirm = (mensaje: string, callback: () => void) => {
    setModalConfirmar({
      mostrar: true,
      mensaje,
      onConfirm: () => {
        callback();
        setModalConfirmar(prev => ({ ...prev, mostrar: false }));
      }
    });
  };

  // Estados de ubicación GPS real
  const [currentCoords, setCurrentCoords] = useState<StopCoords | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"inactivo" | "activo" | "error">("inactivo");
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  // Estados para foto evidencia de gastos
  const [fotoBase64, setFotoBase64] = useState<string>("");
  const [novedadFotoBase64, setNovedadFotoBase64] = useState<string>("");
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  // Estados de carga de Google Maps
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const busMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  const formatDuracion = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}m`;
  };

  // Obtener paradas en base a la ruta
  const getParadas = (origen: string, destino: string) => {
    const o = origen.toLowerCase();
    const d = destino.toLowerCase();
    
    let listaParadas: string[] = [];

    if ((o.includes("jaén") && d.includes("chiclayo")) || (o.includes("chiclayo") && d.includes("jaén"))) {
      listaParadas = ["Jaén", "Chamaya", "Bagua Grande", "Olmos", "Chiclayo"];
    } else if ((o.includes("trujillo") && d.includes("chiclayo")) || (o.includes("chiclayo") && d.includes("trujillo"))) {
      listaParadas = ["Trujillo", "Mocupe", "Guadalupe", "Pacasmayo", "Chiclayo"];
    } else if ((o.includes("cajamarca") && d.includes("trujillo")) || (o.includes("trujillo") && d.includes("cajamarca"))) {
      listaParadas = ["Cajamarca", "Chilete", "Tembladera", "Ciudad de Dios", "Trujillo"];
    } else {
      return [origen, "Control A", "Control B", destino];
    }

    // Invertir el sentido de las paradas si el origen real corresponde al final de la ruta por defecto
    if (listaParadas.length > 0 && listaParadas[listaParadas.length - 1].toLowerCase().includes(o)) {
      listaParadas.reverse();
    }

    return listaParadas;
  };

  const paradas = getParadas(viaje.ruta.origen.nombre, viaje.ruta.destino.nombre);

  // Obtener pasajes válidos y estadísticas de abordaje reales
  const pasajes = viaje.asientos_viaje
    ? viaje.asientos_viaje.map((av: any) => av.pasaje).filter((p: any) => p !== null && p !== undefined)
    : [];

  const totalComprados = pasajes.length;
  const totalAbordados = pasajes.filter((p: any) => p.abordado).length;
  const totalPendientes = totalComprados - totalAbordados;

  // Desactivamos la carga de la API embebida de Google Maps para evitar el cartel de error comercial de Google.
  // En su lugar, el conductor utilizará el botón de lanzamiento a la app nativa y el progreso de paradas local.
  useEffect(() => {
    setGoogleMapsLoaded(false);
  }, []);

  // Monitorear automáticamente el estado de conexión a internet real del navegador
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      localStorage.setItem(`offline_mode_${viaje.id}`, "false");
      // Intentar sincronizar colas locales al recuperar cobertura
      const gQueue = JSON.parse(localStorage.getItem(`queued_gastos_${viaje.id}`) || "[]");
      const nQueue = JSON.parse(localStorage.getItem(`queued_novedades_${viaje.id}`) || "[]");
      if (gQueue.length > 0 || nQueue.length > 0) {
        handleSyncData(gQueue, nQueue);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      localStorage.setItem(`offline_mode_${viaje.id}`, "true");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Inicializar estado según el navegador
    if (!navigator.onLine) {
      setIsOffline(true);
      localStorage.setItem(`offline_mode_${viaje.id}`, "true");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [viaje.id]);

  // Inicializar estados desde localStorage en el cliente
  useEffect(() => {
    setMounted(true);
    
    // Cargar estado de simulación offline
    const offlineSaved = localStorage.getItem(`offline_mode_${viaje.id}`);
    if (offlineSaved === "true") {
      setIsOffline(true);
    }

    // Cargar gastos locales en cola
    const gastosSaved = localStorage.getItem(`queued_gastos_${viaje.id}`);
    if (gastosSaved) {
      setLocalGastos(JSON.parse(gastosSaved));
    }

    // Cargar novedades locales en cola
    const novedadesSaved = localStorage.getItem(`queued_novedades_${viaje.id}`);
    if (novedadesSaved) {
      setLocalNovedades(JSON.parse(novedadesSaved));
    }

    // Cargar progreso de paradas (o reiniciar si el viaje vuelve a estar programado)
    if (viaje.estado === "programado") {
      localStorage.removeItem(`completed_stops_${viaje.id}`);
      setCompletedStops([]);
    } else if (viaje.estado === "completado") {
      // Si el viaje ya está completado en base de datos, forzamos todas las paradas como completadas al 100%
      setCompletedStops(paradas);
      localStorage.setItem(`completed_stops_${viaje.id}`, JSON.stringify(paradas));
    } else {
      const paradasSaved = localStorage.getItem(`completed_stops_${viaje.id}`);
      if (paradasSaved) {
        setCompletedStops(JSON.parse(paradasSaved));
      }
    }

    // Si el viaje ya está en ruta, iniciar tracking GPS automáticamente
    if (viaje.estado === "en_ruta") {
      startGpsTracking();
    }

    return () => {
      stopGpsTracking();
    };
  }, [viaje.id, viaje.estado]);

  // Inicializar y dibujar mapa de Google Maps
  useEffect(() => {
    if (!googleMapsLoaded || isOffline || activeTab !== "ruta" || !mapContainerRef.current) return;

    const google = (window as any).google;

    // Crear instancia del mapa
    const map = new google.maps.Map(mapContainerRef.current, {
      zoom: 8,
      center: { lat: -6.2, lng: -79.2 }, // Centrado aproximado del norte del Perú
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    googleMapInstance.current = map;

    // Añadir capa de tráfico en tiempo real
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);

    // Configurar servicio de Direcciones de Google
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#f07639", // Línea naranja
        strokeWeight: 6,
      },
    });
    directionsRendererRef.current = directionsRenderer;

    const originPlace = `${viaje.ruta.origen.nombre}, Peru`;
    const destPlace = `${viaje.ruta.destino.nombre}, Peru`;

    // Intentar trazar ruta real de Google Maps
    directionsService.route(
      {
        origin: originPlace,
        destination: destPlace,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response: any, status: string) => {
        if (status === "OK") {
          directionsRenderer.setDirections(response);
          const leg = response.routes[0].legs[0];

          // Marcador Terminal de Salida (Verde)
          new google.maps.Marker({
            position: leg.start_location,
            map: map,
            title: `Terminal de Origen: ${viaje.ruta.origen.nombre}`,
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
            },
          });

          // Marcador Terminal de Destino (Rojo)
          new google.maps.Marker({
            position: leg.end_location,
            map: map,
            title: `Terminal de Llegada: ${viaje.ruta.destino.nombre}`,
            icon: {
              url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            },
          });
        } else {
          // FALLBACK: Si no hay API Key facturada, dibujar polilínea de paradas
          console.warn("Directions failed, using polyline fallback:", status);
          const pathCoordinates = paradas
            .map((p) => STOP_COORDINATES[p])
            .filter((c): c is StopCoords => !!c);

          if (pathCoordinates.length > 0) {
            const fallbackPath = new google.maps.Polyline({
              path: pathCoordinates,
              geodesic: true,
              strokeColor: "#f07639",
              strokeOpacity: 1.0,
              strokeWeight: 6,
              map: map,
            });

            (directionsRendererRef as any).currentFallbackPolyline = fallbackPath;

            // Marcador Origen
            new google.maps.Marker({
              position: pathCoordinates[0],
              map: map,
              title: `Terminal de Origen: ${viaje.ruta.origen.nombre}`,
              icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
              },
            });

            // Marcador Destino
            new google.maps.Marker({
              position: pathCoordinates[pathCoordinates.length - 1],
              map: map,
              title: `Terminal de Llegada: ${viaje.ruta.destino.nombre}`,
              icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              },
            });

            // Marcadores intermedios
            for (let i = 1; i < pathCoordinates.length - 1; i++) {
              new google.maps.Marker({
                position: pathCoordinates[i],
                map: map,
                title: `Control: ${paradas[i]}`,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: "#f07639",
                  fillOpacity: 0.8,
                  strokeColor: "#ffffff",
                  strokeWeight: 1.5,
                },
              });
            }

            // Ajustar límites
            const bounds = new google.maps.LatLngBounds();
            pathCoordinates.forEach((c) => bounds.extend(new google.maps.LatLng(c.lat, c.lng)));
            map.fitBounds(bounds);
          }
        }
      }
    );

    // Crear Marcador del Bus
    const initialCoords = currentCoords || STOP_COORDINATES[viaje.ruta.origen.nombre] || { lat: -5.7088, lng: -78.8081 };
    const busMarker = new google.maps.Marker({
      position: initialCoords,
      map: map,
      title: "Ubicación actual del bus",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#3b82f6",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
    busMarkerRef.current = busMarker;

    return () => {
      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
      if ((directionsRendererRef as any).currentFallbackPolyline) {
        (directionsRendererRef as any).currentFallbackPolyline.setMap(null);
      }
      if (busMarkerRef.current) busMarkerRef.current.setMap(null);
      googleMapInstance.current = null;
    };
  }, [googleMapsLoaded, isOffline, activeTab, viaje.ruta.origen.nombre, viaje.ruta.destino.nombre]);

  // Actualizar la posición del Marcador del Bus en el Google Map
  useEffect(() => {
    if (!googleMapsLoaded || !busMarkerRef.current || !currentCoords || isOffline) return;

    const google = (window as any).google;
    const newPos = new google.maps.LatLng(currentCoords.lat, currentCoords.lng);
    busMarkerRef.current.setPosition(newPos);

    // Re-centrar suavemente el mapa en el bus
    if (googleMapInstance.current) {
      googleMapInstance.current.panTo(newPos);
    }
  }, [currentCoords, googleMapsLoaded, isOffline]);

  // Iniciar el rastreo por GPS
  function startGpsTracking() {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    
    stopGpsTracking(); // Limpiar previo si existe

    setGpsStatus("activo");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setCurrentCoords(coords);
        checkProximity(latitude, longitude);
      },
      (error) => {
        console.error("Error GPS:", error);
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  }

  // Detener el rastreo GPS
  function stopGpsTracking() {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  // Evaluar cercanía a las paradas y auto-marcar (con lógica de cascada)
  const checkProximity = (currentLat: number, currentLng: number) => {
    let stateChanged = false;
    const currentCompleted = JSON.parse(localStorage.getItem(`completed_stops_${viaje.id}`) || "[]");
    const updatedStops = [...currentCompleted];

    paradas.forEach((stop, idx) => {
      const stopCoords = STOP_COORDINATES[stop];
      if (stopCoords && !updatedStops.includes(stop)) {
        const distance = getDistanceKm(currentLat, currentLng, stopCoords.lat, stopCoords.lng);
        if (distance < 2.0) { // Menos de 2 km de radio
          // Cascada: Marcar la parada actual y todas las anteriores del trayecto
          for (let i = 0; i <= idx; i++) {
            if (!updatedStops.includes(paradas[i])) {
              updatedStops.push(paradas[i]);
              stateChanged = true;
            }
          }
          setLastNotification(`📍 ¡Llegaste a la parada de control: ${stop}!`);
        }
      }
    });

    if (stateChanged) {
      setCompletedStops(updatedStops);
      localStorage.setItem(`completed_stops_${viaje.id}`, JSON.stringify(updatedStops));
    }
  };

  // Simular movimiento GPS (inyectar coordenadas de prueba)
  const triggerSimulatedLocation = (stopName: string) => {
    if (viaje.estado !== "en_ruta") {
      showAlert("Debes iniciar el viaje antes de poder simular el GPS.", "advertencia");
      return;
    }
    const coords = STOP_COORDINATES[stopName];
    if (coords) {
      setCurrentCoords(coords);
      setGpsStatus("activo");
      checkProximity(coords.lat, coords.lng);
    }
  };

  // Sincronizar cola local con el servidor al volver a estar "En Línea"
  async function handleSyncData(gastosToSync: any[], novedadesToSync: any[]) {
    setIsUpdating(true);
    let successCount = 0;

    try {
      // 1. Sincronizar Gastos
      for (const gasto of gastosToSync) {
        const res = await registrarGasto({
          viaje_id: viaje.id,
          conductor_id: conductorId,
          concepto: gasto.concepto.replace(" (Local/Pendiente)", ""),
          monto: Number(gasto.monto)
        });
        if (res.success) successCount++;
      }

      // 2. Sincronizar Ocurrencias de la Bitácora
      for (const nov of novedadesToSync) {
        const res = await registrarOcurrenciaRuta({
          viaje_id: viaje.id,
          conductor_id: conductorId,
          tipo: nov.tipo,
          gravedad: nov.gravedad,
          descripcion: nov.descripcion.replace(" (Local/Pendiente)", ""),
          retraso_minutos: Number(nov.retraso_minutos)
        });
        if (res.success) successCount++;
      }

      // Limpiar colas locales si todo se sincronizó
      localStorage.removeItem(`queued_gastos_${viaje.id}`);
      localStorage.removeItem(`queued_novedades_${viaje.id}`);
      setLocalGastos([]);
      setLocalNovedades([]);

      if (successCount > 0) {
        showAlert(`¡Sincronización exitosa! Se subieron ${successCount} registros pendientes al servidor.`, "exito");
        router.refresh();
      }
    } catch (err) {
      showAlert("Error de conexión durante la sincronización. Se reintentará al recuperar señal.", "advertencia");
    } finally {
      setIsUpdating(false);
    }
  }

  // Alternar modo de simulación offline
  const toggleOfflineMode = async () => {
    const newOfflineState = !isOffline;
    setIsOffline(newOfflineState);
    localStorage.setItem(`offline_mode_${viaje.id}`, String(newOfflineState));

    if (!newOfflineState) {
      // Si pasa a estar "En Línea", intentar sincronizar colas
      const gQueue = JSON.parse(localStorage.getItem(`queued_gastos_${viaje.id}`) || "[]");
      const nQueue = JSON.parse(localStorage.getItem(`queued_novedades_${viaje.id}`) || "[]");
      if (gQueue.length > 0 || nQueue.length > 0) {
        await handleSyncData(gQueue, nQueue);
      }
    }
  };

  // Función para iniciar el viaje pidiendo permisos GPS de forma nativa
  const handleIniciarViaje = async () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setIsUpdating(true);
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Permiso concedido, iniciar tracking e iniciar viaje en DB
          const { latitude, longitude } = position.coords;
          
          const res = await updateEstadoViaje(viaje.id, "en_ruta");
          if (res.success) {
            startGpsTracking();
            setCurrentCoords({ lat: latitude, lng: longitude });

            // Auto-marcar la primera parada (Origen) por defecto al iniciar
            if (paradas.length > 0) {
              const initialStops = [paradas[0]];
              setCompletedStops(initialStops);
              localStorage.setItem(`completed_stops_${viaje.id}`, JSON.stringify(initialStops));
            }

            checkProximity(latitude, longitude);
            router.refresh();
          } else {
            showAlert("Error al iniciar viaje en el servidor.", "error");
          }
          setIsUpdating(false);
        },
        async (error) => {
          // Permiso denegado: iniciar de todos modos pero avisar
          showAlert("Permiso de GPS denegado. El viaje se iniciará de todos modos, pero el conductor deberá marcar las paradas de forma manual en el checklist.", "advertencia");
          const res = await updateEstadoViaje(viaje.id, "en_ruta");
          if (res.success) {
            // Auto-marcar la primera parada (Origen) por defecto al iniciar
            if (paradas.length > 0) {
              const initialStops = [paradas[0]];
              setCompletedStops(initialStops);
              localStorage.setItem(`completed_stops_${viaje.id}`, JSON.stringify(initialStops));
            }
            router.refresh();
          } else {
            showAlert("Error al iniciar viaje en el servidor.", "error");
          }
          setIsUpdating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      handleEstadoChange("en_ruta");
    }
  };

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (isOffline) {
      showAlert("No puedes cambiar el estado del viaje mientras estás Sin Señal.", "advertencia");
      return;
    }
    showConfirm(`¿Estás seguro de marcar el viaje como ${nuevoEstado.replace('_', ' ')}?`, async () => {
      setIsUpdating(true);
      const res = await updateEstadoViaje(viaje.id, nuevoEstado);
      if (res.success) {
        if (nuevoEstado === "completado") {
          stopGpsTracking();
          // Al completar el viaje, se auto-completan todas las paradas en cascada
          setCompletedStops(paradas);
          localStorage.setItem(`completed_stops_${viaje.id}`, JSON.stringify(paradas));
        }
        router.refresh();
      } else {
        showAlert("Error al actualizar estado del viaje.", "error");
      }
      setIsUpdating(false);
    });
  };

  const handleGuardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoForm.concepto || !gastoForm.monto) return;
    setIsUpdating(true);

    if (isOffline) {
      // Guardar localmente
      const nuevoGastoLocal = {
        id: `local-g_${Date.now()}`,
        concepto: `${gastoForm.concepto} (Local/Pendiente)`,
        monto: Number(gastoForm.monto),
        foto_url: fotoBase64 || null,
        fecha: new Date().toISOString()
      };
      const updatedLocalGastos = [...localGastos, nuevoGastoLocal];
      setLocalGastos(updatedLocalGastos);
      localStorage.setItem(`queued_gastos_${viaje.id}`, JSON.stringify(updatedLocalGastos));
      setGastoForm({ concepto: "", monto: "" });
      setFotoBase64("");
      showAlert("Gasto guardado localmente. Se sincronizará cuando recuperes señal.", "info");
      setIsUpdating(false);
    } else {
      // Enviar al servidor
      const res = await registrarGasto({
        viaje_id: viaje.id,
        conductor_id: conductorId,
        concepto: gastoForm.concepto,
        monto: Number(gastoForm.monto),
        foto_url: fotoBase64 || undefined
      });
      if (res.success) {
        setGastoForm({ concepto: "", monto: "" });
        setFotoBase64("");
        router.refresh();
        showAlert("Gasto registrado con éxito.", "exito");
      } else {
        showAlert("Error al registrar gasto.", "error");
      }
      setIsUpdating(false);
    }
  };

  const handleGuardarNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novedadForm.descripcion) return;
    setIsUpdating(true);

    if (isOffline) {
      // Guardar localmente
      const nuevaNovedadLocal = {
        id: `local-n_${Date.now()}`,
        tipo: novedadForm.tipo,
        gravedad: novedadForm.gravedad,
        descripcion: `${novedadForm.descripcion} (Local/Pendiente)`,
        retraso_minutos: 0,
        foto_url: novedadFotoBase64 || null,
        created_at: new Date().toISOString()
      };
      const updatedLocalNovedades = [...localNovedades, nuevaNovedadLocal];
      setLocalNovedades(updatedLocalNovedades);
      localStorage.setItem(`queued_novedades_${viaje.id}`, JSON.stringify(updatedLocalNovedades));
      setNovedadForm({ tipo: "Tránsito", gravedad: "Baja", descripcion: "", retraso_minutos: "0" });
      setNovedadFotoBase64("");
      showAlert("Ocurrencia guardada localmente. Se sincronizará al conectar señal.", "info");
      setIsUpdating(false);
    } else {
      // Enviar al servidor
      const res = await registrarOcurrenciaRuta({
        viaje_id: viaje.id,
        conductor_id: conductorId,
        tipo: novedadForm.tipo,
        gravedad: novedadForm.gravedad,
        descripcion: novedadForm.descripcion,
        retraso_minutos: 0,
        foto_url: novedadFotoBase64 || undefined
      });
      if (res.success) {
        setNovedadForm({ tipo: "Tránsito", gravedad: "Baja", descripcion: "", retraso_minutos: "0" });
        setNovedadFotoBase64("");
        router.refresh();
        showAlert("Incidente de bitácora registrado con éxito.", "exito");
      } else {
        showAlert("Error al registrar incidente.", "error");
      }
      setIsUpdating(false);
    }
  };

  const handleEliminarGastoClient = async (gastoId: string | number) => {
    showConfirm("¿Estás seguro de que deseas eliminar este gasto de la ruta?", async () => {
      setIsUpdating(true);
      if (typeof gastoId === "string" && gastoId.startsWith("local-g_")) {
        const updated = localGastos.filter(g => g.id !== gastoId);
        setLocalGastos(updated);
        localStorage.setItem(`queued_gastos_${viaje.id}`, JSON.stringify(updated));
        showAlert("Gasto local eliminado correctamente.", "exito");
      } else {
        const res = await eliminarGasto(Number(gastoId));
        if (res.success) {
          router.refresh();
          showAlert("Gasto eliminado correctamente.", "exito");
        } else {
          showAlert(res.error || "No se pudo eliminar el gasto.", "error");
        }
      }
      setIsUpdating(false);
    });
  };

  const handleEliminarBitacoraClient = async (bitacoraId: string | number) => {
    showConfirm("¿Estás seguro de que deseas eliminar este reporte de la bitácora?", async () => {
      setIsUpdating(true);
      if (typeof bitacoraId === "string" && bitacoraId.startsWith("local-n_")) {
        const updated = localNovedades.filter(n => n.id !== bitacoraId);
        setLocalNovedades(updated);
        localStorage.setItem(`queued_novedades_${viaje.id}`, JSON.stringify(updated));
        showAlert("Reporte local de bitácora eliminado.", "exito");
      } else {
        const res = await eliminarBitacora(Number(bitacoraId));
        if (res.success) {
          router.refresh();
          showAlert("Registro de bitácora eliminado correctamente.", "exito");
        } else {
          showAlert(res.error || "No se pudo eliminar el registro.", "error");
        }
      }
      setIsUpdating(false);
    });
  };

  const handleResolverIncidenteClient = async (bitacoraId: string | number) => {
    showConfirm("¿Estás seguro de marcar esta incidencia como SOLUCIONADA?", async () => {
      setIsUpdating(true);
      const res = await resolverIncidente(Number(bitacoraId));
      if (res.success) {
        router.refresh();
        showAlert("Incidencia marcada como solucionada con éxito.", "exito");
      } else {
        showAlert(res.error || "No se pudo actualizar el estado de la incidencia.", "error");
      }
      setIsUpdating(false);
    });
  };

  // Toggle de parada manual con lógica de cascada para paradas anteriores
  const handleToggleParada = (stopName: string) => {
    if (viaje.estado !== "en_ruta") {
      showAlert("Debes iniciar el viaje antes de registrar el progreso de las paradas.", "advertencia");
      return;
    }
    const stopIndex = paradas.indexOf(stopName);
    if (stopIndex === -1) return;

    let updated = [...completedStops];

    if (completedStops.includes(stopName)) {
      // Si la desmarcamos, removemos solo esa parada
      updated = updated.filter(s => s !== stopName);
    } else {
      // Si la marcamos, agregamos esa parada y todas las anteriores del trayecto de forma automática
      for (let i = 0; i <= stopIndex; i++) {
        if (!updated.includes(paradas[i])) {
          updated.push(paradas[i]);
        }
      }
    }
    setCompletedStops(updated);
    localStorage.setItem(`completed_stops_${viaje.id}`, JSON.stringify(updated));
  };

  const progressPct = paradas.length > 0 
    ? Math.round((completedStops.length / paradas.length) * 100) 
    : 0;

  // Combinación de datos en servidor + datos locales en cola offline
  const allGastos = [...viaje.gastos, ...localGastos];
  const allNovedades = [...(viaje.bitacoras || []), ...localNovedades];

  return (
    <div className="max-w-4xl mx-auto pb-20 px-1 sm:px-0">
      
      {/* Cabecera con Botón de Señal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <Link href="/staff/conductor/viajes" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-[#f07639] mr-4 transition-colors border border-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Detalle del Viaje</h1>
            <p className="text-slate-500 text-sm" suppressHydrationWarning>
              {new Date(viaje.fecha_salida).toLocaleString('es-PE')}
            </p>
          </div>
        </div>

        {/* Simulador Offline */}
        {mounted && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Indicador GPS */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              gpsStatus === "activo"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : gpsStatus === "error"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}>
              <Navigation className={`w-3.5 h-3.5 ${gpsStatus === 'activo' ? 'animate-spin' : ''}`} />
              GPS: {gpsStatus === "activo" ? "Activo" : gpsStatus === "error" ? "Falla" : "Inactivo"}
            </div>

            {/* Indicador de Red */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              isOffline 
                ? "bg-red-50 text-red-700 border-red-200" 
                : "bg-green-50 text-green-700 border-green-200"
            }`}>
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  Sin Señal
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  En Línea
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alerta de Modo Sin Señal */}
      {mounted && isOffline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-fadeIn text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">⚠️ Modo Sin Cobertura de Red Activo</p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed font-medium">
              No tienes señal de internet en esta zona de la carretera. Los reportes de gastos e incidencias mecánicas se guardarán localmente en la memoria del navegador y se subirán de forma automática cuando presiones <strong>"Conectar Señal"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Alertas de la Central para este Viaje */}
      {mounted && (viaje.alertas || []).filter((a: any) => !a.leido).map((alerta: any) => (
        <div key={alerta.id} className="bg-red-50 border border-red-200 text-red-950 rounded-2xl p-4 mb-6 flex items-start justify-between animate-fadeIn text-sm gap-4 shadow-[0_4px_20px_rgb(239,68,68,0.03)]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-red-700 uppercase tracking-wide text-xs mb-0.5">Alerta Urgente de la Central</p>
              <p className="font-semibold text-slate-800 leading-relaxed">{alerta.mensaje}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase" suppressHydrationWarning>
                Enviado: {new Date(alerta.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button 
            disabled={isUpdating}
            onClick={async () => {
              setIsUpdating(true);
              const res = await marcarAlertaLeida(Number(alerta.id));
              if (res.success) {
                router.refresh();
              } else {
                showAlert("No se pudo marcar la alerta como leída.", "error");
              }
              setIsUpdating(false);
            }}
            className="text-red-700 hover:text-red-900 text-xs font-black uppercase tracking-wider bg-red-100 hover:bg-red-150 px-3 py-1.5 rounded-xl transition-all active:scale-95 shrink-0"
          >
            Leído
          </button>
        </div>
      ))}

      {/* Alerta GPS Notificación */}
      {mounted && lastNotification && (
        <div className="bg-green-50 border border-green-200 text-green-950 rounded-2xl p-4 mb-6 flex items-center justify-between animate-fadeIn text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <p className="font-bold">{lastNotification}</p>
          </div>
          <button 
            onClick={() => setLastNotification(null)}
            className="text-green-800 hover:text-green-950 text-xs font-black uppercase tracking-wider bg-green-150/40 hover:bg-green-150 px-2 py-1 rounded-lg"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Tarjeta de Resumen */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
        {viaje.estado === "en_ruta" && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse" />
        )}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#f07639]/10 text-[#f07639] flex items-center justify-center shrink-0">
              <Bus className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-2xl font-extrabold text-slate-800 truncate">
                {viaje.ruta.origen.nombre} <span className="text-slate-300 mx-1 sm:mx-2">→</span> {viaje.ruta.destino.nombre}
              </p>
              <p className="text-slate-500 font-medium text-xs sm:text-base">Bus Placa: <span className="text-slate-700 font-bold">{viaje.bus.placa}</span></p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {viaje.estado === "programado" && (
              <button 
                disabled={isUpdating}
                onClick={handleIniciarViaje}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center disabled:opacity-50 transition-all hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 mr-2" />
                INICIAR VIAJE
              </button>
            )}
            {viaje.estado === "en_ruta" && (
              <button 
                disabled={isUpdating}
                onClick={() => handleEstadoChange("completado")}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-500/30 flex items-center justify-center disabled:opacity-50 animate-pulse transition-all hover:scale-[1.02]"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                FINALIZAR VIAJE
              </button>
            )}
            {viaje.estado === "completado" && (
              <div className="bg-green-100 text-green-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center border border-green-200">
                <CheckCircle className="w-4 h-4 mr-2" />
                VIAJE COMPLETADO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
        {[
          { id: "ruta", label: "Hoja de Ruta", icon: MapPin },
          { id: "encomiendas", label: "Encomiendas", icon: Box },
          { id: "gastos", label: "Gastos (Peajes)", icon: Receipt },
          { id: "novedades", label: "Bitácora / Incidentes", icon: ClipboardList },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`whitespace-nowrap flex items-center px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === t.id 
                ? "bg-slate-800 text-white shadow-md" 
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <t.icon className="w-4 h-4 mr-2" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido Tabs */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
        
        {activeTab === "ruta" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4">Hoja de Ruta Interactiva</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Distancia</p>
                  <p className="text-xl font-extrabold text-slate-700">~250 km</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Tiempo Estimado</p>
                  <p className="text-xl font-extrabold text-slate-700">{formatDuracion(viaje.ruta.duracion_estimada_minutos)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center flex flex-col justify-center min-h-[90px]">
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Pasajeros</p>
                  <p className="text-xl font-extrabold text-slate-700">
                    {totalAbordados} <span className="text-slate-400 text-sm font-semibold">/ {totalComprados}</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-bold mt-1.5 leading-normal">
                    No subieron: {totalPendientes} <br /> Aforo: {viaje.bus.capacidad}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Bultos Bodega</p>
                  <p className="text-xl font-extrabold text-slate-700">{viaje.encomiendas.length}</p>
                </div>
              </div>
            </div>

            {/* Progreso y Paradas del Viaje */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Progreso y Paradas del Viaje
                </h3>
              </div>
              
              {/* Contenedor del Mapa (Gráfico SVG interactivo de paradas) */}
              <div className="relative w-full h-[220px] sm:h-[260px] overflow-hidden bg-slate-50 border border-slate-200/60 rounded-2xl sm:rounded-3xl shadow-inner flex flex-col justify-center items-center p-4 sm:p-6 animate-fadeIn">
                <svg viewBox="0 0 500 80" className="w-full max-w-lg mb-4">
                  <line x1="40" y1="40" x2="460" y2="40" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                  <line 
                    x1="40" 
                    y1="40" 
                    x2={40 + (420 * progressPct) / 100} 
                    y2="40" 
                    stroke="#f07639" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    className="transition-all duration-500" 
                  />
                  {paradas.map((p, idx) => {
                    const x = 40 + (420 * idx) / (paradas.length - 1);
                    const isPassed = completedStops.includes(p);
                    return (
                      <g key={p}>
                        <circle 
                          cx={x} 
                          cy="40" 
                          r="10" 
                          fill={isPassed ? "#f07639" : "#ffffff"} 
                          stroke={isPassed ? "#f07639" : "#cbd5e1"} 
                          strokeWidth="3" 
                          className="transition-all duration-300" 
                        />
                        <text 
                          x={x} 
                          y="20" 
                          textAnchor="middle" 
                          className="text-[9px] font-black text-slate-600 uppercase fill-current tracking-tight"
                        >
                          {p}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider text-center">
                  Visualización de Paradas de Control ({completedStops.length} de {paradas.length} completadas)
                </p>
              </div>

              {/* Checklist Interactivo de Paradas (Solo visible cuando no hay señal de GPS activa) */}
              {mounted && gpsStatus !== "activo" && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Checklist de Paradas (Control Manual)</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Presiona sobre una parada para marcarla de forma manual ya que el GPS está inactivo o sin cobertura.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {paradas.map((p, idx) => {
                      const isPassed = completedStops.includes(p);
                      const isDisabled = viaje.estado !== "en_ruta";
                      return (
                        <button
                          key={p}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleToggleParada(p)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                            isDisabled
                              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                              : isPassed
                              ? "bg-green-50/70 border-green-200 text-green-800"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                              isDisabled
                                ? "border-slate-200 bg-slate-100 text-transparent"
                                : isPassed
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-slate-300 text-transparent"
                            }`}>
                              ✓
                            </span>
                            <span>{idx + 1}. {p}</span>
                          </div>
                          <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-black ${
                            isDisabled
                              ? "bg-slate-100 text-slate-400"
                              : isPassed
                              ? "bg-green-150/40 text-green-700"
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {isPassed ? "Completado" : "Pendiente"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botón para abrir ruta en la app de Google Maps externa */}
              <div className="pt-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(viaje.ruta.origen.nombre + ", Peru")}&destination=${encodeURIComponent(viaje.ruta.destino.nombre + ", Peru")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#f07639] hover:bg-[#e06528] text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-[#f07639]/10 hover:shadow-lg transition-all active:scale-[0.99] duration-200"
                >
                  <Navigation className="w-4 h-4 rotate-45" />
                  Abrir Ruta en App de Google Maps (GPS)
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "encomiendas" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Manifiesto de Bodega</h2>
            {viaje.encomiendas.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay encomiendas para este viaje.</p>
            ) : (
              <div className="space-y-3">
                {viaje.encomiendas.map((enc: any) => (
                  <div key={enc.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50">
                    <div className="flex items-center">
                      <Box className="w-6 h-6 text-[#f07639] mr-3" />
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{enc.codigo_seguimiento}</p>
                        <p className="text-xs text-slate-500">Peso: {enc.peso_kg}kg</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Descargar en</p>
                      <p className="font-extrabold text-slate-800 text-sm">{enc.destino.nombre}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "gastos" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Reporte de Peajes y Gastos</h2>
            
            <form onSubmit={handleGuardarGasto} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Concepto</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Peaje Chicama"
                    required
                    value={gastoForm.concepto}
                    onChange={(e) => setGastoForm({...gastoForm, concepto: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#f07639] bg-white text-sm"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Monto (S/)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    required
                    placeholder="15.50"
                    value={gastoForm.monto}
                    onChange={(e) => setGastoForm({...gastoForm, monto: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#f07639] bg-white text-sm"
                  />
                </div>
                <div className="w-full sm:w-auto flex flex-col">
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-[#f07639]" /> Tomar Foto Evidencia
                  </label>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#f07639]/50 transition-colors h-[38px] text-xs font-bold text-slate-600">
                    <Camera className="w-4 h-4 text-slate-400" />
                    <span>{fotoBase64 ? "Foto Capturada ✓" : "Tomar Foto"}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFotoBase64(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <button disabled={isUpdating} type="submit" className="bg-[#f07639] hover:bg-[#e06528] text-white px-6 py-2 rounded-xl font-bold h-[38px] w-full sm:w-auto transition-colors cursor-pointer">
                  Agregar
                </button>
              </div>

              {fotoBase64 && (
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 w-fit">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                    <img src={fotoBase64} alt="Vista previa de evidencia" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700">Evidencia capturada</p>
                    <button 
                      type="button" 
                      onClick={() => setFotoBase64("")}
                      className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider block mt-0.5"
                    >
                      Eliminar Foto
                    </button>
                  </div>
                </div>
              )}
            </form>

            <div className="space-y-2">
              {allGastos.map((g: any) => (
                <div key={g.id} className="flex justify-between items-center p-3 border-b border-slate-100 text-sm">
                  <div className="flex items-center gap-3">
                    {g.foto_url ? (
                      <button 
                        onClick={() => setPreviewFoto(g.foto_url)}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:scale-105 transition-transform flex items-center justify-center text-slate-400 hover:text-[#f07639] shrink-0 group cursor-pointer"
                        title="Ver foto de evidencia"
                      >
                        <img src={g.foto_url} alt="Evidencia" className="w-full h-full object-cover group-hover:opacity-85" />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Receipt className="w-5 h-5 opacity-60" />
                      </div>
                    )}
                    <span className="font-medium text-slate-700">{g.concepto}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-900">S/ {Number(g.monto).toFixed(2)}</span>
                    {g.foto_url && (
                      <button
                        onClick={() => setPreviewFoto(g.foto_url)}
                        className="text-slate-450 hover:text-[#f07639] p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Ver evidencia"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      disabled={isUpdating}
                      onClick={() => handleEliminarGastoClient(g.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {allGastos.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No has registrado gastos aún.</p>
              )}
            </div>
          </div>
        )}

        {/* Modal de Vista Previa de Evidencia */}
        {previewFoto && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative bg-white rounded-3xl p-5 max-w-lg w-full overflow-hidden shadow-2xl flex flex-col items-center">
              <button 
                onClick={() => setPreviewFoto(null)} 
                className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-800 mb-3 pr-8 w-full text-left flex items-center gap-1.5">
                <Receipt className="w-5 h-5 text-[#f07639]" /> Evidencia de Gasto
              </h3>
              <div className="w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center min-h-[300px] max-h-[70vh]">
                <img src={previewFoto} alt="Evidencia de peaje" className="w-full max-h-[70vh] object-contain" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "novedades" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Bitácora de Ruta / Incidentes</h2>
            
            <form onSubmit={handleGuardarNovedad} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Incidente</label>
                  <select 
                    value={novedadForm.tipo}
                    onChange={(e) => setNovedadForm({...novedadForm, tipo: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#f07639] bg-white text-sm"
                  >
                    <option>Tránsito</option>
                    <option>Clima</option>
                    <option>Pasajeros</option>
                    <option>Fiscalización</option>
                    <option>Encomiendas</option>
                    <option>Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Gravedad</label>
                  <select 
                    value={novedadForm.gravedad}
                    onChange={(e) => setNovedadForm({...novedadForm, gravedad: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#f07639] bg-white text-sm"
                  >
                    <option>Baja</option>
                    <option>Media</option>
                    <option>Alta</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1">Descripción del Suceso</label>
                <textarea 
                  required
                  rows={3}
                  value={novedadForm.descripcion}
                  onChange={(e) => setNovedadForm({...novedadForm, descripcion: e.target.value})}
                  placeholder="Describe brevemente lo ocurrido en la carretera..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#f07639] bg-white text-sm"
                />
              </div>

              <div className="mb-4 w-full sm:w-auto flex flex-col items-start">
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-[#f07639]" /> Tomar Foto Evidencia (Opcional)
                </label>
                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#f07639]/50 transition-colors h-[38px] text-xs font-bold text-slate-600">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span>{novedadFotoBase64 ? "Foto Capturada ✓" : "Tomar Foto"}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNovedadFotoBase64(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                
                {novedadFotoBase64 && (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 w-fit mt-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <img src={novedadFotoBase64} alt="Vista previa de novedad" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700">Evidencia capturada</p>
                      <button 
                        type="button" 
                        onClick={() => setNovedadFotoBase64("")}
                        className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider block mt-0.5"
                      >
                        Eliminar Foto
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button disabled={isUpdating} type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold flex justify-center items-center transition-colors cursor-pointer">
                <ClipboardList className="w-5 h-5 mr-2" /> Registrar en Bitácora
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-500">Historial de la Bitácora</h3>
              {allNovedades.map((n: any) => (
                <div key={n.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {n.foto_url && (
                      <button 
                        onClick={() => setPreviewFoto(n.foto_url)}
                        className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:scale-105 transition-transform flex items-center justify-center text-slate-400 hover:text-[#f07639] shrink-0 group cursor-pointer"
                        title="Ver evidencia del incidente"
                      >
                        <img src={n.foto_url} alt="Evidencia" className="w-full h-full object-cover group-hover:opacity-85" />
                      </button>
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-[10px] font-bold text-slate-600 uppercase">{n.tipo}</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          n.gravedad === 'Alta' 
                            ? 'bg-red-100 text-red-700' 
                            : n.gravedad === 'Media' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>{n.gravedad}</span>
                        {Number(n.retraso_minutos) > 0 && (
                          <span className="inline-block px-2 py-0.5 rounded bg-red-50 border border-red-100 text-[10px] font-extrabold text-red-600">
                            Retraso: +{n.retraso_minutos} min
                          </span>
                        )}
                        {n.solucionado ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-[10px] font-extrabold text-emerald-700">
                            ✓ SOLUCIONADO
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-100 border border-amber-200 text-[10px] font-extrabold text-amber-800">
                            ⚠ EN CURSO
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-700 break-words">{n.descripcion}</p>
                      <div className="text-[10px] text-slate-400 font-bold space-y-0.5">
                        <p>Reportado: {n.created_at ? new Date(n.created_at).toLocaleString() : "Fecha no disponible"}</p>
                        {n.solucionado && n.fecha_solucion && (
                          <p className="text-emerald-600">Solucionado: {new Date(n.fecha_solucion).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {n.foto_url && (
                      <button
                        onClick={() => setPreviewFoto(n.foto_url)}
                        className="text-slate-450 hover:text-[#f07639] p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Ver evidencia"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {!n.solucionado && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleResolverIncidenteClient(n.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-250 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all cursor-pointer"
                        title="Marcar como solucionado"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Solucionado</span>
                      </button>
                    )}
                    <button
                      disabled={isUpdating}
                      onClick={() => handleEliminarBitacoraClient(n.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar reporte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {allNovedades.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">Sin incidentes registrados en este viaje.</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Notificación Toast Tipo Nubesita Flotante */}
      {toast.mostrar && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-md border border-slate-100/80 rounded-2xl shadow-xl animate-fade-in max-w-sm w-[90%] sm:w-auto transition-all duration-300">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
            toast.tipo === "exito"
              ? "bg-emerald-50 text-emerald-500 border border-emerald-100"
              : toast.tipo === "error"
                ? "bg-red-50 text-red-500 border border-red-100"
                : toast.tipo === "advertencia"
                  ? "bg-amber-50 text-amber-500 border border-amber-100"
                  : "bg-blue-50 text-blue-500 border border-blue-100"
          }`}>
            {toast.tipo === "exito" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.tipo === "error" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.tipo === "advertencia" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.tipo === "info" && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          
          <div className="flex-1 text-xs font-black text-slate-700 leading-snug">
            {toast.mensaje}
          </div>
          
          <button 
            onClick={() => setToast(prev => ({ ...prev, mostrar: false }))}
            className="text-slate-400 hover:text-slate-600 shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal de Confirmación Premium Personalizado Centrado */}
      {modalConfirmar.mostrar && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center border border-slate-100 transform scale-100 transition-all duration-300">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-50 text-amber-500 border border-amber-100">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-base font-extrabold text-slate-800 mb-2">
              ¿Confirmar Acción?
            </h3>
            
            <p className="text-xs text-slate-500 font-bold mb-6 leading-relaxed">
              {modalConfirmar.mensaje}
            </p>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalConfirmar(prev => ({ ...prev, mostrar: false }))}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={modalConfirmar.onConfirm}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-950 transition-all shadow-sm shadow-slate-900/10 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
