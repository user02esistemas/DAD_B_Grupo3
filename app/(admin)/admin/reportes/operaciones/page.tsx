"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, 
  ArrowDownToLine, 
  ArrowRight,
  MapPin,
  Clock,
  User,
  ShieldAlert,
  Users,
  Receipt,
  ClipboardList,
  BarChart3,
  CircleAlert,
  Eye,
  Camera,
  Image,
  X
} from "lucide-react";
import { obtenerDatosReporte } from "@/app/(admin)/actions/reportes";
import { getPeruDateString } from "@/lib/dates";
import { jsPDF } from "jspdf";

export default function ReportesOperacionesPage() {
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
  const [activeTab, setActiveTab] = useState<"gastos" | "incidentes" | "embarques">("gastos");

  // Nuevos estados para filtros interactivos en tiempo real
  const [busquedaDni, setBusquedaDni] = useState("");
  const [filtroRuta, setFiltroRuta] = useState("");
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

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

  // Obtener la lista única de rutas presentes en los datos operativos
  const getRutasUnicas = () => {
    if (!data) return [];
    const rutasSet = new Set<string>();
    if (data.gastos) data.gastos.forEach((g: any) => rutasSet.add(g.ruta));
    if (data.incidentes) data.incidentes.forEach((i: any) => rutasSet.add(i.ruta));
    if (data.embarques) data.embarques.forEach((em: any) => rutasSet.add(`${em.origen} a ${em.destino}`));
    return Array.from(rutasSet);
  };
  const rutasUnicas = getRutasUnicas();

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
    totalGastosRuta: gastosFiltrados.reduce((acc: number, g: any) => acc + Number(g.monto), 0),
    totalIncidentes: incidentesFiltrados.length,
    totalViajesMonitoreados: embarquesFiltrados.length,
    pasajerosAbordados: embarquesFiltrados.reduce((acc: number, em: any) => acc + em.abordaron, 0),
    pasajerosEsperados: embarquesFiltrados.reduce((acc: number, em: any) => acc + em.vendidos, 0),
  };

  const exportarPDF = () => {
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
    doc.text("Sistema de Gestión Administrativa - Reporte Operativo y Bitácora", 15, 32);
    
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
    doc.text(`${desde}   al   ${hasta}`, 60, yMeta + 8);
    
    let yFiltros = yMeta + 14;
    if (busquedaDni.trim() !== "") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("FILTRO CONDUCTOR DNI:", 20, yFiltros);
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
    
    // 3. Grid de Cajas KPI Operativos (4 Tarjetas KPI)
    let kpiY = 92;
    // KPI 1: Gastos
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
    doc.roundedRect(15, kpiY, 41, 26, 3, 3, "FD");
    doc.setTextColor(185, 28, 28); // red-700
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("GASTOS EN RUTA", 19, kpiY + 7);
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(11);
    doc.text(`S/. ${resumenFiltrado.totalGastosRuta.toFixed(2)}`, 19, kpiY + 16);
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(6.5);
    doc.text("Reportado por pilotos", 19, kpiY + 22);

    // KPI 2: Incidentes
    doc.setFillColor(254, 243, 199); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.roundedRect(60, kpiY, 41, 26, 3, 3, "FD");
    doc.setTextColor(180, 83, 9); // amber-700
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("INCIDENCIAS BITÁCORA", 64, kpiY + 7);
    doc.setTextColor(146, 64, 14);
    doc.setFontSize(11.5);
    doc.text(`${resumenFiltrado.totalIncidentes} sucesos`, 64, kpiY + 16);
    doc.setTextColor(217, 119, 6);
    doc.setFontSize(6.5);
    doc.text("Sucesos en ruta", 64, kpiY + 22);

    // KPI 3: Viajes Monitoreados
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.roundedRect(105, kpiY, 41, 26, 3, 3, "FD");
    doc.setTextColor(29, 78, 216); // blue-700
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("VIAJES EVALUADOS", 109, kpiY + 7);
    doc.setTextColor(21, 76, 121);
    doc.setFontSize(11.5);
    doc.text(`${resumenFiltrado.totalViajesMonitoreados} viajes`, 109, kpiY + 16);
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(6.5);
    doc.text("Embarques activos", 109, kpiY + 22);

    // KPI 4: Embarque / Asistencia
    doc.setFillColor(240, 253, 244); // green-50
    doc.setDrawColor(187, 247, 208); // green-200
    doc.roundedRect(150, kpiY, 41, 26, 3, 3, "FD");
    doc.setTextColor(21, 128, 61); // green-700
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("TASA ABORDAJE", 154, kpiY + 7);
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(11.5);
    const pct = resumenFiltrado.pasajerosEsperados > 0 
      ? Math.round((resumenFiltrado.pasajerosAbordados / resumenFiltrado.pasajerosEsperados) * 100)
      : 100;
    doc.text(`${pct}% asist.`, 154, kpiY + 16);
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(6.5);
    doc.text(`${resumenFiltrado.pasajerosAbordados}/${resumenFiltrado.pasajerosEsperados} pas`, 154, kpiY + 22);
    
    // 4. Tabla Detallada
    let yTable = 130;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    
    if (activeTab === "gastos") {
      doc.text("DETALLE DE GASTOS DE RUTA DE CONDUCTORES", 15, yTable - 4);
      
      // Cabecera Tabla
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(15, yTable, 180, 8, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("FECHA / REGISTRO", 18, yTable + 5.5);
      doc.text("CONCEPTO / DETALLES", 55, yTable + 5.5);
      doc.text("CONDUCTOR / TELÉFONO", 110, yTable + 5.5);
      doc.text("MONTO", 180, yTable + 5.5);
      
      let currentY = yTable + 8;
      let isZebra = false;
      
      gastosFiltrados.slice(0, 15).forEach((g: any) => {
        if (currentY > 265) { doc.addPage(); currentY = 20; }
        
        if (isZebra) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, 180, 8, "F");
        }
        isZebra = !isZebra;
        
        doc.setDrawColor(241, 245, 249);
        doc.line(15, currentY + 8, 195, currentY + 8);
        
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const fStr = g.fecha ? new Date(g.fecha).toLocaleDateString("es-PE") : "N/A";
        doc.text(fStr, 18, currentY + 5.5);
        
        doc.setFont("helvetica", "bold");
        doc.text(g.concepto.substring(0, 28), 55, currentY + 5.5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const salidaStr = g.horaSalida ? new Date(g.horaSalida).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' }) : "N/A";
        doc.text(`Ruta Salida: ${salidaStr}`, 55, currentY + 7.5);
        
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`${g.conductor.substring(0,18)}`, 110, currentY + 5.5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Tel: ${g.conductorTelefono || "N/A"} • Bus: ${g.bus}`, 110, currentY + 7.5);
        
        doc.setTextColor(220, 38, 38); // rojo de gastos
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(`S/. ${g.monto.toFixed(2)}`, 180, currentY + 5.5);
        
        currentY += 8;
      });
      
      if (gastosFiltrados.length === 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(148, 163, 184);
        doc.text("No se encontraron gastos reportados en este período.", 20, currentY + 6);
      }
    } else if (activeTab === "incidentes") {
      doc.text("HISTORIAL DE INCIDENCIAS DE BITÁCORA", 15, yTable - 4);
      
      // Cabecera Tabla
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(15, yTable, 180, 8, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("TIPO / FECHA", 18, yTable + 5.5);
      doc.text("ESTADO / GRAVEDAD", 54, yTable + 5.5);
      doc.text("DESCRIPCIÓN DEL SUCESO", 96, yTable + 5.5);
      doc.text("CONDUCTOR / TELÉFONO", 145, yTable + 5.5);
      
      let currentY = yTable + 8;
      let isZebra = false;
      
      incidentesFiltrados.slice(0, 15).forEach((i: any) => {
        if (currentY > 265) { doc.addPage(); currentY = 20; }
        
        if (isZebra) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, 180, 8, "F");
        }
        isZebra = !isZebra;
        
        doc.setDrawColor(241, 245, 249);
        doc.line(15, currentY + 8, 195, currentY + 8);
        
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const fStr = i.fecha ? new Date(i.fecha).toLocaleDateString("es-PE") : "N/A";
        doc.text(i.tipo, 18, currentY + 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(fStr, 18, currentY + 7.5);
        
        // Badge de estado
        if (i.solucionado) {
          doc.setFillColor(240, 253, 244); // green-50
          doc.setDrawColor(187, 247, 208); // green-200
          doc.roundedRect(54, currentY + 1.5, 14, 4.5, 0.5, 0.5, "FD");
          doc.setTextColor(21, 128, 61); // green-700
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.text("RESUELTO", 55.5, currentY + 4.7);
        } else {
          doc.setFillColor(254, 243, 199); // amber-50
          doc.setDrawColor(253, 230, 138); // amber-200
          doc.roundedRect(54, currentY + 1.5, 14, 4.5, 0.5, 0.5, "FD");
          doc.setTextColor(180, 83, 9); // amber-700
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.text("EN CURSO", 55.5, currentY + 4.7);
        }
        
        // Badge de gravedad / Retraso
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(`[${i.gravedad}] +${i.retraso}m`, 70, currentY + 4.8);
        if (i.solucionado && i.fechaSolucion) {
          const resueltTime = new Date(i.fechaSolucion).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' });
          doc.text(`Resuelto: ${resueltTime}`, 70, 7.5 + currentY);
        }
        
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8);
        doc.text(i.descripcion.substring(0, 24), 96, currentY + 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const salidaStr = i.horaSalida ? new Date(i.horaSalida).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' }) : "N/A";
        doc.text(`Ruta Salida: ${salidaStr}`, 96, currentY + 7.5);
        
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`${i.conductor.substring(0, 15)}`, 145, currentY + 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Tel: ${i.conductorTelefono || "N/A"} • Bus: ${i.bus}`, 145, currentY + 7.5);
        
        currentY += 8;
      });
      
      if (incidentesFiltrados.length === 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(148, 163, 184);
        doc.text("No se encontraron incidentes reportados en la bitácora.", 20, currentY + 6);
      }
    } else {
      doc.text("CONTROL DE MANIFIESTO Y EMBARQUE", 15, yTable - 4);
      
      // Cabecera Tabla
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(15, yTable, 180, 8, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("FECHA / HORA SALIDA", 18, yTable + 5.5);
      doc.text("RUTA DE SERVICIO", 60, yTable + 5.5);
      doc.text("BUS / CONDUCTOR / TELÉFONO", 110, yTable + 5.5);
      doc.text("BOLETOS / A BORDO", 160, yTable + 5.5);
      doc.text("% ASIST", 185, yTable + 5.5);
      
      let currentY = yTable + 8;
      let isZebra = false;
      
      embarquesFiltrados.slice(0, 15).forEach((em: any) => {
        if (currentY > 265) { doc.addPage(); currentY = 20; }
        
        if (isZebra) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, 180, 8, "F");
        }
        isZebra = !isZebra;
        
        doc.setDrawColor(241, 245, 249);
        doc.line(15, currentY + 8, 195, currentY + 8);
        
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const fStr = em.fecha ? new Date(em.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "N/A";
        doc.text(fStr, 18, currentY + 5.5);
        
        doc.setFont("helvetica", "bold");
        doc.text(`${em.origen.substring(0,10)} a ${em.destino.substring(0,10)}`, 60, currentY + 5.5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(`Bus: ${em.bus} • ${em.conductor.substring(0,14)}`, 110, currentY + 4.5);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Tel: ${em.conductorTelefono || "N/A"}`, 110, currentY + 7.2);
        
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8);
        doc.text(`${em.vendidos} vend. / ${em.abordaron} abor.`, 160, currentY + 5.5);
        
        doc.setTextColor(16, 185, 129); // verde de embarques
        doc.setFont("helvetica", "bold");
        doc.text(`${em.porcentajeAbordaje}%`, 185, currentY + 5.5);
        
        currentY += 8;
      });
      
      if (embarquesFiltrados.length === 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(148, 163, 184);
        doc.text("No se encontraron registros de embarque validados por operarios.", 20, currentY + 6);
      }
    }
    
    // Pie de página sutil y elegante
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 276, 195, 276);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Transportes El Cumbe S.A. © Todos los derechos reservados. Reporte generado de forma automatizada por el sistema administrativo.", 15, 282);
    doc.text("Página 1 de 1", 182, 282);
    
    doc.save(`Reporte_Operativo_${desde}_a_${hasta}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado con Filtros del Reporte */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
              <span className="w-2.5 h-6 rounded-full bg-[#f07639] block" />
              Reporte de Operaciones y Bitácora
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
              Control de gastos de ruta, incidencias del conductor y manifiestos de operarios
            </p>
          </div>
          
          <button
            onClick={exportarPDF}
            disabled={!data || loading}
            className="flex items-center justify-center gap-2 bg-[#f07639] hover:bg-[#d85e25] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Descargar PDF Operativo
          </button>
        </div>

        {/* Panel de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
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
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Buscar Conductor (DNI)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-300 pointer-events-none" />
              <input
                type="text"
                placeholder="DNI del Conductor..."
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
                {rutasUnicas.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de Carga o Error */}
      {loading && (
        <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center shadow-sm">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando bitácora y datos operativos...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 text-red-600 border border-red-100 rounded-2xl p-5 flex items-start gap-3 shadow-sm">
          <CircleAlert className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Error de Carga</p>
            <p className="text-xs mt-1 text-red-500 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Panel de Resumen KPI Operativo */}
      {data && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Gastos de Ruta */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-rose-600 opacity-[0.06]" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-red-500">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="bg-rose-50 text-red-600 border border-rose-100 text-[10px] font-extrabold px-2 py-0.5 rounded">Ruta</span>
            </div>
            <p className="text-2xl font-black text-slate-800">S/. {resumenFiltrado.totalGastosRuta.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">TOTAL GASTOS CONDUCTORES</p>
          </div>

          {/* Incidentes de Bitácora */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 opacity-[0.06]" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-extrabold px-2 py-0.5 rounded">Bitácora</span>
            </div>
            <p className="text-2xl font-black text-slate-800">{resumenFiltrado.totalIncidentes} sucesos</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">INCIDENTES DE BITÁCORA</p>
          </div>

          {/* Viajes Monitoreados */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 opacity-[0.06]" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-extrabold px-2 py-0.5 rounded">Manifiestos</span>
            </div>
            <p className="text-2xl font-black text-slate-800">{resumenFiltrado.totalViajesMonitoreados} viajes</p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">SERVICIOS VALIDADOS</p>
          </div>

          {/* Asistencia Promedio */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-sm">
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-[0.06]" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#10b981]">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="bg-emerald-50 text-[#10b981] border border-emerald-100 text-[10px] font-extrabold px-2 py-0.5 rounded">Operarios</span>
            </div>
            <p className="text-2xl font-black text-slate-800">
              {resumenFiltrado.pasajerosEsperados > 0 
                ? `${Math.round((resumenFiltrado.pasajerosAbordados / resumenFiltrado.pasajerosEsperados) * 100)}%`
                : "100%"}
            </p>
            <p className="text-[11px] text-slate-400 font-bold mt-1">TASA DE ABORDAJE PROMEDIO</p>
          </div>
        </div>
      )}

      {/* Tabs y Detalle */}
      {data && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0">
            <button
              onClick={() => setActiveTab("gastos")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-xs font-bold border-b-2 transition-colors outline-none cursor-pointer shrink-0 ${
                activeTab === "gastos"
                  ? "border-[#f07639] text-[#f07639] bg-white"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Receipt className="w-4 h-4" />
              Gastos Conductor ({gastosFiltrados.length})
            </button>
            <button
              onClick={() => setActiveTab("incidentes")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-xs font-bold border-b-2 transition-colors outline-none cursor-pointer shrink-0 ${
                activeTab === "incidentes"
                  ? "border-[#f07639] text-[#f07639] bg-white"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Incidentes Bitácora ({incidentesFiltrados.length})
            </button>
            <button
              onClick={() => setActiveTab("embarques")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 text-xs font-bold border-b-2 transition-colors outline-none cursor-pointer shrink-0 ${
                activeTab === "embarques"
                  ? "border-[#f07639] text-[#f07639] bg-white"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Users className="w-4 h-4" />
              Embarque Operario ({embarquesFiltrados.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "gastos" ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 bg-white z-10">
                      <th className="pb-3 w-[12%]">Fecha</th>
                      <th className="pb-3 w-[20%]">Concepto</th>
                      <th className="pb-3 w-[22%]">Conductor</th>
                      <th className="pb-3 w-[10%] text-center">Evidencia</th>
                      <th className="pb-3 w-[10%] text-center">Bus</th>
                      <th className="pb-3 w-[16%]">Ruta</th>
                      <th className="pb-3 w-[10%] text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {gastosFiltrados.length > 0 ? (
                      gastosFiltrados.map((g: any) => (
                        <tr key={g.id} className="text-xs text-slate-600 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-slate-400 font-medium">
                            {g.fecha ? new Date(g.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                          </td>
                          <td className="py-3 font-bold text-slate-800 break-words">{g.concepto}</td>
                          <td className="py-3 font-semibold break-words">
                            {g.conductor}
                            <span className="text-[10px] text-slate-400 block font-normal">DNI: {g.conductorDni} • Tel: {g.conductorTelefono}</span>
                          </td>
                          <td className="py-3 text-center">
                            {g.foto_url ? (
                              <button 
                                onClick={() => setPreviewFoto(g.foto_url)}
                                className="inline-flex items-center gap-1 bg-slate-50 hover:bg-[#f07639]/10 text-slate-650 hover:text-[#f07639] border border-slate-200 hover:border-[#f07639]/30 px-2 py-0.5 rounded font-bold text-[10px] cursor-pointer transition-all active:scale-95"
                              >
                                <Eye className="w-3 h-3" /> Ver Foto
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              {g.bus}
                            </span>
                          </td>
                          <td className="py-3 font-medium">
                            {g.ruta}
                            {g.horaSalida && (
                              <span className="text-[9px] text-slate-400 block font-normal mt-0.5" suppressHydrationWarning>
                                Salida: {new Date(g.horaSalida).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right font-black text-red-600">S/. {g.monto.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-semibold">
                          No se encontraron gastos registrados con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === "incidentes" ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 bg-white z-10">
                      <th className="pb-3 w-[11%]">Fecha</th>
                      <th className="pb-3 w-[8%]">Tipo</th>
                      <th className="pb-3 w-[8%] text-center">Gravedad</th>
                      <th className="pb-3 w-[11%]">Estado</th>
                      <th className="pb-3 w-[18%]">Descripción</th>
                      <th className="pb-3 w-[8%] text-center">Evidencia</th>
                      <th className="pb-3 w-[7%] text-center">Retraso</th>
                      <th className="pb-3 w-[15%]">Conductor</th>
                      <th className="pb-3 w-[7%] text-center">Bus</th>
                      <th className="pb-3 w-[10%]">Ruta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {incidentesFiltrados.length > 0 ? (
                      incidentesFiltrados.map((i: any) => (
                        <tr key={i.id} className="text-xs text-slate-600 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-slate-400 font-medium">
                            {i.fecha ? new Date(i.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                          </td>
                          <td className="py-3 font-bold text-slate-800">{i.tipo}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                              i.gravedad.toLowerCase() === "alta" 
                                ? "bg-red-50 text-red-600 border border-red-100" 
                                : i.gravedad.toLowerCase() === "media"
                                  ? "bg-amber-50 text-amber-600 border border-amber-100"
                                  : "bg-blue-50 text-blue-600 border border-blue-100"
                            }`}>
                              {i.gravedad}
                            </span>
                          </td>
                          <td className="py-3">
                            {i.solucionado ? (
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded font-black text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase animate-fade-in">
                                  ✓ Solucionado
                                </span>
                                {i.fechaSolucion && (
                                  <span className="text-[9px] text-slate-400 block font-normal mt-0.5" suppressHydrationWarning>
                                    Resuelto: {new Date(i.fechaSolucion).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded font-black text-[9px] bg-amber-50 text-amber-600 border border-amber-100 uppercase animate-pulse">
                                ⚠ En curso
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-slate-500 font-medium break-words pr-2">{i.descripcion}</td>
                          <td className="py-3 text-center">
                            {i.foto_url ? (
                              <button 
                                onClick={() => setPreviewFoto(i.foto_url)}
                                className="inline-flex items-center gap-1 bg-slate-50 hover:bg-[#f07639]/10 text-slate-650 hover:text-[#f07639] border border-slate-200 hover:border-[#f07639]/30 px-2 py-0.5 rounded font-bold text-[9px] cursor-pointer transition-all active:scale-95"
                              >
                                <Eye className="w-3 h-3" /> Ver Foto
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3 text-center font-bold text-slate-700">{i.retraso} min</td>
                          <td className="py-3 font-semibold break-words">
                            {i.conductor}
                            <span className="text-[10px] text-slate-400 block font-normal">DNI: {i.conductorDni} • Tel: {i.conductorTelefono}</span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              {i.bus}
                            </span>
                          </td>
                          <td className="py-3 font-medium">
                            {i.ruta}
                            {i.horaSalida && (
                              <span className="text-[9px] text-slate-400 block font-normal mt-0.5" suppressHydrationWarning>
                                Salida: {new Date(i.horaSalida).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-semibold">
                          No se encontraron incidentes registrados con los filtros actuales.
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
                      <th className="pb-3 w-[15%]">Fecha Salida</th>
                      <th className="pb-3 w-[20%]">Ruta</th>
                      <th className="pb-3 w-[10%] text-center">Bus</th>
                      <th className="pb-3 w-[20%]">Conductor</th>
                      <th className="pb-3 w-[8%] text-center">Vendidos</th>
                      <th className="pb-3 w-[8%] text-center">A Bordo</th>
                      <th className="pb-3 w-[9%] text-center">Pendientes</th>
                      <th className="pb-3 w-[10%] text-center">% Asistencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {embarquesFiltrados.length > 0 ? (
                      embarquesFiltrados.map((em: any) => (
                        <tr key={em.id} className="text-xs text-slate-600 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-slate-400 font-medium">
                            {new Date(em.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="py-3 font-bold text-slate-800">
                            <span className="flex items-center gap-1.5">
                              {em.origen}
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              {em.destino}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-bold text-[10px]">
                              {em.bus}
                            </span>
                          </td>
                          <td className="py-3 font-semibold break-words">
                            {em.conductor}
                            <span className="text-[10px] text-slate-400 block font-normal">DNI: {em.conductorDni} • Tel: {em.conductorTelefono}</span>
                          </td>
                          <td className="py-3 text-center font-bold text-slate-700">{em.vendidos}</td>
                          <td className="py-3 text-center font-bold text-emerald-600 bg-emerald-50/30 rounded">{em.abordaron}</td>
                          <td className="py-3 text-center font-bold text-slate-400">{em.pendientes}</td>
                          <td className="py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-extrabold text-[10px] text-slate-700">{em.porcentajeAbordaje}%</span>
                              <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${
                                    em.porcentajeAbordaje >= 90 
                                      ? "bg-emerald-500" 
                                      : em.porcentajeAbordaje >= 60 
                                        ? "bg-blue-500" 
                                        : "bg-amber-500"
                                  }`} 
                                  style={{ width: `${em.porcentajeAbordaje}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-semibold">
                          No se encontraron registros de embarque con los filtros actuales.
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

      {/* Modal de Vista Previa de Evidencia para el Administrador */}
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
              <Receipt className="w-5 h-5 text-[#f07639]" /> Evidencia Adjunta
            </h3>
            <div className="w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center min-h-[300px] max-h-[70vh]">
              <img src={previewFoto} alt="Evidencia" className="w-full max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
