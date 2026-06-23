"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getLocations, searchTrips, getTripSeats, simularPagoYCrearTicket } from "@/app/actions";
import { Loader2, ArrowRight, MapPin, Calendar as CalendarIcon, Clock, CheckCircle, BusFront, Search } from "lucide-react";
import Link from "next/link";

export default function CompraPage() {
  const { data: session, status } = useSession();
  
  // Stepper state
  const [step, setStep] = useState(1);
  
  // Global loading state for actions
  const [loading, setLoading] = useState(false);

  // Step 1: Búsqueda
  const [locations, setLocations] = useState<any[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [date, setDate] = useState("");
  const [errorStep1, setErrorStep1] = useState("");

  // Step 2: Viajes
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  // Step 3: Asientos
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);

  // Step 4: Checkout
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ticketResult, setTicketResult] = useState<any | null>(null);

  useEffect(() => {
    async function loadLocations() {
      const locs = await getLocations();
      setLocations(locs);
    }
    loadLocations();
  }, []);

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

  const handlePayment = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const result = await simularPagoYCrearTicket(
        selectedSeat.id, 
        session.user.email, 
        selectedTrip.ruta.precio_base
      );
      setTicketResult(result);
      setPaymentSuccess(true);
    } catch (error: any) {
      alert(error.message || "Error procesando el pago");
    } finally {
      setLoading(false);
    }
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
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#f07639] w-10 h-10" /></div>;
  }

  // Requiere autenticación
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl text-center">
          <BusFront className="mx-auto h-16 w-16 text-[#f07639]" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Inicia sesión para comprar</h2>
          <p className="mt-2 text-sm text-gray-600">
            Necesitas tener una cuenta en El Cumbe para poder adquirir tus pasajes de manera segura.
          </p>
          <div className="mt-8 space-y-4">
            <Link href="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#f07639] hover:bg-[#d8662d] transition-colors">
              Iniciar Sesión
            </Link>
            <Link href="/registro" className="w-full flex justify-center py-3 px-4 border border-[#f07639] rounded-xl shadow-sm text-sm font-medium text-[#f07639] bg-white hover:bg-orange-50 transition-colors">
              Crear una cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {!paymentSuccess && renderStepper()}

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          
          {/* STEP 1: Búsqueda */}
          {step === 1 && (
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">¿A dónde quieres viajar hoy?</h2>
              
              {errorStep1 && (
                <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium text-center border border-red-100">
                  {errorStep1}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Origen</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      className="block w-full pl-10 py-4 text-base border-gray-300 focus:outline-none focus:ring-[#f07639] focus:border-[#f07639] sm:text-sm rounded-xl bg-gray-50"
                      value={originId}
                      onChange={(e) => setOriginId(e.target.value)}
                    >
                      <option value="">Selecciona Origen</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destino</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      className="block w-full pl-10 py-4 text-base border-gray-300 focus:outline-none focus:ring-[#f07639] focus:border-[#f07639] sm:text-sm rounded-xl bg-gray-50"
                      value={destinationId}
                      onChange={(e) => setDestinationId(e.target.value)}
                    >
                      <option value="">Selecciona Destino</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Viaje</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      className="block w-full pl-10 py-4 text-base border-gray-300 focus:outline-none focus:ring-[#f07639] focus:border-[#f07639] sm:text-sm rounded-xl bg-gray-50"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 text-center">
                <button
                  onClick={handleSearchTrips}
                  disabled={loading}
                  className="inline-flex items-center px-10 py-4 border border-transparent text-lg font-bold rounded-xl shadow-sm text-white bg-[#f07639] hover:bg-[#d8662d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f07639] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                  Buscar Viajes
                </button>
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

              {trips.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay viajes programados</h3>
                  <p className="mt-1 text-sm text-gray-500">Prueba cambiando la fecha o tu lugar de destino.</p>
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
                        </div>
                        <div className="h-12 w-px bg-gray-200 hidden sm:block"></div>
                        <div>
                          <p className="text-lg font-bold text-[#f07639]">S/ {trip.ruta.precio_base}</p>
                          <p className="text-sm text-gray-500 font-medium">
                            <span className="text-green-600 font-bold">{trip.available_seats}</span> asientos disponibles
                          </p>
                        </div>
                      </div>
                      <button className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl group-hover:bg-[#f07639] group-hover:text-white transition-colors">
                        Seleccionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Asientos */}
          {step === 3 && (
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-extrabold text-gray-900">Selecciona tu Asiento</h2>
                <button onClick={() => setStep(2)} className="text-sm text-[#f07639] hover:underline font-medium">Volver a Viajes</button>
              </div>

              <div className="flex flex-col md:flex-row gap-12">
                <div className="flex-1">
                  <div className="bg-gray-100 p-8 rounded-[3rem] border-4 border-gray-200 max-w-xs mx-auto relative">
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-gray-400">
                      <div className="w-16 h-2 bg-gray-300 rounded-full"></div>
                    </div>
                    <div className="mt-8 grid grid-cols-4 gap-4">
                      {seats.map((seat) => {
                        const isAvailable = seat.estado === "disponible";
                        const isSelected = selectedSeat?.id === seat.id;
                        return (
                          <button
                            key={seat.id}
                            disabled={!isAvailable}
                            onClick={() => setSelectedSeat(seat)}
                            className={`
                              h-12 w-full rounded-t-lg rounded-b-sm border-2 font-bold text-sm flex items-center justify-center transition-all
                              ${isSelected ? "bg-[#f07639] border-[#f07639] text-white shadow-md transform -translate-y-1" : ""}
                              ${!isSelected && isAvailable ? "bg-white border-gray-300 text-gray-600 hover:border-[#f07639] hover:text-[#f07639]" : ""}
                              ${!isAvailable ? "bg-gray-300 border-gray-300 text-gray-400 cursor-not-allowed" : ""}
                            `}
                          >
                            {seat.numero_asiento}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Leyenda</h3>
                    <div className="space-y-3">
                      <div className="flex items-center"><div className="w-6 h-6 rounded-t border-2 border-gray-300 bg-white mr-3"></div><span className="text-sm text-gray-600">Disponible</span></div>
                      <div className="flex items-center"><div className="w-6 h-6 rounded-t border-2 border-[#f07639] bg-[#f07639] mr-3"></div><span className="text-sm text-gray-600">Seleccionado</span></div>
                      <div className="flex items-center"><div className="w-6 h-6 rounded-t border-2 border-gray-300 bg-gray-300 mr-3"></div><span className="text-sm text-gray-600">Ocupado</span></div>
                    </div>
                  </div>

                  <button
                    disabled={!selectedSeat}
                    onClick={() => setStep(4)}
                    className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-[#f07639] hover:bg-[#d8662d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f07639] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Continuar al Pago <ArrowRight className="ml-2 w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Checkout */}
          {step === 4 && !paymentSuccess && (
            <div className="p-8 md:p-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-extrabold text-gray-900">Resumen de Compra</h2>
                <button onClick={() => setStep(3)} className="text-sm text-[#f07639] hover:underline font-medium">Cambiar Asiento</button>
              </div>

              <div className="bg-orange-50 rounded-2xl p-8 border border-orange-100 mb-8">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-sm text-orange-800 font-medium opacity-70 mb-1">Fecha y Hora</p>
                    <p className="text-lg font-bold text-gray-900">
                      {new Date(selectedTrip.departure_time).toLocaleDateString()} - {new Date(selectedTrip.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-800 font-medium opacity-70 mb-1">Asiento</p>
                    <p className="text-lg font-bold text-gray-900">N° {selectedSeat.numero_asiento}</p>
                  </div>
                  <div className="col-span-2 pt-4 border-t border-orange-200">
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-bold text-gray-900">Total a Pagar</p>
                      <p className="text-3xl font-extrabold text-[#f07639]">S/ {selectedTrip.ruta.precio_base}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full flex justify-center items-center py-5 px-4 border border-transparent rounded-xl shadow-lg text-xl font-bold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle className="w-6 h-6 mr-2" />}
                Confirmar y Pagar (Simulado)
              </button>
            </div>
          )}

          {/* PAGO EXITOSO */}
          {paymentSuccess && (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4">¡Compra Exitosa!</h2>
              <p className="text-lg text-gray-600 max-w-md mx-auto mb-8">
                Tu pasaje ha sido confirmado. Presenta este código al abordar el bus.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 max-w-sm mx-auto mb-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Código de Ticket</p>
                <p className="text-2xl font-mono font-bold text-gray-900 break-all">{ticketResult?.codigo_qr}</p>
              </div>

              <Link href="/" className="inline-flex justify-center items-center py-3 px-8 border border-gray-300 rounded-xl shadow-sm text-lg font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all">
                Volver al Inicio
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
