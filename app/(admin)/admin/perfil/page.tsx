"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getClienteProfile, updateClienteProfile } from "@/app/actions";
import { User, Phone, CreditCard, Mail, CheckCircle, Save, Loader2, Lock, Shield } from "lucide-react";

export default function AdminPerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      loadProfile();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session]);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");
      const data = await getClienteProfile(session!.user!.email!);
      if (data) {
        setProfile(data);
        const fullName = data.persona ? `${data.persona.nombres} ${data.persona.apellidos}`.trim() : "";
        setNombre(fullName);
        setDni(data.persona?.dni || "");
        setTelefono(data.persona?.telefono || "");
      }
    } catch (err) {
      console.error("Error al cargar perfil administrativo:", err);
      setError("Error al obtener la información de perfil.");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!nombre.trim()) {
      setError("El nombre es requerido.");
      return;
    }

    if (newPassword && newPassword.trim().length > 0 && newPassword.trim().length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
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
        setSuccessMsg("¡Tus datos de administrador se actualizaron con éxito!");
        setNewPassword(""); // Limpiar
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

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#f07639] w-10 h-10" />
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role === "cliente") {
    return (
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center border border-slate-200/60 max-w-md mx-auto my-12">
        <Shield className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-800">Acceso Restringido</h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Debes iniciar sesión con una cuenta administrativa para acceder a este panel de perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Cabecera del Perfil */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
          <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center text-[#f07639] flex-shrink-0 shadow-sm border border-orange-100/50">
            <User size={40} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {profile?.persona ? `${profile.persona.nombres} ${profile.persona.apellidos}` : "Administrador"}
            </h1>
            <p className="text-sm text-slate-400 font-semibold flex items-center justify-center sm:justify-start gap-1.5 mt-1">
              <Mail size={14} />
              {profile?.correo}
            </p>
            <span className="inline-flex items-center mt-2.5 px-3 py-1 rounded-full text-xs font-black bg-orange-50 text-[#f07639] border border-orange-100/60 uppercase tracking-wider">
              Rol: {profile?.rol || "Admin"}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-sm">
              <CreditCard size={14} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">DNI</p>
              <p className="text-xs font-bold text-slate-700">{profile?.persona?.dni || "No registrado"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-sm">
              <Phone size={14} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Teléfono</p>
              <p className="text-xs font-bold text-slate-700">{profile?.persona?.telefono || "No registrado"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Datos */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-50 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#f07639] rounded-full"></span>
              Mis Datos Personales
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Mantén tu información personal y contraseña actualizados.</p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-[#f07639] text-xs font-bold rounded-xl text-[#f07639] bg-white hover:bg-orange-50 transition-all active:scale-95"
            >
              Editar Datos
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100 animate-in fade-in duration-200">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium border border-green-100 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle size={18} />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className={`h-4.5 w-4.5 ${isEditing ? 'text-slate-400' : 'text-slate-300'}`} />
                </div>
                <input
                  type="text"
                  className={`block w-full pl-11 pr-4 py-3 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f07639]/10 focus:border-[#f07639] rounded-xl text-slate-700 ${!isEditing ? 'bg-slate-50/70 cursor-not-allowed text-slate-500 border-slate-200/50' : 'bg-white'}`}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  required
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Número de Celular</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className={`h-4.5 w-4.5 ${isEditing ? 'text-slate-400' : 'text-slate-300'}`} />
                </div>
                <input
                  type="text"
                  maxLength={9}
                  className={`block w-full pl-11 pr-4 py-3 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f07639]/10 focus:border-[#f07639] rounded-xl text-slate-700 ${!isEditing ? 'bg-slate-50/70 cursor-not-allowed text-slate-500 border-slate-200/50' : 'bg-white'}`}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej. 987654321"
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* DNI */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Número de DNI</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <CreditCard className={`h-4.5 w-4.5 ${isEditing ? 'text-slate-400' : 'text-slate-300'}`} />
                </div>
                <input
                  type="text"
                  maxLength={8}
                  className={`block w-full pl-11 pr-4 py-3 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f07639]/10 focus:border-[#f07639] rounded-xl text-slate-700 ${!isEditing ? 'bg-slate-50/70 cursor-not-allowed text-slate-500 border-slate-200/50' : 'bg-white'}`}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej. 12345678"
                  disabled={!isEditing}
                />
              </div>
            </div>
            
            {/* Nueva Contraseña */}
            {isEditing && (
              <div className="md:col-span-2 border-t border-slate-50 pt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cambiar Contraseña (Opcional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    className="block w-full pl-11 pr-4 py-3 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#f07639]/10 focus:border-[#f07639] rounded-xl bg-white text-slate-700 placeholder-slate-300"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 font-medium">Déjalo en blanco si no deseas modificar tu clave actual.</p>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end pt-5 border-t border-slate-50 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  loadProfile();
                }}
                disabled={saving}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-slate-200 text-xs font-bold rounded-xl text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-xs font-bold rounded-xl shadow-sm text-white bg-[#f07639] hover:bg-orange-600 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
