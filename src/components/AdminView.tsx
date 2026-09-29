import React from 'react';
import { 
  ShieldCheck, 
  Terminal, 
  Database, 
  RefreshCw, 
  Trash2, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Cpu,
  Wifi
} from 'lucide-react';
import { User, AuditoriaSistema, RegionalCentro, UserRole } from '../types';
import { ModalSupabaseGuia } from './ModalSupabaseGuia';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { UserPlus, KeyRound, X } from 'lucide-react';

interface AdminProps {
  currentUser: User;
  usersList: User[];
  logs: AuditoriaSistema[];
  centro: RegionalCentro;
  onSeedDatabase: () => void;
  onLimpiarDatabase: () => void;
  onCrearUsuario?: (usuario: User) => void;
  onEliminarUsuario?: (usuarioId: string) => void;
}

export const AdminView: React.FC<AdminProps> = ({
  currentUser,
  usersList,
  logs,
  centro,
  onSeedDatabase,
  onLimpiarDatabase,
  onCrearUsuario,
  onEliminarUsuario
}) => {
  const [filterModulo, setFilterModulo] = React.useState<string>('TODOS');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = React.useState<boolean>(false);
  const [isModalUsuarioOpen, setIsModalUsuarioOpen] = React.useState<boolean>(false);

  // Campos para crear usuario
  const [nuevoNombre, setNuevoNombre] = React.useState('');
  const [nuevoCorreo, setNuevoCorreo] = React.useState('');
  const [nuevaClave, setNuevaClave] = React.useState('Sena2026*');
  const [nuevoRol, setNuevoRol] = React.useState<UserRole>('INSTRUCTOR_LIDER');
  const [nuevoCargo, setNuevoCargo] = React.useState('Instructor de Formación Titulada');

  const filteredLogs = logs.filter(l => {
    if (filterModulo === 'TODOS') return true;
    return l.modulo === filterModulo;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-[#EDE7F6] text-[#6F43C0]">Panel de Control Administrador</span>
            <span>•</span>
            <span>Seguridad & Telemetría</span>
          </div>
          <h1 className="text-2xl font-black text-[#111C2D] tracking-tight mt-1">
            Auditoría de Acciones y Mantenimiento del Sistema
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Gestión de usuarios, logs estructurados y operaciones de siembra o depuración segura.
          </p>
        </div>

        {/* Acciones de Base de Datos */}
        <div className="flex items-center space-x-2.5">
          <button
            id="btn-ver-supabase-schema"
            onClick={() => setIsSupabaseModalOpen(true)}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all relative"
            title="Ver Scripts SQL y Estado de Supabase"
          >
            <Wifi className="w-4 h-4 text-emerald-200" />
            <span>Supabase: {isSupabaseConfigured ? 'Conectado' : 'Configurar'}</span>
            {isSupabaseConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={onSeedDatabase}
            className="flex items-center space-x-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
            title="Sembrar datos base demostrativos del Centro"
          >
            <Database className="w-4 h-4" />
            <span>Sembrar Datos (Seed)</span>
          </button>

          <button
            onClick={onLimpiarDatabase}
            className="flex items-center space-x-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="Limpiar registros de prueba sin alterar la estructura"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purgar BD de Prueba</span>
          </button>
        </div>
      </div>

      {/* Grid Bento: Estado del Servidor & Roles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Motor de Persistencia
            </div>
            <div className="text-sm font-black text-[#111C2D] mt-0.5">
              SQLite 3 / SQLAlchemy
            </div>
            <div className="text-[11px] text-[#2E7D32] font-bold">
              ✓ Claves Foráneas Activas
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Control de Acceso (RBAC)
            </div>
            <div className="text-sm font-black text-[#111C2D] mt-0.5">
              4 Roles Configurados
            </div>
            <div className="text-[11px] text-slate-500">
              Admin, Coord, Instructor Líder, Auxiliar
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EDE7F6] text-[#6F43C0] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Telemetría de Seguridad
            </div>
            <div className="text-sm font-black text-[#111C2D] mt-0.5">
              Cabeceras Helmet & CSP
            </div>
            <div className="text-[11px] text-[#005A8C] font-bold">
              ✓ Sanitización Anti-XSS
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E1F5FE] text-[#005A8C] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Usuarios y Permisos de la Plataforma */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-[#111C2D]">Usuarios Registrados en el Centro</h3>
            <p className="text-xs text-slate-500">Cuentas activas, roles y alcance operativo para trabajo con datos reales</p>
          </div>
          {onCrearUsuario && (
            <button
              onClick={() => setIsModalUsuarioOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Crear Nuevo Usuario</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {usersList.map(u => {
            const isRootAdmin = u.id === 'usr_admin';
            const isCurrent = u.id === currentUser.id;
            return (
              <div key={u.id} className="p-4 rounded-xl border border-slate-200 bg-[#F8F9FA] space-y-2 relative group hover:border-emerald-300 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <img 
                      src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre_completo)}&background=0D631B&color=fff`} 
                      alt={u.nombre_completo}
                      className="w-10 h-10 rounded-full object-cover border border-slate-300 shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#111C2D] truncate" title={u.nombre_completo}>
                        {u.nombre_completo}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate" title={u.correo}>
                        {u.correo}
                      </div>
                    </div>
                  </div>

                  {!isRootAdmin && !isCurrent && onEliminarUsuario && (
                    <button
                      onClick={() => onEliminarUsuario(u.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-all"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 truncate font-medium">
                  {u.cargo || 'Funcionario SENA'}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.rol === 'ADMINISTRADOR' ? 'bg-purple-100 text-purple-800' :
                    u.rol === 'COORDINADOR' ? 'bg-emerald-100 text-emerald-800' :
                    u.rol === 'AUXILIAR' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {u.rol}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {u.clave ? 'Clave asignada' : 'Sena2026*'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal para Crear Usuario */}
      {isModalUsuarioOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0D631B] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Crear Usuario del Sistema</h3>
              </div>
              <button
                onClick={() => setIsModalUsuarioOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nuevoNombre.trim() || !nuevoCorreo.trim()) {
                  alert('Por favor complete el nombre y correo del usuario.');
                  return;
                }
                const nuevoUser: User = {
                  id: `usr_${Date.now()}`,
                  correo: nuevoCorreo.trim().toLowerCase(),
                  clave: nuevaClave.trim() || 'Sena2026*',
                  nombre_completo: nuevoNombre.trim(),
                  rol: nuevoRol,
                  cargo: nuevoCargo.trim() || 'Funcionario SENA',
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(nuevoNombre.trim())}&background=0D631B&color=fff`
                };
                onCrearUsuario?.(nuevoUser);
                setIsModalUsuarioOpen(false);
                setNuevoNombre('');
                setNuevoCorreo('');
                setNuevaClave('Sena2026*');
              }}
              className="mt-4 space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Ing. Carlos Pérez"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0D631B] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Correo Electrónico Institucional:</label>
                <input
                  type="email"
                  required
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  placeholder="usuario@misena.edu.co"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0D631B] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rol en Plataforma:</label>
                  <select
                    value={nuevoRol}
                    onChange={(e) => setNuevoRol(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0D631B] outline-none font-bold text-slate-700"
                  >
                    <option value="INSTRUCTOR_LIDER">Instructor Líder</option>
                    <option value="COORDINADOR">Coordinador Académico</option>
                    <option value="AUXILIAR">Auxiliar Operativo</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contraseña Inicial:</label>
                  <input
                    type="text"
                    required
                    value={nuevaClave}
                    onChange={(e) => setNuevaClave(e.target.value)}
                    placeholder="Sena2026*"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0D631B] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cargo / Denominación:</label>
                <input
                  type="text"
                  value={nuevoCargo}
                  onChange={(e) => setNuevoCargo(e.target.value)}
                  placeholder="Ej: Instructor Técnico - Software"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0D631B] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalUsuarioOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0D631B] hover:bg-[#0a4d15] text-white rounded-xl font-bold shadow-xs"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor de Auditoría Integrado */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <h3 className="font-black text-sm text-[#111C2D]">Visor de Auditoría en Tiempo Real</h3>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">Filtrar por Módulo:</span>
            <select
              value={filterModulo}
              onChange={(e) => setFilterModulo(e.target.value)}
              className="bg-[#F8F9FA] border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none"
            >
              <option value="TODOS">Todos los Módulos</option>
              <option value="Seguimiento Curricular">Seguimiento Curricular</option>
              <option value="Programación de Horarios">Programación de Horarios</option>
              <option value="Ingesta de Archivos Excel">Ingesta de Archivos Excel</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-2.5">Marca Temporal</th>
                <th className="pb-2.5">Operador / Usuario</th>
                <th className="pb-2.5">Rol</th>
                <th className="pb-2.5">Acción</th>
                <th className="pb-2.5">Módulo</th>
                <th className="pb-2.5 text-right">Detalle Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="py-2.5 text-slate-500 whitespace-nowrap">{log.fechaHora}</td>
                  <td className="py-2.5 font-bold text-[#111C2D]">{log.usuarioNombre}</td>
                  <td className="py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                      {log.rol}
                    </span>
                  </td>
                  <td className="py-2.5 font-bold text-[#0D631B]">{log.accion}</td>
                  <td className="py-2.5 text-slate-600">{log.modulo}</td>
                  <td className="py-2.5 text-right text-slate-500 max-w-xs truncate">{log.detalles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Interactivo con Scripts y Guía Paso a Paso Supabase */}
      <ModalSupabaseGuia
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
