import React from 'react';
import { 
  Bell, 
  ChevronDown, 
  Check, 
  PlusCircle, 
  Wifi, 
  Edit3, 
  LogOut, 
  Github, 
  Menu, 
  ChevronsLeft, 
  ChevronsRight,
  GraduationCap,
  XCircle,
  X
} from 'lucide-react';
import { User, RegionalCentro, Ficha } from '../types';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface HeaderProps {
  currentUser: User;
  centro: RegionalCentro;
  fichas: Ficha[];
  selectedFicha: Ficha | null;
  onSelectFicha: (ficha: Ficha | null) => void;
  breadcrumbs: string[];
  unreadAlertsCount?: number;
  onOpenAlerts?: () => void;
  onOpenModalCrearFicha?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenEditarPrograma?: () => void;
  onOpenStandaloneModal?: () => void;
  onLogout?: () => void;
  // Props de responsividad y menú retráctil
  onToggleMobileMenu?: () => void;
  onToggleSidebarCollapse?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  centro,
  fichas,
  selectedFicha,
  onSelectFicha,
  breadcrumbs,
  unreadAlertsCount = 3,
  onOpenAlerts,
  onOpenModalCrearFicha,
  onOpenSupabaseModal,
  onOpenEditarPrograma,
  onOpenStandaloneModal,
  onLogout,
  onToggleMobileMenu,
  onToggleSidebarCollapse,
  isSidebarCollapsed = false
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  // Si es instructor líder, solo puede ver su ficha asignada; Auxiliar, Coordinador y Admin ven todas
  // (la lista que llega ya viene filtrada por permisos desde App)
  const availableFichas = fichas;

  const canCreateFicha = currentUser.rol === 'COORDINADOR' || currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'AUXILIAR';

  // Agrupar fichas por programa de formación para mostrar PRIMERO a qué programa pertenece cada ficha
  const fichasPorPrograma = React.useMemo(() => {
    const map = new Map<string, {
      codigo: string;
      nombre: string;
      nivel: string;
      fichas: Ficha[];
    }>();

    availableFichas.forEach(f => {
      const key = f.programaCodigo || f.programaNombre;
      if (!map.has(key)) {
        map.set(key, {
          codigo: f.programaCodigo,
          nombre: f.programaNombre,
          nivel: f.nivelFormacion,
          fichas: []
        });
      }
      map.get(key)!.fichas.push(f);
    });

    return Array.from(map.values());
  }, [availableFichas]);

  return (
    <header 
      id="main-header"
      className="bg-white border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-20 flex items-center justify-between shadow-xs gap-2"
    >
      {/* Zona Izquierda: Botón Menú Móvil + Botón Plegar Desktop + Breadcrumbs */}
      <div className="flex items-center space-x-2 min-w-0">
        {/* Botón Hamburger para Móvil (< lg) */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 -ml-1 text-slate-700 hover:text-[#0D631B] hover:bg-slate-100 rounded-xl lg:hidden transition-colors shrink-0"
            title="Abrir menú de navegación"
            aria-label="Abrir menú lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Botón Retráctil para Desktop (≥ lg) */}
        {onToggleSidebarCollapse && (
          <button
            onClick={onToggleSidebarCollapse}
            className="p-1.5 -ml-1 text-slate-500 hover:text-[#0D631B] hover:bg-[#E8F5E9] rounded-xl hidden lg:flex items-center justify-center transition-colors shrink-0"
            title={isSidebarCollapsed ? "Expandir menú lateral" : "Plegar menú lateral"}
            aria-label="Alternar menú lateral"
          >
            {isSidebarCollapsed ? (
              <ChevronsRight className="w-4 h-4 text-[#0D631B]" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Breadcrumbs jerárquicos adaptables */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <span className="font-bold text-[#0D631B] cursor-pointer hover:underline shrink-0">Inicio</span>
          <span className="text-slate-400">›</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className={`shrink-0 ${idx === breadcrumbs.length - 1 ? 'font-bold text-[#111C2D]' : 'text-slate-600'}`}>
                {crumb}
              </span>
              {idx < breadcrumbs.length - 1 && <span className="text-slate-400">›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Zona Derecha: Acciones del Header con respuesta adaptativa al ancho disponible */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 min-w-0">
        {/* Selector de Ficha Activa - Visible ÚNICAMENTE para el Administrador del Sistema */}
        {currentUser.rol === 'ADMINISTRADOR' && (
          <div className="relative shrink-0">
            <button
              id="btn-select-ficha-dropdown"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-1.5 sm:space-x-2 bg-[#F0F4FA] hover:bg-slate-100 border border-slate-200 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#111C2D] transition-colors max-w-[150px] sm:max-w-[200px] md:max-w-[260px] xl:max-w-[340px]"
              title={selectedFicha ? `Programa: ${selectedFicha.programaNombre} • Ficha ${selectedFicha.numero_ficha}` : 'Seleccionar Ficha'}
            >
              {selectedFicha ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#2E7D32] shrink-0"></span>
                  {/* Se muestra PRIMERO a qué programa pertenece y luego la ficha */}
                  <span className="truncate font-bold text-[#0D631B] min-w-0">
                    {selectedFicha.programaNombre}
                  </span>
                  <span className="font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[10px] sm:text-[11px] shrink-0 whitespace-nowrap">
                    Ficha {selectedFicha.numero_ficha}
                  </span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate text-slate-600 font-medium">
                    Seleccionar Ficha
                  </span>
                </>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-0.5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Cabecera del desplegable */}
                <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#0D631B]" />
                    <span>Programas y Fichas ({availableFichas.length})</span>
                  </div>
                  {canCreateFicha && onOpenModalCrearFicha && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenModalCrearFicha();
                      }}
                      className="text-[#0D631B] hover:underline font-bold text-[11px] flex items-center space-x-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      <span>Nueva Ficha</span>
                    </button>
                  )}
                </div>

                {/* Opción para Deseleccionar Ficha si hay una seleccionada */}
                {selectedFicha && (
                  <div className="px-2 pt-2 pb-1 border-b border-slate-100">
                    <button
                      onClick={() => {
                        onSelectFicha(null);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl flex items-center space-x-2 transition-colors font-medium"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-400 hover:text-red-600 shrink-0" />
                      <span>Quitar selección de ficha (No mostrar ficha)</span>
                    </button>
                  </div>
                )}

                {/* Listado agrupado por Programa: Muestra PRIMERO a qué programa pertenece cada ficha */}
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto px-1 py-1">
                  {fichasPorPrograma.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-700 mb-1">No hay fichas registradas</p>
                      <p className="text-[11px] text-slate-400 mb-3">Registra una ficha para comenzar a gestionar horarios y seguimiento.</p>
                      {canCreateFicha && onOpenModalCrearFicha && (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenModalCrearFicha();
                          }}
                          className="px-3 py-1.5 bg-[#0D631B] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#0a4d15]"
                        >
                          + Registrar Ficha
                        </button>
                      )}
                    </div>
                  ) : (
                    fichasPorPrograma.map(prog => (
                      <div key={prog.codigo || prog.nombre} className="py-2">
                        {/* Cabecera del Programa: Muestra PRIMERO el Programa */}
                        <div className="px-2.5 py-1 text-[11px] font-bold text-[#0D631B] bg-[#E8F5E9]/70 rounded-lg flex items-center justify-between mb-1.5 mx-1">
                          <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                            <GraduationCap className="w-3.5 h-3.5 text-[#0D631B] shrink-0" />
                            <span className="truncate font-black">{prog.nombre}</span>
                          </div>
                          <span className="text-[10px] bg-white px-1.5 py-0.2 rounded text-slate-600 font-semibold border border-[#C8E6C9] shrink-0">
                            {prog.nivel}
                          </span>
                        </div>

                        {/* Fichas pertenecientes al programa */}
                        <div className="space-y-1 px-1">
                          {prog.fichas.map(f => {
                            const isSelected = selectedFicha?.id === f.id;
                            return (
                              <button
                                key={f.id}
                                id={`ficha-opt-${f.numero_ficha}`}
                                onClick={() => {
                                  onSelectFicha(f);
                                  setDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-[#F0F7F1] transition-colors ${
                                  isSelected
                                    ? 'bg-[#E8F5E9] font-bold text-[#0D631B] border border-[#C8E6C9]'
                                    : 'text-[#111C2D] border border-transparent'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-bold flex items-center space-x-2">
                                    <span className="text-[12px] font-mono text-slate-900 font-black">
                                      Ficha {f.numero_ficha}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                                      {f.modalidad}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                                    Líder: {f.instructorLiderNombre} • {f.ambientePrincipal}
                                  </div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-[#2E7D32] shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botón Rápido Editar Programa de la Ficha Activa (Solo Administrador) */}
        {onOpenEditarPrograma && currentUser.rol === 'ADMINISTRADOR' && selectedFicha && (
          <button
            id="btn-header-editar-programa"
            onClick={onOpenEditarPrograma}
            className="flex items-center space-x-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs shrink-0"
            title={`Editar datos curriculares del programa: ${selectedFicha.programaNombre}`}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#0D631B]" />
            <span className="hidden xl:inline">Editar Programa</span>
          </button>
        )}

        {/* Acceso Directo Supabase BD */}
        {onOpenSupabaseModal && (
          <button
            id="btn-header-supabase"
            onClick={onOpenSupabaseModal}
            className={`flex items-center space-x-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
              isSupabaseConfigured
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
            }`}
            title="Ver conexión y scripts de Supabase PostgreSQL"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden xl:inline">Supabase</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>
        )}

        {/* Botón Descargar Versión Standalone (HTML/CSS/JS + GitHub) */}
        {onOpenStandaloneModal && (
          <button
            id="btn-header-github-standalone"
            onClick={onOpenStandaloneModal}
            className="hidden sm:flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
            title="Descargar versión HTML, CSS y JS para GitHub"
          >
            <Github className="w-3.5 h-3.5 text-white" />
            <span className="hidden 2xl:inline">Versión GitHub</span>
          </button>
        )}

        {/* Botón Rápido + Ficha en Header */}
        {canCreateFicha && onOpenModalCrearFicha && (
          <button
            id="btn-header-crear-ficha"
            onClick={onOpenModalCrearFicha}
            className="flex items-center space-x-1.5 bg-[#0D631B] hover:bg-[#0a4d15] text-white p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
            title="Crear una nueva ficha manualmente"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Nueva Ficha</span>
          </button>
        )}

        {/* Campana de Alertas / Notificaciones */}
        <button
          id="btn-header-alerts"
          onClick={onOpenAlerts}
          className="relative p-1.5 sm:p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          title="Alertas Preventivas"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#BA1A1A] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Usuario info con Avatar Alien y Badge de Rol */}
        <div className="flex items-center space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200 shrink-0">
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.nombre_completo}
              className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500/60 shadow-xs shrink-0 bg-slate-900"
              referrerPolicy="no-referrer"
              title={`${currentUser.nombre_completo} • ${currentUser.cargo}`}
            />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5"></span>
          </div>

          <div className="hidden 2xl:block text-right max-w-[130px] truncate">
            <div className="text-xs font-bold text-[#111C2D] leading-tight truncate">
              {currentUser.nombre_completo}
            </div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              {currentUser.rol === 'AUXILIAR' && 'Auxiliar Operativo'}
              {currentUser.rol === 'COORDINADOR' && 'Coordinación Académica'}
              {currentUser.rol === 'INSTRUCTOR_LIDER' && 'Instructor Líder'}
              {currentUser.rol === 'ADMINISTRADOR' && 'Administrador Sistema'}
            </div>
          </div>

          {/* Botón Salir / Cerrar Sesión */}
          {onLogout && (
            <button
              id="btn-header-logout"
              onClick={onLogout}
              className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
