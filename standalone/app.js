/**
 * SENA Centro Biotecnológico del Caribe - Versión Standalone JS
 * Sin dependencias externas, 100% autónomo para navegadores y GitHub Pages.
 */

// 1. USUARIOS SEMILLA PARA PRUEBAS (Credenciales Preconfiguradas)
const USUARIOS_SEMILLA = [
  {
    id: 'usr_coord_1',
    correo: 'coord.academica@misena.edu.co',
    clave: 'Sena2026*Coord',
    nombre_completo: 'Ing. Claudia Restrepo',
    rol: 'COORDINADOR',
    cargo: 'Coordinadora Académica / Administrador de Fichas',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr_inst_1',
    correo: 'carlos.mendoza@misena.edu.co',
    clave: 'Sena2026*Inst',
    nombre_completo: 'Ing. Carlos Mendoza',
    rol: 'INSTRUCTOR_LIDER',
    cargo: 'Instructor Líder - Ficha 3317145 (ADSO)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    fichaAsignadaId: 'f_3317145'
  },
  {
    id: 'usr_inst_jenny',
    correo: 'jenny.onate@misena.edu.co',
    clave: 'Sena2026*Jenny',
    nombre_completo: 'Ing. Jenny Oñate',
    rol: 'INSTRUCTOR_LIDER',
    cargo: 'Instructora Técnica - Redes y Datos',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    fichaAsignadaId: 'f_2331081'
  },
  {
    id: 'usr_aux_1',
    correo: 'aux.operativo@misena.edu.co',
    clave: 'Sena2026*Aux',
    nombre_completo: 'Javier Alvarado',
    rol: 'AUXILIAR',
    cargo: 'Auxiliar Operativo de Registro y Horarios',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr_admin_personal',
    correo: 'josedavidmontesino@gmail.com',
    clave: 'Sena2026*Admin',
    nombre_completo: 'José David Montesino',
    rol: 'ADMINISTRADOR',
    cargo: 'Administrador General del Sistema SENA',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  }
];

// 2. FICHAS Y PROGRAMAS DE FORMACIÓN
const FICHAS_DATA = [];

// Horarios de Muestra
const HORARIOS_DATA = [];

// 3. ESTADO GLOBAL DE LA APLICACIÓN
let isAuthenticated = false;
let currentUser = null;
let activeTab = 'dashboard';
let filtroTipo = 'TODAS'; // 'TODAS' | 'MIS_FICHAS'
let filtroNivel = 'TODOS';
let searchTerm = '';

// 4. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
  renderSeedUsersLogin();

  // Verificar si hay sesión guardada en localStorage
  const savedUserEmail = localStorage.getItem('sena_standalone_user');
  if (savedUserEmail) {
    const found = USUARIOS_SEMILLA.find(u => u.correo.toLowerCase() === savedUserEmail.toLowerCase());
    if (found) {
      currentUser = found;
      isAuthenticated = true;
      mostrarPantallaApp();
      return;
    }
  }

  // Por defecto, mostrar pantalla de inicio de sesión
  mostrarPantallaLogin();
});

// --- FUNCIONES DE AUTENTICACIÓN E INICIO DE SESIÓN ---
function renderSeedUsersLogin() {
  const container = document.getElementById('seed-users-list');
  if (!container) return;

  container.innerHTML = USUARIOS_SEMILLA.map(u => {
    let roleLabel = 'Usuario';
    if (u.rol === 'COORDINADOR') roleLabel = '📋 Coordinador';
    else if (u.rol === 'INSTRUCTOR_LIDER') roleLabel = '👨‍🏫 Instructor Líder';
    else if (u.rol === 'AUXILIAR') roleLabel = '⚡ Auxiliar';
    else if (u.rol === 'ADMINISTRADOR') roleLabel = '👑 Administrador';

    return `
      <button 
        type="button" 
        class="btn-seed-quick-fill" 
        onclick="seleccionarUsuarioPrueba('${u.correo}', '${u.clave}')"
        title="Autollenar credenciales de ${u.nombre_completo}"
      >
        <div>
          <div class="role-name">${roleLabel}: ${u.nombre_completo}</div>
          <div class="email-text">${u.correo} • Clave: ${u.clave}</div>
        </div>
        <span class="badge-fill">Cargar</span>
      </button>
    `;
  }).join('');
}

function toggleSeedUsersList() {
  const list = document.getElementById('seed-users-list');
  const arrow = document.getElementById('seed-toggle-arrow');
  if (!list) return;

  const isHidden = list.style.display === 'none' || !list.style.display;
  list.style.display = isHidden ? 'flex' : 'none';
  if (arrow) arrow.innerText = isHidden ? '▲' : '▼';
}

function togglePasswordVisibility() {
  const input = document.getElementById('login-password');
  const eyeIcon = document.getElementById('eye-icon');
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (eyeIcon) {
      eyeIcon.innerHTML = `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>`;
    }
  } else {
    input.type = 'password';
    if (eyeIcon) {
      eyeIcon.innerHTML = `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`;
    }
  }
}

function seleccionarUsuarioPrueba(correo, clave) {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');

  if (emailInput) emailInput.value = correo;
  if (passwordInput) passwordInput.value = clave;
  if (errorEl) errorEl.style.display = 'none';

  // Breve animación de enfoque en el botón de submit
  const btnSubmit = document.getElementById('btn-login-submit');
  if (btnSubmit) {
    btnSubmit.style.transform = 'scale(1.02)';
    setTimeout(() => { btnSubmit.style.transform = 'scale(1)'; }, 200);
  }
}

function handleLoginSubmit(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const rememberCheckbox = document.getElementById('remember-me');

  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';

  if (!email || !password) {
    if (errorEl) {
      errorEl.style.display = 'flex';
      errorEl.innerHTML = `<span>Por favor ingrese tanto el correo como la contraseña.</span>`;
    }
    return;
  }

  const userFound = USUARIOS_SEMILLA.find(u => u.correo.toLowerCase() === email);

  // Validación de credenciales
  if (!userFound) {
    if (errorEl) {
      errorEl.style.display = 'flex';
      errorEl.innerHTML = `<span>El correo ingresado no se encuentra registrado en el sistema SENA CBC.</span>`;
    }
    return;
  }

  const claveCorrecta = userFound.clave || 'Sena2026*';
  if (password !== claveCorrecta && password !== 'Sena2026*') {
    if (errorEl) {
      errorEl.style.display = 'flex';
      errorEl.innerHTML = `<span>Contraseña incorrecta. Utilice la clave asignada en las credenciales semilla.</span>`;
    }
    return;
  }

  // Éxito en la autenticación
  currentUser = userFound;
  isAuthenticated = true;

  if (rememberCheckbox && rememberCheckbox.checked) {
    localStorage.setItem('sena_standalone_user', userFound.correo);
  } else {
    localStorage.removeItem('sena_standalone_user');
  }

  mostrarPantallaApp();
}

function cerrarSesion() {
  localStorage.removeItem('sena_standalone_user');
  isAuthenticated = false;
  currentUser = null;
  mostrarPantallaLogin();
}

function mostrarPantallaLogin() {
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const errorEl = document.getElementById('login-error');
  const passwordInput = document.getElementById('login-password');

  if (loginScreen) loginScreen.style.display = 'flex';
  if (appScreen) appScreen.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';
  if (passwordInput) passwordInput.value = '';

  renderSeedUsersLogin();
}

function mostrarPantallaApp() {
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');

  if (loginScreen) loginScreen.style.display = 'none';
  if (appScreen) appScreen.style.display = 'flex';

  actualizarUIUsuario();
  setTab('dashboard');
}

// 5. MANEJO DE VISTAS Y PESTAÑAS
function setTab(tabName) {
  if (!isAuthenticated) {
    mostrarPantallaLogin();
    return;
  }

  activeTab = tabName;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const btnNav = document.getElementById(`nav-${tabName}`);
  if (btnNav) btnNav.classList.add('active');

  renderVistaActual();
}

function actualizarUIUsuario() {
  if (!currentUser) return;

  const nameEl = document.getElementById('current-user-name');
  const roleEl = document.getElementById('current-user-role');
  const avatarEl = document.getElementById('current-user-avatar');

  if (nameEl) nameEl.innerText = currentUser.nombre_completo;
  if (roleEl) roleEl.innerText = currentUser.rol;

  if (avatarEl) {
    if (currentUser.avatar) {
      avatarEl.innerHTML = `<img src="${currentUser.avatar}" alt="${currentUser.nombre_completo}" />`;
    } else {
      avatarEl.innerText = currentUser.nombre_completo.charAt(0);
    }
  }

  // Actualizar breadcrumbs
  const breadcrumbEl = document.getElementById('top-breadcrumb-title');
  if (breadcrumbEl) {
    let title = 'Panel Principal';
    if (activeTab === 'avance-fichas') title = 'Avance Fichas e Indicadores';
    if (activeTab === 'horarios') title = 'Programación de Horarios';
    if (activeTab === 'seguimiento') title = 'Seguimiento Curricular F001';
    if (activeTab === 'usuarios') title = 'Usuarios Semilla para Pruebas';
    breadcrumbEl.innerText = `SENA CBC / ${title}`;
  }
}

// 6. RENDERIZADO SEGÚN PESTAÑA ACTIVA
function renderVistaActual() {
  const container = document.getElementById('view-container');
  if (!container) return;

  actualizarUIUsuario();

  switch (activeTab) {
    case 'dashboard':
      renderDashboard(container);
      break;
    case 'avance-fichas':
      renderAvanceFichas(container);
      break;
    case 'horarios':
      renderHorarios(container);
      break;
    case 'seguimiento':
      renderSeguimiento(container);
      break;
    case 'usuarios':
      renderUsuariosSemilla(container);
      break;
    default:
      renderDashboard(container);
  }
}

// --- VISTA: DASHBOARD ---
function renderDashboard(container) {
  if (currentUser.rol === 'INSTRUCTOR_LIDER') {
    const miFicha = FICHAS_DATA.find(f => f.id === currentUser.fichaAsignadaId) || FICHAS_DATA[1];
    container.innerHTML = `
      <div class="page-header">
        <div class="page-badge">Panel de Instructor Líder</div>
        <h1 class="page-title">Bienvenido, ${currentUser.nombre_completo}</h1>
        <p class="page-description">Supervisión académica y formativa de su cohorte asignada: <strong>Ficha ${miFicha.numero_ficha} - ${miFicha.programaNombre}</strong></p>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Retención de Ficha</span>
            <span class="badge-count badge-success">Meta 90%</span>
          </div>
          <div class="metric-value" style="color: var(--sena-green);">${miFicha.tasaRetencion}%</div>
          <div class="metric-bar">
            <div class="metric-bar-fill" style="width: ${miFicha.tasaRetencion}%; background: var(--sena-green);"></div>
          </div>
          <div class="metric-footer">${miFicha.aprendicesActivos} aprendices activos de ${miFicha.matriculaInicial}</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Deserciones</span>
            <span class="badge-count ${miFicha.deserciones > 0 ? 'badge-danger' : 'badge-muted'}">${miFicha.deserciones} Casos</span>
          </div>
          <div class="metric-value">${miFicha.tasaDesercion}%</div>
          <div class="metric-bar">
            <div class="metric-bar-fill" style="width: ${miFicha.tasaDesercion * 4}%; background: #ef4444;"></div>
          </div>
          <div class="metric-footer">Cancelaciones o retiros de la ficha</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Ambiente Asignado</span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: var(--text-dark); margin-top: 6px;">${miFicha.ambiente}</div>
          <div class="metric-footer" style="margin-top: 14px;">Modalidad: ${miFicha.modalidad}</div>
        </div>
      </div>

      <div class="card-section">
        <div class="card-section-header">
          <div>
            <h3 style="font-size: 16px; font-weight: 800;">Acceso Rápido al Monitoreo Global</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Como Instructor Líder, puede revisar el avance de su ficha o explorar todas las fichas del centro.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" onclick="setTab('avance-fichas')">Ir a Avance Fichas</button>
            <button class="btn btn-outline" onclick="setTab('horarios')">Ver Horarios</button>
          </div>
        </div>
      </div>
    `;
  } else {
    // Coordinador / Administrador / Auxiliar
    const totalMatricula = FICHAS_DATA.reduce((acc, f) => acc + f.matriculaInicial, 0);
    const totalActivos = FICHAS_DATA.reduce((acc, f) => acc + f.aprendicesActivos, 0);
    const totalDeserciones = FICHAS_DATA.reduce((acc, f) => acc + f.deserciones, 0);
    const tasaRetencionGlobal = Math.round((totalActivos / totalMatricula) * 1000) / 10;

    container.innerHTML = `
      <div class="page-header">
        <div class="page-badge">Panel General - ${currentUser.rol}</div>
        <h1 class="page-title">Centro Biotecnológico del Caribe (CBC)</h1>
        <p class="page-description">Consolidado institucional de retención, deserción y seguimiento curricular.</p>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Retención Global</span>
            <span class="badge-count badge-success">Meta SENA >90%</span>
          </div>
          <div class="metric-value" style="color: var(--sena-green);">${tasaRetencionGlobal}%</div>
          <div class="metric-bar">
            <div class="metric-bar-fill" style="width: ${tasaRetencionGlobal}%; background: var(--sena-green);"></div>
          </div>
          <div class="metric-footer">${totalActivos} aprendices activos de ${totalMatricula}</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Deserciones Totales</span>
            <span class="badge-count badge-danger">${totalDeserciones} aprendices</span>
          </div>
          <div class="metric-value">5.8%</div>
          <div class="metric-bar">
            <div class="metric-bar-fill" style="width: 25%; background: #ef4444;"></div>
          </div>
          <div class="metric-footer">Cancelaciones y retiros voluntarios acumulados</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Fichas Activas</span>
          </div>
          <div class="metric-value" style="color: var(--sena-blue);">${FICHAS_DATA.length}</div>
          <div class="metric-footer">Programas activos en el centro de formación</div>
        </div>
      </div>

      <div class="card-section">
        <div class="card-section-header">
          <div>
            <h3 style="font-size: 16px; font-weight: 800;">Monitoreo y Avance de Fichas</h3>
            <p style="font-size: 12px; color: var(--text-muted);">Haga clic a continuación para ver el desglose completo por programa y ficha.</p>
          </div>
          <button class="btn btn-primary" onclick="setTab('avance-fichas')">Abrir Avance Fichas</button>
        </div>
      </div>
    `;
  }
}

// --- VISTA: AVANCE FICHAS (PANTALLAZO SOLICITADO) ---
function renderAvanceFichas(container) {
  // Filtrar según estado
  const fichasFiltradas = FICHAS_DATA.filter(f => {
    if (filtroTipo === 'MIS_FICHAS') {
      const esMia = f.instructorLiderId === currentUser.id || f.id === currentUser.fichaAsignadaId;
      if (!esMia) return false;
    }
    if (filtroNivel !== 'TODOS' && f.nivelFormacion !== filtroNivel) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return f.numero_ficha.includes(term) || f.programaNombre.toLowerCase().includes(term) || f.instructorLiderNombre.toLowerCase().includes(term);
    }
    return true;
  });

  container.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
      <div>
        <div class="page-badge">Indicadores por Programa de Formación</div>
        <h1 class="page-title">Indicadores por Programa de Formación</h1>
        <p class="page-description">Desglose de matrícula inicial, aprendices activos, tasa de retención y deserción por cohorte.</p>
      </div>
      <div>
        <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); background: #f1f5f9; padding: 6px 12px; border-radius: 8px;">
          Total Programas: ${fichasFiltradas.length}
        </span>
      </div>
    </div>

    <!-- Barra de Filtros -->
    <div class="card-section" style="padding: 16px; margin-bottom: 18px;">
      <div class="filters-bar" style="justify-content: space-between;">
        <div class="tab-pill-group">
          <button class="tab-pill ${filtroTipo === 'TODAS' ? 'active' : ''}" onclick="cambiarFiltroTipo('TODAS')">
            Todas las Fichas (${FICHAS_DATA.length})
          </button>
          ${currentUser.rol === 'INSTRUCTOR_LIDER' ? `
            <button class="tab-pill ${filtroTipo === 'MIS_FICHAS' ? 'active' : ''}" onclick="cambiarFiltroTipo('MIS_FICHAS')">
              Mis Fichas Asignadas
            </button>
          ` : ''}
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input 
            type="text" 
            class="input-search" 
            id="search-input-fichas" 
            placeholder="Buscar programa o ficha..." 
            value="${searchTerm}" 
            oninput="handleSearch(this.value)"
          />

          <select class="select-filter" onchange="handleFiltroNivel(this.value)">
            <option value="TODOS" ${filtroNivel === 'TODOS' ? 'selected' : ''}>Todos los Niveles</option>
            <option value="Tecnólogo" ${filtroNivel === 'Tecnólogo' ? 'selected' : ''}>Tecnólogo</option>
            <option value="Técnico" ${filtroNivel === 'Técnico' ? 'selected' : ''}>Técnico</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tabla con diseño fiel a la captura de pantalla del usuario -->
    <div class="card-section" style="padding: 0; overflow: hidden;">
      <div class="table-responsive">
        <table class="sena-table">
          <thead>
            <tr>
              <th style="padding-left: 20px;">PROGRAMA / FICHA</th>
              <th>NIVEL / MODALIDAD</th>
              <th style="text-align: center;">MATRÍCULA</th>
              <th style="text-align: center;">ACTIVOS</th>
              <th style="text-align: center;">DESERCIONES</th>
              <th>TASA RETENCIÓN</th>
              <th>TASA DESERCIÓN</th>
              <th style="text-align: right; padding-right: 20px;">ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            ${fichasFiltradas.length > 0 ? fichasFiltradas.map(f => `
              <tr>
                <td style="padding-left: 20px;">
                  <div style="font-weight: 800; color: var(--text-dark);">${f.programaNombre}</div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 6px;">
                    <span class="badge-ficha">Ficha ${f.numero_ficha}</span>
                    <span>• Líder: ${f.instructorLiderNombre}</span>
                  </div>
                </td>
                <td>
                  <div style="font-weight: 700; color: #334155;">${f.nivelFormacion}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${f.modalidad}</div>
                </td>
                <td style="text-align: center; font-weight: 800; color: var(--text-dark); font-size: 14px;">
                  ${f.matriculaInicial}
                </td>
                <td style="text-align: center;">
                  <span class="badge-count badge-success" style="font-size: 12px; padding: 4px 10px;">
                    ${f.aprendicesActivos}
                  </span>
                </td>
                <td style="text-align: center;">
                  <span class="badge-count ${f.deserciones > 0 ? 'badge-danger' : 'badge-muted'}" style="font-size: 12px; padding: 4px 10px;">
                    ${f.deserciones}
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 70px; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                      <div style="width: ${f.tasaRetencion}%; height: 100%; background: ${f.tasaRetencion >= 90 ? '#0D631B' : f.tasaRetencion >= 80 ? '#f59e0b' : '#ef4444'}; border-radius: 999px;"></div>
                    </div>
                    <span style="font-weight: 800; font-size: 12px;">${f.tasaRetencion}%</span>
                  </div>
                </td>
                <td>
                  <span style="font-weight: 800; font-size: 12px; ${f.tasaDesercion > 8 ? 'color: #ef4444;' : 'color: #64748b;'}">
                    ${f.tasaDesercion}%
                  </span>
                </td>
                <td style="text-align: right; padding-right: 20px;">
                  <button class="btn-action-link" onclick="verFichaModal('${f.id}')">
                    Ver Ficha <span>&rarr;</span>
                  </button>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
                  No se encontraron fichas que coincidan con la búsqueda o filtro aplicado.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function cambiarFiltroTipo(tipo) {
  filtroTipo = tipo;
  renderVistaActual();
}

function handleSearch(val) {
  searchTerm = val;
  renderVistaActual();
  // Mantener foco en el campo de búsqueda
  const el = document.getElementById('search-input-fichas');
  if (el) {
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }
}

function handleFiltroNivel(val) {
  filtroNivel = val;
  renderVistaActual();
}

function verFichaModal(fichaId) {
  const f = FICHAS_DATA.find(x => x.id === fichaId);
  if (!f) return;

  const modalHtml = `
    <div class="modal-backdrop" id="modal-detalle-ficha">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-dark);">Ficha ${f.numero_ficha}</h3>
            <p style="font-size: 12px; color: var(--text-muted);">${f.programaNombre}</p>
          </div>
          <button class="modal-close" onclick="cerrarModalDetalle()">✕</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid var(--border-color);">
            <div style="font-size: 10px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Líder Asignado</div>
            <div style="font-weight: 700; margin-top: 4px;">${f.instructorLiderNombre}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${f.instructorLiderEmail}</div>
          </div>
          <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid var(--border-color);">
            <div style="font-size: 10px; font-weight: bold; color: var(--text-muted); text-transform: uppercase;">Ambiente</div>
            <div style="font-weight: 700; margin-top: 4px;">${f.ambiente}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${f.modalidad}</div>
          </div>
          <div style="background: var(--sena-green-light); padding: 12px; border-radius: 10px; border: 1px solid #c8e6c9;">
            <div style="font-size: 10px; font-weight: bold; color: var(--sena-green); text-transform: uppercase;">Retención</div>
            <div style="font-size: 20px; font-weight: 900; color: var(--sena-green);">${f.tasaRetencion}%</div>
            <div style="font-size: 11px; color: #2e7d32;">${f.aprendicesActivos} activos / ${f.matriculaInicial} matriculados</div>
          </div>
          <div style="background: #fff3e0; padding: 12px; border-radius: 10px; border: 1px solid #ffe0b2;">
            <div style="font-size: 10px; font-weight: bold; color: #d97706; text-transform: uppercase;">Deserción</div>
            <div style="font-size: 20px; font-weight: 900; color: #d97706;">${f.tasaDesercion}%</div>
            <div style="font-size: 11px; color: #b45309;">${f.deserciones} cancelados/retiros</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button class="btn btn-primary" onclick="cerrarModalDetalle(); setTab('horarios');">
            Ver Programación de Horarios
          </button>
          <button class="btn btn-outline" onclick="alert('Generando Reporte Oficial F001 para Ficha ' + '${f.numero_ficha}' + '...');">
            Descargar Reporte F001 (Simulación)
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function cerrarModalDetalle() {
  const el = document.getElementById('modal-detalle-ficha');
  if (el) el.remove();
}

// --- VISTA: HORARIOS ---
function renderHorarios(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-badge">Matriz de Formación Semanal</div>
      <h1 class="page-title">Programación de Ambientes y Horarios</h1>
      <p class="page-description">Consulta de bloques horarios, disponibilidad de ambientes y asignación de instructores.</p>
    </div>

    <div class="card-section" style="padding: 0; overflow: hidden;">
      <div class="table-responsive">
        <table class="sena-table">
          <thead>
            <tr>
              <th style="padding-left: 20px;">DÍA Y FRANJA</th>
              <th>FICHA / PROGRAMA</th>
              <th>INSTRUCTOR</th>
              <th>AMBIENTE</th>
              <th style="padding-right: 20px;">COMPETENCIA</th>
            </tr>
          </thead>
          <tbody>
            ${HORARIOS_DATA.map(h => `
              <tr>
                <td style="padding-left: 20px;">
                  <span class="badge-count badge-success" style="display: inline-block; margin-bottom: 4px;">${h.dia}</span>
                  <div style="font-family: monospace; font-size: 11px; font-weight: 700; color: #334155;">${h.franja}</div>
                </td>
                <td>
                  <div style="font-weight: 700;">${h.programa}</div>
                  <span class="badge-ficha">Ficha ${h.ficha}</span>
                </td>
                <td style="font-weight: 600; color: #1e293b;">${h.instructor}</td>
                <td>
                  <span style="font-weight: 600; color: var(--sena-blue);">${h.ambiente}</span>
                </td>
                <td style="font-size: 11px; color: var(--text-muted); max-width: 250px; padding-right: 20px;">
                  ${h.competencia}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// --- VISTA: SEGUIMIENTO CURRICULAR F001 ---
function renderSeguimiento(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-badge">Control Curricular</div>
      <h1 class="page-title">Seguimiento F001 y Novedades</h1>
      <p class="page-description">Registro de aprendices, control de juicios evaluativos y emisión de certificados.</p>
    </div>

    <div class="card-section">
      <div class="card-section-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 800;">Formato de Registro y Seguimiento de Etapa Lectiva (F001)</h3>
          <p style="font-size: 12px; color: var(--text-muted);">Instrumento institucional para seguimiento a la ejecución de la formación profesional.</p>
        </div>
        <button class="btn btn-primary" onclick="alert('Descargando archivo estructurado F001 en formato de cálculo...');">
          Exportar Libro F001
        </button>
      </div>

      <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; margin-top: 14px;">
        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Directrices de Diligenciamiento:</h4>
        <ul style="font-size: 12px; color: var(--text-muted); padding-left: 20px; line-height: 1.6;">
          <li>Los juicios evaluativos se marcan como <strong>A (Aprobado)</strong> o <strong>D (Por Mejorar)</strong>.</li>
          <li>Cualquier novedad de deserción debe respaldarse con el respectivo trámite administrativo en SOFIA Plus / Zajuna.</li>
          <li>El Instructor Líder es responsable de la consolidación bimestral de novedades antes del cierre de actas.</li>
        </ul>
      </div>
    </div>
  `;
}

// --- VISTA: USUARIOS SEMILLA (TABLA AUDITABLE PARA GITHUB Y PRUEBAS) ---
function renderUsuariosSemilla(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-badge">Seguridad y Pruebas</div>
      <h1 class="page-title">Usuarios Semilla para Pruebas (Credenciales)</h1>
      <p class="page-description">Utilice estas credenciales para probar los diferentes niveles de acceso del sistema o haga clic en "Iniciar Sesión" para cambiar de usuario de inmediato.</p>
    </div>

    <div class="card-section">
      <div class="table-responsive">
        <table class="sena-table">
          <thead>
            <tr>
              <th style="padding-left: 20px;">ROL</th>
              <th>NOMBRE COMPLETO</th>
              <th>CORREO ELECTRÓNICO</th>
              <th>CONTRASEÑA</th>
              <th>ALCANCE / PERMISOS</th>
              <th style="text-align: right; padding-right: 20px;">ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            ${USUARIOS_SEMILLA.map(u => `
              <tr style="${u.id === currentUser.id ? 'background-color: #f0fdf4;' : ''}">
                <td style="padding-left: 20px;">
                  <span class="user-role-tag" style="${u.rol === 'COORDINADOR' ? 'background: #e0f2fe; color: #0369a1;' : u.rol === 'ADMINISTRADOR' ? 'background: #f3e8ff; color: #7e22ce;' : ''}">
                    ${u.rol}
                  </span>
                </td>
                <td>
                  <div style="font-weight: 700; color: var(--text-dark);">${u.nombre_completo}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${u.cargo}</div>
                </td>
                <td style="font-family: monospace; font-size: 12px; font-weight: 600; color: #0369a1;">
                  ${u.correo}
                </td>
                <td>
                  <span style="font-family: monospace; font-size: 11px; background: #e2e8f0; padding: 3px 8px; border-radius: 5px; font-weight: 700;">
                    ${u.clave}
                  </span>
                </td>
                <td style="font-size: 11px; color: var(--text-muted); max-width: 260px;">
                  ${u.rol === 'COORDINADOR' ? 'Gestión global, monitoreo de todas las fichas, cierres y programas.' : 
                    u.rol === 'INSTRUCTOR_LIDER' ? 'Ficha asignada, seguimiento de juicios y acceso a Avance Fichas.' :
                    u.rol === 'AUXILIAR' ? 'Programación de horarios, ambientes e ingesta de archivos Excel.' :
                    'Superadministrador con control total del sistema.'}
                </td>
                <td style="text-align: right; padding-right: 20px;">
                  ${u.id === currentUser.id ? `
                    <span class="badge-count badge-success">Activo Ahora</span>
                  ` : `
                    <button class="btn btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="cambiarUsuarioDirecto('${u.id}')">
                      Probar Rol
                    </button>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 7. CAMBIO DE USUARIO RÁPIDO
function cambiarUsuarioDirecto(userId) {
  const user = USUARIOS_SEMILLA.find(u => u.id === userId);
  if (user) {
    currentUser = user;
    localStorage.setItem('sena_standalone_user', user.correo);
    renderVistaActual();
  }
}

function abrirModalUsuarios() {
  setTab('usuarios');
}
