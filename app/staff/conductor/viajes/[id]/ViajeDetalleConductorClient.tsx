"use client";

import { useState, useEffect, useRef } from "react";
import { updateEstadoViaje, registrarGasto, reportarNovedad } from "@/app/(admin)/actions/conductor";
import { ArrowLeft, MapPin, Bus, Clock, Box, Play, CheckCircle, Receipt, Wrench, AlertCircle, Wifi, WifiOff, Navigation } from "lucide-react";
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
  const [novedadForm, setNovedadForm] = useState({ categoria: "Motor", descripcion: "" });

  // Estados de conexión offline y sincronización
  const [mounted, setMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  // Listas locales temporales (para modo offline)
  const [localGastos, setLocalGastos] = useState<any[]>([]);
  const [localNovedades, setLocalNovedades] = useState<any[]>([]);
  
  // Paradas completadas en la hoja de ruta
  const [completedStops, setCompletedStops] = useState<string[]>([]);

  // Estados de ubicación GPS real
  const [currentCoords, setCurrentCoords] = useState<StopCoords | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"inactivo" | "activo" | "error">("inactivo");
  const [lastNotification, setLastNotification] = useState<string | null>(null);

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
    if ((o.includes("jaén") && d.includes("chiclayo")) || (o.includes("chiclayo") && d.includes("jaén"))) {
      return ["Jaén", "Chamaya", "Bagua Grande", "Olmos", "Chiclayo"];
    }
    if ((o.includes("trujillo") && d.includes("chiclayo")) || (o.includes("chiclayo") && d.includes("trujillo"))) {
      return ["Trujillo", "Mocupe", "Guadalupe", "Pacasmayo", "Chiclayo"];
    }
    if ((o.includes("cajamarca") && d.includes("trujillo")) || (o.includes("trujillo") && d.includes("cajamarca"))) {
      return ["Cajamarca", "Chilete", "Tembladera", "Ciudad de Dios", "Trujillo"];
    }
    return [origen, "Control A", "Control B", destino];
  };

  const paradas = getParadas(viaje.ruta.origen.nombre, viaje.ruta.destino.nombre);

  // Carga asíncrona de Google Maps API
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).google && (window as any).google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    // Callback de inicialización para la API de Google Maps
    (window as any).initGoogleMapsCallback = () => {
      setGoogleMapsLoaded(true);
    };

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      delete (window as any).initGoogleMapsCallback;
    };
  }, []);

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

    // Cargar progreso de paradas
    const paradasSaved = localStorage.getItem(`completed_stops_${viaje.id}`);
    if (paradasSaved) {
      setCompletedStops(JSON.parse(paradasSaved));
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
      fullscreenControl: false,
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
  const startGpsTracking = () => {
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
  };

  // Detener el rastreo GPS
  const stopGpsTracking = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Evaluar cercanía a las paradas y auto-marcar
  const checkProximity = (currentLat: number, currentLng: number) => {
    let stateChanged = false;
    const currentCompleted = JSON.parse(localStorage.getItem(`completed_stops_${viaje.id}`) || "[]");
    const updatedStops = [...currentCompleted];

    paradas.forEach((stop) => {
      const stopCoords = STOP_COORDINATES[stop];
      if (stopCoords && !updatedStops.includes(stop)) {
        const distance = getDistanceKm(currentLat, currentLng, stopCoords.lat, stopCoords.lng);
        if (distance < 2.0) { // Menos de 2 km de radio
          updatedStops.push(stop);
          stateChanged = true;
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
    const coords = STOP_COORDINATES[stopName];
    if (coords) {
      setCurrentCoords(coords);
      setGpsStatus("activo");
      checkProximity(coords.lat, coords.lng);
    }
  };

  // Sincronizar cola local con el servidor al volver a estar "En Línea"
  const handleSyncData = async (gastosToSync: any[], novedadesToSync: any[]) => {
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

      // 2. Sincronizar Novedades Mecánicas
      for (const nov of novedadesToSync) {
        const res = await reportarNovedad({
          viaje_id: viaje.id,
          bus_id: viaje.bus.id,
          conductor_id: conductorId,
          categoria: nov.categoria,
          descripcion: nov.descripcion.replace(" (Local/Pendiente)", "")
        });
        if (res.success) successCount++;
      }

      // Limpiar colas locales si todo se sincronizó
      localStorage.removeItem(`queued_gastos_${viaje.id}`);
      localStorage.removeItem(`queued_novedades_${viaje.id}`);
      setLocalGastos([]);
      setLocalNovedades([]);

      if (successCount > 0) {
        alert(`✅ ¡Sincronización exitosa! Se subieron ${successCount} registros pendientes al servidor.`);
        router.refresh();
      }
    } catch (err) {
      alert("⚠️ Error de conexión durante la sincronización. Se reintentará al recuperar señal.");
    } finally {
      setIsUpdating(false);
    }
  };

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
            checkProximity(latitude, longitude);
            router.refresh();
          } else {
            alert("Error al iniciar viaje en el servidor.");
          }
          setIsUpdating(false);
        },
        async (error) => {
          // Permiso denegado: iniciar de todos modos pero avisar
          alert("⚠️ Permiso de GPS denegado. El viaje se iniciará de todos modos, pero el conductor deberá marcar las paradas de forma manual en el checklist.");
          const res = await updateEstadoViaje(viaje.id, "en_ruta");
          if (res.success) {
            router.refresh();
          } else {
            alert("Error al iniciar viaje en el servidor.");
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
      alert("⚠️ No puedes cambiar el estado del viaje mientras estás Sin Señal.");
      return;
    }
    if (!confirm(`¿Estás seguro de marcar el viaje como ${nuevoEstado.replace('_', ' ')}?`)) return;
    setIsUpdating(true);
    const res = await updateEstadoViaje(viaje.id, nuevoEstado);
    if (res.success) {
      if (nuevoEstado === "completado") {
        stopGpsTracking();
      }
      router.refresh();
    } else {
      alert("Error al actualizar estado");
    }
    setIsUpdating(false);
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
        fecha: new Date().toISOString()
      };
      const updatedLocalGastos = [...localGastos, nuevoGastoLocal];
      setLocalGastos(updatedLocalGastos);
      localStorage.setItem(`queued_gastos_${viaje.id}`, JSON.stringify(updatedLocalGastos));
      setGastoForm({ concepto: "", monto: "" });
      alert("💾 Gasto guardado localmente. Se sincronizará cuando recuperes señal.");
      setIsUpdating(false);
    } else {
      // Enviar al servidor
      const res = await registrarGasto({
        viaje_id: viaje.id,
        conductor_id: conductorId,
        concepto: gastoForm.concepto,
        monto: Number(gastoForm.monto)
      });
      if (res.success) {
        setGastoForm({ concepto: "", monto: "" });
        router.refresh();
        alert("Gasto registrado con éxito.");
      } else {
        alert("Error al registrar gasto.");
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
        categoria: novedadForm.categoria,
        descripcion: `${novedadForm.descripcion} (Local/Pendiente)`,
        estado: "pendiente"
      };
      const updatedLocalNovedades = [...localNovedades, nuevaNovedadLocal];
      setLocalNovedades(updatedLocalNovedades);
      localStorage.setItem(`queued_novedades_${viaje.id}`, JSON.stringify(updatedLocalNovedades));
      setNovedadForm({ categoria: "Motor", descripcion: "" });
      alert("💾 Novedad guardada localmente. Se sincronizará cuando recuperes señal.");
      setIsUpdating(false);
    } else {
      // Enviar al servidor
      const res = await reportarNovedad({
        viaje_id: viaje.id,
        bus_id: viaje.bus.id,
        conductor_id: conductorId,
        categoria: novedadForm.categoria,
        descripcion: novedadForm.descripcion
      });
      if (res.success) {
        setNovedadForm({ categoria: "Motor", descripcion: "" });
        router.refresh();
        alert("Novedad reportada. Mantenimiento ha sido notificado.");
      } else {
        alert("Error al registrar novedad.");
      }
      setIsUpdating(false);
    }
  };

  // Toggle de parada manual
  const handleToggleParada = (stopName: string) => {
    let updated: string[];
    if (completedStops.includes(stopName)) {
      updated = completedStops.filter(s => s !== stopName);
    } else {
      updated = [...completedStops, stopName];
    }
    setCompletedStops(updated);
    localStorage.setItem(`completed_stops_${viaje.id}`, JSON.stringify(updated));
  };

  const progressPct = paradas.length > 0 
    ? Math.round((completedStops.length / paradas.length) * 100) 
    : 0;

  // Combinación de datos en servidor + datos locales en cola offline
  const allGastos = [...viaje.gastos, ...localGastos];
  const allNovedades = [...viaje.novedades, ...localNovedades];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      
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
          <div className="flex items-center gap-3">
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
            
            <button
              onClick={toggleOfflineMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shadow-sm ${
                isOffline
                  ? "bg-slate-800 text-white hover:bg-slate-700 border-slate-800"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
              }`}
            >
              {isOffline ? "Conectar Señal" : "Perder Señal"}
            </button>
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
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
        {viaje.estado === "en_ruta" && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse" />
        )}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#f07639]/10 text-[#f07639] flex items-center justify-center">
              <Bus className="w-7 h-7" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800">
                {viaje.ruta.origen.nombre} <span className="text-slate-300 mx-2">→</span> {viaje.ruta.destino.nombre}
              </p>
              <p className="text-slate-500 font-medium">Bus Placa: <span className="text-slate-700 font-bold">{viaje.bus.placa}</span></p>
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
          { id: "novedades", label: "Fallas Mecánicas", icon: Wrench },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`whitespace-nowrap flex items-center px-5 py-3 rounded-xl font-bold text-sm transition-all ${
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
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        
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
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Pasajeros</p>
                  <p className="text-xl font-extrabold text-slate-700">{viaje.bus.capacidad}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400 font-bold uppercase mb-1">Bultos Bodega</p>
                  <p className="text-xl font-extrabold text-slate-700">{viaje.encomiendas.length}</p>
                </div>
              </div>
            </div>

            {/* Google Map real interactivo (En línea) o Fallback SVG (Offline) */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-slate-600 uppercase tracking-wider">
                  {isOffline ? "Mapa de Progreso Offline (Doble Cobertura)" : "Mapa de Ruta en Tiempo Real (Google Maps)"}
                </h3>
                {mounted && !isOffline && (
                  <span className="text-[10px] bg-green-150/40 text-green-700 font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    Capa de Tráfico Activa
                  </span>
                )}
              </div>
              
              {/* Contenedor del Mapa */}
              <div className="relative w-full h-[360px] overflow-hidden bg-slate-100 border border-slate-200 rounded-3xl shadow-inner">
                {/* Fallback Offline (SVG) */}
                {isOffline && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-6 bg-slate-50 animate-fadeIn">
                    <svg viewBox="0 0 500 80" className="w-full max-w-lg mb-6">
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
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider text-center">
                      Visualización Offline de Paradas de Control
                    </p>
                  </div>
                )}

                {/* Google Map real (Visible en línea) */}
                <div 
                  ref={mapContainerRef} 
                  className={`w-full h-full ${isOffline ? "hidden" : "block"}`}
                />

                {/* Mensaje de carga inicial de Google Maps */}
                {!googleMapsLoaded && !isOffline && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-100 text-slate-500 gap-2">
                    <Clock className="w-8 h-8 animate-spin text-[#f07639]" />
                    <p className="text-xs font-bold">Cargando Google Maps API...</p>
                  </div>
                )}
              </div>

              {/* Checklist de Paradas de Control */}
              <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmación de Paradas Pasadas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {paradas.map((stop) => (
                    <label 
                      key={stop} 
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer select-none transition-all ${
                        completedStops.includes(stop)
                          ? "bg-orange-50/50 text-[#f07639] border-orange-100 font-bold"
                          : "bg-white text-slate-600 border-slate-150 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={completedStops.includes(stop)}
                        onChange={() => handleToggleParada(stop)}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-[#f07639] focus:ring-[#f07639]/30 transition-all cursor-pointer"
                      />
                      <span className="text-xs">{stop}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Simulador de GPS (Súper UX para pruebas) */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4.5 h-4.5 text-[#f07639]" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Simulador de Movimiento GPS</h4>
                </div>
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  Haz clic en cualquiera de las paradas a continuación para simular que el bus llega a dicha ubicación y observar el movimiento en vivo sobre el mapa de Google Maps:
                </p>
                <div className="flex flex-wrap gap-2">
                  {paradas.map(p => (
                    <button
                      key={`sim-${p}`}
                      type="button"
                      onClick={() => triggerSimulatedLocation(p)}
                      className="px-3 py-2 bg-white border border-slate-200 hover:border-[#f07639] hover:text-[#f07639] text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm hover:bg-orange-50/20"
                    >
                      📍 Llegar a {p}
                    </button>
                  ))}
                </div>
                {currentCoords && (
                  <div className="mt-4 pt-3 border-t border-slate-200/50 text-[11px] text-slate-500 font-semibold flex items-center justify-between">
                    <span>Ubicación GPS Actual del Bus:</span>
                    <span className="bg-slate-200/80 px-2 py-0.5 rounded text-slate-800 font-mono">
                      {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                    </span>
                  </div>
                )}
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
            
            <form onSubmit={handleGuardarGasto} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 flex flex-col sm:flex-row gap-3 items-end">
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
              <button disabled={isUpdating} type="submit" className="bg-[#f07639] hover:bg-[#e06528] text-white px-6 py-2 rounded-xl font-bold h-[42px] w-full sm:w-auto transition-colors">
                Agregar
              </button>
            </form>

            <div className="space-y-2">
              {allGastos.map((g: any) => (
                <div key={g.id} className="flex justify-between items-center p-3 border-b border-slate-100 text-sm">
                  <span className="font-medium text-slate-700">{g.concepto}</span>
                  <span className="font-bold text-slate-900">S/ {Number(g.monto).toFixed(2)}</span>
                </div>
              ))}
              {allGastos.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No has registrado gastos aún.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "novedades" && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Reporte de Novedad Mecánica</h2>
            
            <form onSubmit={handleGuardarNovedad} className="bg-red-50/50 p-5 rounded-2xl border border-red-100 mb-6">
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1">Categoría</label>
                <select 
                  value={novedadForm.categoria}
                  onChange={(e) => setNovedadForm({...novedadForm, categoria: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-red-400 bg-white text-sm"
                >
                  <option>Motor</option>
                  <option>Llantas</option>
                  <option>Frenos</option>
                  <option>Interiores / Asientos</option>
                  <option>Aire Acondicionado</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1">Descripción del problema</label>
                <textarea 
                  required
                  rows={3}
                  value={novedadForm.descripcion}
                  onChange={(e) => setNovedadForm({...novedadForm, descripcion: e.target.value})}
                  placeholder="Describe brevemente el ruido o problema que notaste..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-red-400 bg-white text-sm"
                />
              </div>
              <button disabled={isUpdating} type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold flex justify-center items-center transition-colors">
                <AlertCircle className="w-5 h-5 mr-2" /> Enviar Reporte a Mantenimiento
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-500">Historial de Reportes</h3>
              {allNovedades.map((n: any) => (
                <div key={n.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 rounded bg-slate-200 text-[10px] font-bold text-slate-600 mb-2">{n.categoria}</span>
                    <p className="text-sm text-slate-700">{n.descripcion}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${n.estado === 'pendiente' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {n.estado}
                  </span>
                </div>
              ))}
              {allNovedades.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">Sin reportes registrados en este viaje.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
