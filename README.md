# SENA Centro Biotecnológico del Caribe (CBC) - Regional Cesar
## Sistema Integral de Gestión Académica, Horarios y Fichas de Formación

Aplicación web diseñada para la administración, seguimiento curricular y programación horaria de las fichas de formación en el **Centro Biotecnológico del Caribe (SENA Regional Cesar)**.

El sistema cuenta con control de acceso basado en roles (**RBAC**), gestión de horarios sin colisiones de ambientes, monitoreo de indicadores de retención/deserción por programa (**Avance Fichas**) y generación de reportes oficiales en formato F001.

---

## 👥 Usuarios Semilla para Pruebas (Credenciales de Acceso)

Para facilitar la evaluación y auditoría del sistema en GitHub o en entornos locales, se han configurado los siguientes usuarios semilla clasificados por rol:

| Rol | Nombre Completo | Correo Electrónico | Contraseña / Clave | Alcance y Permisos |
| :--- | :--- | :--- | :--- | :--- |
| **COORDINADOR** | Ing. Claudia Restrepo | `coord.academica@misena.edu.co` | `Sena2026*Coord` | **Gestión Global:** Dashboard con métricas globales, Avance Fichas institucional, gestión de fichas, programas, instructores, cierres de periodo y auditoría. |
| **INSTRUCTOR LÍDER** | Ing. Carlos Mendoza | `carlos.mendoza@misena.edu.co` | `Sena2026*Inst` | **Ficha Asignada (3317145 - ADSO):** Vista de su cohorte, programación semanal, evaluación de juicios evaluativos (RAPs), exportación F001 y acceso al módulo **Avance Fichas** de todo el centro. |
| **INSTRUCTOR LÍDER** | Ing. Jenny Oñate | `jenny.onate@misena.edu.co` | `Sena2026*Jenny` | **Ficha Asignada (Redes y Datos):** Consulta de programación horaria técnica, registro de novedades y consulta de indicadores de fichas. |
| **AUXILIAR** | Javier Alvarado | `aux.operativo@misena.edu.co` | `Sena2026*Aux` | **Operativo Multificha:** Programación de matriz de horarios para todos los ambientes, seguimiento curricular, ingesta de archivos Excel (GPFI) y validación de cruces. |
| **ADMINISTRADOR** | José David Montesino | `josedavidmontesino@gmail.com` | `Sena2026*Admin` | **Acceso Total:** Superadministrador de la plataforma, gestión integral de usuarios, configuración del centro y logs de seguridad. |

> 💡 **Nota:** En la pantalla de inicio de sesión de ambas versiones (React y HTML/CSS/JS Standalone), encontrará un botón de **"Credenciales de Prueba"** que permite iniciar sesión con un solo clic en cualquiera de estos perfiles sin necesidad de escribir manualmente la contraseña.

---

## 🚀 Opciones de Despliegue y Ejecución

El proyecto incluye **dos modalidades de despliegue**:

### Opción 1: Versión Standalone (HTML5, CSS3 y JavaScript Puro)
Ubicada en el directorio `/standalone` o descargable directamente desde la plataforma:
- **Sin necesidad de instalar Node.js ni paquetes npm.**
- Compatible con **GitHub Pages**, servidores Apache/Nginx o simplemente haciendo **doble clic en `index.html`** en cualquier navegador (Chrome, Firefox, Edge, Safari).
- Incluye almacenamiento local (`localStorage`) para persistencia inmediata de cambios, asignaciones y filtros.
- Contiene:
  - `standalone/index.html`: Estructura semántica de la aplicación.
  - `standalone/style.css`: Estilos visuales con la identidad corporativa SENA (Verde `#0D631B`, Azul `#005A8C`, tipografía limpia).
  - `standalone/app.js`: Lógica completa de autenticación, roles, filtrado de avance de fichas, horarios y juicios.

#### Despliegue en GitHub Pages:
1. Sube este repositorio a tu cuenta de GitHub.
2. Ve a **Settings** > **Pages** en tu repositorio.
3. En **Source**, selecciona `Deploy from a branch`.
4. Selecciona la rama `main` y la carpeta `/` o `/standalone`.
5. Guarda los cambios; en menos de 1 minuto tendrás la aplicación publicada en línea.

---

### Opción 2: Versión Full React + TypeScript + Vite
Para desarrollo con componentes modulares, TypeScript estricto y Tailwind CSS:

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/sena-gestion-academica.git
cd sena-gestion-academica

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo local
npm run dev

# 4. Compilar para producción
npm run build
```

La aplicación se ejecutará de forma predeterminada en `http://localhost:3000`.

---

## 📂 Estructura del Repositorio

```text
├── README.md                      # Documentación principal para GitHub con usuarios semilla
├── metadata.json                  # Metadatos del aplicativo SENA
├── package.json                   # Dependencias del proyecto React / Vite
├── index.html                     # Entrada HTML para Vite
├── src/                           # Código fuente React + TypeScript
│   ├── App.tsx                    # Orquestador principal y enrutamiento por roles
│   ├── types.ts                   # Interfaces TypeScript (User, Ficha, Horario, etc.)
│   ├── mockData.ts                # Base de datos inicial y usuarios semilla
│   ├── components/                # Vistas principales:
│   │   ├── AvanceFichasView.tsx   # Desglose de retención, deserción y matrícula por programa
│   │   ├── DashboardView.tsx      # Paneles personalizados según rol (Coordinador, Líder, Auxiliar)
│   │   ├── HorariosView.tsx       # Matriz semanal y detector de cruces de ambientes
│   │   ├── SeguimientoView.tsx    # Juicios evaluativos de RAPs y formato F001
│   │   ├── IngestaExcelView.tsx   # Carga y validación de plantillas Excel GPFI
│   │   ├── LoginModal.tsx         # Modal de autenticación con selector de perfiles semilla
│   │   └── DescargarStandaloneModal.tsx # Exportador de la versión descargable ZIP
│   └── services/                  # Servicios de exportación Excel y auditoría
└── standalone/                    # VERSIÓN ESTÁTICA LIGERA (HTML, CSS, JS)
    ├── index.html                 # Aplicativo estático completo
    ├── style.css                  # Hoja de estilos SENA
    ├── app.js                     # Motor JavaScript sin dependencias externas
    └── README.md                  # Guía rápida para la versión estática
```

---

## ✨ Características Principales

1. **Control de Acceso por Roles (RBAC SENA)**:
   - Pantallas y menús adaptados según el perfil del usuario autenticado.
2. **Módulo "Avance Fichas"**:
   - Tabla comparativa con matrícula inicial, aprendices activos, cancelaciones, retiros voluntarios, tasa de retención (con barra cromática de cumplimiento) y tasa de deserción.
   - Pestaña para que el **Instructor Líder** filtre entre *Todas las Fichas* y *Mis Fichas Asignadas*.
3. **Matriz de Programación de Horarios**:
   - Control de ambientes de aprendizaje, cálculo de horas semanales de instructores y prevención de colisiones horarias.
4. **Seguimiento Curricular y Formato F001**:
   - Registro de novedades de aprendices (aplazamientos, traslados, deserciones) y exportación a libro de cálculo Excel compatible con directrices SENA.
5. **Ingesta de Archivos Excel**:
   - Validador de columnas y esquemas oficiales de horarios para importación masiva.
6. **Bitácora de Auditoría**:
   - Trazabilidad de inicios de sesión, cambios de estados y modificaciones horarias con sello de tiempo y usuario responsable.

---

## 🏛️ Información Institucional
- **Entidad:** Servicio Nacional de Aprendizaje (SENA)
- **Centro:** Centro Biotecnológico del Caribe (CBC)
- **Regional:** Regional Cesar
- **Sede:** Sede Principal - Valledupar
- **Año:** 2026
