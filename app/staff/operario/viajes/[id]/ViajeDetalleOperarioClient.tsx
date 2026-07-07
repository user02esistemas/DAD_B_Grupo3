"use client";

import { useState } from "react";
import { ArrowLeft, User, Search, UserCheck, UserMinus, QrCode, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { registrarAbordaje, validarBoletoQR } from "@/app/(admin)/actions/operario";

type Pasajero = {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string | null;
};

type AsientoViaje = {
  numero_asiento: number;
  piso: number;
  estado: string;
};

type Pasaje = {
  id: string;
  asiento_viaje_id: string;
  persona_id: string;
  precio: string;
  fecha_compra: string;
  codigo_qr: string | null;
  abordado: boolean;
  pasajero: Pasajero;
  asiento_viaje: AsientoViaje;
};

type Viaje = {
  id: string;
  fecha_salida: string;
  ruta: {
    origen: { nombre: string };
    destino: { nombre: string };
  };
  bus: {
    placa: string;
    capacidad: number;
    pisos: number;
  };
};

export default function ViajeDetalleOperarioClient({ 
  viaje, 
  initialPasajeros 
}: { 
  viaje: Viaje; 
  initialPasajeros: Pasaje[] 
}) {
  const [pasajeros, setPasajeros] = useState<Pasaje[]>(initialPasajeros);
  const [searchTerm, setSearchTerm] = useState("");
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Filtrar lista de pasajeros en base a búsqueda
  const filteredPasajeros = pasajeros.filter((p) => {
    const searchString = `${p.pasajero.nombres} ${p.pasajero.apellidos} ${p.pasajero.dni}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const totalPasajeros = pasajeros.length;
  const abordadosCount = pasajeros.filter(p => p.abordado).length;
  const porcentaje = totalPasajeros > 0 ? Math.round((abordadosCount / totalPasajeros) * 100) : 0;

  // Toggle de abordaje manual
  const handleToggleAbordaje = async (pasajeId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Cambiar localmente para retroalimentación instantánea
    setPasajeros(prev => 
      prev.map(p => p.id === pasajeId ? { ...p, abordado: newStatus } : p)
    );

    const res = await registrarAbordaje(pasajeId, newStatus);
    if (!res.success) {
      alert(res.error || "No se pudo actualizar el estado de abordaje.");
      // Revertir en caso de error
      setPasajeros(prev => 
        prev.map(p => p.id === pasajeId ? { ...p, abordado: currentStatus } : p)
      );
    }
  };

  // Simulación de Escaneo QR
  const handleScanQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeInput.trim()) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      const res = await validarBoletoQR(viaje.id, qrCodeInput.trim());
      if (res.success) {
        // Actualizar lista
        setPasajeros(prev =>
          prev.map(p => p.id === res.data.id ? { ...p, abordado: true } : p)
        );
        setScanResult({
          success: true,
          message: `¡Boleto Validado! Pasajero: ${res.data.pasajero.nombres} ${res.data.pasajero.apellidos} | Asiento: ${res.data.asiento_viaje.numero_asiento}`
        });
        setQrCodeInput("");
      } else {
        setScanResult({
          success: false,
          message: res.error || "Código QR no válido para este viaje."
        });
      }
    } catch (err) {
      setScanResult({
        success: false,
        message: "Error de conexión al validar boleto."
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Lista de códigos de prueba (pasajeros que no han abordado) para facilitar las pruebas
  const codigosDePrueba = pasajeros.filter(p => !p.abordado && p.codigo_qr);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center">
        <Link 
          href="/staff/operario" 
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-[#f07639] mr-4 transition-colors border border-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manifiesto y Embarque</h1>
          <p className="text-slate-500 text-xs font-semibold">
            {viaje.ruta.origen.nombre} a {viaje.ruta.destino.nombre} | Bus: {viaje.bus.placa}
          </p>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Izquierdo: Listado de Pasajeros */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-extrabold text-slate-800">Lista de Pasajeros</h2>
              
              {/* Buscador */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar por nombre o DNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Listado */}
            <div className="overflow-x-auto">
              {filteredPasajeros.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">
                  {searchTerm ? "No se encontraron pasajeros para esta búsqueda." : "No hay pasajeros registrados para este viaje."}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <th className="py-2 text-center w-16">Asiento</th>
                      <th className="py-2">Pasajero</th>
                      <th className="py-2 text-center">DNI</th>
                      <th className="py-2 text-right">Abordaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {filteredPasajeros.map((pasaje) => (
                      <tr key={pasaje.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="py-3 text-center">
                          <span className="w-7 h-7 rounded-lg bg-orange-50 text-[#f07639] border border-orange-100 flex items-center justify-center text-xs font-black mx-auto">
                            {pasaje.asiento_viaje.numero_asiento}
                          </span>
                        </td>
                        <td className="py-3">
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">
                              {pasaje.pasajero.apellidos}, {pasaje.pasajero.nombres}
                            </p>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              Piso {pasaje.asiento_viaje.piso}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-center font-semibold text-slate-600">
                          {pasaje.pasajero.dni}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleToggleAbordaje(pasaje.id, pasaje.abordado)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto ${
                              pasaje.abordado
                                ? "bg-green-50 text-green-700 hover:bg-green-100/80 border border-green-100"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-100"
                            }`}
                          >
                            {pasaje.abordado ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                A Bordo
                              </>
                            ) : (
                              <>
                                <UserMinus className="w-3.5 h-3.5" />
                                Pendiente
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Scanner QR y Progreso */}
        <div className="space-y-6">
          {/* Progreso */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-extrabold text-slate-800">Progreso del Viaje</h2>
            
            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
              <span>Porcentaje a bordo</span>
              <span>{porcentaje}%</span>
            </div>
            
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${porcentaje}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center pt-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Abordaron</span>
                <span className="text-lg font-black text-green-600 mt-1 block">{abordadosCount}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pendientes</span>
                <span className="text-lg font-black text-slate-500 mt-1 block">{totalPasajeros - abordadosCount}</span>
              </div>
            </div>
          </div>

          {/* Simulador de Lector QR */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#f07639]" />
              <h2 className="text-base font-extrabold text-slate-800">Simulador de Lector QR</h2>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Ingresa o escanea el código del boleto del pasajero para registrar automáticamente su ingreso al bus.
            </p>

            <form onSubmit={handleScanQR} className="space-y-3">
              <input 
                type="text"
                placeholder="Código de Boleto (ej: QR-XXXXX)"
                value={qrCodeInput}
                onChange={(e) => setQrCodeInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 focus:border-[#f07639]/30 rounded-xl focus:bg-white text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={isScanning || !qrCodeInput.trim()}
                className="w-full bg-[#f07639] hover:bg-[#e06528] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#f07639]/15 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                {isScanning ? "Validando..." : "Validar Boleto"}
              </button>
            </form>

            {/* Resultado del Escaneo */}
            {scanResult && (
              <div className={`p-4 rounded-xl border text-xs font-bold leading-normal flex items-start gap-2.5 animate-fadeIn ${
                scanResult.success 
                  ? "bg-green-50 text-green-800 border-green-100" 
                  : "bg-red-50 text-red-800 border-red-100"
              }`}>
                {scanResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-extrabold">{scanResult.success ? "Escaneo Exitoso" : "Error de Validación"}</p>
                  <p className="font-medium text-[11px] mt-0.5">{scanResult.message}</p>
                </div>
              </div>
            )}

            {/* Ayudante de Códigos de Prueba (Súper UX) */}
            {codigosDePrueba.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Códigos de Prueba Rápidos:</span>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                  {codigosDePrueba.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setQrCodeInput(p.codigo_qr || "")}
                      className="px-2 py-1 bg-slate-100 hover:bg-[#f07639]/10 hover:text-[#f07639] border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all"
                      title={`${p.pasajero.nombres} - Asiento ${p.asiento_viaje.numero_asiento}`}
                    >
                      Asiento {p.asiento_viaje.numero_asiento}: {p.codigo_qr}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
