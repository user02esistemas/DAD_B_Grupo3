"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { 
  getLocations, 
  searchTrips, 
  getTripSeats, 
  marcarAsientosPendientes, 
  liberarAsientos, 
  crearOrdenCulqi,
  crearCargoCulqi, 
  procesarPagoMultiplesAsientosCulqi,
  getClienteProfile,
  enviarTicketEmail
} from "@/app/actions";
import { 
  Loader2, 
  ArrowRight, 
  MapPin, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  BusFront, 
  Search,
  ArrowLeftRight,
  Route,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { generateBoletoPDF } from "@/lib/pdfUtils";
import RouteLocationPicker from "./components/RouteLocationPicker";

function CompraContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const originParam = searchParams.get("origin") || "";
  const destinationParam = searchParams.get("destination") || "";
  const dateParam = searchParams.get("date") || "";
  
  // Stepper state
  const [step, setStep] = useState(1);
  
  // Global loading state for actions
  const [loading, setLoading] = useState(false);

  // Bus Images Modal state
  const [busImages, setBusImages] = useState<string[]>([]);
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Step 1: Búsqueda
  const [locations, setLocations] = useState<any[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [peruDate] = useState(() => {
    const options = { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === "year")?.value;
    const month = parts.find(p => p.type === "month")?.value;
    const day = parts.find(p => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  });
  const [date, setDate] = useState(peruDate);
  const [errorStep1, setErrorStep1] = useState("");

  const handleOriginChange = (val: string) => {
    if (val && val === destinationId) {
      setDestinationId(originId);
    }
    setOriginId(val);
  };

  const handleDestinationChange = (val: string) => {
    if (val && val === originId) {
      setOriginId(destinationId);
    }
    setDestinationId(val);
  };

  const handleSwapLocations = () => {
    setOriginId(destinationId);
    setDestinationId(originId);
    setErrorStep1("");
  };

  const selectedOriginName = locations.find((location) => location.id.toString() === originId)?.nombre || "Origen";
  const selectedDestinationName = locations.find((location) => location.id.toString() === destinationId)?.nombre || "Destino";
  const formattedTravelDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    : "Fecha pendiente";

  // Step 2: Viajes
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  // Step 3: Asientos
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);

  // Step 4: Checkout
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ticketResult, setTicketResult] = useState<any[] | null>(null);
  const [pasajeros, setPasajeros] = useState<Record<string, any>>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(480); // 8 minutos en segundos
  const [userProfile, setUserProfile] = useState<any>(null);

  // Mantener referencia de los asientos seleccionados para liberarlos al desmontar
  const selectedSeatsRef = useRef(selectedSeats);
  const stepRef = useRef(step);
  
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
    stepRef.current = step;
  }, [selectedSeats, step]);

  // Liberar los asientos bloqueados si el usuario abandona la página (desmonta el componente)
  useEffect(() => {
    const releaseMySeats = () => {
      const seats = selectedSeatsRef.current;
      const currentStep = stepRef.current;
      if (seats.length > 0 && currentStep >= 3 && currentStep !== 5) {
        const ids = seats.map(s => s.id);
        const data = JSON.stringify({ seatIds: ids });
        navigator.sendBeacon('/api/release-seats', new Blob([data], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', releaseMySeats);
    
    return () => {
      releaseMySeats();
    };
  }, []);

  // Función para manejar la expiración del temporizador
  const handleExpiration = async () => {
    if (selectedSeatsRef.current.length > 0) {
      setLoading(true);
      const ids = selectedSeatsRef.current.map(s => s.id);
      await liberarAsientos(ids);
      alert("Tu tiempo de reserva para completar el pago ha expirado. Por favor, selecciona nuevamente.");
      setSelectedSeats([]);
      if (selectedTrip) {
        const tripSeats = await getTripSeats(selectedTrip.id);
        setSeats(tripSeats);
      }
      setStep(3);
      setLoading(false);
    }
  };

  // Efecto del temporizador en el paso 4
  useEffect(() => {
    if (step !== 4 || paymentSuccess) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleExpiration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, paymentSuccess, selectedTrip]);

  const handleDownloadPDF = async (ticket: any) => {
    const seatId = ticket.asiento_viaje_id;
    const seat = selectedTrip?.asientos?.find((a: any) => a.id === seatId || a.id === String(seatId) || BigInt(a.id) === seatId);
    
    const dateObj = selectedTrip ? new Date(selectedTrip.fecha_salida || selectedTrip.departure_time) : new Date();
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tipoBus = selectedTrip?.bus?.pisos === 2 ? "Buscama" : "Normal";

    await generateBoletoPDF({
      pasajero: {
        nombres: ticket.nombres || "",
        apellidos: ticket.apellidos || "",
        dni: ticket.dni || "",
      },
      viaje: {
        origen: selectedTrip?.ruta?.origen?.nombre || "",
        destino: selectedTrip?.ruta?.destino?.nombre || "",
        fecha_salida: dateStr,
        hora_salida: timeStr,
        tipoBus: tipoBus,
        placa: selectedTrip?.bus?.placa || "-",
      },
      asiento: {
        numero: seat?.numero_asiento || "-",
        piso: seat?.piso || "-",
      },
      pago: {
        precio: ticket.precio || 0,
      },
      ticket: {
        codigo_qr: ticket.codigo_qr || "",
      },
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cargar datos completos del perfil del cliente autenticado
  useEffect(() => {
    async function fetchPerfilCliente() {
      if (status === "authenticated" && session?.user?.email) {
        try {
          const perfil = await getClienteProfile(session.user.email);
          if (perfil) {
            setUserProfile(perfil);
          }
        } catch (e) {
          console.error("Error al cargar perfil de cliente para autocompletado:", e);
        }
      }
    }
    fetchPerfilCliente();
  }, [session, status]);

  useEffect(() => {
    async function loadLocationsAndAutosearch() {
      const locs = await getLocations();
      setLocations(locs);

      // Si vienen parámetros en la URL, disparar búsqueda automática de viajes
      if (originParam && destinationParam && dateParam) {
        setOriginId(originParam);
        setDestinationId(destinationParam);
        setDate(dateParam);
        
        setStep(2);
        setLoading(true);
        const results = await searchTrips(originParam, destinationParam, dateParam);
        setTrips(results);
        setLoading(false);
      }
    }
    loadLocationsAndAutosearch();
  }, [originParam, destinationParam, dateParam]);

  // Listener para cuando el usuario cierra el modal de Culqi manualmente
  useEffect(() => {
    const handleCulqiMessage = async (event: MessageEvent) => {
      if (event.data === "checkout_cerrado") {
        console.log("Checkout cerrado por el usuario.");
        if (selectedSeats.length > 0) {
          setLoading(true);
          const ids = selectedSeats.map(s => s.id);
          await liberarAsientos(ids);
          alert("Pago fallido");
          setPaymentError("El proceso de pago fue cancelado o cerrado.");
          setStep(3);
          setSelectedSeats([]);
          // Recargar asientos
          if (selectedTrip) {
            const tripSeats = await getTripSeats(selectedTrip.id);
            setSeats(tripSeats);
          }
          setLoading(false);
        }
      }
    };
    
    window.addEventListener("message", handleCulqiMessage);
    return () => {
      window.removeEventListener("message", handleCulqiMessage);
    };
  }, [selectedSeats, selectedTrip]);

  const handleSearchTrips = async () => {
    if (!originId || !destinationId || !date) {
      setErrorStep1("Por favor completa todos los campos.");
      return;
    }
    if (originId === destinationId) {
      setErrorStep1("El origen y el destino no pueden ser iguales.");
      return;
    }
    setErrorStep1("");
    setLoading(true);
    const results = await searchTrips(originId, destinationId, date);
    setTrips(results);
    setStep(2);
    setLoading(false);
  };

  const handleSelectTrip = async (trip: any) => {
    setSelectedTrip(trip);
    setLoading(true);
    const tripSeats = await getTripSeats(trip.id);
    setSeats(tripSeats);
    setStep(3);
    setLoading(false);
  };

  function getGuestToken() {
    if (typeof window !== "undefined") {
      let token = localStorage.getItem("guestToken");
      if (!token) {
        token = "gt_" + Math.random().toString(36).substring(2, 15) + Date.now();
        localStorage.setItem("guestToken", token);
      }
      return token;
    }
    return "gt_fallback";
  }

  const goToStep4 = async () => {
    if (selectedSeats.length === 0) return;
    setLoading(true);
    setPaymentError(null);
    try {
      const ids = selectedSeats.map(s => s.id);
      const token = getGuestToken();
      const reserveRes = await marcarAsientosPendientes(ids, token, session?.user?.email || undefined);
      if (!reserveRes.success) {
        alert(reserveRes.error || "Alguno de los asientos seleccionados ya ha sido tomado.");
        // Volver a cargar asientos
        if (selectedTrip) {
          const tripSeats = await getTripSeats(selectedTrip.id);
          setSeats(tripSeats);
        }
        setSelectedSeats([]);
        setStep(3);
        setLoading(false);
        return;
      }

      // Reiniciar temporizador dinámico (3 mins base + 1 min por asiento)
      const dynamicSeconds = 180 + (selectedSeats.length * 60);
      setTimeLeft(dynamicSeconds);

      // Si hay sesión activa, pre-completamos los nombres del primer asiento
      const initialPasajeros: Record<string, any> = {};
      selectedSeats.forEach((seat, index) => {
        if (index === 0 && (userProfile || session?.user?.name)) {
           let nombres = "";
           let apellidos = "";
           if (userProfile?.nombre) {
             const partes = userProfile.nombre.split(" ");
             nombres = partes.slice(0, Math.ceil(partes.length / 2)).join(" ");
             apellidos = partes.slice(Math.ceil(partes.length / 2)).join(" ");
           } else if (session?.user?.name) {
             const partes = session.user.name.split(" ");
             nombres = partes.slice(0, Math.ceil(partes.length / 2)).join(" ");
             apellidos = partes.slice(Math.ceil(partes.length / 2)).join(" ");
           }
           initialPasajeros[seat.id] = {
             nombres,
             apellidos,
             dni: userProfile?.dni || "",
             telefono: userProfile?.telefono || "",
             email: session?.user?.email || ""
           };
        } else {
           initialPasajeros[seat.id] = { nombres: "", apellidos: "", dni: "", telefono: "", email: "" };
        }
      });
      setPasajeros(initialPasajeros);

      setStep(4);
    } catch (e) {
      console.error("Error al marcar asientos temporales en goToStep4:", e);
      alert("Hubo un error al reservar los asientos temporalmente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePagarConCulqi = async () => {
    // Validar todos los pasajeros
    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const [index, seat] of selectedSeats.entries()) {
      const p = pasajeros[seat.id];
      if (!p.nombres || !p.apellidos || !p.dni) {
        alert(`Faltan datos obligatorios para el pasajero (Asiento ${seat.numero_asiento}).`);
        return;
      }
      if (!nameRegex.test(p.nombres) || p.nombres.length > 50) {
        alert(`El nombre para el Asiento ${seat.numero_asiento} debe contener solo letras y un máximo de 50 caracteres.`);
        return;
      }
      if (!nameRegex.test(p.apellidos) || p.apellidos.length > 50) {
        alert(`Los apellidos para el Asiento ${seat.numero_asiento} deben contener solo letras y un máximo de 50 caracteres.`);
        return;
      }
      if (!/^\d{8}$/.test(p.dni)) {
        alert(`El DNI para el Asiento ${seat.numero_asiento} debe tener exactamente 8 números.`);
        return;
      }
      if (!p.telefono || !/^\d{9}$/.test(p.telefono)) {
        alert(`El celular para el Asiento ${seat.numero_asiento} es obligatorio y debe tener exactamente 9 números.`);
        return;
      }
      if (index === 0) {
        if (!p.email || !emailRegex.test(p.email)) {
          alert("Debes ingresar un correo electrónico válido para el Pasajero 1 (quien recibirá los boletos).");
          return;
        }
      }
    }

    setLoading(true);
    setPaymentError(null);

    try {
      const primerPasajero = pasajeros[selectedSeats[0].id];
      const email = primerPasajero.email;

      // 1. Configurar el objeto Culqi global
      const Culqi = (window as any).Culqi;
      const totalAmount = selectedSeats.length * Number(selectedTrip.ruta.precio_base);

      // 1.5 Crear Orden en el backend para poder usar Yape/PagoEfectivo
      const orderRes = await crearOrdenCulqi(
        totalAmount, 
        email, 
        primerPasajero.nombres, 
        primerPasajero.apellidos, 
        primerPasajero.telefono || "",
        selectedSeats.map(s => s.id)
      );

      if (!orderRes.success || !orderRes.orderId) {
        setPaymentError(orderRes.error || "No se pudo generar la orden de pago.");
        setLoading(false);
        return;
      }

      const culqiPublicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
      if (!culqiPublicKey) {
        setPaymentError("Falta la clave pública de Culqi en el sistema.");
        setLoading(false);
        return;
      }

      Culqi.publicKey = culqiPublicKey;
      Culqi.settings({
        title: 'El Cumbe',
        currency: 'PEN',
        amount: Math.round(totalAmount * 100), // En centavos
        order: orderRes.orderId, // ESTO ES OBLIGATORIO PARA YAPE
      });

      Culqi.options({
        lang: "es",
        installments: false,
        paymentMethods: {
          tarjeta: true,
          yape: true,
          bancaMovil: true,
          agente: true,
          cuotealo: false,
        },
      });

      // 2. Abrir modal
      Culqi.open();

      // 3. Manejar el evento cuando Culqi devuelve un token válido
      (window as any).culqi = async () => {
        if (Culqi.token) {
          const token = Culqi.token.id;
          
          try {
            // a. Crear el cargo en nuestro backend
            const chargeRes = await crearCargoCulqi(
              token, 
              email, 
              totalAmount, 
              selectedSeats.map(s => s.id)
            );
            
            if (!chargeRes.success) {
               setPaymentError(chargeRes.error || "Error al procesar el pago");
               setLoading(false);
               Culqi.close();
               return;
            }

            // b. Pago exitoso, procesar en la DB
            const asientosPasajeros = selectedSeats.map(s => ({
              seatId: s.id,
              pasajeroData: pasajeros[s.id]
            }));

            const res = await procesarPagoMultiplesAsientosCulqi(
              selectedTrip.id,
              asientosPasajeros,
              totalAmount,
              chargeRes.chargeId,
              email,
              getGuestToken()
            );

            if (res.success) {
              setPaymentSuccess(true);
              setTicketResult(res.tickets);
              
              // Enviar correo de forma asíncrona (sin bloquear UI)
              enviarTicketEmail(email, res.tickets, selectedTrip).catch(console.error);
              
              Culqi.close();
            } else {
              setPaymentError(res.error || "Error al emitir boletos en la base de datos.");
              Culqi.close();
            }
          } catch (e) {
            console.error("Error procesando pago en callback:", e);
            const ids = selectedSeats.map(s => s.id);
            await liberarAsientos(ids);
            alert("Ocurrió un error inesperado al procesar el pago.");
            Culqi.close();
          } finally {
            setLoading(false);
          }
        } else if (Culqi.order) {
          console.log("Orden generada exitosamente:", Culqi.order);
          Culqi.close();
        } else {
          console.error("Error de tokenización:", Culqi.error);
          const ids = selectedSeats.map(s => s.id);
          await liberarAsientos(ids);
          alert("Pago fallido");
          setPaymentError(Culqi.error?.user_message || "Pago fallido");
          setStep(3);
          setSelectedSeats([]);
          // Recargar asientos
          const tripSeats = await getTripSeats(selectedTrip.id);
          setSeats(tripSeats);
          setLoading(false);
          Culqi.close();
        }
      };
    } catch (e) {
      console.error("Error al iniciar checkout:", e);
      alert("Error al iniciar el checkout.");
      setLoading(false);
    }
  };

  const seatsPiso1 = seats.filter(s => Number(s.piso) === 1);
  const seatsPiso2 = seats.filter(s => Number(s.piso) === 2);

  const renderTVIcon = () => (
    <svg className="w-4 h-4 text-gray-400 opacity-70 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="M8 3l4 4 4-4" />
    </svg>
  );

  const renderEscaleraIcon = () => (
    <div className="w-8 h-8 flex items-center justify-center">
      <svg className="w-6 h-6 text-gray-400 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h4v-5h4v-5h4v-5h6" />
      </svg>
    </div>
  );

  const renderVolante = () => (
    <div className="text-gray-400 p-1 flex justify-center items-center">
      <svg className="w-8 h-8 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 15l-3.5 6" />
        <path d="M12 15l3.5 6" />
        <path d="M12 9V2" />
        <path d="M4 10l5.5 2" />
        <path d="M20 10l-5.5 2" />
      </svg>
    </div>
  );

  const renderAsientoButton = (seat: any, esPiso1: boolean) => {
    if (!seat) return <div className="w-8 h-8" />;

    const isSelected = selectedSeats.some(s => s.id === seat.id);
    const isOcupadoStatus = seat.estado !== "disponible" && !isSelected;

    const toggleSeat = () => {
      if (isSelected) {
        setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
      } else {
        if (selectedSeats.length >= 6) {
          alert("Puedes seleccionar un máximo de 6 asientos a la vez.");
          return;
        }
        setSelectedSeats(prev => [...prev, seat]);
      }
    };

    let colorClass = "text-[#7c2d12] hover:text-orange-600 bg-transparent hover:scale-105";
    if (isOcupadoStatus) {
      colorClass = "text-gray-300 bg-transparent cursor-not-allowed";
    } else if (isSelected) {
      colorClass = "text-white bg-[#f07639] border-[#d8662d] shadow-md scale-105 rounded-xl";
    }

    return (
      <button
        key={seat.id}
        disabled={isOcupadoStatus || loading}
        onClick={toggleSeat}
        className={`relative w-8 h-8 flex items-center justify-center transition-all focus:outline-none cursor-pointer ${colorClass}`}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Contorno Exterior (Respaldo + Apoyabrazos) */}
          <path
            d="M 22 42 H 28 V 22 C 28 14, 72 14, 72 22 V 42 H 78 C 83 42, 85 46, 85 50 V 78 C 85 86, 77 88, 70 88 H 30 C 23 88, 15 86, 15 78 V 50 C 15 46, 17 42, 22 42 Z"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Línea Interior (Cojín) */}
          <path
            d="M 28 42 V 66 C 28 74, 72 74, 72 66 V 42"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {isOcupadoStatus ? (
            /* Cruz X para ocupados */
            <path
              d="M 40 22 L 60 42 M 60 22 L 40 42"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
            />
          ) : (
            /* Número de Asiento */
            <text
              x="50"
              y="34"
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-bold text-[20px]"
              fill="currentColor"
            >
              {seat.numero_asiento}
            </text>
          )}
        </svg>
      </button>
    );
  };

  const renderAsientosPiso = (asientosPiso: any[], esPiso1: boolean) => {
    const filas: any[][] = [];
    for (let i = 0; i < asientosPiso.length; i += 4) {
      filas.push(asientosPiso.slice(i, i + 4));
    }

    return (
      <div className="space-y-2">
        {filas.map((fila, filaIdx) => (
          <div key={filaIdx} className="grid grid-cols-5 gap-2 items-center justify-items-center">
            {fila[0] ? renderAsientoButton(fila[0], esPiso1) : <div className="w-10 h-10" />}
            {fila[1] ? renderAsientoButton(fila[1], esPiso1) : <div className="w-10 h-10" />}
            <div className="w-3 h-8" />
            {fila[2] ? renderAsientoButton(fila[2], esPiso1) : <div className="w-10 h-10" />}
            {fila[3] ? renderAsientoButton(fila[3], esPiso1) : <div className="w-10 h-10" />}
          </div>
        ))}
      </div>
    );
  };

  const renderPiso1DoblePiso = () => {
    const filasPiso1 = [
      { col1: 1, col2: 2, col4: 3, hasTV: true },
      { col1: 4, col2: 5, col4: 6, hasTV: false },
      { col1: 7, col2: 8, col4: 9, hasTV: false },
      { col1: 10, col2: 11, col4: 12, hasTV: false },
    ];

    return (
      <div className="space-y-0.5">
        {filasPiso1.map((fila, idx) => {
          const seatCol1 = seats.find(s => Number(s.piso) === 1 && s.numero_asiento === fila.col1);
          const seatCol2 = seats.find(s => Number(s.piso) === 1 && s.numero_asiento === fila.col2);
          const seatCol4 = seats.find(s => Number(s.piso) === 1 && s.numero_asiento === fila.col4);

          return (
            <div key={idx} className="flex items-center justify-center gap-0.5">
              {seatCol1 ? renderAsientoButton(seatCol1, true) : <div className="w-8 h-8" />}
              {seatCol2 ? renderAsientoButton(seatCol2, true) : <div className="w-8 h-8" />}
              <div className="w-4 flex items-center justify-center">
                {fila.hasTV && renderTVIcon()}
              </div>
              {seatCol4 ? renderAsientoButton(seatCol4, true) : <div className="w-8 h-8" />}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPiso2DoblePiso = () => {
    type Fila2 = { col1: number; col2: number; col4: number | null; col5: number | null; hasTV: boolean; escalera: boolean };
    const filasPiso2: Fila2[] = [
      { col1: 13, col2: 14, col4: 15, col5: 16, hasTV: true, escalera: false },
      { col1: 17, col2: 18, col4: 19, col5: 20, hasTV: false, escalera: false },
      { col1: 21, col2: 22, col4: null, col5: null, hasTV: false, escalera: true },
      { col1: 23, col2: 24, col4: null, col5: null, hasTV: false, escalera: false },
      { col1: 25, col2: 26, col4: 27, col5: 28, hasTV: true, escalera: false },
      { col1: 29, col2: 30, col4: 31, col5: 32, hasTV: true, escalera: false },
      { col1: 33, col2: 34, col4: 35, col5: 36, hasTV: false, escalera: false },
      { col1: 37, col2: 38, col4: 39, col5: 40, hasTV: false, escalera: false },
      { col1: 41, col2: 42, col4: 43, col5: 44, hasTV: false, escalera: false },
      { col1: 45, col2: 46, col4: 47, col5: 48, hasTV: false, escalera: false },
      { col1: 49, col2: 50, col4: 51, col5: 52, hasTV: true, escalera: false },
      { col1: 53, col2: 54, col4: 55, col5: 56, hasTV: false, escalera: false },
      { col1: 57, col2: 58, col4: 59, col5: 60, hasTV: false, escalera: false },
    ];

    return (
      <div className="space-y-0.5">
        {filasPiso2.map((fila, idx) => {
          const seatCol1 = seats.find(s => Number(s.piso) === 2 && s.numero_asiento === fila.col1);
          const seatCol2 = seats.find(s => Number(s.piso) === 2 && s.numero_asiento === fila.col2);
          const seatCol4 = fila.col4 !== null ? seats.find(s => Number(s.piso) === 2 && s.numero_asiento === fila.col4) : null;
          const seatCol5 = fila.col5 !== null ? seats.find(s => Number(s.piso) === 2 && s.numero_asiento === fila.col5) : null;

          return (
            <div key={idx} className="flex items-center justify-center gap-0.5">
              {seatCol1 ? renderAsientoButton(seatCol1, false) : <div className="w-8 h-8" />}
              {seatCol2 ? renderAsientoButton(seatCol2, false) : <div className="w-8 h-8" />}
              <div className="w-4 flex items-center justify-center">
                {fila.hasTV && renderTVIcon()}
              </div>
              {fila.escalera ? (
                <>{renderEscaleraIcon()}<div className="w-8 h-8" /></>
              ) : fila.col4 === null ? (
                <><div className="w-8 h-8" /><div className="w-8 h-8" /></>
              ) : (
                <>
                  {seatCol4 ? renderAsientoButton(seatCol4, false) : <div className="w-8 h-8" />}
                  {seatCol5 ? renderAsientoButton(seatCol5, false) : <div className="w-8 h-8" />}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStepper = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 z-0"></div>
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-[#f07639] z-0 transition-all duration-500 ease-in-out" 
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="relative z-10 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 ${
              step >= s ? "bg-[#f07639] border-orange-100 text-white" : "bg-white border-gray-200 text-gray-400"
            }`}>
              {s}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs font-medium text-gray-500 px-2">
        <span>Búsqueda</span>
        <span>Viajes</span>
        <span>Asiento</span>
        <span>Pago</span>
      </div>
    </div>
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#f07639] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[60vh] bg-transparent px-0 py-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="relative z-10 mx-auto max-w-6xl">
        {!paymentSuccess && renderStepper()}

        <div className="border-y border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--shadow-md)] sm:rounded-xl sm:border">
          
          {/* STEP 1: Búsqueda */}
          {step === 1 && (
            <div className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col gap-4 border-b border-[var(--card-border)] pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--primary-text)]">
                    <Route className="h-4 w-4" />
                    Planifica tu viaje
                  </div>
                  <h2 className="text-xl font-black text-[var(--foreground)] sm:text-2xl">Define tu ruta</h2>
                  <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-[var(--muted)]">
                    Consulta las salidas de El Cumbe y elige la terminal que mejor se adapte a tu recorrido.
                  </p>
                </div>
                <div className="hidden items-center gap-3 border-l border-[var(--card-border)] pl-5 sm:flex">
                  <ShieldCheck className="h-6 w-6 text-[var(--secondary)]" />
                  <div>
                    <p className="text-xs font-extrabold text-[var(--foreground)]">Compra protegida</p>
                    <p className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">Reserva y pago seguro</p>
                  </div>
                </div>
              </div>

              {errorStep1 && (
                <div className="mt-4 rounded-lg border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-300" role="alert">
                  {errorStep1}
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)]">
                <RouteLocationPicker
                  id="purchase-origin"
                  label="Origen"
                  helper="Terminal de salida"
                  placeholder="Selecciona tu origen"
                  locations={locations}
                  value={originId}
                  onChange={handleOriginChange}
                />

                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--surface-secondary)] text-[var(--muted)] transition-all hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-text)] md:mt-[38px]"
                  aria-label="Intercambiar origen y destino"
                  title="Intercambiar origen y destino"
                >
                  <ArrowLeftRight className="h-5 w-5 md:rotate-0" />
                </button>

                <RouteLocationPicker
                  id="purchase-destination"
                  label="Destino"
                  helper="Terminal de llegada"
                  placeholder="Selecciona tu destino"
                  locations={locations.filter((location) => location.id.toString() !== originId)}
                  value={destinationId}
                  onChange={handleDestinationChange}
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <label htmlFor="purchase-date" className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Fecha de viaje</label>
                  <div className="flex min-h-16 items-center gap-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-4 transition-colors focus-within:border-[var(--primary)]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--secondary)]">
                      <CalendarIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Salida</span>
                      <input
                        id="purchase-date"
                        type="date"
                        min={peruDate}
                        className="mt-0.5 w-full cursor-pointer border-0 bg-transparent p-0 text-sm font-extrabold text-[var(--foreground)] shadow-none focus:ring-0"
                        value={date}
                        onChange={(event) => {
                          const val = event.target.value;
                          if (val && val < peruDate) {
                            setDate(peruDate);
                          } else {
                            setDate(val);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSearchTrips}
                  disabled={loading}
                  className="mt-auto inline-flex min-h-16 w-full items-center justify-center rounded-lg bg-[var(--primary)] px-8 text-base font-extrabold text-white shadow-[0_10px_22px_rgba(223,92,36,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50 md:w-auto"
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                  Buscar Viajes
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-[var(--primary)] pl-3 text-xs font-semibold text-[var(--muted)]">
                <span className="text-[var(--foreground)]">{selectedOriginName}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--primary-text)]" />
                <span className="text-[var(--foreground)]">{selectedDestinationName}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{formattedTravelDate}</span>
              </div>
            </div>
          )}

          {/* STEP 2: Viajes */}
          {step === 2 && (
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-extrabold text-gray-900">Viajes Disponibles</h2>
                <button onClick={() => setStep(1)} className="text-sm text-[#f07639] hover:underline font-medium">Modificar Búsqueda</button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-12 h-12 text-[#f07639] animate-spin mb-4" />
                  <p className="text-gray-500 font-medium text-lg">Buscando los mejores viajes para ti...</p>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay viajes programados</h3>
                  <p className="mt-1 text-sm text-gray-500">Prueba cambiando la fecha o tu lugar de destino.</p>
                  <button
                    onClick={() => setStep(1)}
                    className="mt-6 inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-[#f07639] hover:bg-[#e06528] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f07639] transition-colors"
                  >
                    Volver a la búsqueda
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.map((trip) => (
                    <div key={trip.id} className="border border-gray-200 rounded-2xl p-6 hover:border-[#f07639] transition-all bg-white flex flex-col sm:flex-row justify-between items-center group cursor-pointer" onClick={() => handleSelectTrip(trip)}>
                      <div className="flex items-center space-x-6 mb-4 sm:mb-0">
                        <div className="text-center">
                          <p className="text-3xl font-extrabold text-gray-900">
                            {trip.departure_time_formatted}
                          </p>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Salida</p>
                          <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 uppercase tracking-wide">
                            <BusFront className="w-3 h-3 mr-1" />
                            {trip.bus?.pisos === 2 ? "Buscama" : "Normal"}
                          </div>
                        </div>
                        <div className="h-12 w-px bg-gray-200 hidden sm:block"></div>
                        <div>
                          <p className="text-lg font-bold text-[#f07639]">S/ {trip.ruta.precio_base}</p>
                          <p className="text-sm text-gray-500 font-medium">
                            <span className="text-green-600 font-bold">{trip.available_seats}</span> asientos disponibles
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0 w-full sm:w-auto">
                        {trip.bus?.imagenes && trip.bus.imagenes.trim() !== "" && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const imgs = trip.bus.imagenes.split(",").map((i: string) => i.trim()).filter((i: string) => i !== "").map((i: string) => i.startsWith("http") || i.startsWith("/") ? i : `/${i}`);
                              if (imgs.length > 0) {
                                setBusImages(imgs);
                                setCurrentImageIndex(0);
                                setIsImagesModalOpen(true);
                              }
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            Ver Bus
                          </button>
                        )}
                        <button className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-[#f07639] hover:text-white transition-colors">
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Asientos */}
          {step === 3 && (
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-extrabold text-gray-900">Selecciona tu Asiento</h2>
                <button onClick={() => setStep(2)} className="text-sm text-[#f07639] hover:underline font-medium">Volver a Viajes</button>
              </div>

              {/* Leyenda horizontal + Botón */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-5 rounded-t rounded-b-sm border border-[#7c2d12] bg-white" />
                    <span>Disponible</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-5 rounded-t rounded-b-sm border border-[#d8662d] bg-[#f07639]" />
                    <span>Seleccionado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-5 rounded-t rounded-b-sm border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-300">
                      <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <span>Ocupado</span>
                  </div>
                </div>

                {paymentError && (
                  <span className="text-red-600 text-xs font-medium">{paymentError}</span>
                )}

                <div className="flex items-center gap-4 ml-auto">
                  {selectedSeats.length > 0 && (
                    <span className="text-sm font-bold text-gray-900 bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200">
                      {selectedSeats.length} Asiento{selectedSeats.length > 1 ? 's' : ''} (S/ {selectedSeats.length * (selectedTrip?.ruta.precio_base || 0)})
                    </span>
                  )}
                  <button
                    disabled={selectedSeats.length === 0 || loading}
                    onClick={goToStep4}
                    className="flex items-center px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#f07639] hover:bg-[#d8662d] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Continuar al Pago <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Croquis de Asientos */}
              {selectedTrip?.bus?.pisos === 2 ? (
                <div className="flex flex-col md:flex-row justify-center gap-4">
                  {/* Primer Piso */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-3 pb-4 shadow-sm">
                    <div className="flex items-center space-x-2 mb-2">
                       {renderVolante()}
                       <span className="text-xs font-extrabold text-gray-700">Primer Piso</span>
                    </div>
                    {renderPiso1DoblePiso()}
                  </div>

                  {/* Segundo Piso */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-3 pb-4 shadow-sm">
                    <div className="flex justify-center items-center mb-2">
                       <span className="text-xs font-extrabold text-gray-700">Segundo Piso</span>
                    </div>
                    {renderPiso2DoblePiso()}
                  </div>
                </div>
              ) : (
                /* Bus de 1 solo piso */
                <div className="max-w-xs bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mx-auto">
                  <div className="flex items-center space-x-2 mb-3">
                    {renderVolante()}
                    <span className="text-xs font-extrabold text-gray-700">Distribución de Asientos</span>
                  </div>
                  {renderAsientosPiso(seats, true)}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Checkout */}
          {step === 4 && !paymentSuccess && (
            <div className="p-6 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold text-gray-900">Resumen de Compra</h2>
                <button 
                  onClick={async () => {
                    if (selectedSeats.length > 0) {
                      setLoading(true);
                      const ids = selectedSeats.map(s => s.id);
                      await liberarAsientos(ids);
                      setSelectedSeats([]);
                      setLoading(false);
                    }
                    setStep(3);
                  }} 
                  className="text-sm text-[#f07639] hover:underline font-medium"
                  disabled={loading}
                >
                  Cambiar Asiento
                </button>
              </div>

              {/* Layout de dos columnas para optimizar espacio */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                {/* Lado izquierdo (Datos y Botón de Pago) - 2/3 en pantallas medianas y grandes */}
                <div className="md:col-span-2 space-y-6">
                  {/* Formularios de los Pasajeros */}
                  <div className="space-y-6">
                    {selectedSeats.map((seat, index) => {
                      const p = pasajeros[seat.id] || { nombres: "", apellidos: "", dni: "", telefono: "" };
                      return (
                        <div key={seat.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-bold text-gray-900">
                              Pasajero {index + 1}
                            </h3>
                            <span className="text-sm font-bold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                              Asiento {seat.numero_asiento} (Piso {seat.piso})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                              <input 
                                type="text" 
                                value={p.nombres}
                                onChange={(e) => setPasajeros({...pasajeros, [seat.id]: {...p, nombres: e.target.value.toUpperCase()}})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none text-gray-900 bg-white text-sm"
                                disabled={loading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                              <input 
                                type="text" 
                                value={p.apellidos}
                                onChange={(e) => setPasajeros({...pasajeros, [seat.id]: {...p, apellidos: e.target.value.toUpperCase()}})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none text-gray-900 bg-white text-sm"
                                disabled={loading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
                              <input 
                                type="text" 
                                maxLength={8}
                                value={p.dni}
                                onChange={(e) => setPasajeros({...pasajeros, [seat.id]: {...p, dni: e.target.value.replace(/\D/g, "")}})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none text-gray-900 bg-white text-sm"
                                disabled={loading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Celular *</label>
                              <input 
                                type="text" 
                                maxLength={9}
                                value={p.telefono}
                                onChange={(e) => setPasajeros({...pasajeros, [seat.id]: {...p, telefono: e.target.value.replace(/\D/g, "")}})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none text-gray-900 bg-white text-sm"
                                disabled={loading}
                              />
                            </div>
                            {index === 0 && (
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                                <input 
                                  type="email" 
                                  value={p.email || ""}
                                  onChange={(e) => setPasajeros({...pasajeros, [seat.id]: {...p, email: e.target.value}})}
                                  placeholder="ejemplo@correo.com"
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f07639] outline-none text-gray-900 bg-white text-sm"
                                  disabled={loading}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {paymentError && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium text-center border border-red-100">
                      {paymentError}
                    </div>
                  )}

                  <button
                    onClick={handlePagarConCulqi}
                    disabled={loading || selectedSeats.some((seat, idx) => {
                      const p = pasajeros[seat.id];
                      const emailValido = idx === 0 ? (p && p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) : true;
                      const telefonoValido = p && p.telefono && /^\d{9}$/.test(p.telefono);
                      return !p || !p.nombres || !p.apellidos || !p.dni || !telefonoValido || !emailValido;
                    })}
                    className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Procesando...
                      </>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <span>Pagar con</span>
                        <img 
                          src="/culqilogo.png" 
                          alt="Culqi" 
                          className="h-7 object-contain bg-white px-2 py-0.5 rounded shadow-sm"
                        />
                      </div>
                    )}
                  </button>
                </div>

                {/* Lado derecho (Temporizador y Detalle de Compra) - 1/3 en pantallas medianas y grandes */}
                <div className="space-y-4">
                  {/* Temporizador de Cuenta Regresiva */}
                  <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-red-600 animate-pulse" />
                      <div>
                        <p className="font-bold text-xs">Tiempo para pagar</p>
                      </div>
                    </div>
                    <div className="bg-red-600 text-white font-mono font-black text-base px-3 py-1.5 rounded-lg shadow-sm border border-red-700 tracking-wider">
                      {formatTime(timeLeft)}
                    </div>
                  </div>

                  {/* Resumen de Ruta y Precio */}
                  <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100 shadow-sm">
                    <h4 className="text-sm font-bold text-orange-950 mb-3 border-b border-orange-200 pb-2">Detalles del Viaje</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-orange-800 font-medium opacity-75">Fecha y Hora</p>
                        <p className="text-sm font-bold text-gray-900">
                          {selectedTrip && new Date(selectedTrip.fecha_salida || selectedTrip.departure_time).toLocaleDateString()} - {selectedTrip && new Date(selectedTrip.fecha_salida || selectedTrip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-orange-800 font-medium opacity-75">Asientos ({selectedSeats.length})</p>
                        <p className="text-sm font-bold text-gray-900">{selectedSeats.map(s => `N° ${s.numero_asiento}`).join(', ')}</p>
                      </div>
                      <div className="pt-2 border-t border-orange-200 flex justify-between items-center">
                        <p className="text-sm font-bold text-gray-900">Total a Pagar</p>
                        <p className="text-2xl font-extrabold text-[#f07639]">S/ {selectedSeats.length * Number(selectedTrip?.ruta.precio_base)}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* PAGO EXITOSO */}
          {/* PAGO EXITOSO */}
          {paymentSuccess && (
            <div className="p-6 md:p-8 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">¡Compra Exitosa!</h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-3">
                Tu pasaje está confirmado. Presenta el código de abordaje al subir al bus.
              </p>
              
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-50 border border-green-200 text-xs font-semibold text-green-700 mb-6">
                ✓ Se ha enviado una copia a tu correo electrónico
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left mb-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1.5">Boletos Emitidos</p>
                <div className="space-y-2.5">
                  {ticketResult?.map((ticket, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-3 rounded-xl border border-gray-200 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase">Pasajero</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">{ticket.nombres} {ticket.apellidos}</p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium uppercase">Código de Abordaje</p>
                          <p className="text-sm font-mono font-bold text-[#f07639]">{ticket.codigo_qr}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDownloadPDF(ticket)}
                            className="bg-[#f07639] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#e06528] transition-all shadow-sm whitespace-nowrap"
                            title="Descargar PDF"
                          >
                            Descargar PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Link href="/" className="inline-flex justify-center items-center py-2.5 px-6 border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all">
                Volver al Inicio
              </Link>
            </div>
          )}

        </div>

        {/* MODAL IMÁGENES DEL BUS */}
        {isImagesModalOpen && busImages.length > 0 && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
            onClick={() => setIsImagesModalOpen(false)}
          >
            <div 
              className="bg-white rounded-3xl overflow-hidden w-full max-w-2xl flex flex-col max-h-[80vh] shadow-2xl border border-gray-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f07639]"></span>
                  Fotos del Bus
                </h3>
                <button 
                  onClick={() => setIsImagesModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
                >
                  &times;
                </button>
              </div>

              {/* Contenedor de la Imagen */}
              <div className="relative flex-1 bg-gray-950 flex items-center justify-center min-h-[300px] overflow-hidden">
                <img 
                  src={busImages[currentImageIndex]} 
                  alt="Bus" 
                  className="max-w-full max-h-[45vh] object-contain transition-all duration-300"
                />
                
                {/* Controles de Navegación Lateral */}
                {busImages.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? busImages.length - 1 : prev - 1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => prev === busImages.length - 1 ? 0 : prev + 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails en la parte inferior */}
              {busImages.length > 1 && (
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-center gap-2 overflow-x-auto">
                  {busImages.map((img, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${idx === currentImageIndex ? 'border-[#f07639] scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function CompraPage() {
  return (
    <>
      <Script src="https://checkout.culqi.com/js/v4" strategy="afterInteractive" />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#f07639] w-10 h-10" /></div>}>
        <CompraContent />
      </Suspense>
    </>
  );
}
