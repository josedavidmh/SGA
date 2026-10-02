import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileSpreadsheet, 
  UploadCloud, 
  PieChart, 
  ShieldCheck, 
  LogOut,
  ChevronRight,
  Headphones,
  CheckCircle2,
  Users,
  FolderPlus,
  UserPlus,
  GraduationCap,
  BookPlus,
  BookOpen,
  TrendingUp,
  Github,
  ChevronsLeft,
  ChevronsRight,
  X,
  Building2,
  Sliders,
  FileBarChart2,
  DatabaseBackup
} from 'lucide-react';
import { User, UserRole, RegionalCentro, Ficha } from '../types';

interface SidebarProps {
  currentUser: User;
  onSwitchUser: (userRole: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  centro: RegionalCentro;
  fichas: Ficha[];
  selectedFicha?: Ficha | null;
  onSelectFicha?: (ficha: Ficha | null) => void;
  usersList: User[];
  onOpenModalCrearFicha?: () => void;
  onOpenModalCrearInstructor?: () => void;
  onOpenModalCrearPrograma?: () => void;
  onOpenStandaloneModal?: () => void;
  onLogout?: () => void;
  // Props para modo retráctil (desktop) y responsivo (móvil)
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  onSwitchUser,
  activeTab,
  setActiveTab,
  centro,
  usersList,
  onOpenModalCrearFicha,
  onOpenModalCrearInstructor,
  onOpenModalCrearPrograma,
  onOpenStandaloneModal,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) => {
  // Reglas RBAC
  const canAccessDashboard = true;
  const canAccessAvanceFichas = true;
  const canAccessHorarios = true;
  const canAccessSeguimiento = true;
  // El instructor líder entra a Ingesta solo para Juicios y Horas de SUS fichas.
  const canAccessIngesta = currentUser.rol === 'AUXILIAR' || currentUser.rol === 'COORDINADOR' || currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'INSTRUCTOR_LIDER';
  const canAccessCierres = currentUser.rol === 'COORDINADOR' || currentUser.rol === 'ADMINISTRADOR';
  const canAccessInstructores = currentUser.rol === 'COORDINADOR' || currentUser.rol === 'ADMINISTRADOR';
  const canAccessParametrizaciones = currentUser.rol === 'COORDINADOR' || currentUser.rol === 'ADMINISTRADOR';
  const canAccessAdmin = currentUser.rol === 'ADMINISTRADOR';
  const canCreateFicha = currentUser.rol === 'ADMINISTRADOR' || currentUser.rol === 'COORDINADOR';
  const canAccessProgramas = true;

  // Manejador que cambia pestaña y cierra el menú móvil si está abierto
  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const handleAction = (action?: () => void) => {
    if (action) {
      action();
      if (onCloseMobile) onCloseMobile();
    }
  };

  // Renderizador del contenido interno del sidebar (se usa tanto en desktop como en drawer móvil)
  const renderContent = (collapsed: boolean, isDrawer: boolean) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 1. Cabecera / Logo Fija */}
      <div className={`shrink-0 p-3.5 sm:p-4 border-b border-slate-100 flex items-center bg-gradient-to-b from-[#F0F7F1]/60 to-white ${
        collapsed ? 'justify-center flex-col gap-2' : 'justify-between'
      }`}>
        <div className="flex items-center space-x-3 min-w-0">
          <div 
            onClick={collapsed && onToggleCollapse ? onToggleCollapse : undefined}
            className="w-10 h-10 rounded-xl bg-[#0D631B] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#0D631B]/20 shrink-0 cursor-pointer select-none"
            title={collapsed ? "Expandir menú lateral" : "Sistema"}
          >
            S
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-black tracking-wider text-[#0D631B] uppercase flex items-center gap-1.5">
                <span>Sistema</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                  v2.4
                </span>
              </div>
              <div className="text-sm font-bold text-[#111C2D] leading-tight truncate">
                Gestión Académica
              </div>
            </div>
          )}
        </div>

        {/* Botón de cierre en Móvil o Botón Retráctil en Desktop */}
        {isDrawer ? (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Cerrar menú"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        ) : onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 text-slate-400 hover:text-[#0D631B] hover:bg-[#E8F5E9] rounded-lg transition-colors ${
              collapsed ? 'mt-1' : ''
            }`}
            title={collapsed ? "Expandir menú (Modo amplio)" : "Plegar menú (Modo compacto)"}
            aria-label="Alternar menú lateral"
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* 2. Cuerpo Central con Desplazamiento Fluido */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3.5 py-2 scrollbar-thin">
        {/* Badge Centro Regional */}
        <div className={collapsed ? 'px-2 pt-1 pb-0.5' : 'px-3 pt-1 pb-0.5'}>
          {collapsed ? (
            <div 
              className="w-10 h-10 mx-auto bg-[#F0F4FA] rounded-xl border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-[#0D631B] transition-colors cursor-pointer"
              title={`${centro.centro} • ${centro.regional}`}
            >
              <Building2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-2.5 bg-[#F0F4FA] rounded-xl border border-slate-200/60 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-medium text-[10px] mb-0.5">
                <span>CENTRO DE FORMACIÓN</span>
                <CheckCircle2 className="w-3 h-3 text-[#2E7D32]" />
              </div>
              <div className="font-bold text-[#111C2D] truncate text-xs">{centro.centro}</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">{centro.regional}</div>
            </div>
          )}
        </div>

      {/* Accesos Rápidos de Creación Manual */}
      {(canCreateFicha || canAccessInstructores || canAccessProgramas) && (
        <div className={collapsed ? 'px-2 py-2 space-y-1.5' : 'px-4 py-2 space-y-1.5'}>
          {!collapsed && (
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Creación Manual
            </div>
          )}
          
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              {canCreateFicha && onOpenModalCrearFicha && (
                <button
                  id="btn-sidebar-crear-ficha-collapsed"
                  onClick={() => handleAction(onOpenModalCrearFicha)}
                  className="w-10 h-10 rounded-xl bg-[#E8F5E9] hover:bg-[#d5ecd7] text-[#0D631B] border border-[#C8E6C9] flex items-center justify-center transition-colors"
                  title="Registrar nueva ficha"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              )}
              {canAccessInstructores && onOpenModalCrearInstructor && (
                <button
                  id="btn-sidebar-crear-instructor-collapsed"
                  onClick={() => handleAction(onOpenModalCrearInstructor)}
                  className="w-10 h-10 rounded-xl bg-[#EDE7F6] hover:bg-[#ded4f0] text-[#6F43C0] border border-[#D3BBFF] flex items-center justify-center transition-colors"
                  title="Registrar nuevo instructor"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              )}
              {canAccessProgramas && onOpenModalCrearPrograma && (
                <button
                  id="btn-sidebar-crear-programa-collapsed"
                  onClick={() => handleAction(onOpenModalCrearPrograma)}
                  className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center transition-colors"
                  title="Registrar nuevo programa"
                >
                  <BookPlus className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {canCreateFicha && onOpenModalCrearFicha && (
                <button
                  id="btn-sidebar-crear-ficha"
                  onClick={() => handleAction(onOpenModalCrearFicha)}
                  className="flex items-center justify-center space-x-1 py-2 px-1.5 rounded-xl bg-[#E8F5E9] hover:bg-[#d5ecd7] text-[#0D631B] text-[11px] font-bold border border-[#C8E6C9] transition-colors"
                  title="Registrar manualmente una nueva ficha"
                >
                  <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">+ Ficha</span>
                </button>
              )}

              {canAccessInstructores && onOpenModalCrearInstructor && (
                <button
                  id="btn-sidebar-crear-instructor"
                  onClick={() => handleAction(onOpenModalCrearInstructor)}
                  className="flex items-center justify-center space-x-1 py-2 px-1.5 rounded-xl bg-[#EDE7F6] hover:bg-[#ded4f0] text-[#6F43C0] text-[11px] font-bold border border-[#D3BBFF] transition-colors"
                  title="Registrar manualmente un nuevo instructor"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">+ Inst.</span>
                </button>
              )}

              {canAccessProgramas && onOpenModalCrearPrograma && (
                <button
                  id="btn-sidebar-crear-programa"
                  onClick={() => handleAction(onOpenModalCrearPrograma)}
                  className="flex items-center justify-center space-x-1 py-2 px-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200 transition-colors"
                  title="Registrar o editar programas de formación"
                >
                  <BookPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">+ Prog.</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Módulos de Navegación */}
      <div className={collapsed ? 'px-2 py-2 flex-1 space-y-4' : 'px-3 py-2 flex-1 space-y-5'}>
        <div>
          {!collapsed && (
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Módulos Académicos
            </div>
          )}
          <nav className="space-y-1">
            {/* 1. Panel Principal de Primero */}
            {canAccessDashboard && (
              <button
                id="nav-btn-dashboard"
                onClick={() => handleSelectTab('dashboard')}
                title="Panel Principal"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Panel Principal</span>}
                </div>
                {!collapsed && activeTab === 'dashboard' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {/* 2. Programas de Formación */}
            {canAccessProgramas && (
              <button
                id="nav-btn-programas"
                onClick={() => handleSelectTab('programas')}
                title="Programas de Formación"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'programas'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Programas de Formación</span>}
                </div>
                {!collapsed && activeTab === 'programas' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {/* 3. Fichas de Formación */}
            {canAccessAvanceFichas && (
              <button
                id="nav-btn-avance-fichas"
                onClick={() => handleSelectTab('avance-fichas')}
                title="Fichas de Formación (Avance e Indicadores)"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'avance-fichas'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Fichas de Formación</span>}
                </div>
                {!collapsed && activeTab === 'avance-fichas' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {/* 4. Competencias y RAPs */}
            {canAccessProgramas && (
              <button
                id="nav-btn-competencias"
                onClick={() => handleSelectTab('competencias')}
                title="Competencias & RAPs"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'competencias'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Competencias & RAPs</span>}
                </div>
                {!collapsed && activeTab === 'competencias' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {canAccessHorarios && (
              <button
                id="nav-btn-horarios"
                onClick={() => handleSelectTab('horarios')}
                title="Programación de Horarios"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'horarios'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <CalendarDays className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Programación de Horarios</span>}
                </div>
                {!collapsed && activeTab === 'horarios' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {canAccessSeguimiento && (
              <button
                id="nav-btn-seguimiento"
                onClick={() => handleSelectTab('seguimiento')}
                title="Seguimiento Curricular"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'seguimiento'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Seguimiento Curricular</span>}
                </div>
                {!collapsed && activeTab === 'seguimiento' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {canAccessInstructores && (
              <button
                id="nav-btn-instructores"
                onClick={() => handleSelectTab('instructores')}
                title="Instructores y Planta"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'instructores'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Instructores y Planta</span>}
                </div>
                {!collapsed && activeTab === 'instructores' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {canAccessIngesta && (
              <button
                id="nav-btn-ingesta"
                onClick={() => handleSelectTab('ingesta')}
                title="Ingesta de Archivos Excel"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'ingesta'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <UploadCloud className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Ingesta de Archivos Excel</span>}
                </div>
                {!collapsed && activeTab === 'ingesta' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {canAccessCierres && (
              <button
                id="nav-btn-cierres"
                onClick={() => handleSelectTab('cierres')}
                title="Cierres e Indicadores"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'cierres'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <PieChart className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Cierres e Indicadores</span>}
                </div>
                {!collapsed && activeTab === 'cierres' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {canAccessHorarios && (
              <button
                id="nav-btn-reportes"
                onClick={() => handleSelectTab('reportes')}
                title="Reportes (Horarios por Instructor, Ambientes por Ficha, y más)"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'reportes'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileBarChart2 className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Reportes</span>}
                </div>
                {!collapsed && activeTab === 'reportes' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}

            {canAccessParametrizaciones && (
              <button
                id="nav-btn-parametrizaciones"
                onClick={() => handleSelectTab('parametrizaciones')}
                title="Parametrizaciones y Tablas Maestras"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'parametrizaciones'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Sliders className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Parametrizaciones y Tablas</span>}
                </div>
                {!collapsed && activeTab === 'parametrizaciones' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )}
          </nav>
        </div>

        {canAccessAdmin && (
          <div>
            {!collapsed && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Administración
              </div>
            )}
            <nav className="space-y-1">
              <button
                id="nav-btn-admin"
                onClick={() => handleSelectTab('admin')}
                title="Auditoría y Mantenimiento"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Auditoría y Mantenimiento</span>}
                </div>
                {!collapsed && activeTab === 'admin' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
              <button
                id="nav-btn-respaldo"
                onClick={() => handleSelectTab('respaldo')}
                title="Respaldo y Restauración de datos"
                className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'respaldo'
                    ? 'bg-[#0D631B] text-white shadow-sm shadow-[#0D631B]/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#111C2D]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <DatabaseBackup className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">Respaldo y Restauración</span>}
                </div>
                {!collapsed && activeTab === 'respaldo' && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Descargar Versión Standalone para GitHub */}
      {onOpenStandaloneModal && (
        <div className={collapsed ? 'px-2 mb-2 flex justify-center' : 'mx-3 mb-2'}>
          {collapsed ? (
            <button
              id="sidebar-btn-github-standalone-collapsed"
              onClick={() => handleAction(onOpenStandaloneModal)}
              className="w-10 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-700/60 flex items-center justify-center transition-all shadow-xs"
              title="Descargar Versión GitHub (HTML/CSS/JS)"
            >
              <Github className="w-4 h-4 text-white" />
            </button>
          ) : (
            <button
              id="sidebar-btn-github-standalone"
              onClick={() => handleAction(onOpenStandaloneModal)}
              className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-700/60 flex items-center justify-between text-xs font-bold transition-all shadow-xs group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Github className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left truncate">
                  <div className="leading-tight truncate">Versión GitHub</div>
                  <div className="text-[10px] text-slate-400 font-normal truncate">HTML, CSS, JS + Semilla</div>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shrink-0">
                ZIP
              </span>
            </button>
          )}
        </div>
      )}

      {/* Soporte Institucional */}
      <div className={collapsed ? 'px-2 mb-2 flex justify-center' : 'p-3 mx-3 mb-2 bg-[#F8F9FA] rounded-xl border border-slate-200/80 flex items-center space-x-3'}>
        {collapsed ? (
          <div 
            className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center cursor-pointer"
            title="Mesa de Soporte: Extensión 2415"
          >
            <Headphones className="w-4 h-4" />
          </div>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#111C2D]">Mesa de Soporte</div>
              <div className="text-[11px] text-slate-500 truncate">Extensión 2415</div>
            </div>
          </>
        )}
      </div>
      </div>

      {/* 3. Pie de Página Fijo: Perfil del Usuario Actual */}
      <div className={`shrink-0 p-3 border-t border-slate-200/80 bg-slate-50 flex items-center ${
        collapsed ? 'justify-center flex-col gap-2' : 'justify-between'
      }`}>
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative shrink-0">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.nombre_completo} 
              className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500/60 shadow-xs bg-slate-900"
              referrerPolicy="no-referrer"
              title={`${currentUser.nombre_completo} (${currentUser.cargo})`}
            />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5"></span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#111C2D] truncate">{currentUser.nombre_completo}</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">{currentUser.cargo}</div>
            </div>
          )}
        </div>

        {onLogout && !collapsed && (
          <button
            id="sidebar-btn-logout"
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. SIDEBAR DESKTOP (Docked, retráctil con animación suave de ancho) */}
      <aside 
        id="main-sidebar"
        className={`hidden lg:flex flex-col justify-between shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200/80 shadow-sm select-none z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {renderContent(isCollapsed, false)}
      </aside>

      {/* 2. SIDEBAR MÓVIL (Off-canvas Drawer responsivo con Backdrop) */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col justify-between h-full shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderContent(false, true)}
      </aside>
    </>
  );
};
