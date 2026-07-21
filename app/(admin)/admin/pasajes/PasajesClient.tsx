"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MapPin, Calendar, Clock, CreditCard, User, Tag, ChevronRight, CheckCircle2, Ticket, ArrowLeft, Monitor, Maximize2, X, RotateCcw, Printer } from "lucide-react";
import { buscarViajes, obtenerAsientosPorViaje, buscarPasajeroPorDni, venderPasaje } from "../../actions/pasajes";
import { getPeruDateString } from "@/lib/dates";
import ListaPasajes from "./ListaPasajes";
import QRCode from "qrcode";

type Sucursal = { id: string; nombre: string };
type Ruta = { id: string; precio_base: string };
type Viaje = { 
  id: string; 
  fecha_salida: string; 
  ruta: Ruta & { origen: Sucursal, destino: Sucursal }; 
  bus: { id: string; placa: string; capacity: number; pisos: number; asientos_piso_1: number; asientos_restringidos: string };
  asientos_viaje: { estado: string }[];
};
type Asiento = { id: string; numero_asiento: number; piso: number; estado: string };

export default function PasajesClient({ initialSucursales, userRole }: { initialSucursales: Sucursal[], userRole?: string }) {
  // Buscador
  const [origenId, setOrigenId] = useState<string>("");
  const [destinoId, setDestinoId] = useState<string>("");
  const [fecha, setFecha] = useState<string>(getPeruDateString());

  // Vista actual — leer tab de la URL si existe (?tab=lista)
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [view, setView] = useState<"venta" | "lista">(userRole !== "vendedor" ? "lista" : (tabParam === "lista" ? "lista" : "venta"));

  // Sincronizar vista cuando cambia el param de URL (navegación desde notificaciones)
  useEffect(() => {
    if (tabParam === "lista") setView("lista");
    else if (tabParam === "venta") setView("venta");
  }, [tabParam]);
  
  // Resultados Viajes
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [isLoadingViajes, setIsLoadingViajes] = useState(false);
  const [selectedViaje, setSelectedViaje] = useState<Viaje | null>(null);

  // Asientos del Viaje seleccionado
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [isLoadingAsientos, setIsLoadingAsientos] = useState(false);
  const [selectedAsientos, setSelectedAsientos] = useState<Asiento[]>([]);

  // Panel de Venta: mapeado por asientoId
  const [pasajeros, setPasajeros] = useState<Record<string, { dni: string; nombres: string; apellidos: string; telefono: string }>>({});
  const [precio, setPrecio] = useState<string>("0");
  const [isSearchingDnis, setIsSearchingDnis] = useState<Record<string, boolean>>({});
  const [isSelling, setIsSelling] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [ticketsVendidos, setTicketsVendidos] = useState<any[]>([]);

  // === PASO 1: BUSCAR VIAJES ===
  const handleBuscarViajes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!origenId || !destinoId || !fecha) return;
    
    setIsLoadingViajes(true);
    setSelectedViaje(null);
    setSelectedAsientos([]);
    setPasajeros({});
    setAsientos([]);
    
    try {
      const res = await buscarViajes(origenId, destinoId, fecha);
      if (res.success) {
        setViajes(res.data);
      } else {
        alert(res.error || "Error de servidor al buscar viajes.");
      }
    } catch(err) {
      alert("Error de conexión. Verifica tu internet y vuelve a intentarlo.");
    } finally {
      setIsLoadingViajes(false);
    }
  };

  const handleLimpiar = () => {
    setOrigenId("");
    setDestinoId("");
    setFecha(getPeruDateString());
    setViajes([]);
    setSelectedViaje(null);
    setSelectedAsientos([]);
    setAsientos([]);
    setPasajeros({});
    setPrecio("0");
    setSaleSuccess(false);
    setTicketsVendidos([]);
  };

  // === IMPRIMIR BOLETO TÉRMICO (FORMATO TICKET 80MM) ===
  const imprimirTicket = async (ticket: any, viajeObj = selectedViaje, asientoObj = selectedAsiento) => {
    if (!ticket || !viajeObj || !asientoObj) return;

    let qrBase64 = "";
    try {
      qrBase64 = await QRCode.toDataURL(ticket.codigo_qr, { width: 120, margin: 1 });
    } catch (err) {
      console.error("Error al generar QR para impresión:", err);
    }

    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes en tu navegador para imprimir el ticket.");
      return;
    }

    const fechaCompraStr = ticket.fecha_compra 
      ? new Date(ticket.fecha_compra).toLocaleString() 
      : new Date().toLocaleString();

    const fechaSalidaStr = viajeObj.fecha_salida 
      ? new Date(viajeObj.fecha_salida).toLocaleDateString() 
      : "";

    const horaSalidaStr = viajeObj.fecha_salida 
      ? formatTime(viajeObj.fecha_salida) 
      : "";

    const ticketHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Ticket Boleto #${ticket.codigo_qr}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 4mm 0;
            font-size: 11px;
            color: #000;
            line-height: 1.3;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 3mm 0; }
          .header { font-size: 14px; font-weight: bold; margin-bottom: 1mm; }
          .subtitle { font-size: 10px; margin-bottom: 2mm; }
          .row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
          .qr-container { display: flex; justify-content: center; margin: 3mm 0; }
          .qr-container img { width: 120px; height: 120px; }
          .ticket-title { font-size: 12px; font-weight: bold; margin: 2mm 0; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="header">TRANSPORTES EL CUMBE</div>
          <div class="subtitle">R.U.C. 20123456789</div>
          <div class="subtitle">Oficina Principal - Venta Presencial</div>
          <div class="divider"></div>
          <div class="ticket-title">Boleto de Pasaje</div>
          <div class="bold">${ticket.codigo_qr}</div>
          <div class="subtitle">Compra: ${fechaCompraStr}</div>
        </div>

        <div class="divider"></div>

        <div class="row"><span class="bold">Pasajero:</span><span>${pasajero.nombres.toUpperCase()}</span></div>
        <div class="row"><span></span><span>${pasajero.apellidos.toUpperCase()}</span></div>
        <div class="row"><span class="bold">DNI:</span><span>${pasajero.dni}</span></div>
        ${pasajero.telefono ? `<div class="row"><span class="bold">Teléfono:</span><span>${pasajero.telefono}</span></div>` : ""}

        <div class="divider"></div>

        <div class="text-center bold" style="margin-bottom: 2mm;">DETALLE DEL VIAJE</div>
        <div class="row"><span class="bold">Origen:</span><span>${viajeObj.ruta.origen.nombre}</span></div>
        <div class="row"><span class="bold">Destino:</span><span>${viajeObj.ruta.destino.nombre}</span></div>
        <div class="row"><span class="bold">F. Viaje:</span><span>${fechaSalidaStr}</span></div>
        <div class="row"><span class="bold">H. Viaje:</span><span>${horaSalidaStr}</span></div>
        <div class="row"><span class="bold">Bus Placa:</span><span>${viajeObj.bus.placa}</span></div>

        <div class="divider"></div>

        <div class="row" style="font-size: 12px;"><span class="bold">ASIENTO:</span><span class="bold">#${asientoObj.numero_asiento} (Piso ${asientoObj.piso})</span></div>
        <div class="row" style="font-size: 12px;"><span class="bold">TOTAL PAGADO:</span><span class="bold">S/ ${parseFloat(precio).toFixed(2)}</span></div>

        <div class="divider"></div>

        ${qrBase64 ? `
          <div class="qr-container">
            <img src="${qrBase64}" alt="Código QR" />
          </div>
        ` : ""}

        <div class="text-center" style="font-size: 9px; margin-top: 2mm;">
          ¡GRACIAS POR SU PREFERENCIA!<br>
          Presentar este boleto 30 min antes<br>
          de la salida del bus.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(ticketHtml);
    printWindow.document.close();

    // Retrasar el diálogo de impresión en Brave/Chrome para permitir que carguen el DOM y el QR decodificado en la vista previa
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      } catch (e) {
        console.error("Error al disparar impresión del ticket:", e);
      }
    }, 600);
  };

  // === PASO 2: SELECCIONAR VIAJE Y CARGAR ASIENTOS ===
  const handleSelectViaje = async (viaje: Viaje) => {
    setSelectedViaje(viaje);
    setSelectedAsientos([]);
    setPasajeros({});
    setSaleSuccess(false);
    setIsLoadingAsientos(true);
    setAsientos([]); // Limpiar mapa viejo rápido
    setTicketsVendidos([]);
    
    try {
      const res = await obtenerAsientosPorViaje(viaje.id);
      
      setSelectedViaje((currentViaje) => {
        if (currentViaje?.id === viaje.id) {
          if (res.success) {
            setAsientos(res.data);
          } else {
            alert(res.error || "No se pudieron cargar los asientos de este viaje.");
          }
          setIsLoadingAsientos(false);
        }
        return currentViaje;
      });
    } catch(err) {
      alert("Error de red al cargar asientos. Inténtalo de nuevo.");
      setIsLoadingAsientos(false);
    }
  };

  const handleSelectAsiento = (asiento: Asiento) => {
    if (asiento.estado !== "disponible") return; // Solo permitir seleccionar disponibles
    
    setSaleSuccess(false);
    setSelectedAsientos((prev) => {
      const exists = prev.some(a => a.id === asiento.id);
      let nextList = [];
      if (exists) {
        nextList = prev.filter(a => a.id !== asiento.id);
        // Quitar también pasajero de los datos
        setPasajeros(current => {
          const updated = { ...current };
          delete updated[asiento.id];
          return updated;
        });
      } else {
        nextList = [...prev, asiento];
      }
      
      if (selectedViaje) {
        setPrecio((nextList.length * Number(selectedViaje.ruta.precio_base)).toString());
      }
      return nextList;
    });
  };

  // === ABRIR SUB-PANTALLA (POPUP) INDEPENDIENTE "VISTA COMPLETA" PARA EL CLIENTE ===
  const abrirPopupCliente = () => {
    if (!selectedViaje || asientos.length === 0) {
      alert("Por favor, selecciona primero un viaje para cargar los asientos.");
      return;
    }

    const popup = window.open(
      "",
      "VistaCompletaElCumbe",
      "width=1050,height=880,status=no,toolbar=no,menubar=no,resizable=yes"
    );

    if (!popup) {
      alert("Por favor, permite las ventanas emergentes (popups) en tu navegador para mostrar la sub-pantalla al cliente.");
      return;
    }

    // Exponer la función al objeto window global del padre para que el popup pueda llamarla
    (window as any).seleccionarAsientoDesdeCliente = (asientoId: string) => {
      const seat = asientos.find(a => a.id === asientoId);
      if (seat) {
        handleSelectAsiento(seat);
        // No cerramos el popup para que el cliente pueda seguir seleccionando o deseleccionando asientos
      }
    };

    const isBuscama = selectedViaje.bus.pisos === 2;

    // Generar botones de asiento en formato HTML
    const renderAsientoHTML = (seat: any) => {
      if (!seat) return '<div class="w-18 h-18"></div>';
      const isOcupado = seat.estado !== "disponible";
      const isSelected = selectedAsientos.some(a => a.id === seat.id);
      
      let colorClass = "text-orange-500 bg-[#f07639]/5 border-2 border-[#f07639]/20 hover:bg-[#f07639] hover:text-white hover:border-[#d8662d] cursor-pointer shadow-sm";
      if (isOcupado) {
        colorClass = "text-slate-350 bg-slate-50 border-2 border-slate-100 cursor-not-allowed";
      } else if (isSelected) {
        colorClass = "text-white bg-[#f07639] border-2 border-[#d8662d] shadow-lg shadow-orange-500/25";
      }

      const disabledAttr = isOcupado ? "disabled" : "";
      const clickHandler = isOcupado ? "" : `onclick="window.opener.seleccionarAsientoDesdeCliente('${seat.id}')"`;

      return `
        <button ${disabledAttr} ${clickHandler} class="w-18 h-20 rounded-2xl flex items-center justify-center transition-all duration-200 ${colorClass}">
          <svg class="w-full h-full p-1.5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 22 42 H 28 V 22 C 28 14, 72 14, 72 22 V 42 H 78 C 83 42, 85 46, 85 50 V 78 C 85 86, 77 88, 70 88 H 30 C 23 88, 15 86, 15 78 V 50 C 15 46, 17 42, 22 42 Z" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 28 42 V 66 C 28 74, 72 74, 72 66 V 42" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            ${isOcupado ? `
              <path d="M 40 22 L 60 42 M 60 22 L 40 42" stroke="currentColor" stroke-width="7" stroke-linecap="round" />
            ` : `
              <text x="50" y="34" text-anchor="middle" dominant-baseline="middle" class="font-extrabold text-[28px]" fill="currentColor">
                ${seat.numero_asiento}
              </text>
            `}
          </svg>
        </button>
      `;
    };

    // Renderizadores HTML específicos de la estructura del Bus
    const renderPiso1HTML = () => {
      const asientosPiso = asientos.filter(a => a.piso === 1);
      const filasPiso1 = [
        { col1: 1, col2: 2, col4: 3 },
        { col1: 4, col2: 5, col4: 6 },
        { col1: 7, col2: 8, col4: 9 },
        { col1: 10, col2: 11, col4: 12 },
      ];
      let html = '<div class="space-y-4">';
      filasPiso1.forEach(fila => {
        const seatCol1 = asientosPiso.find(s => s.numero_asiento === fila.col1);
        const seatCol2 = asientosPiso.find(s => s.numero_asiento === fila.col2);
        const seatCol4 = asientosPiso.find(s => s.numero_asiento === fila.col4);
        html += `
          <div class="flex items-center gap-4">
            ${renderAsientoHTML(seatCol1)}
            ${renderAsientoHTML(seatCol2)}
            <div class="w-14 flex items-center justify-center">
              <svg class="w-6 h-6 text-slate-350" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M8 3l4 4 4-4" /></svg>
            </div>
            ${renderAsientoHTML(seatCol4)}
          </div>
        `;
      });
      html += '</div>';
      return html;
    };

    const renderPiso2HTML = () => {
      const asientosPiso = asientos.filter(a => a.piso === 2);
      const filasPiso2 = [
        { col1: 13, col2: 14, col4: 15, col5: 16, escalera: false },
        { col1: 17, col2: 18, col4: 19, col5: 20, escalera: false },
        { col1: 21, col2: 22, col4: null, col5: null, escalera: true },
        { col1: 23, col2: 24, col4: null, col5: null, escalera: false },
        { col1: 25, col2: 26, col4: 27, col5: 28, escalera: false },
        { col1: 29, col2: 30, col4: 31, col5: 32, escalera: false },
        { col1: 33, col2: 34, col4: 35, col5: 36, escalera: false },
        { col1: 37, col2: 38, col4: 39, col5: 40, escalera: false },
        { col1: 41, col2: 42, col4: 43, col5: 44, escalera: false },
        { col1: 45, col2: 46, col4: 47, col5: 48, escalera: false },
        { col1: 49, col2: 50, col4: 51, col5: 52, escalera: false },
        { col1: 53, col2: 54, col4: 55, col5: 56, escalera: false },
        { col1: 57, col2: 58, col4: 59, col5: 60, escalera: false },
      ];
      let html = '<div class="space-y-4">';
      filasPiso2.forEach(fila => {
        const seatCol1 = asientosPiso.find(s => s.numero_asiento === fila.col1);
        const seatCol2 = asientosPiso.find(s => s.numero_asiento === fila.col2);
        const seatCol4 = fila.col4 !== null ? asientosPiso.find(s => s.numero_asiento === fila.col4) : null;
        const seatCol5 = fila.col5 !== null ? asientosPiso.find(s => s.numero_asiento === fila.col5) : null;
        html += `
          <div class="flex items-center gap-4">
            ${renderAsientoHTML(seatCol1)}
            ${renderAsientoHTML(seatCol2)}
            <div class="w-14 flex items-center justify-center"></div>
            ${fila.escalera ? `
              <div class="w-40 h-20 flex items-center justify-center text-slate-300">
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h4v-5h4v-5h4v-5h6" /></svg>
              </div>
            ` : `
              ${renderAsientoHTML(seatCol4)}
              ${renderAsientoHTML(seatCol5)}
            `}
          </div>
        `;
      });
      html += '</div>';
      return html;
    };

    const renderAsientosRegularesHTML = () => {
      const asientosPiso = asientos.filter(a => a.piso === 1);
      const filas = [];
      for (let i = 0; i < asientosPiso.length; i += 4) {
        filas.push(asientosPiso.slice(i, i + 4));
      }
      let html = '<div class="space-y-4">';
      filas.forEach(fila => {
        html += `
          <div class="flex items-center gap-4">
            ${renderAsientoHTML(fila[0])}
            ${renderAsientoHTML(fila[1])}
            <div class="w-14 h-20"></div>
            ${renderAsientoHTML(fila[2])}
            ${renderAsientoHTML(fila[3])}
          </div>
        `;
      });
      html += '</div>';
      return html;
    };

    // Construcción completa del documento HTML en Modo Claro
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vista Completa Asientos - El Cumbe</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
          body {
            font-family: 'Outfit', sans-serif;
            background-color: #f8f9fc;
            color: #1e293b;
          }
          .bus-chasis {
            box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.05);
          }
        </style>
      </head>
      <body class="min-h-screen flex flex-col p-6 md:p-8 select-none overflow-x-hidden">
        <!-- Cabecera -->
        <div class="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 shadow-md">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 bg-gradient-to-br from-[#f07639] to-[#d45a1f] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div class="text-center sm:text-left">
              <h1 class="text-xl md:text-2xl font-black text-slate-800 tracking-tight">📱 PANTALLA CLIENTE: Selecciona tu Asiento</h1>
              <p class="text-xs text-slate-450 font-bold mt-0.5">
                Bus ${selectedViaje.bus.placa} • ${selectedViaje.ruta.origen.nombre} &rarr; ${selectedViaje.ruta.destino.nombre}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="bg-[#f07639]/10 border border-[#f07639]/20 px-4 py-2 rounded-xl text-[#f07639] text-xs font-bold shadow-sm">
              Tarifa: <span class="text-[#f07639] font-extrabold text-sm ml-1">S/ ${selectedViaje.ruta.precio_base}</span>
            </div>
            <button onclick="window.close()" class="bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105 cursor-pointer flex items-center gap-1">
              &times; Cerrar
            </button>
          </div>
        </div>

        <!-- Cuerpo con mapa de asientos -->
        <div class="flex-1 flex items-center justify-center py-4">
          <div class="flex flex-col lg:flex-row gap-16 max-w-6xl items-center lg:items-start transition-all duration-300">
            ${isBuscama ? `
              <!-- Piso 1 -->
              <div class="flex flex-col items-center">
                <div class="font-black text-xs uppercase tracking-[0.2em] px-4.5 py-2 bg-slate-50 border border-slate-200 text-slate-650 rounded-full mb-4 shadow-sm">1er Piso</div>
                <div class="bus-chasis border-2 border-slate-200/80 bg-white rounded-[3.8rem] py-10 px-6 shadow-sm">
                  ${renderPiso1HTML()}
                </div>
              </div>
              <!-- Piso 2 -->
              <div class="flex flex-col items-center">
                <div class="font-black text-xs uppercase tracking-[0.2em] px-4.5 py-2 bg-slate-50 border border-slate-200 text-slate-650 rounded-full mb-4 shadow-sm">2do Piso</div>
                <div class="bus-chasis border-2 border-slate-200/80 bg-white rounded-[3.8rem] py-10 px-6 shadow-sm">
                  ${renderPiso2HTML()}
                </div>
              </div>
            ` : `
              <!-- Regular 1 Piso -->
              <div class="flex flex-col items-center">
                <div class="font-black text-xs uppercase tracking-[0.2em] px-4.5 py-2 bg-slate-50 border border-slate-200 text-slate-650 rounded-full mb-4 shadow-sm">Croquis del Bus</div>
                <div class="bus-chasis border-2 border-slate-200/80 bg-white rounded-[3.8rem] py-10 px-6 shadow-sm">
                  ${renderAsientosRegularesHTML()}
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- Leyendas -->
        <div class="mt-8 border-t border-slate-200/80 pt-6 flex justify-center gap-10 text-xs font-bold text-slate-450">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-[#f07639]/5 border border-[#f07639]/20 flex items-center justify-center text-orange-500">
              <svg class="w-4.5 h-4.5" viewBox="0 0 100 100" fill="none"><path d="M 22 42 H 28 V 22 C 28 14, 72 14, 72 22 V 42 H 78 C 83 42, 85 46, 85 50 V 78 C 85 86, 77 88, 70 88 H 30 C 23 88, 15 86, 15 78 V 50 C 15 46, 17 42, 22 42 Z" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /><path d="M 28 42 V 66 C 28 74, 72 74, 72 66 V 42" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
            <span>Disponible</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center">
              <svg class="w-4.5 h-4.5" viewBox="0 0 100 100" fill="none"><path d="M 22 42 H 28 V 22 C 28 14, 72 14, 72 22 V 42 H 78 C 83 42, 85 46, 85 50 V 78 C 85 86, 77 88, 70 88 H 30 C 23 88, 15 86, 15 78 V 50 C 15 46, 17 42, 22 42 Z" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /><path d="M 28 42 V 66 C 28 74, 72 74, 72 66 V 42" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" /><path d="M 40 22 L 60 42 M 60 22 L 40 42" stroke="currentColor" stroke-width="6" stroke-linecap="round" /></svg>
            </div>
            <span>Ocupado</span>
          </div>
        </div>
      </body>
      </html>
    `;

    popup.document.write(htmlContent);
    popup.document.close();
  };

  // Autocompletado de DNI y guardado de datos de pasajeros
  const handleDniChange = async (asientoId: string, val: string) => {
    setPasajeros(prev => ({
      ...prev,
      [asientoId]: {
        ...(prev[asientoId] || { dni: "", nombres: "", apellidos: "", telefono: "" }),
        dni: val,
        nombres: val.length < 8 ? "" : (prev[asientoId]?.nombres || ""),
        apellidos: val.length < 8 ? "" : (prev[asientoId]?.apellidos || "")
      }
    }));
    
    if (val.length === 8) {
      setIsSearchingDnis(prev => ({ ...prev, [asientoId]: true }));
      const res = await buscarPasajeroPorDni(val);
      if (res.success && res.data) {
        setPasajeros(prev => ({
          ...prev,
          [asientoId]: {
            dni: val,
            nombres: res.data.nombres || "",
            apellidos: res.data.apellidos || "",
            telefono: res.data.telefono || ""
          }
        }));
      }
      setIsSearchingDnis(prev => ({ ...prev, [asientoId]: false }));
    }
  };

  const handleDniBlurForSeat = async (asientoId: string) => {
    const currentPasajero = pasajeros[asientoId];
    if (currentPasajero && currentPasajero.dni.length >= 8) {
      setIsSearchingDnis(prev => ({ ...prev, [asientoId]: true }));
      const res = await buscarPasajeroPorDni(currentPasajero.dni);
      if (res.success && res.data) {
        setPasajeros(prev => ({
          ...prev,
          [asientoId]: {
            ...currentPasajero,
            nombres: res.data.nombres || "",
            apellidos: res.data.apellidos || "",
            telefono: res.data.telefono || ""
          }
        }));
      }
      setIsSearchingDnis(prev => ({ ...prev, [asientoId]: false }));
    }
  };

  // Confirmar Venta de múltiples asientos
  const handleVender = async () => {
    if (!selectedViaje || selectedAsientos.length === 0) return;
    
    // Validar que todos los pasajeros de los asientos seleccionados tengan DNI, nombres y apellidos
    for (const asiento of selectedAsientos) {
      const p = pasajeros[asiento.id];
      if (!p || !p.dni || !p.nombres || !p.apellidos) {
        alert(`Por favor, complete los datos del pasajero para el asiento #${asiento.numero_asiento}`);
        return;
      }
    }

    setIsSelling(true);
    try {
      const results: any[] = [];
      // Vender cada asiento seleccionado de forma secuencial en backend
      for (const asiento of selectedAsientos) {
        const p = pasajeros[asiento.id];
        const res = await venderPasaje({
          viaje_id: selectedViaje.id,
          asiento_id: asiento.id,
          precio: Number(selectedViaje.ruta.precio_base),
          pasajero: p
        });
        
        if (res.success) {
          results.push(res.data);
        } else {
          throw new Error(res.error || `Error al vender el asiento #${asiento.numero_asiento}`);
        }
      }

      setSaleSuccess(true);
      setTicketsVendidos(results);
      handleSelectViaje(selectedViaje);
      alert("¡Venta múltiple registrada exitosamente!");
      
      // Imprimir boletos automáticamente en cadena
      for (let i = 0; i < results.length; i++) {
        imprimirTicket(results[i], selectedViaje, selectedAsientos[i]);
      }
    } catch(err: any) {
      alert(err.message || "Error al procesar la venta. Inténtalo de nuevo.");
      handleSelectViaje(selectedViaje);
    } finally {
      setIsSelling(false);
    }
  };

  // UI Helpers
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Selector de Vista */}
      {userRole === "vendedor" && (
        <div className="bg-slate-200/50 border border-slate-200/30 p-1.5 rounded-full shadow-inner mb-6 w-full max-w-md flex space-x-1 mx-auto flex-shrink-0">
          <button
            onClick={() => setView("venta")}
            className={`flex-1 py-2.5 px-4 rounded-full font-bold transition-all duration-300 flex items-center justify-center ${
              view === "venta" ? "bg-white text-slate-800 shadow-[0_4px_15px_rgba(0,0,0,0.05)] scale-[1.02] border border-slate-200/60" : "text-slate-500 hover:text-slate-700 hover:bg-slate-250/30"
            }`}
          >
            <CreditCard className="w-4 h-4 mr-2" /> Vender Pasaje
          </button>
          <button
            onClick={() => setView("lista")}
            className={`flex-1 py-2.5 px-4 rounded-full font-bold transition-all duration-300 flex items-center justify-center ${
              view === "lista" ? "bg-white text-slate-800 shadow-[0_4px_15px_rgba(0,0,0,0.05)] scale-[1.02] border border-slate-200/60" : "text-slate-500 hover:text-slate-700 hover:bg-slate-250/30"
            }`}
          >
            <Ticket className="w-4 h-4 mr-2" /> Pasajes Vendidos
          </button>
        </div>
      )}

      {view === "lista" ? (
        <ListaPasajes sucursales={initialSucursales} />
      ) : (
        <>
          {/* Top Bar: Buscador */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-150 mb-6 flex-shrink-0">
            <form onSubmit={handleBuscarViajes} className="flex flex-wrap items-end gap-5">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Origen</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                  <select 
                    required
                    value={origenId} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val === destinoId) setDestinoId(origenId);
                      setOrigenId(val);
                    }}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 hover:bg-slate-100/60 focus:bg-white focus:border-[#f07639]/40 outline-none transition-all duration-300 font-medium text-slate-700 cursor-pointer appearance-none rounded-2xl"
                  >
                    <option value="">Seleccione Origen</option>
                    {initialSucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Destino</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                  <select 
                    required
                    value={destinoId} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val === origenId) setOrigenId(destinoId);
                      setDestinoId(val);
                    }}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 hover:bg-slate-100/60 focus:bg-white focus:border-[#f07639]/40 outline-none transition-all duration-300 font-medium text-slate-700 cursor-pointer appearance-none rounded-2xl"
                  >
                    <option value="">Seleccione Destino</option>
                    {initialSucursales
                      .filter(s => s.id !== origenId)
                      .map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 min-w-[160px]">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Fecha de Viaje</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                  <input 
                    type="date" required
                    value={fecha} onChange={(e) => setFecha(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 hover:bg-slate-100/60 focus:bg-white focus:border-[#f07639]/40 outline-none transition-all duration-300 font-medium text-slate-700 rounded-2xl cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  type="submit"
                  disabled={isLoadingViajes}
                  className="bg-gradient-to-r from-[#f07639] to-[#d8662d] hover:from-[#e06528] hover:to-[#c7551d] text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-orange-500/10 hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-0.5 flex items-center justify-center min-w-[140px] cursor-pointer"
                >
                  <Search className="w-5 h-5 mr-2" />
                  {isLoadingViajes ? "Buscando..." : "Buscar"}
                </button>

                <button 
                  type="button"
                  onClick={handleLimpiar}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200/60 text-slate-600 px-5 py-3 rounded-2xl font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center cursor-pointer shadow-sm"
                  title="Limpiar filtros y nueva búsqueda"
                >
                  <RotateCcw className="w-4.5 h-4.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Main Layout Dinámico: Paso 1 (Lista de Viajes) o Paso 2 (Asientos + Venta) */}
          <div className="flex-1 flex gap-5 min-h-0">
            
            {/* === PASO 1: Lista de Viajes (Ocupa toda la pantalla) === */}
            {!selectedViaje && (
              <div className="w-full flex flex-col bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden relative">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#f07639]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Paso 1: Elige un Viaje Disponible</h3>
                    <p className="text-xs text-slate-400 font-medium">Selecciona el horario y bus en el que viajará el cliente</p>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  {viajes.length === 0 && !isLoadingViajes && (
                    <div className="text-center flex flex-col items-center justify-center h-full opacity-60">
                      <Search className="w-16 h-16 text-slate-400 mb-4" />
                      <p className="text-slate-500 font-medium text-lg">Realiza una búsqueda para ver los viajes programados.</p>
                    </div>
                  )}
                  {isLoadingViajes && (
                    <div className="text-center text-slate-400 font-medium text-lg mt-20 animate-pulse">
                      Buscando viajes...
                    </div>
                  )}
                  {viajes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {viajes.map((viaje) => {
                        const libres = viaje.asientos_viaje.filter(a => a.estado === "disponible").length;
                        return (
                          <div 
                            key={viaje.id} 
                            onClick={() => handleSelectViaje(viaje)}
                            className="p-5 rounded-2xl border border-slate-200/60 cursor-pointer bg-white hover:border-[#f07639]/50 hover:bg-orange-50/10 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 group"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="text-3xl font-black text-slate-800 tracking-tighter group-hover:text-[#f07639] transition-colors">
                                {formatTime(viaje.fecha_salida)}
                              </div>
                              <div className="bg-slate-50 border border-slate-200/50 text-[#f07639] text-sm font-black px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                S/ {viaje.ruta.precio_base}
                              </div>
                            </div>
                            <div className="text-sm text-slate-600 font-semibold mb-4 bg-slate-50/60 px-3 py-2 rounded-lg border border-slate-100">
                              Bus <span className="text-slate-800 font-bold">{viaje.bus.placa}</span> • {viaje.bus.pisos} Piso(s)
                            </div>
                            <div className="flex items-center justify-between mt-auto border-t border-slate-100 pt-3">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${libres > 0 ? 'bg-green-50 text-green-700 border border-green-150' : 'bg-red-50 text-red-700 border border-red-150'}`}>
                                {libres} asientos libres
                              </span>
                              <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#f07639]/20 flex items-center justify-center transition-colors">
                                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#f07639] transition-colors" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === PASO 2: Mapa de Asientos (60%) y Datos y Pago (40%) === */}
            {selectedViaje && (
              <>
                {/* COL 1: Mapa de Asientos (60%) */}
                <div className="w-[60%] bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden flex flex-col relative">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          setSelectedViaje(null);
                          setSelectedAsiento(null);
                          setSaleSuccess(false);
                        }}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-[#f07639]/20 text-slate-600 hover:text-[#f07639] flex items-center justify-center transition-all border border-slate-200 hover:border-[#f07639]/30 cursor-pointer"
                        title="Volver a la lista de viajes"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">Paso 2: Selección de Asiento</h3>
                        <p className="text-xs text-slate-400 font-medium">Bus {selectedViaje.bus.placa} • {formatTime(selectedViaje.fecha_salida)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={abrirPopupCliente}
                        className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 text-indigo-700 text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.03] cursor-pointer"
                        title="Abrir mapa de asientos en una sub-pantalla independiente para el cliente"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        Vista Completa
                      </button>
                      <div className="bg-[#f07639] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                        Tarifa: S/ {selectedViaje.ruta.precio_base}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 overflow-y-auto flex-1 flex justify-center items-start bg-slate-50/50">
                    {isLoadingAsientos && (
                      <div className="text-center text-slate-400 text-sm mt-20 animate-pulse">Cargando asientos...</div>
                    )}

                    {!isLoadingAsientos && asientos.length > 0 && (
                      <div className="flex flex-col gap-8 pb-10">
                        {/* Agrupar por pisos */}
                        {[1, 2].map(piso => {
                          const asientosPiso = asientos.filter(a => a.piso === piso);
                          if (asientosPiso.length === 0) return null;
                          
                          const isBuscama = selectedViaje?.bus?.pisos === 2;

                          const renderTVIcon = () => (
                            <svg className="w-4 h-4 text-slate-400 opacity-70 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="13" rx="2" />
                              <path d="M8 3l4 4 4-4" />
                            </svg>
                          );

                          const renderAsientoButton = (seat: any, esPiso1: boolean) => {
                            if (!seat) return <div className="w-8 h-8" />;
                            const isSelected = selectedAsientos.some(a => a.id === seat.id);
                            const isOcupadoStatus = seat.estado !== "disponible";

                            let colorClass = "text-orange-350/90 hover:text-[#f07639] bg-transparent hover:scale-105";
                            if (isOcupadoStatus) {
                              colorClass = "text-slate-300 bg-transparent cursor-not-allowed";
                            } else if (isSelected) {
                              colorClass = "text-white bg-[#f07639] border-[#d8662d] shadow-md scale-105 rounded-xl";
                            }

                            return (
                              <button
                                key={seat.id}
                                disabled={isOcupadoStatus || isSelling}
                                onClick={() => handleSelectAsiento(seat)}
                                className={`relative w-8 h-8 md:w-9 md:h-10 flex items-center justify-center transition-all focus:outline-none cursor-pointer ${colorClass}`}
                              >
                                <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M 22 42 H 28 V 22 C 28 14, 72 14, 72 22 V 42 H 78 C 83 42, 85 46, 85 50 V 78 C 85 86, 77 88, 70 88 H 30 C 23 88, 15 86, 15 78 V 50 C 15 46, 17 42, 22 42 Z" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M 28 42 V 66 C 28 74, 72 74, 72 66 V 42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                  {isOcupadoStatus ? (
                                    <path d="M 40 22 L 60 42 M 60 22 L 40 42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                                  ) : (
                                    <text x="50" y="34" textAnchor="middle" dominantBaseline="middle" className="font-bold text-[20px]" fill="currentColor">
                                      {seat.numero_asiento}
                                    </text>
                                  )}
                                </svg>
                              </button>
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
                                  const seatCol1 = asientosPiso.find(s => s.numero_asiento === fila.col1);
                                  const seatCol2 = asientosPiso.find(s => s.numero_asiento === fila.col2);
                                  const seatCol4 = asientosPiso.find(s => s.numero_asiento === fila.col4);
                                  return (
                                    <div key={idx} className="flex items-center justify-center gap-1 md:gap-1.5">
                                      {seatCol1 ? renderAsientoButton(seatCol1, true) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                      {seatCol2 ? renderAsientoButton(seatCol2, true) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                      <div className="w-4 md:w-6 flex items-center justify-center">{fila.hasTV && renderTVIcon()}</div>
                                      {seatCol4 ? renderAsientoButton(seatCol4, true) : <div className="w-8 h-8 md:w-9 md:h-10" />}
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
                                  const seatCol1 = asientosPiso.find(s => s.numero_asiento === fila.col1);
                                  const seatCol2 = asientosPiso.find(s => s.numero_asiento === fila.col2);
                                  const seatCol4 = fila.col4 !== null ? asientosPiso.find(s => s.numero_asiento === fila.col4) : null;
                                  const seatCol5 = fila.col5 !== null ? asientosPiso.find(s => s.numero_asiento === fila.col5) : null;
                                  return (
                                    <div key={idx} className="flex items-center justify-center gap-1 md:gap-1.5">
                                      {seatCol1 ? renderAsientoButton(seatCol1, false) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                      {seatCol2 ? renderAsientoButton(seatCol2, false) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                      <div className="w-4 md:w-6 flex items-center justify-center">{fila.hasTV && renderTVIcon()}</div>
                                      {fila.escalera ? (
                                        <div className="w-16 md:w-20 h-8 md:h-10 flex items-center justify-center">
                                          <svg className="w-5 h-5 md:w-7 md:h-7 text-slate-400 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2 20h4v-5h4v-5h4v-5h6" />
                                          </svg>
                                        </div>
                                      ) : (
                                        <>
                                          {seatCol4 ? renderAsientoButton(seatCol4, false) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                          {seatCol5 ? renderAsientoButton(seatCol5, false) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          };

                          const renderAsientosRegulares = () => {
                            const filas: any[][] = [];
                            for (let i = 0; i < asientosPiso.length; i += 4) {
                              filas.push(asientosPiso.slice(i, i + 4));
                            }
                            return (
                              <div className="space-y-1">
                                {filas.map((fila, filaIdx) => (
                                  <div key={filaIdx} className="flex items-center justify-center gap-1 md:gap-2">
                                    {fila[0] ? renderAsientoButton(fila[0], true) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                    {fila[1] ? renderAsientoButton(fila[1], true) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                    <div className="w-4 md:w-6 h-10" />
                                    {fila[2] ? renderAsientoButton(fila[2], true) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                    {fila[3] ? renderAsientoButton(fila[3], true) : <div className="w-8 h-8 md:w-9 md:h-10" />}
                                  </div>
                                ))}
                              </div>
                            );
                          };

                          return (
                            <div key={piso} className="flex flex-col items-center w-full max-w-[320px] mx-auto pb-4">
                              
                              {/* TITULO Y VOLANTE */}
                              <div className="w-full flex justify-between items-center mb-4 px-4">
                                <div className="font-bold text-slate-700 text-sm md:text-base uppercase tracking-widest px-3.5 py-1 bg-white rounded-full shadow-sm border border-slate-200">
                                  {piso === 1 ? "1er Piso" : "2do Piso"}
                                </div>
                                {piso === 1 && (
                                  <div className="text-slate-400 bg-white p-2 rounded-full shadow-sm border border-slate-200">
                                    <svg className="w-5 h-5 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="12" r="10" />
                                      <circle cx="12" cy="12" r="3" />
                                      <path d="M12 15l-3.5 6" />
                                      <path d="M12 15l3.5 6" />
                                      <path d="M12 9V2" />
                                      <path d="M4 10l5.5 2" />
                                      <path d="M20 10l-5.5 2" />
                                    </svg>
                                  </div>
                                )}
                                {piso === 2 && (
                                  <div className="text-slate-400 bg-white p-2 rounded-full shadow-sm border border-slate-200">
                                    <svg className="w-5 h-5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M3 21h18M3 17h14M3 13h10M3 9h6M3 5h2" strokeLinecap="round" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* CHASIS DEL BUS */}
                              <div className="w-full bg-white border-2 border-slate-200/80 rounded-[3rem] shadow-inner py-6 px-3 flex justify-center relative overflow-hidden">
                                <div className="space-y-1 relative z-10 w-full flex flex-col items-center">
                                  {isBuscama 
                                    ? (piso === 1 ? renderPiso1DoblePiso() : renderPiso2DoblePiso())
                                    : renderAsientosRegulares()
                                  }
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* COL 2: Formulario Venta (40%) */}
                <div className="w-[40%] flex flex-col bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden relative">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#f07639]">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Paso 3: Datos y Pago</h3>
                      <p className="text-xs text-slate-400 font-medium">Completa la información del pasajero</p>
                    </div>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                    {selectedAsientos.length === 0 ? (
                      <div className="text-center text-slate-400 text-sm mt-20 flex flex-col items-center opacity-70">
                        <Ticket className="w-12 h-12 text-slate-355 mb-4 animate-bounce" />
                        Selecciona uno o más asientos disponibles (marrón claro) para proceder.
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        
                        {/* Resumen Selección */}
                        <div className="bg-orange-50 border border-orange-100/70 rounded-2xl p-4 mb-6 shadow-inner">
                          <div className="text-xs text-orange-600 font-black uppercase tracking-wider mb-1">Asientos Seleccionados</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedAsientos.map(a => (
                              <span key={a.id} className="px-3 py-1 bg-white border border-orange-200 text-slate-800 rounded-xl font-extrabold text-sm shadow-sm">
                                Asiento #{a.numero_asiento} (Piso {a.piso})
                              </span>
                            ))}
                          </div>
                        </div>

                        {saleSuccess && (
                          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl mb-6 flex flex-col items-center text-center">
                            <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                            <span className="font-bold">¡Venta Registrada Exitosamente!</span>
                            <span className="text-sm mt-1 opacity-90">{selectedAsientos.length} asiento(s) ahora están ocupados.</span>
                          </div>
                        )}

                        <div className="space-y-6">
                          {selectedAsientos.map((asiento) => {
                            const passengerObj = pasajeros[asiento.id] || { dni: "", nombres: "", apellidos: "", telefono: "" };
                            const isSearchingDni = isSearchingDnis[asiento.id] || false;
                            
                            return (
                              <div key={asiento.id} className="border border-slate-100 p-4 rounded-2xl bg-slate-50/50 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                                  <span className="text-xs font-black text-slate-750 uppercase tracking-wider">Asiento #{asiento.numero_asiento}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAsiento(asiento)}
                                    className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider"
                                  >
                                    Quitar
                                  </button>
                                </div>

                                {/* DNI */}
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">DNI del Pasajero</label>
                                  <div className="relative group/input">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover/input:text-[#f07639] transition-colors" />
                                    <input 
                                      type="text" maxLength={15}
                                      value={passengerObj.dni} 
                                      onChange={(e) => handleDniChange(asiento.id, e.target.value)}
                                      onBlur={() => handleDniBlurForSeat(asiento.id)}
                                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 focus:border-[#f07639]/45 outline-none transition-all font-bold text-slate-755 rounded-xl text-xs"
                                      placeholder="Ingrese DNI"
                                    />
                                    {isSearchingDni && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#f07639] animate-pulse">Buscando...</span>}
                                  </div>
                                </div>

                                {/* Nombres y Apellidos */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Nombres</label>
                                    <input 
                                      type="text" 
                                      value={passengerObj.nombres} 
                                      onChange={(e) => {
                                        setPasajeros(prev => ({
                                          ...prev,
                                          [asiento.id]: { ...(prev[asiento.id] || { dni: "", nombres: "", apellidos: "", telefono: "" }), nombres: e.target.value.toUpperCase() }
                                        }));
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#f07639]/45 outline-none transition-all font-bold text-slate-755 rounded-xl text-xs uppercase"
                                      placeholder="Nombres"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Apellidos</label>
                                    <input 
                                      type="text" 
                                      value={passengerObj.apellidos} 
                                      onChange={(e) => {
                                        setPasajeros(prev => ({
                                          ...prev,
                                          [asiento.id]: { ...(prev[asiento.id] || { dni: "", nombres: "", apellidos: "", telefono: "" }), apellidos: e.target.value.toUpperCase() }
                                        }));
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#f07639]/45 outline-none transition-all font-bold text-slate-755 rounded-xl text-xs uppercase"
                                      placeholder="Apellidos"
                                    />
                                  </div>
                                </div>

                                {/* Teléfono */}
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 pl-1">Teléfono (Opcional)</label>
                                  <input 
                                    type="text" 
                                    value={passengerObj.telefono} 
                                    onChange={(e) => {
                                      setPasajeros(prev => ({
                                        ...prev,
                                        [asiento.id]: { ...(prev[asiento.id] || { dni: "", nombres: "", apellidos: "", telefono: "" }), telefono: e.target.value }
                                      }));
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#f07639]/45 outline-none transition-all font-bold text-slate-755 rounded-xl text-xs"
                                    placeholder="Celular"
                                  />
                                </div>
                              </div>
                            );
                          })}

                          {/* Precio Editable */}
                          <div className="pt-6 mt-6 border-t border-slate-100">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">Precio Total (S/)</label>
                            <div className="relative">
                              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f07639]" />
                              <input 
                                type="text"
                                readOnly
                                value={`S/ ${precio}`}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none font-black text-2xl text-slate-700 cursor-not-allowed"
                              />
                            </div>
                            {/* Botón de Venta o Impresión de Ticket */}
                            {saleSuccess && ticketsVendidos.length > 0 ? (
                              <div className="space-y-2 mt-6">
                                {ticketsVendidos.map((t, index) => (
                                  <button
                                    key={t.id}
                                    onClick={() => imprimirTicket(t, selectedViaje, selectedAsientos[index])}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Printer className="w-4 h-4" />
                                    Imprimir Ticket Asiento #{selectedAsientos[index]?.numero_asiento || ""}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button
                                onClick={handleVender}
                                disabled={isSelling}
                                className={`
                                  w-full py-4 rounded-xl font-bold text-white text-lg transition-all mt-6 shadow-md cursor-pointer
                                  ${isSelling 
                                    ? 'bg-slate-400 cursor-not-allowed animate-pulse' 
                                    : 'bg-[#f07639] hover:bg-orange-600 hover:-translate-y-1 hover:shadow-xl'
                                  }
                                `}
                              >
                                {isSelling ? "Procesando..." : "Confirmar Venta"}
                              </button>
                            )}
                            
                            {saleSuccess && (
                              <button
                                onClick={() => {
                                  setSelectedAsientos([]);
                                  setPasajeros({});
                                  setSaleSuccess(false);
                                  setTicketsVendidos([]);
                                }}
                                className="w-full py-3 text-sm text-[#f07639] hover:underline font-bold transition-all text-center"
                              >
                                Realizar otra venta
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </>
            )}
            
          </div>
        </>
      )}
    </div>
  );
}
