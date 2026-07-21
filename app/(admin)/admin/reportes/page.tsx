"use client";

import { useState, useEffect } from "react";
import { 
  CircleDollarSign, 
  Ticket, 
  Package, 
  Calendar, 
  ArrowDownToLine, 
  BarChart3, 
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  User,
  ShieldAlert,
  Users,
  Receipt
} from "lucide-react";
import { obtenerDatosReporte } from "@/app/(admin)/actions/reportes";
import { getPeruDateString } from "@/lib/dates";
import { jsPDF } from "jspdf";

export default function ReportesPage() {
  // Inicializar rango de fechas: desde hace 7 días hasta hoy
  const getTodayStr = () => getPeruDateString();
  const getPrevWeekStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getPeruDateString(d);
  };

  const [desde, setDesde] = useState(getPrevWeekStr());
  const [hasta, setHasta] = useState(getTodayStr());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"todo" | "pasajes" | "encomiendas" | "gastos" | "incidentes" | "embarques">("todo");

  // Nuevos estados para filtros interactivos en tiempo real
  const [busquedaDni, setBusquedaDni] = useState("");
  const [filtroRuta, setFiltroRuta] = useState("");

  const cargarReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await obtenerDatosReporte(desde, hasta);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || "No se pudieron cargar los datos.");
      }
    } catch (err: any) {
      setError(err.message || "Error de servidor al cargar reporte.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al iniciar y cuando cambien las fechas
  useEffect(() => {
    cargarReporte();
  }, [desde, hasta]);

  // Resetear filtros locales cuando cambia la consulta de fechas
  useEffect(() => {
    setBusquedaDni("");
    setFiltroRuta("");
  }, [data]);

  // Obtener la lista única de rutas presentes en las transacciones actuales
  const getRutasUnicas = () => {
    if (!data) return [];
    const rutasSet = new Set<string>();
    data.pasajes.forEach((p: any) => rutasSet.add(`${p.origen} a ${p.destino}`));
    data.encomiendas.forEach((e: any) => rutasSet.add(`${e.origen} a ${e.destino}`));
    if (data.gastos) data.gastos.forEach((g: any) => rutasSet.add(g.ruta));
    if (data.incidentes) data.incidentes.forEach((i: any) => rutasSet.add(i.ruta));
    if (data.embarques) data.embarques.forEach((em: any) => rutasSet.add(`${em.origen} a ${em.destino}`));
    return Array.from(rutasSet);
  };
  const rutasUnicas = getRutasUnicas();

  // Filtrar pasajes en base a DNI y Ruta
  const pasajesFiltrados = data
    ? data.pasajes.filter((p: any) => {
        const coincideDni = busquedaDni.trim() === "" || p.dni.includes(busquedaDni.trim());
        const ruta = `${p.origen} a ${p.destino}`;
        const coincideRuta = filtroRuta === "" || ruta === filtroRuta;
        return coincideDni && coincideRuta;
      })
    : [];

  // Filtrar encomiendas en base a DNI (remitente o destinatario) y Ruta
  const encomiendasFiltradas = data
    ? data.encomiendas.filter((e: any) => {
        const coincideDni = busquedaDni.trim() === "" ||
          (e.remitenteDni && e.remitenteDni.includes(busquedaDni.trim())) ||
          (e.destinatarioDni && e.destinatarioDni.includes(busquedaDni.trim()));
        const ruta = `${e.origen} a ${e.destino}`;
        const coincideRuta = filtroRuta === "" || ruta === filtroRuta;
        return coincideDni && coincideRuta;
      })
    : [];

  // Filtrar gastos de ruta en base a DNI de conductor y Ruta
  const gastosFiltrados = data && data.gastos
    ? data.gastos.filter((g: any) => {
        const coincideDni = busquedaDni.trim() === "" || (g.conductorDni && g.conductorDni.includes(busquedaDni.trim()));
        const coincideRuta = filtroRuta === "" || g.ruta === filtroRuta;
        return coincideDni && coincideRuta;
      })
    : [];

  // Filtrar incidentes de bitácora en base a DNI de conductor y Ruta
  const incidentesFiltrados = data && data.incidentes
    ? data.incidentes.filter((i: any) => {
        const coincideDni = busquedaDni.trim() === "" || (i.conductorDni && i.conductorDni.includes(busquedaDni.trim()));
        const coincideRuta = filtroRuta === "" || i.ruta === filtroRuta;
        return coincideDni && coincideRuta;
      })
    : [];

  // Filtrar embarques en base a DNI de conductor y Ruta
  const embarquesFiltrados = data && data.embarques
    ? data.embarques.filter((em: any) => {
        const coincideDni = busquedaDni.trim() === "" || (em.conductorDni && em.conductorDni.includes(busquedaDni.trim()));
        const coincideRuta = filtroRuta === "" || `${em.origen} a ${em.destino}` === filtroRuta;
        return coincideDni && coincideRuta;
      })
    : [];

  // Recalcular los resúmenes financieros en caliente basados en los filtros activos
  const resumenFiltrado = {
    totalPasajesVendidos: pasajesFiltrados.length,
    totalEncomiendasRegistradas: encomiendasFiltradas.length,
    ingresosPasajes: pasajesFiltrados.reduce((acc: number, p: any) => acc + Number(p.precio), 0),
    ingresosEncomiendas: encomiendasFiltradas.reduce((acc: number, e: any) => acc + Number(e.precio), 0),
    ingresosTotales: pasajesFiltrados.reduce((acc: number, p: any) => acc + Number(p.precio), 0) + encomiendasFiltradas.reduce((acc: number, e: any) => acc + Number(e.precio), 0),
    totalGastosRuta: gastosFiltrados.reduce((acc: number, g: any) => acc + Number(g.monto), 0),
    totalIncidentes: incidentesFiltrados.length,
  };

  // Lista unificada para la pestaña de Consolidado
  const todasLasTransacciones = data
    ? [
        ...pasajesFiltrados.map((p: any) => ({
          id: `P-${p.id}`,
          tipo: "PASAJE",
          dni: p.dni,
          cliente: p.pasajero,
          detalles: `Asiento N° ${p.asiento} • Bus: ${p.bus} • Cond: ${p.conductor}`,
          ruta: `${p.origen} a ${p.destino}`,
          fecha: p.fecha,
          monto: p.precio,
        })),
        ...encomiendasFiltradas.map((e: any) => ({
          id: `E-${e.id}`,
          tipo: "ENCOMIENDA",
          dni: e.remitenteDni,
          cliente: `${e.remitente} (Rem) -> ${e.destinatario} (Dest)`,
          detalles: `Cód: ${e.codigo} • Peso: ${e.peso} kg`,
          ruta: `${e.origen} a ${e.destino}`,
          fecha: e.fecha,
          monto: e.precio,
        }))
      ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    : [];  const exportarPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    
    // 1. Franja azul marino del encabezado
    doc.setFillColor(15, 23, 42); // slate-900 (#0f172a)
    doc.rect(0, 0, 210, 42, "F");
    
    // Línea de acento naranja vibrante de marca
    doc.setFillColor(240, 118, 57); // #f07639
    doc.rect(0, 42, 210, 2.5, "F");
    
    // Títulos del encabezado
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("TRANSPORTES EL CUMBE S.A.", 15, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(226, 232, 240); // slate-200
    doc.text("Sistema de Gestión Administrativa - Reporte Balance Financiero", 15, 32);
    
    // Vector Logo Corporativo en el encabezado
    doc.setFillColor(240, 118, 57); // Círculo naranja de marca
    doc.circle(185, 21, 6.5, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(185, 21, 4, "F");
    doc.setFillColor(240, 118, 57);
    doc.circle(185, 21, 2, "F");
    
    // 2. Bloque de Datos de Rango y Filtros (Card de metadatos)
    let yMeta = 54;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(15, yMeta, 180, 28, 3, 3, "FD");
    
    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("RANGO DE FECHAS:", 20, yMeta + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${data.rango.desde}   al   ${data.rango.hasta}`, 60, yMeta + 8);
    
    let yFiltros = yMeta + 14;
    if (busquedaDni.trim() !== "") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("FILTRO BUSQUEDA DNI:", 20, yFiltros);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(busquedaDni.trim(), 60, yFiltros);
      yFiltros += 5;
    }
    if (filtroRuta !== "") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("RUTA FILTRADA:", 20, yFiltros);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(filtroRuta, 60, yFiltros);
      yFiltros += 5;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("FECHA EMISIÓN:", 20, yFiltros);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(new Date().toLocaleString("es-PE"), 60, yFiltros);
    
    // 3. Grid de Cajas KPI
    let kpiY = 92;
    // KPI 1: Pasajes
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, kpiY, 56, 26, 3, 3, "FD");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("INGRESOS PASAJES", 20, kpiY + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`S/. ${resumenFiltrado.ingresosPasajes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 20, kpiY + 16);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.text(`${resumenFiltrado.totalPasajesVendidos} pasajes vendidos`, 20, kpiY + 22);

    // KPI 2: Encomiendas
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(77, kpiY, 56, 26, 3, 3, "FD");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("INGRESOS ENCOMIENDAS", 82, kpiY + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`S/. ${resumenFiltrado.ingresosEncomiendas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 82, kpiY + 16);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.text(`${resumenFiltrado.totalEncomiendasRegistradas} envíos recibidos`, 82, kpiY + 22);

    // KPI 3: Consolidado Total (Amber/Naranja)
    doc.setFillColor(254, 243, 199); // Amber-100 (#fef3c7)
    doc.setDrawColor(245, 158, 11); // Amber-500
    doc.roundedRect(139, kpiY, 56, 26, 3, 3, "FD");
    doc.setTextColor(180, 83, 9); // Amber-800
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("CAJA CONSOLIDADA", 144, kpiY + 7);
    doc.setTextColor(120, 53, 4); // Amber-950
    doc.setFontSize(13);
    doc.text(`S/. ${resumenFiltrado.ingresosTotales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 144, kpiY + 16);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(7.5);
    doc.text(`${resumenFiltrado.totalPasajesVendidos + resumenFiltrado.totalEncomiendasRegistradas} transacciones`, 144, kpiY + 22);
    
    // 4. Tabla de Transacciones
    let yTable = 130;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DE OPERACIONES RECIENTES", 15, yTable - 4);
    
    // Cabecera Tabla
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(15, yTable, 180, 8, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("TIPO", 18, yTable + 5.5);
    doc.text("CLIENTE / DOCUMENTO", 45, yTable + 5.5);
    doc.text("RUTA DE SERVICIO", 110, yTable + 5.5);
    doc.text("PRECIO NETO", 175, yTable + 5.5);
    
    // Datos de la Tabla
    let currentY = yTable + 8;
    const maxItems = 15;
    const items = [
      ...pasajesFiltrados.slice(0, 8).map((p: any) => ({ tipo: "PASAJE", desc: `${p.pasajero} (${p.dni})`, ruta: `${p.origen} -> ${p.destino}`, precio: p.precio })),
      ...encomiendasFiltradas.slice(0, 8).map((e: any) => ({ tipo: "ENCOMIENDA", desc: `${e.codigo} • ${e.remitente}`, ruta: `${e.origen} -> ${e.destino}`, precio: e.precio }))
    ].slice(0, maxItems);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    
    let isZebra = false;
    items.forEach((item) => {
      // Fondo cebreado
      if (isZebra) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(15, currentY, 180, 8, "F");
      }
      isZebra = !isZebra;
      
      // Borde inferior delgado
      doc.setDrawColor(241, 245, 249); // slate-100
      doc.line(15, currentY + 8, 195, currentY + 8);
      
      // Dibujar Badge para Tipo
      if (item.tipo === "PASAJE") {
        doc.setFillColor(239, 246, 255); // blue-50
        doc.setDrawColor(191, 219, 254); // blue-200
        doc.roundedRect(17, currentY + 1.5, 18, 5, 1, 1, "FD");
        doc.setTextColor(29, 78, 216); // blue-700
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("PASAJE", 20, currentY + 5);
      } else {
        doc.setFillColor(255, 247, 237); // orange-50
        doc.setDrawColor(254, 215, 170); // orange-200
        doc.roundedRect(17, currentY + 1.5, 22, 5, 1, 1, "FD");
        doc.setTextColor(194, 65, 12); // orange-700
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("ENCOMIENDA", 18.5, currentY + 5);
      }
      
      // Textos
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      
      const descTruncada = item.desc.length > 32 ? item.desc.substring(0, 30) + ".." : item.desc;
      doc.text(descTruncada, 45, currentY + 5.5);
      
      doc.text(item.ruta, 110, currentY + 5.5);
      
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("helvetica", "bold");
      doc.text(`S/. ${Number(item.precio).toFixed(2)}`, 175, currentY + 5.5);
      
      currentY += 8;
    });
    
    if (items.length === 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(148, 163, 184);
      doc.text("No se encontraron transacciones en el rango y filtros actuales.", 20, currentY + 6);
    }
    
    // Pie de página sutil y elegante
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 276, 195, 276);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Transportes El Cumbe S.A. © Todos los derechos reservados. Reporte generado de forma automatizada por el sistema administrativo.", 15, 282);
    doc.text("Página 1 de 1", 182, 282);
    
    doc.save(`Reporte_Ventas_ElCumbe_${desde}_a_${hasta}.pdf`);
  };
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
              <span className="w-2.5 h-6 rounded-full bg-[#f07639] block" />
              Reporte de Ventas Financieras
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
              Análisis detallado de recaudación por venta de pasajes y envíos de encomienda.
            </p>
          </div>
          
          <button
            onClick={exportarPDF}
            disabled={!data || loading}
            className="flex items-center justify-center gap-2 bg-[#f07639] hover:bg-[#d85e25] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Descargar PDF de Ventas
          </button>
        </div>

        {/* Panel de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-300 pointer-events-none" />
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none text-slate-600 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-300 pointer-events-none" />
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none text-slate-600 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Buscar Cliente (DNI)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Ej: 45010001"
                value={busquedaDni}
                onChange={(e) => setBusquedaDni(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none text-slate-600 font-bold placeholder-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Filtrar por Ruta</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-300 pointer-events-none" />
              <select
                value={filtroRuta}
                onChange={(e) => setFiltroRuta(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none text-slate-600 font-bold bg-white cursor-pointer appearance-none"
              >
                <option value="">Todas las rutas</option>
                {rutasUnicas.map((r: string) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de Carga o Error */}
      {loading && (
        <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center shadow-sm mb-6">
          <div className="w-10 h-10 border-4 border-[#f07639] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando datos financieros...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Recaudado */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.06]" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CircleDollarSign className="w-5 h-5" />
              </div>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-extrabold px-2 py-0.5 rounded">Caja Total</span>
            </div>
            <p className="text-2xl font-black text-slate-800">S/. {resumenFiltrado.ingresosTotales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">TOTAL RECAUDADO</p>
          </div>

          {/* Pasajes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 opacity-[0.06]" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Ticket className="w-5 h-5" />
              </div>
              <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-extrabold px-2 py-0.5 rounded">{resumenFiltrado.totalPasajesVendidos} vtas</span>
            </div>
            <p className="text-2xl font-black text-slate-800">S/. {resumenFiltrado.ingresosPasajes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">INGRESOS PASAJES</p>
          </div>

          {/* Encomiendas */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 opacity-[0.06]" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#f07639]">
                <Package className="w-5 h-5" />
              </div>
              <span className="bg-orange-50 text-[#f07639] border border-orange-100 text-[10px] font-extrabold px-2 py-0.5 rounded">{resumenFiltrado.totalEncomiendasRegistradas} envíos</span>
            </div>
            <p className="text-2xl font-black text-slate-800">S/. {resumenFiltrado.ingresosEncomiendas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">INGRESOS ENCOMIENDAS</p>
          </div>

          {/* Operaciones Totales */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 opacity-[0.06]" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="bg-violet-50 text-violet-600 border border-violet-100 text-[10px] font-extrabold px-2 py-0.5 rounded">Operativo</span>
            </div>
            <p className="text-2xl font-black text-slate-800">{resumenFiltrado.totalPasajesVendidos + resumenFiltrado.totalEncomiendasRegistradas}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">TRANSACCIONES TOTALES</p>
          </div>
        </div>
      )}

      {/* Tabs y Detalle */}
      {data && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <button
              onClick={() => setActiveTab("todo")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-xs font-bold border-b-2 transition-colors outline-none cursor-pointer ${
                activeTab === "todo"
                  ? "border-[#f07639] text-[#f07639] bg-white"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <CircleDollarSign className="w-4 h-4" />
              Consolidado General ({todasLasTransacciones.length})
            </button>
            <button
              onClick={() => setActiveTab("pasajes")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-xs font-bold border-b-2 transition-colors outline-none cursor-pointer ${
                activeTab === "pasajes"
                  ? "border-[#f07639] text-[#f07639] bg-white"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Ticket className="w-4 h-4" />
              Pasajes Vendidos ({pasajesFiltrados.length})
            </button>
            <button
              onClick={() => setActiveTab("encomiendas")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-xs font-bold border-b-2 transition-colors outline-none cursor-pointer ${
                activeTab === "encomiendas"
                  ? "border-[#f07639] text-[#f07639] bg-white"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Package className="w-4 h-4" />
              Encomiendas Recibidas ({encomiendasFiltradas.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "todo" ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 bg-white z-10">
                      <th className="pb-3 w-[10%]">DNI</th>
                      <th className="pb-3 w-[32%]">Cliente / Pasajero</th>
                      <th className="pb-3 w-[8%]">Tipo</th>
                      <th className="pb-3 w-[25%]">Detalles</th>
                      <th className="pb-3 w-[15%]">Ruta</th>
                      <th className="pb-3 w-[10%] text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {todasLasTransacciones.length > 0 ? (
                      todasLasTransacciones.map((t: any) => (
                        <tr key={t.id} className="text-xs text-slate-600 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-semibold">{t.dni}</td>
                          <td className="py-3 font-bold text-slate-800 pr-2 break-words">{t.cliente}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                              t.tipo === "PASAJE" 
                                ? "bg-blue-50 text-blue-600 border border-blue-100" 
                                : "bg-orange-50 text-[#f07639] border border-orange-100"
                            }`}>
                              {t.tipo}
                            </span>
                          </td>
                          <td className="py-3 text-[11px] text-slate-500 font-medium truncate pr-2" title={t.detalles}>
                            {t.detalles}
                          </td>
                          <td className="py-3 font-medium truncate">{t.ruta}</td>
                          <td className="py-3 text-right font-black text-slate-800">S/. {t.monto.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-semibold">
                          No se encontraron operaciones con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === "pasajes" ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 bg-white z-10">
                      <th className="pb-3 w-[10%]">DNI</th>
                      <th className="pb-3 w-[22%]">Pasajeros</th>
                      <th className="pb-3 w-[18%]">Ruta</th>
                      <th className="pb-3 w-[8%] text-center">Asiento</th>
                      <th className="pb-3 w-[10%] text-center">Bus</th>
                      <th className="pb-3 w-[17%]">Conductor</th>
                      <th className="pb-3 w-[15%]">Fecha Compra</th>
                      <th className="pb-3 w-[10%] text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pasajesFiltrados.length > 0 ? (
                      pasajesFiltrados.map((p: any) => (
                        <tr key={p.id} className="text-xs text-slate-600 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-semibold">{p.dni}</td>
                          <td className="py-3 font-bold text-slate-800 pr-2 break-words">{p.pasajero}</td>
                          <td className="py-3 font-medium truncate">
                            <span className="flex items-center gap-1.5">
                              {p.origen}
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              {p.destino}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded font-black text-[10px]">
                              N° {p.asiento}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              {p.bus}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 font-semibold pr-2 break-words" title={p.conductor}>{p.conductor}</td>
                          <td className="py-3 text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-300" />
                              {new Date(p.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </td>
                          <td className="py-3 text-right font-black text-slate-800">S/. {p.precio.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-semibold">
                          No se encontraron pasajes vendidos con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 bg-white z-10">
                      <th className="pb-3 w-[10%]">DNI Remitente</th>
                      <th className="pb-3 w-[22%]">Remitente</th>
                      <th className="pb-3 w-[22%]">Destinatario</th>
                      <th className="pb-3 w-[18%]">Ruta</th>
                      <th className="pb-3 w-[8%] text-center">Peso</th>
                      <th className="pb-3 w-[16%]">Fecha Envío</th>
                      <th className="pb-3 w-[10%] text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {encomiendasFiltradas.length > 0 ? (
                      encomiendasFiltradas.map((e: any) => (
                        <tr key={e.id} className="text-xs text-slate-600 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-semibold">{e.remitenteDni}</td>
                          <td className="py-3 font-semibold text-slate-800 pr-2 break-words">{e.remitente}</td>
                          <td className="py-3 font-semibold pr-2 break-words">{e.destinatario}</td>
                          <td className="py-3 font-medium truncate">
                            <span className="flex items-center gap-1.5">
                              {e.origen}
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              {e.destino}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-orange-50 text-[#f07639] border border-orange-100 px-2 py-0.5 rounded font-black text-[10px]">
                              {e.peso} kg
                            </span>
                          </td>
                          <td className="py-3 text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-300" />
                              {new Date(e.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </td>
                          <td className="py-3 text-right font-black text-slate-800">S/. {e.precio.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 font-semibold">
                          No se encontraron encomiendas registradas con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
