"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, User, Phone, IdCard, Calendar, ArrowLeft, Eye, EyeOff } from "lucide-react";

interface StrengthIndicator {
  label: string;
  color: string;
  percent: number;
  textClass: string;
}

function getPasswordStrength(password: string): StrengthIndicator {
  if (!password) return { label: "", color: "bg-gray-200", percent: 0, textClass: "text-gray-400" };
  
  let score = 0;
  
  // Criterios de evaluación
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Penalización por longitud muy corta (menos de 6 caracteres)
  if (password.length < 6) {
    return { label: "Muy leve", color: "bg-red-500", percent: 20, textClass: "text-red-500" };
  }

  // Mapear puntaje a nivel
  if (score <= 1) {
    return { label: "Muy leve", color: "bg-red-500", percent: 20, textClass: "text-red-500" };
  } else if (score === 2) {
    return { label: "Débil", color: "bg-orange-500", percent: 40, textClass: "text-orange-500" };
  } else if (score === 3) {
    return { label: "Media", color: "bg-yellow-500", percent: 60, textClass: "text-yellow-500" };
  } else if (score === 4) {
    return { label: "Segura", color: "bg-green-500", percent: 80, textClass: "text-green-500" };
  } else {
    return { label: "Muy segura", color: "bg-emerald-600", percent: 100, textClass: "text-emerald-600" };
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    password: "",
    dni: "",
    phone: "",
    birth_date: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validar nombres y apellidos (solo letras y espacios)
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(formData.nombres.trim())) {
      setError("El nombre solo debe contener letras y espacios.");
      return;
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(formData.apellidos.trim())) {
      setError("Los apellidos solo deben contener letras y espacios.");
      return;
    }

    // 2. Correo electrónico (debe contener siempre @)
    if (!formData.email.includes("@")) {
      setError("El correo electrónico debe contener un '@'.");
      return;
    }

    // 3. DNI (solo 8 números)
    if (formData.dni.length !== 8 || !/^\d{8}$/.test(formData.dni)) {
      setError("El DNI debe tener exactamente 8 dígitos numéricos.");
      return;
    }

    // 4. Celular (solo 9 números)
    if (formData.phone.length !== 9 || !/^\d{9}$/.test(formData.phone)) {
      setError("El celular debe tener exactamente 9 dígitos numéricos.");
      return;
    }

    // 5. Fecha de nacimiento (mayor de 18 años)
    if (!formData.birth_date) {
      setError("Por favor, ingresa tu fecha de nacimiento.");
      return;
    }
    const birthDate = new Date(formData.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      setError("Debes ser mayor de 18 años para poder registrarte.");
      return;
    }

    // 6. Validar que las contraseñas coincidan
    if (formData.password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al registrar usuario");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* LEFT SIDE: Banner */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/banner.png" alt="Banner El Cumbe" className="w-full h-full object-cover opacity-70 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20"></div>
        </div>
        <div className="relative z-10 flex flex-col p-12 h-full text-white w-full">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-300 hover:text-white hover:underline transition-all w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
          <div className="flex-1 flex flex-col justify-center pb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
              Únete a la familia.
            </h2>
            <p className="text-lg text-gray-200 max-w-md">
              Regístrate y comienza a disfrutar de todos los beneficios y facilidades que El Cumbe tiene para ti y tus encomiendas.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative overflow-y-auto">
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="flex items-center text-sm font-medium text-gray-600 hover:text-[#f07639] transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md lg:w-[28rem]">
          <div className="text-center lg:text-left mb-8 mt-8 lg:mt-0">
            <div className="flex justify-center lg:justify-start mb-6">
              <img src="/logo.png" alt="Logo El Cumbe" className="h-20 w-auto" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Crea tu cuenta
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <Link
                href="/login"
                className="font-medium text-[#f07639] hover:text-[#d8662d] transition-colors underline"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>

          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="nombres"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nombres
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="nombres"
                      name="nombres"
                      type="text"
                      required
                      className="focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-gray-50 text-gray-900"
                      placeholder="Ingresa tus nombres"
                      value={formData.nombres}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "");
                        setFormData({ ...formData, nombres: cleanValue });
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="apellidos"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Apellidos
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="apellidos"
                      name="apellidos"
                      type="text"
                      required
                      className="focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-gray-50 text-gray-900"
                      placeholder="Ingresa tus apellidos"
                      value={formData.apellidos}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "");
                        setFormData({ ...formData, apellidos: cleanValue });
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Correo electrónico
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-gray-50 text-gray-900"
                    placeholder="ejemplo@gmail.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dni"
                    className="block text-sm font-medium text-gray-700"
                  >
                    DNI
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IdCard className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="dni"
                      name="dni"
                      type="text"
                      required
                      maxLength={8}
                      className="focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-gray-50 text-gray-900"
                      placeholder="12345678"
                      value={formData.dni}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
                        setFormData({ ...formData, dni: cleanValue });
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Celular
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      maxLength={9}
                      className="focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-gray-50 text-gray-900"
                      placeholder="999999999"
                      value={formData.phone}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/[^0-9]/g, "").slice(0, 9);
                        setFormData({ ...formData, phone: cleanValue });
                      }}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="birth_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Fecha de Nacimiento
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="birth_date"
                    name="birth_date"
                    type="date"
                    required
                    className="focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-gray-50 text-gray-900"
                    value={formData.birth_date}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_date: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-gray-700"
                >
                  Contraseña
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className={`focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-gray-50 text-gray-900 ${showPassword ? "" : "font-bold tracking-widest"
                      }`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Fuerza de la contraseña:</span>
                      <span className={`font-semibold ${passwordStrength.textClass}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-bold text-gray-700"
                >
                  Confirmar contraseña
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className={`focus:ring-[#f07639] focus:border-[#f07639] block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-gray-50 text-gray-900 ${showConfirmPassword ? "" : "font-bold tracking-widest"
                      }`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#f07639] hover:bg-[#d8662d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f07639] disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Registrando...
                    </>
                  ) : (
                    "Registrarse"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
