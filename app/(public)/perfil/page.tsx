"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { getClienteProfile, updateClienteProfile } from "@/app/actions";
import { User, Calendar, Phone, CreditCard, Mail, Ticket, CheckCircle, Save, Loader2, Bus, Download, Search, X, MapPin, Lock } from "lucide-react";
import { generateBoletoPDF } from "@/lib/pdfUtils";
import QRCode from "qrcode";
import Link from "next/link";

function PerfilContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "datos";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Filtros de Tickets
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState("");

  // Modal de Detalle de Ticket
  const [ticketSeleccionado, setTicketSeleccionado] = useState<any>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      loadProfile();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session]);

  // Sincronizar tab desde url
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "tickets" || tab === "datos") {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab("datos");
    }
  }, [searchParams]);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await getClienteProfile(session!.user!.email!);
      if (data) {
        setProfile(data);
        const fullName = data.persona ? `${data.persona.nombres} ${data.persona.apellidos}`.trim() : "";
        setNombre(fullName);
        setDni(data.persona?.dni || "");
        setTelefono(data.persona?.telefono || "");
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
      setError("Error al obtener la información de perfil.");
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPDF = async (ticket: any) => {
    const salida = ticket.asiento_viaje?.viaje?.fecha_salida 
      ? new Date(ticket.asiento_viaje.viaje.fecha_salida) 
      : null;
      
    const dateStr = salida ? salida.toLocaleDateString() : "";
    const timeStr = salida ? salida.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";
    const tipoBus = ticket.asiento_viaje?.viaje?.bus?.pisos === 2 ? "Buscama" : "Normal";

    await generateBoletoPDF({
      pasajero: {
        nombres: ticket.nombres || "",
        apellidos: ticket.apellidos || "",
        dni: ticket.dni || "",
      },
      viaje: {
        origen: ticket.asiento_viaje?.viaje?.ruta?.origen?.nombre || "",
        destino: ticket.asiento_viaje?.viaje?.ruta?.destino?.nombre || "",
        fecha_salida: dateStr,
        hora_salida: timeStr,
        tipoBus: tipoBus,
        placa: ticket.asiento_viaje?.viaje?.bus?.placa || "-",
      },
      asiento: {
        numero: ticket.asiento_viaje?.numero_asiento || "-",
        piso: ticket.asiento_viaje?.piso || "-",
      },
      pago: {
        precio: ticket.precio || 0,
      },
      ticket: {
        codigo_qr: ticket.codigo_qr || "",
      },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!nombre.trim()) {
      setError("El nombre es requerido.");
      return;
    }

    if (newPassword && newPassword.trim().length > 0 && newPassword.trim().length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (dni && !/^\d{8}$/.test(dni)) {
      setError("El DNI debe tener exactamente 8 dígitos numéricos.");
      return;
    }

    if (telefono && !/^\d{9}$/.test(telefono)) {
      setError("El teléfono debe tener exactamente 9 dígitos numéricos.");
      return;
    }

    try {
      setSaving(true);
      const res = await updateClienteProfile(session!.user!.email!, {
        nombre,
        dni: dni || undefined,
        telefono: telefono || undefined,
        newPassword: newPassword || undefined,
      });

      if (res.success) {
        setSuccessMsg("¡Tus datos se actualizaron con éxito!");
        setNewPassword(""); // Limpiar la contraseña si se actualizó
        setIsEditing(false); // Volver al modo lectura
        await loadProfile();
      } else {
        setError(res.error || "Ocurrió un error al guardar los datos.");
      }
    } catch (err: any) {
      setError(err.message || "Error al actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  // Lógica de Filtros para Pasajes
  const origenesUnicos = Array.from(
    new Set(
      profile?.pasajes
        ?.map((t: any) => t.asiento_viaje?.viaje?.ruta?.origen?.nombre)
        .filter(Boolean)
    )
  ) as string[];

  const pasajesFiltrados = profile?.pasajes?.filter((ticket: any) => {
    let cumpleFecha = true;
    let cumpleOrigen = true;

    if (filtroFecha) {
      const salida = ticket.asiento_viaje?.viaje?.fecha_salida;
      if (salida) {
        // Extraer formato local YYYY-MM-DD
        const dateObj = new Date(salida);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const fechaLocal = `${yyyy}-${mm}-${dd}`;
        cumpleFecha = fechaLocal === filtroFecha;
      } else {
        cumpleFecha = false;
      }
    }

    if (filtroOrigen) {
      cumpleOrigen = ticket.asiento_viaje?.viaje?.ruta?.origen?.nombre === filtroOrigen;
    }

    return cumpleFecha && cumpleOrigen;
  }) || [];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#f07639] w-10 h-10" />
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "cliente") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl text-center border border-gray-100">
          <User className="mx-auto h-16 w-16 text-[#f07639]" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Inicia sesión como cliente</h2>
          <p className="mt-2 text-sm text-gray-600">
            Para acceder a tu perfil y revisar tus pasajes, debes estar autenticado como cliente.
          </p>
          <div className="mt-8 space-y-4">
            <Link
              href="/login?callbackUrl=/perfil"
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#f07639] hover:bg-[#d8662d] transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/registro"
              className="w-full flex justify-center py-3.5 px-4 border border-[#f07639] rounded-xl text-sm font-bold text-[#f07639] bg-white hover:bg-orange-50 transition-colors"
            >
              Crear una cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Cabecera del Perfil */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 mb-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-[#f07639] flex-shrink-0">
              <User size={44} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                {profile?.persona ? `${profile.persona.nombres} ${profile.persona.apellidos}` : "Cliente"}
              </h1>
              <p className="text-sm text-gray-500 font-medium flex items-center justify-center sm:justify-start gap-1">
                <Mail size={14} className="text-gray-400" />
                {profile?.correo}
              </p>
              <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-[#f07639]">
                Cliente Registrado
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                <CreditCard size={14} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">DNI</p>
                <p className="text-sm font-semibold text-gray-800">{profile?.persona?.dni || "No registrado"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                <Phone size={14} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Teléfono</p>
                <p className="text-sm font-semibold text-gray-800">{profile?.persona?.telefono || "No registrado"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Pestañas (Tabs) */}
        <div className="flex border-b border-gray-200 mb-8 bg-white p-2 rounded-xl shadow-sm border">
          <button
            onClick={() => setActiveTab("datos")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === "datos"
                ? "bg-[#f07639] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <User size={18} />
            Mis Datos Personales
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === "tickets"
                ? "bg-[#f07639] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Ticket size={18} />
            Mis Pasajes / Tickets ({profile?.pasajes?.length || 0})
          </button>
        </div>

        {/* CONTENIDO DE LA PESTAÑA: DATOS */}
        {activeTab === "datos" && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[#f07639] rounded-full"></span>
                Información de Perfil
              </h2>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-[#f07639] text-sm font-bold rounded-xl text-[#f07639] bg-white hover:bg-orange-50 transition-colors"
                >
                  Editar Datos
                </button>
              )}
            </div>

            {error && (
              <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium border border-green-100 flex items-center gap-2">
                <CheckCircle size={18} />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className={`h-5 w-5 ${isEditing ? 'text-gray-400' : 'text-gray-300'}`} />
                    </div>
                    <input
                      type="text"
                      className={`block w-full pl-11 pr-4 py-3.5 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639] rounded-xl text-gray-800 ${!isEditing && 'bg-gray-100/50 cursor-not-allowed text-gray-500'}`}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Juan Pérez"
                      required
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Número de Celular</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Phone className={`h-5 w-5 ${isEditing ? 'text-gray-400' : 'text-gray-300'}`} />
                    </div>
                    <input
                      type="text"
                      maxLength={9}
                      className={`block w-full pl-11 pr-4 py-3.5 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639] rounded-xl text-gray-800 ${!isEditing && 'bg-gray-100/50 cursor-not-allowed text-gray-500'}`}
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
                      placeholder="987654321"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                {/* Nueva Contraseña */}
                {isEditing && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cambiar Contraseña (Opcional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        className="block w-full pl-11 pr-4 py-3.5 text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f07639]/20 focus:border-[#f07639] rounded-xl bg-white text-gray-800 placeholder-gray-300"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400 font-medium">Déjalo en blanco si no deseas cambiarla.</p>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      loadProfile(); // Reset fields to original
                    }}
                    disabled={saving}
                    className="inline-flex items-center justify-center px-6 py-3.5 border border-gray-200 text-sm font-bold rounded-xl text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-[#f07639] hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* CONTENIDO DE LA PESTAÑA: TICKETS */}
        {activeTab === "tickets" && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#f07639] rounded-full"></span>
              Historial de Pasajes Comprados
            </h2>

            {!profile?.pasajes || profile.pasajes.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Ticket className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aún no has comprado pasajes</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-xs mx-auto">
                  Tus boletos comprados aparecerán aquí para que puedas abordar y rastrearlos.
                </p>
                <div className="mt-6">
                  <Link
                    href="/compra"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-[#f07639] hover:bg-orange-600 transition-colors"
                  >
                    Comprar mi primer pasaje
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Sección de Filtros */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  {/* Filtro Fecha */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Filtrar por Fecha de Viaje</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-[#f07639] focus:border-[#f07639] bg-white text-gray-700"
                      />
                    </div>
                  </div>
                  
                  {/* Filtro Origen */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Filtrar por Origen</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-4 w-4 text-gray-400" />
                      </div>
                      <select
                        value={filtroOrigen}
                        onChange={(e) => setFiltroOrigen(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-[#f07639] focus:border-[#f07639] bg-white text-gray-700"
                      >
                        <option value="">Todos los orígenes</option>
                        {origenesUnicos.map((origen, idx) => (
                          <option key={idx} value={origen}>{origen}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {pasajesFiltrados.length === 0 ? (
                  <div className="text-center py-10">
                    <Search className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No se encontraron pasajes que coincidan con los filtros.</p>
                    <button 
                      onClick={() => { setFiltroFecha(""); setFiltroOrigen(""); }}
                      className="mt-3 text-[#f07639] text-sm font-semibold hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pasajesFiltrados.map((ticket: any) => {
                      const salida = ticket.asiento_viaje?.viaje?.fecha_salida 
                        ? new Date(ticket.asiento_viaje.viaje.fecha_salida) 
                        : null;
                      
                      return (
                        <div 
                          key={ticket.id} 
                          className="border border-gray-200 rounded-2xl p-6 hover:border-[#f07639] transition-all bg-white relative overflow-hidden group flex flex-col md:flex-row justify-between items-center gap-6"
                        >
                          <div className="flex-1 space-y-4 w-full">
                            <div className="flex items-center gap-3">
                              <Bus className="h-6 w-6 text-[#f07639]" />
                              <div>
                                <span className="text-sm font-bold text-gray-900 uppercase block">
                                  Bus {ticket.asiento_viaje?.viaje?.bus?.pisos === 2 ? "Buscama" : "Normal"} - N° {ticket.asiento_viaje?.viaje?.bus?.placa}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Ruta</span>
                                <span className="text-sm font-bold text-gray-800">
                                  {ticket.asiento_viaje?.viaje?.ruta?.origen?.nombre} &rarr; {ticket.asiento_viaje?.viaje?.ruta?.destino?.nombre}
                                </span>
                              </div>

                              <div>
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Fecha y Hora</span>
                                <span className="text-sm font-bold text-gray-800">
                                  {salida 
                                    ? `${salida.toLocaleDateString()} - ${salida.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : "No especificado"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-xl border border-gray-100 text-center w-full md:w-auto min-w-[200px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Estado del Pasaje</span>
                            <span className="text-[10px] text-green-600 font-semibold mb-2 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              Pagado
                            </span>
                            
                            <div className="flex flex-col gap-2 w-full mt-2">
                              <button
                                onClick={() => setTicketSeleccionado(ticket)}
                                className="flex items-center justify-center w-full px-3 py-2 text-xs font-bold text-[#f07639] border-2 border-[#f07639] hover:bg-orange-50 rounded-lg transition-colors shadow-sm"
                              >
                                <Ticket className="w-3.5 h-3.5 mr-1" />
                                Ver Detalle
                              </button>
                              
                              <button
                                onClick={() => handleDownloadPDF(ticket)}
                                className="flex items-center justify-center w-full px-3 py-2 text-xs font-bold text-white bg-[#f07639] hover:bg-orange-600 rounded-lg transition-colors shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5 mr-1" />
                                Descargar PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE DE TICKET */}
      {ticketSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            {/* Header Modal */}
            <div className="bg-[#f07639] p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Ticket className="w-5 h-5" /> Detalle del Pasaje
              </h3>
              <button onClick={() => setTicketSeleccionado(null)} className="text-white hover:text-orange-200 transition-colors rounded-full p-1 hover:bg-white/10">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Body Modal */}
            <div className="p-6 overflow-y-auto bg-white flex flex-col items-center">
              {/* Info Pasajero */}
              <div className="w-full text-center border-b border-gray-100 pb-4 mb-4">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Pasajero</p>
                <h4 className="text-lg font-extrabold text-gray-900">{ticketSeleccionado.nombres} {ticketSeleccionado.apellidos}</h4>
                <p className="text-sm font-medium text-gray-500">DNI: {ticketSeleccionado.dni}</p>
              </div>

              {/* Grid Info Viaje */}
              <div className="w-full grid grid-cols-2 gap-4 mb-6 text-center">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Ruta</p>
                  <p className="text-sm font-bold text-gray-800">
                    {ticketSeleccionado.asiento_viaje?.viaje?.ruta?.origen?.nombre} <br/> 
                    <span className="text-xs text-gray-400">&darr;</span> <br/>
                    {ticketSeleccionado.asiento_viaje?.viaje?.ruta?.destino?.nombre}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Fecha de Salida</p>
                  <p className="text-sm font-bold text-gray-800">
                    {ticketSeleccionado.asiento_viaje?.viaje?.fecha_salida 
                      ? new Date(ticketSeleccionado.asiento_viaje.viaje.fecha_salida).toLocaleDateString()
                      : "N/A"}
                  </p>
                  <p className="text-sm font-bold text-[#f07639]">
                    {ticketSeleccionado.asiento_viaje?.viaje?.fecha_salida 
                      ? new Date(ticketSeleccionado.asiento_viaje.viaje.fecha_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 col-span-2 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-orange-600/70 font-bold uppercase mb-0.5 text-left">Asiento N°</p>
                    <p className="text-xl font-extrabold text-[#f07639] text-left">{ticketSeleccionado.asiento_viaje?.numero_asiento}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-orange-600/70 font-bold uppercase mb-0.5">Piso</p>
                    <p className="text-lg font-bold text-[#f07639]">{ticketSeleccionado.asiento_viaje?.piso}</p>
                  </div>
                </div>
              </div>

              {/* Código de Abordaje y QR */}
              <div className="flex flex-col items-center justify-center w-full">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Código de Abordaje</p>
                
                {/* Generación en vivo del QR como imagen en Base64 */}
                <QRCodeGenerator text={ticketSeleccionado.codigo_qr} />

                <span className="mt-3 text-lg font-mono font-bold text-gray-800 select-all tracking-wider bg-gray-100 px-4 py-1.5 rounded-lg border border-gray-300">
                  {ticketSeleccionado.codigo_qr}
                </span>
                
                <p className="text-xs text-gray-400 text-center mt-4 px-4">
                  Presenta este código al momento de abordar el bus. No es necesario imprimirlo.
                </p>
              </div>
            </div>
            
            {/* Footer Modal */}
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => handleDownloadPDF(ticketSeleccionado)}
                className="w-full flex items-center justify-center px-4 py-3.5 text-sm font-bold text-white bg-[#f07639] hover:bg-orange-600 rounded-xl transition-colors shadow-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Boleto (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente simple para renderizar el QR en HTML usando una Data URL
function QRCodeGenerator({ text }: { text: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (text) {
      QRCode.toDataURL(text, { width: 180, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
        .then(setSrc)
        .catch(console.error);
    }
  }, [text]);

  if (!src) return <div className="w-[180px] h-[180px] bg-gray-100 rounded-lg animate-pulse" />;
  
  return <img src={src} alt="QR Code" className="w-[180px] h-[180px] rounded-lg shadow-sm border border-gray-200" />;
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-[#f07639] w-10 h-10" /></div>}>
      <PerfilContent />
    </Suspense>
  );
}
