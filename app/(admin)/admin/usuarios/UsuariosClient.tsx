"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, Search, Edit2, Trash2, X, AlertTriangle, CheckCircle, ShieldAlert, Plus, Briefcase, UserCheck } from "lucide-react";
import { actualizarRolUsuario, eliminarUsuario, crearUsuario } from "@/app/(admin)/actions/usuarios";

export default function UsuariosClient({ usuarios, userRole, currentUserId }: { usuarios: any[], userRole: string, currentUserId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditingRol, setIsEditingRol] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRol, setSelectedRol] = useState<string>("");
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    dni: "",
    telefono: "",
    correo: "",
    contrasena: "",
    rol: "vendedor"
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [activeCategoryTab, setActiveCategoryTab] = useState<"todos" | "personal" | "clientes">("todos");

  // Filtro por categoría y término de búsqueda
  const filteredUsuarios = usuarios.filter((usuario) => {
    // A. Filtro por categoría
    if (activeCategoryTab === "personal" && usuario.rol === "cliente") return false;
    if (activeCategoryTab === "clientes" && usuario.rol !== "cliente") return false;

    // B. Filtro por término
    const term = searchTerm.toLowerCase();
    const matchesName = usuario.persona?.nombres?.toLowerCase().includes(term) || usuario.persona?.apellidos?.toLowerCase().includes(term);
    const matchesDni = usuario.persona?.dni?.includes(term);
    const matchesCorreo = usuario.correo?.toLowerCase().includes(term);
    const matchesRol = usuario.rol?.toLowerCase().includes(term);
    return matchesName || matchesDni || matchesCorreo || matchesRol;
  });

  const isGerente = userRole === "gerente";

  const handleUpdateRol = async () => {
    if (!isEditingRol) return;
    setIsLoading(true);
    setError("");

    const res = await actualizarRolUsuario(isEditingRol.id, { rol: selectedRol });
    if (res.success) {
      setIsEditingRol(null);
    } else {
      setError(res.error || "Error al actualizar rol");
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError("");
    const res = await eliminarUsuario(id);
    if (res.success) {
      setIsDeleting(null);
    } else {
      setError(res.error || "Error al eliminar usuario");
    }
    setIsLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await crearUsuario(formData);
    if (res.success) {
      setIsCreating(false);
      setFormData({
        nombres: "",
        apellidos: "",
        dni: "",
        telefono: "",
        correo: "",
        contrasena: "",
        rol: "vendedor"
      });
    } else {
      setError(res.error || "Error al crear usuario");
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      {/* HEADER */}
      <div className="bg-[#f07639] p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Gestión de Usuarios</h1>
            </div>
            <p className="text-orange-100 font-medium max-w-xl">
              {isGerente 
                ? "Modo de auditoría. Visualiza los usuarios y personal registrados en la plataforma."
                : "Administra los usuarios registrados, asigna roles de personal o elimina cuentas."}
            </p>
          </div>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input 
                type="text" 
                placeholder="Buscar por DNI o Nombre..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-black/10 border border-white/20 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-black/20 transition-all font-medium"
              />
            </div>
            {!isGerente && (
              <button 
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-white text-[#f07639] font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Nuevo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE CATEGORÍA DE USUARIOS */}
      <div className="flex flex-wrap items-center gap-2.5 p-4 bg-gray-50/80 border-b border-gray-100 px-6">
        <button
          onClick={() => setActiveCategoryTab("todos")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeCategoryTab === "todos"
              ? "bg-[#0f172a] text-white shadow-md shadow-slate-900/10 scale-[1.02]"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Todos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeCategoryTab === "todos" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
            {usuarios.length}
          </span>
        </button>

        <button
          onClick={() => setActiveCategoryTab("personal")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeCategoryTab === "personal"
              ? "bg-[#f07639] text-white shadow-md shadow-orange-500/20 scale-[1.02]"
              : "bg-white text-gray-600 hover:bg-orange-50 hover:text-[#f07639] border border-gray-200/80"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Personal de la Empresa</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeCategoryTab === "personal" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-800"}`}>
            {usuarios.filter((u) => u.rol !== "cliente").length}
          </span>
        </button>

        <button
          onClick={() => setActiveCategoryTab("clientes")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeCategoryTab === "clientes"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]"
              : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200/80"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Clientes / Pasajeros</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeCategoryTab === "clientes" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"}`}>
            {usuarios.filter((u) => u.rol === "cliente").length}
          </span>
        </button>
      </div>

      {error && (
        <div className="m-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium text-sm">{error}</span>
          <button onClick={() => setError("")} className="ml-auto"><X className="w-5 h-5 opacity-50 hover:opacity-100" /></button>
        </div>
      )}

      {/* TABLA */}
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="pb-4 font-bold text-gray-400 uppercase tracking-wider text-xs w-[30%]">Usuario</th>
                <th className="pb-4 font-bold text-gray-400 uppercase tracking-wider text-xs">Contacto</th>
                <th className="pb-4 font-bold text-gray-400 uppercase tracking-wider text-xs">Rol</th>
                {!isGerente && <th className="pb-4 font-bold text-gray-400 uppercase tracking-wider text-xs text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsuarios.length > 0 ? (
                filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold shadow-inner">
                          {usuario.persona?.nombres?.charAt(0)}{usuario.persona?.apellidos?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-[#f07639] transition-colors line-clamp-1">
                            {usuario.persona?.nombres} {usuario.persona?.apellidos}
                          </p>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            DNI: {usuario.persona?.dni || "N/A"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm font-medium text-gray-700">{usuario.correo}</p>
                      <p className="text-xs text-gray-400">{usuario.persona?.telefono || "Sin teléfono"}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider
                        ${usuario.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 
                          usuario.rol === 'gerente' ? 'bg-blue-100 text-blue-700' :
                          usuario.rol === 'vendedor' ? 'bg-orange-100 text-orange-700' :
                          usuario.rol === 'operario' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }
                      `}>
                        {usuario.rol}
                      </span>
                      {usuario.id === currentUserId && (
                         <span className="ml-2 text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold">TÚ</span>
                      )}
                    </td>
                    {!isGerente && (
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setIsEditingRol(usuario);
                              setSelectedRol(usuario.rol);
                            }}
                            disabled={usuario.id === currentUserId}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Editar Rol"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setIsDeleting(usuario.id)}
                            disabled={usuario.id === currentUserId || usuario.rol === 'admin'}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isGerente ? 3 : 4} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Users className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium">No se encontraron usuarios</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDITAR ROL */}
      {mounted && isEditingRol && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden scale-in-center">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Modificar Rol</h3>
              <p className="text-sm text-center text-gray-500 mb-6">
                Selecciona el nuevo rol para <strong>{isEditingRol.persona?.nombres}</strong>.
              </p>
              
              <select 
                value={selectedRol}
                onChange={(e) => setSelectedRol(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f07639]/50 mb-6"
              >
                <option value="cliente">Cliente</option>
                <option value="vendedor">Vendedor</option>
                <option value="gerente">Gerente</option>
                <option value="operario">Operario</option>
                <option value="conductor">Conductor</option>
                <option value="admin">Admin</option>
              </select>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditingRol(null)}
                  disabled={isLoading}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateRol}
                  disabled={isLoading || selectedRol === isEditingRol.rol}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Guardar Cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ELIMINAR */}
      {mounted && isDeleting && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden scale-in-center">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">¿Eliminar usuario?</h3>
              <p className="text-gray-500 mb-8">Esta acción es irreversible. Se eliminará el acceso al sistema para esta cuenta.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleting(null)}
                  disabled={isLoading}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(isDeleting)}
                  disabled={isLoading}
                  className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30 flex justify-center items-center"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CREAR USUARIO */}
      {mounted && isCreating && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden scale-in-center max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Crear Nuevo Usuario</h3>
                <p className="text-sm text-gray-500">Completa los datos del personal de la empresa.</p>
              </div>
              <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="createForm" onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                    <input required type="text" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                    <input required type="text" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                    <input required type="text" maxLength={8} value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input required type="tel" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                  <input required type="email" value={formData.correo} onChange={(e) => setFormData({...formData, correo: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input required type="password" minLength={8} value={formData.contrasena} onChange={(e) => setFormData({...formData, contrasena: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f07639]/50 focus:border-[#f07639] transition-all">
                    <option value="vendedor">Vendedor</option>
                    <option value="gerente">Gerente</option>
                    <option value="operario">Operario</option>
                    <option value="conductor">Conductor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button type="button" onClick={() => setIsCreating(false)} disabled={isLoading} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="createForm" disabled={isLoading} className="flex-1 py-3 bg-[#f07639] text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 flex justify-center items-center">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Crear Usuario"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
