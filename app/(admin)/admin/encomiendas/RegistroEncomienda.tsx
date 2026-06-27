"use client";

import { useState } from "react";
import { User, MapPin, Package, Save, Loader2, Search, CheckCircle2 } from "lucide-react";
import { registrarEncomienda } from "../../actions/encomiendas";
import { buscarPasajeroPorDni } from "../../actions/pasajes"; // Usamos esta función porque busca en Persona

type Sucursal = { id: string; nombre: string };

type PersonaForm = {
  dni: string;
  nombres: string;
  apellidos: string;
  telefono: string;
};

export default function RegistroEncomienda({ 
  sucursales,
  onSuccess 
}: { 
  sucursales: Sucursal[],
  onSuccess: () => void 
}) {
  const [remitente, setRemitente] = useState<PersonaForm>({ dni: "", nombres: "", apellidos: "", telefono: "" });
  const [destinatario, setDestinatario] = useState<PersonaForm>({ dni: "", nombres: "", apellidos: "", telefono: "" });
  
  const [paquete, setPaquete] = useState({
    origen_id: "",
    destino_id: "",
    peso_kg: "",
    precio: "",
    descripcion: ""
  });

  const [isLoadingRemitente, setIsLoadingRemitente] = useState(false);
  const [isLoadingDestinatario, setIsLoadingDestinatario] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const buscarPersona = async (dni: string, type: 'remitente' | 'destinatario') => {
    if (dni.length < 8) return;
    
    if (type === 'remitente') setIsLoadingRemitente(true);
    else setIsLoadingDestinatario(true);

    try {
      const res = await buscarPasajeroPorDni(dni);
      if (res.success && res.data) {
        if (type === 'remitente') {
          setRemitente({ dni, nombres: res.data.nombres, apellidos: res.data.apellidos, telefono: res.data.telefono || "" });
        } else {
          setDestinatario({ dni, nombres: res.data.nombres, apellidos: res.data.apellidos, telefono: res.data.telefono || "" });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingRemitente(false);
      setIsLoadingDestinatario(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg("");

    if (!paquete.origen_id || !paquete.destino_id) {
      alert("Por favor seleccione origen y destino.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await registrarEncomienda({
        remitente,
        destinatario,
        paquete
      });

      if (res.success) {
        setSuccessMsg(`¡Encomienda registrada con éxito! Código: ${res.data.codigo_seguimiento}`);
        // Limpiar form
        setRemitente({ dni: "", nombres: "", apellidos: "", telefono: "" });
        setDestinatario({ dni: "", nombres: "", apellidos: "", telefono: "" });
        setPaquete({ origen_id: "", destino_id: "", peso_kg: "", precio: "", descripcion: "" });
        
        // Llamamos al callback después de unos segundos
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        alert(res.error || "Error al registrar la encomienda");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 relative">
      {successMsg && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
          <h3 className="text-2xl font-black text-gray-900 mb-2">¡Éxito!</h3>
          <p className="text-gray-600 font-medium">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Tarjeta Remitente */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-[#f07639]" /> Datos del Remitente
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">DNI</label>
                <div className="flex gap-2">
                  <input 
                    type="text" required maxLength={8}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                    value={remitente.dni} 
                    onChange={(e) => setRemitente({...remitente, dni: e.target.value})}
                  />
                  <button type="button" onClick={() => buscarPersona(remitente.dni, 'remitente')} className="bg-gray-200 p-2 rounded-xl hover:bg-gray-300 transition-colors">
                    {isLoadingRemitente ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombres</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                    value={remitente.nombres} onChange={(e) => setRemitente({...remitente, nombres: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Apellidos</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                    value={remitente.apellidos} onChange={(e) => setRemitente({...remitente, apellidos: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono (Opcional)</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                  value={remitente.telefono} onChange={(e) => setRemitente({...remitente, telefono: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Tarjeta Destinatario */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" /> Datos del Destinatario
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">DNI</label>
                <div className="flex gap-2">
                  <input 
                    type="text" required maxLength={8}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                    value={destinatario.dni} 
                    onChange={(e) => setDestinatario({...destinatario, dni: e.target.value})}
                  />
                  <button type="button" onClick={() => buscarPersona(destinatario.dni, 'destinatario')} className="bg-gray-200 p-2 rounded-xl hover:bg-gray-300 transition-colors">
                    {isLoadingDestinatario ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombres</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                    value={destinatario.nombres} onChange={(e) => setDestinatario({...destinatario, nombres: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Apellidos</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                    value={destinatario.apellidos} onChange={(e) => setDestinatario({...destinatario, apellidos: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono (Opcional)</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                  value={destinatario.telefono} onChange={(e) => setDestinatario({...destinatario, telefono: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta Paquete */}
        <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
          <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2 text-[#f07639]" /> Detalles del Paquete
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Origen</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select required value={paquete.origen_id} onChange={e => setPaquete({...paquete, origen_id: e.target.value})} className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none">
                  <option value="">Seleccione</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Destino</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select required value={paquete.destino_id} onChange={e => setPaquete({...paquete, destino_id: e.target.value})} className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none">
                  <option value="">Seleccione</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Peso (Kg)</label>
              <input type="number" step="0.1" required min="0.1" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                value={paquete.peso_kg} onChange={e => setPaquete({...paquete, peso_kg: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Precio Cobrado (S/)</label>
              <input type="number" step="0.1" required min="1" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none font-bold text-[#f07639]"
                value={paquete.precio} onChange={e => setPaquete({...paquete, precio: e.target.value})} />
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Descripción del Contenido</label>
              <input type="text" required placeholder="Ej. Caja de ropa, documentos..." className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f07639] outline-none"
                value={paquete.descripcion} onChange={e => setPaquete({...paquete, descripcion: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-[#f07639] hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/30 flex items-center"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            {isSubmitting ? "Registrando..." : "Registrar Encomienda"}
          </button>
        </div>
      </form>
    </div>
  );
}
