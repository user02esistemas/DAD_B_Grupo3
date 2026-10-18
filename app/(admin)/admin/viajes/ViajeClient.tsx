"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, XCircle, Pencil, Calendar, Hash, MapPin, Bus as BusIcon, Search, Bell, Users, Download, FileText } from "lucide-react";
import { crearViajeConAsientos, cancelarViaje, actualizarViaje, enviarAlertaCentral } from "../../actions/viajes";
import { obtenerPasajerosViaje } from "../../actions/operario";

type Ruta = {
  id: string;
  origen: { nombre: string };
  destino: { nombre: string };
  duracion_estimada_minutos: number;
};

type Bus = {
  id: string;
  placa: string;
  capacidad: number;
  pisos: number;
};

type Viaje = {
  id: string;
  ruta_id: string;
  bus_id: string;
  conductor_id?: string | null;
  fecha_salida: string;
  fecha_llegada: string | null;
  estado: string;
  ruta: Ruta;
  bus: Bus;
  conductor?: { nombres: string; apellidos: string } | null;
};

type Conductor = {
  id: string;
  nombres: string;
  apellidos: string;
};

export default function ViajeClient({
  initialViajes,
  rutas,
  buses,
  conductores
}: {
  initialViajes: Viaje[],
  rutas: Ruta[],
  buses: Bus[],
  conductores: Conductor[]
}) {
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [periodo, setPeriodo] = useState("actuales"); // "actuales" | "todos"
  const [estadoFiltro, setEstadoFiltro] = useState("todos"); // "todos" | "programado" | "en_ruta" | ...
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingViajeId, setEditingViajeId] = useState<string | null>(null);

  // Alerta Central Modal
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertTargetViaje, setAlertTargetViaje] = useState<Viaje | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  const handleOpenAlertModal = (viaje: Viaje) => {
    setAlertTargetViaje(viaje);
    setAlertMessage("");
    setIsAlertModalOpen(true);
  };

  const handleCloseAlertModal = () => {
    setIsAlertModalOpen(false);
    setAlertTargetViaje(null);
  };

  // Pasajeros Modal
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [passengerModalLoading, setPassengerModalLoading] = useState(false);
  const [passengersList, setPassengersList] = useState<any[]>([]);
  const [selectedViajeForPassengers, setSelectedViajeForPassengers] = useState<Viaje | null>(null);

  const handleOpenPassengerModal = async (viaje: Viaje) => {
    setSelectedViajeForPassengers(viaje);
    setIsPassengerModalOpen(true);
    setPassengerModalLoading(true);
    setPassengersList([]);
    try {
      const res = await obtenerPasajerosViaje(viaje.id);
      if (res.success) {
        setPassengersList(res.data);
      } else {
        alert("Error al cargar pasajeros: " + res.error);
      }
    } catch (error) {
      console.error("Error cargando pasajeros:", error);
      alert("Error de conexión.");
    } finally {
      setPassengerModalLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!selectedViajeForPassengers) return;

    const headers = ["Asiento", "Nombres", "Apellidos", "DNI", "Estado de Abordaje"];

    const rows = passengersList.map((pasaje) => [
      pasaje.asiento_viaje.numero_asiento,
      `"${pasaje.pasajero.nombres}"`,
      `"${pasaje.pasajero.apellidos}"`,
      pasaje.pasajero.dni,
      pasaje.abordado ? "A BORDO" : "NO SUBIO"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    const orig = selectedViajeForPassengers.ruta.origen.nombre.replace(/\s+/g, '_');
    const dest = selectedViajeForPassengers.ruta.destino.nombre.replace(/\s+/g, '_');
    const dateStr = new Date(selectedViajeForPassengers.fecha_salida).toLocaleDateString().replace(/\//g, '-');
    const fileName = `Manifiesto_Viaje_${selectedViajeForPassengers.id}_${orig}_a_${dest}_${dateStr}.csv`;

    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (!selectedViajeForPassengers) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor permite los pop-ups para descargar el PDF.");
      return;
    }

    const orig = selectedViajeForPassengers.ruta.origen.nombre;
    const dest = selectedViajeForPassengers.ruta.destino.nombre;
    const dateStr = new Date(selectedViajeForPassengers.fecha_salida).toLocaleString("es-PE", {
      dateStyle: "short",
      timeStyle: "short"
    });
    const busPlaca = selectedViajeForPassengers.bus.placa;
    const conductorName = selectedViajeForPassengers.conductor
      ? `${selectedViajeForPassengers.conductor.nombres} ${selectedViajeForPassengers.conductor.apellidos}`
      : "Sin Conductor Asignado";

    const rowsHtml = passengersList.map((pasaje) => `
      <tr>
        <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px;">
          ${pasaje.asiento_viaje.numero_asiento}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 600;">
          ${pasaje.pasajero.nombres}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 600;">
          ${pasaje.pasajero.apellidos}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; color: #475569;">
          ${pasaje.pasajero.dni}
        </td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; color: ${pasaje.abordado ? '#16a34a' : '#475569'};">
          ${pasaje.abordado ? 'A BORDO' : 'NO SUBIÓ'}
        </td>
      </tr>
    `).join("");

    const totalV = passengersList.length;
    const totalA = passengersList.filter(p => p.abordado).length;
    const totalN = totalV - totalA;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Manifiesto de Pasajeros - Viaje #${selectedViajeForPassengers.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 30px; color: #1e293b; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 5px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; margin-bottom: 25px; font-size: 12px; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-label { font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
            .meta-value { font-weight: 700; color: #334155; }
            .stats-bar { display: flex; gap: 20px; margin-bottom: 25px; }
            .stat-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; }
            .stat-val { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
            th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; font-weight: 800; text-transform: uppercase; font-size: 9px; color: #475569; text-align: left; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer-notes { margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 10px; color: #64748b; font-weight: 500; display: flex; justify-content: space-between; }
            @media print {
              body { margin: 15px; font-size: 11px; }
              .meta-grid { background: none; border-radius: 0; border: 1px solid #000; padding: 10px; }
              .stat-box { border: 1px solid #000; border-radius: 0; }
              th { background: #e2e8f0 !important; color: #000; border: 1px solid #000; }
              td { border: 1px solid #000 !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Transportes El Cumbe S.A.</h1>
            <div class="subtitle">Manifiesto Oficial de Pasajeros y Abordaje</div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Servicio</span>
              <span class="meta-value">${orig} ➔ ${dest}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Fecha y Hora</span>
              <span class="meta-value">${dateStr}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Vehículo (Placa)</span>
              <span class="meta-value">${busPlaca}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Conductor</span>
              <span class="meta-value">${conductorName}</span>
            </div>
          </div>

          <div class="stats-bar">
            <div class="stat-box">
              Vendidos
              <div class="stat-val">${totalV}</div>
            </div>
            <div class="stat-box" style="border-color: #bbf7d0; color: #166534;">
              Abordados
              <div class="stat-val" style="color: #166534;">${totalA}</div>
            </div>
            <div class="stat-box">
              No Subieron
              <div class="stat-val">${totalN}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%; text-align: center;">Asiento</th>
                <th style="width: 30%;">Nombres</th>
                <th style="width: 30%;">Apellidos</th>
                <th style="width: 15%;">DNI</th>
                <th style="width: 15%; text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-notes">
            <span>Generado el: ${new Date().toLocaleString("es-PE")}</span>
            <span>Firma Autorizada: Central de Despacho El Cumbe</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTargetViaje || !alertMessage.trim()) return;

    setIsSendingAlert(true);
    const res = await enviarAlertaCentral(alertTargetViaje.id, alertMessage);
    setIsSendingAlert(false);

    if (res.success) {
      alert("✔️ Alerta enviada con éxito al conductor.");
      handleCloseAlertModal();
    } else {
      alert("❌ Error: " + (res.error || "No se pudo enviar la alerta."));
    }
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [formData, setFormData] = useState({
    ruta_id: "",
    bus_id: "",
    conductor_id: "",
  });

  const [fechaSalidaDate, setFechaSalidaDate] = useState("");
  const [fechaSalidaTime, setFechaSalidaTime] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenForm = () => {
    setError(null);
    setFormData({
      ruta_id: rutas.length > 0 ? rutas[0].id : "",
      bus_id: buses.length > 0 ? buses[0].id : "",
      conductor_id: "",
    });
    setFechaSalidaDate("");
    setFechaSalidaTime("");
    setEditingViajeId(null);
    setIsFormOpen(true);
  };

  const handleEditForm = (viaje: Viaje) => {
    setError(null);
    setFormData({
      ruta_id: viaje.ruta_id,
      bus_id: viaje.bus_id,
      conductor_id: viaje.conductor_id || "",
    });

    // Convertir la fecha UTC del servidor a huso horario de Perú (America/Lima) en formato estricto 24h para los inputs
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(viaje.fecha_salida));
    const year = parts.find((p) => p.type === "year")!.value;
    const month = parts.find((p) => p.type === "month")!.value;
    const day = parts.find((p) => p.type === "day")!.value;
    let hour = parts.find((p) => p.type === "hour")!.value;
    if (hour === "24") hour = "00";
    const minute = parts.find((p) => p.type === "minute")!.value;

    setFechaSalidaDate(`${year}-${month}-${day}`);
    setFechaSalidaTime(`${hour}:${minute}`);

    setEditingViajeId(viaje.id);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!fechaSalidaDate || !fechaSalidaTime) {
        setError("Debe especificar la fecha y hora de salida.");
        setIsLoading(false);
        return;
      }

      // Calcular automáticamente la hora de llegada en base a la duración de la ruta
      const rutaSel = rutas.find(r => r.id.toString() === formData.ruta_id.toString());
      const duration = rutaSel ? rutaSel.duracion_estimada_minutos : 0;

      const timeFormatted = fechaSalidaTime.length === 5 ? `${fechaSalidaTime}:00` : fechaSalidaTime;
      const departureDateTime = new Date(`${fechaSalidaDate}T${timeFormatted}-05:00`);

      if (isNaN(departureDateTime.getTime())) {
        setError("Fecha u hora de salida inválida.");
        setIsLoading(false);
        return;
      }

      const now = new Date();
      // Permitir un margen de 5 minutos
      const minAllowedDate = new Date(now.getTime() - 5 * 60 * 1000);
      if (departureDateTime < minAllowedDate) {
        setError("La fecha y hora de salida no puede ser anterior a la actual.");
        setIsLoading(false);
        return;
      }

      const arrivalDateTime = new Date(departureDateTime.getTime() + duration * 60 * 1000);

      const payload = {
        ...formData,
        fecha_salida: departureDateTime.toISOString(),
        fecha_llegada: arrivalDateTime.toISOString(),
      };

      if (editingViajeId) {
        const res = await actualizarViaje(editingViajeId, payload);
        if (res.success) {
          setViajes((prev) =>
            prev.map((v) => (v.id === editingViajeId ? res.data : v))
          );
          handleCloseForm();
        } else {
          setError(res.error || "Error al actualizar viaje");
        }
      } else {
        const res = await crearViajeConAsientos(payload);
        if (res.success) {
          setViajes((prev) => [res.data, ...prev]);
          handleCloseForm();
        } else {
          setError(res.error || "Error al programar viaje");
        }
      }
    } catch (err) {
      setError("Error inesperado de red.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas cancelar este viaje?")) return;

    try {
      const res = await cancelarViaje(id);
      if (res.success) {
        setViajes((prev) =>
          prev.map((v) => v.id === id ? { ...v, estado: "cancelado" } : v)
        );
      } else {
        alert(res.error || "Error al cancelar viaje");
      }
    } catch (err) {
      alert("Error inesperado al intentar cancelar.");
    }
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'programado':
        return <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold uppercase tracking-wider">Programado</span>;
      case 'en_ruta':
        return <span className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full text-xs font-bold uppercase tracking-wider">En Ruta</span>;
      case 'completado':
        return <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold uppercase tracking-wider">Completado</span>;
      case 'cancelado':
        return <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-bold uppercase tracking-wider">Cancelado</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">{estado}</span>;
    }
  };

  // Lógica de filtrado de viajes
  const filteredViajes = viajes.filter((viaje) => {
    const fechaSalida = new Date(viaje.fecha_salida);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Inicio de hoy

    // 1. Filtro de período temporal (solo aplica si no hay un día seleccionado en el calendario)
    if (!selectedDate && periodo === "actuales") {
      if (fechaSalida < hoy) {
        return false;
      }
    }

    // 2. Filtro de día seleccionado (Calendario)
    if (selectedDate) {
      const viajeDateStr = new Date(viaje.fecha_salida).toLocaleDateString('sv-SE');
      if (viajeDateStr !== selectedDate) {
        return false;
      }
    }

    // 3. Filtro por Estado
    if (estadoFiltro !== "todos" && viaje.estado !== estadoFiltro) {
      return false;
    }

    // 4. Filtro de texto (ruta, placa)
    const searchString = `${viaje.ruta.origen.nombre} ${viaje.ruta.destino.nombre} ${viaje.bus.placa}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#f07639] to-[#d45a1f] flex items-center justify-center text-white shadow-lg shadow-[#f07639]/20">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Programación de Viajes</h2>
            <p className="text-[12px] text-slate-400 font-medium">Crea viajes, asigna buses y genera el mapa de asientos.</p>
          </div>
        </div>
        <button
          onClick={handleOpenForm}
          className="bg-gradient-to-r from-[#f07639] to-[#d45a1f] hover:from-[#e06528] hover:to-[#c7551d] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center shadow-lg shadow-[#f07639]/15 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#f07639]/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Programar Viaje
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Buscador de Texto */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ruta o bus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Filtro por Calendario */}
          <div className="relative min-w-[170px]">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 font-bold text-sm leading-none bg-slate-200 hover:bg-slate-300 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                title="Mostrar todos los días"
              >
                &times;
              </button>
            )}
          </div>

          {/* Filtro por Período */}
          <div className="min-w-[160px]">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all appearance-none"
            >
              <option value="actuales">Actuales y futuros</option>
              <option value="todos">Todos los viajes</option>
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="min-w-[150px]">
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#f8f9fc] border border-slate-200/60 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-[13px] font-semibold text-slate-700 cursor-pointer outline-none transition-all appearance-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="programado">Programados</option>
              <option value="en_ruta">En Ruta</option>
              <option value="completado">Completados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-slate-100">
                <th className="px-3 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Ruta</th>
                <th className="px-3 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Salida</th>
                <th className="px-3 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Llegada</th>
                <th className="px-3 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Bus Asignado</th>
                <th className="px-3 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">Conductor</th>
                <th className="px-3 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">Estado</th>
                <th className="px-3 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredViajes.length > 0 ? (
                filteredViajes.map((viaje) => (
                  <tr key={viaje.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-slate-400 mr-3" />
                        <div>
                          <p className="font-bold text-slate-800">
                            {viaje.ruta.origen.nombre} a {viaje.ruta.destino.nombre}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center text-slate-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium" suppressHydrationWarning>
                          {new Date(viaje.fecha_salida).toLocaleString('es-PE', {
                            timeZone: 'America/Lima',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center text-slate-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium" suppressHydrationWarning>
                          {viaje.fecha_llegada ? new Date(viaje.fecha_llegada).toLocaleString('es-PE', {
                            timeZone: 'America/Lima',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }) : "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center font-bold text-slate-800">
                          <BusIcon className="w-4 h-4 mr-2 text-slate-400" />
                          {viaje.bus.placa}
                        </div>
                        <span className="text-xs text-slate-500 ml-6 whitespace-nowrap">
                          Capacidad: {viaje.bus.capacidad} | Pisos: {viaje.bus.pisos}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {viaje.conductor ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-850 whitespace-nowrap">
                            {viaje.conductor.nombres} {viaje.conductor.apellidos}
                          </span>
                          <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Conductor</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-red-600 bg-red-50/50 px-2.5 py-1 rounded border border-red-100 uppercase tracking-wide">Sin Asignar</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {getStatusBadge(viaje.estado)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {viaje.estado === 'programado' && (
                          <>
                            <button
                              onClick={() => handleEditForm(viaje)}
                              className="text-slate-400 hover:text-blue-500 transition-colors"
                              title="Editar Viaje"
                            >
                              <Pencil className="w-5 h-5 inline-block" />
                            </button>
                            <button
                              onClick={() => handleCancel(viaje.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              title="Cancelar Viaje"
                            >
                              <XCircle className="w-5 h-5 inline-block" />
                            </button>
                          </>
                        )}
                        {viaje.estado !== 'cancelado' && viaje.estado !== 'completado' && (
                          <button
                            onClick={() => handleOpenAlertModal(viaje)}
                            className="text-slate-400 hover:text-amber-500 transition-colors"
                            title="Enviar Alerta Central"
                          >
                            <Bell className="w-5 h-5 inline-block" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenPassengerModal(viaje)}
                          className="text-slate-400 hover:text-green-600 transition-colors"
                          title="Lista de Pasajeros / Abordajes"
                        >
                          <Users className="w-5 h-5 inline-block" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No hay viajes programados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulario */}
      {mounted && isFormOpen && createPortal(
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseForm();
            }
          }}
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 backdrop-blur-sm flex justify-center items-start py-8 px-4 sm:px-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden relative my-auto p-8"
          >
            <button
              onClick={handleCloseForm}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            >
              &times;
            </button>

            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingViajeId ? "Editar Viaje" : "Programar Nuevo Viaje"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-155 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruta <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.ruta_id}
                    onChange={(e) => setFormData({ ...formData, ruta_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all text-sm"
                  >
                    <option value="" disabled>Seleccione ruta</option>
                    {rutas.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.origen.nombre} → {r.destino.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-755 mb-1">
                    Bus Asignado <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.bus_id}
                    onChange={(e) => setFormData({ ...formData, bus_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all text-sm"
                  >
                    <option value="" disabled>Seleccione bus</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>
                        Placa: {b.placa} | Asientos: {b.capacidad} | Pisos: {b.pisos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-755 mb-1">
                    Conductor Asignado
                  </label>
                  <select
                    value={formData.conductor_id}
                    onChange={(e) => setFormData({ ...formData, conductor_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all text-sm"
                  >
                    <option value="">Seleccionar conductor (opcional)</option>
                    {conductores.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombres} {c.apellidos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80">
                  <label className="block text-[13px] font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <Calendar className="w-3 h-3" />
                    </div>
                    Salida <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                      <input
                        type="date"
                        required
                        min={new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' })}
                        value={fechaSalidaDate}
                        onChange={(e) => setFechaSalidaDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all cursor-pointer shadow-sm text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Hora</label>
                      <input
                        type="time"
                        required
                        value={fechaSalidaTime}
                        onChange={(e) => setFechaSalidaTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 text-gray-800 focus:border-[#f07639] focus:ring-1 focus:ring-[#f07639] rounded-xl outline-none transition-all cursor-pointer shadow-sm text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 text-gray-500 hover:text-gray-700 transition-colors font-semibold text-sm rounded-xl hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#f07639] hover:bg-[#e06528] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-[#f07639]/15 hover:shadow-lg hover:shadow-[#f07639]/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                >
                  {isLoading ? "Guardando..." : (editingViajeId ? "Guardar Cambios" : "Programar Viaje")}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Enviar Alerta */}
      {mounted && isAlertModalOpen && alertTargetViaje && createPortal(
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseAlertModal();
            }
          }}
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 backdrop-blur-sm flex justify-center items-start py-8 px-4 sm:px-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden relative my-auto p-8 space-y-6"
          >
            <button
              onClick={handleCloseAlertModal}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            >
              &times;
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-800">
                Enviar Alerta al Conductor
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Viaje: {alertTargetViaje.ruta.origen.nombre} → {alertTargetViaje.ruta.destino.nombre} ({alertTargetViaje.bus.placa})
              </p>
            </div>

            <form onSubmit={handleSendAlert} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Mensaje de Advertencia
                </label>
                <textarea
                  required
                  rows={4}
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="Escribe el mensaje de alerta (ej: Clima inestable, desvío por obras, etc.)..."
                  className="w-full px-4 py-3 border border-slate-200 outline-none focus:border-[#f07639] rounded-xl bg-white text-sm"
                />
              </div>

              <div className="flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseAlertModal}
                  className="px-5 py-2.5 text-gray-500 hover:text-gray-700 transition-colors font-semibold text-sm rounded-xl hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingAlert || !alertMessage.trim()}
                  className="bg-[#f07639] hover:bg-[#e06528] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-[#f07639]/15 hover:shadow-lg disabled:opacity-50"
                >
                  {isSendingAlert ? "Enviando..." : "Enviar Alerta"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Lista de Pasajeros / Manifiesto de Embarque */}
      {mounted && isPassengerModalOpen && selectedViajeForPassengers && createPortal(
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setIsPassengerModalOpen(false);
            }
          }}
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40 backdrop-blur-sm flex justify-center items-start py-8 px-4 sm:px-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden relative my-auto p-8 space-y-6"
          >
            <button
              onClick={() => setIsPassengerModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            >
              &times;
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-800">
                Lista de Pasajeros y Abordaje
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1" suppressHydrationWarning>
                Servicio: {selectedViajeForPassengers.ruta.origen.nombre} → {selectedViajeForPassengers.ruta.destino.nombre} | Placa: {selectedViajeForPassengers.bus.placa} | Fecha: {new Date(selectedViajeForPassengers.fecha_salida).toLocaleDateString()}
              </p>
            </div>

            {passengerModalLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-10 h-10 border-4 border-[#f07639]/30 border-t-[#f07639] rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-slate-500">Cargando manifiesto de pasajeros...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumen de Métricas */}
                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vendidos</p>
                    <p className="text-lg font-black text-slate-800">{passengersList.length}</p>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-green-650">Abordados</p>
                    <p className="text-lg font-black text-green-600">{passengersList.filter(p => p.abordado).length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-slate-500">No Subieron</p>
                    <p className="text-lg font-black text-slate-500">{passengersList.filter(p => !p.abordado).length}</p>
                  </div>
                </div>

                {/* Tabla de Pasajeros */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                  {passengersList.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase text-[10px]">Asiento</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase text-[10px]">Nombres</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase text-[10px]">Apellidos</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase text-[10px]">DNI</th>
                          <th className="py-3 px-4 font-bold text-slate-500 uppercase text-[10px] text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                        {passengersList.map((pasaje) => (
                          <tr key={pasaje.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-black">
                              <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                {pasaje.asiento_viaje.numero_asiento}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold">
                              {pasaje.pasajero.nombres}
                            </td>
                            <td className="py-3.5 px-4 font-bold">
                              {pasaje.pasajero.apellidos}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-medium">
                              {pasaje.pasajero.dni}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {pasaje.abordado ? (
                                <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase border border-green-200 tracking-wider">
                                  A bordo
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-550 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase border border-slate-200 tracking-wider">
                                  No subió
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-450 font-bold">
                      No hay pasajes vendidos ni reservados para este viaje aún.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  {passengersList.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.01]"
                      >
                        <FileText className="w-4 h-4" />
                        Descargar PDF
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadCSV}
                        className="bg-[#f07639] hover:bg-[#e06528] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.01]"
                      >
                        <Download className="w-4 h-4" />
                        Descargar Excel / CSV
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPassengerModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-[1.01]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
