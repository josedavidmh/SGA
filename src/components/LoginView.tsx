import React, { useState } from 'react';
import bcrypt from 'bcryptjs';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { User } from '../types';
import { AcercaDeModal } from './AcercaDeModal';

interface LoginViewProps {
  usuariosDisponibles: User[];
  onLoginSuccess: (user: User, claveIngresada: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  usuariosDisponibles,
  onLoginSuccess
}) => {
  const [emailInput, setEmailInput] = useState<string>('');
  const [claveInput, setClaveInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [recordarSesion, setRecordarSesion] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mostrarAcercaDe, setMostrarAcercaDe] = useState<boolean>(false);

  // Intentar login por credenciales
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = emailInput.trim().toLowerCase();
    const claveTrimmed = claveInput.trim();

    if (!emailTrimmed) {
      setErrorMessage('Por favor ingresa tu correo electrónico registrado.');
      return;
    }

    if (!claveTrimmed) {
      setErrorMessage('Por favor ingresa tu clave de acceso.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Buscar usuario en la base de usuarios disponibles
      const userFound = usuariosDisponibles.find(
        u => u.correo.toLowerCase() === emailTrimmed ||
             (u.rol === 'ADMINISTRADOR' && (emailTrimmed === 'admin' || emailTrimmed === 'admin@sga.edu.co' || emailTrimmed === 'admin@correo.edu.co' || emailTrimmed === 'admin@misena.edu.co' || emailTrimmed === 'admin@sena.edu.co'))
      );

      if (!userFound) {
        setIsLoading(false);
        setErrorMessage('El correo electrónico no se encuentra registrado en el sistema.');
        return;
      }

      // Validar clave de acceso asignada. Orden de intentos:
      //   1) Texto plano guardado en ESTE navegador (rápido, sin esperar a bcrypt).
      //   2) La clave maestra por defecto.
      //   3) El hash bcrypt que sí viaja por Supabase — este es el que permite
      //      iniciar sesión con la clave real desde un navegador/equipo distinto
      //      al que la creó o la cambió por última vez (antes esto era imposible:
      //      la clave nunca salía de localStorage, así que en un origen nuevo
      //      solo la clave maestra funcionaba).
      const claveLocalCoincide = userFound.clave && claveTrimmed === userFound.clave;
      const claveMaestraCoincide = claveTrimmed === 'Sistema2026*';
      const claveHashCoincide = !claveLocalCoincide && !claveMaestraCoincide && !!userFound.claveHash &&
        bcrypt.compareSync(claveTrimmed, userFound.claveHash);

      if (!claveLocalCoincide && !claveMaestraCoincide && !claveHashCoincide) {
        setIsLoading(false);
        setErrorMessage('La contraseña ingresada es incorrecta. Verifica la clave asignada.');
        return;
      }

      // Login exitoso
      if (recordarSesion) {
        localStorage.setItem('sena_session_user_id', userFound.id);
      }
      setIsLoading(false);
      onLoginSuccess(userFound, claveTrimmed);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06240B] via-[#0D631B] to-[#0D1B2A] flex flex-col justify-center items-center px-4 py-12 antialiased">
      {/* Contenedor Central Limpio y Centrado */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-8 sm:p-9 shadow-2xl border border-slate-200/80 flex flex-col justify-between">
          <div>
            {/* Encabezado Institucional */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#0D631B] flex items-center justify-center font-black text-xl shadow-xs border border-emerald-200">
                <GraduationCap className="w-6 h-6 text-[#0D631B]" />
              </div>
              <div>
                <div className="text-xs font-black tracking-widest text-[#0D631B] uppercase">
                  Gestión Académica
                </div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">
                  Sistema de Gestión Académica y Curricular
                </h1>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa con tu correo institucional y contraseña asignada para acceder al panel según tu rol.
              </p>
            </div>

            {/* Alerta de Error */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo: Correo Electrónico */}
              <div>
                <label 
                  htmlFor="input-email-login"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-email-login"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="usuario@correo.com"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#0D631B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D631B]/15 transition-all text-slate-900 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Campo: Clave de Acceso */}
              <div>
                <label 
                  htmlFor="input-clave-login"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-clave-login"
                    type={showPassword ? 'text' : 'password'}
                    value={claveInput}
                    onChange={(e) => setClaveInput(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-[#0D631B] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D631B]/15 transition-all text-slate-900 font-mono placeholder:font-sans placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox Recordar */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordarSesion}
                    onChange={(e) => setRecordarSesion(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0D631B] focus:ring-[#0D631B] border-slate-300"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    Mantener sesión iniciada
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">v1.0</span>
              </div>

              {/* Botón de Enviar */}
              <button
                id="btn-submit-login"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#0D631B] hover:bg-[#0a4d15] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-wait"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Pie de Página */}
          <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Autenticación RBAC</span>
            </span>
            <button
              type="button"
              onClick={() => setMostrarAcercaDe(true)}
              className="hover:text-slate-500 transition-colors cursor-default"
              title=" "
            >
              v1.0
            </button>
          </div>
        </div>

        {mostrarAcercaDe && (
          <AcercaDeModal onClose={() => setMostrarAcercaDe(false)} />
        )}
      </div>
    </div>
  );
};
