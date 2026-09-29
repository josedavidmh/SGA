# Cambios en el módulo de Seguimiento — resumen para aplicar

El enlace con tu computador se cayó a mitad de la sesión, así que estos archivos no se pudieron
escribir directamente en tu carpeta `D:\Cowork\sistema-de-gestión-académica-sena`. Cada archivo
de aquí va en la MISMA ruta relativa dentro de tu proyecto (reemplaza el archivo existente,
excepto los que son nuevos).

Verificado antes de entregar: `npx tsc --noEmit` sin errores y `npm run build` exitoso sobre el
proyecto completo (no solo el archivo tocado).

## 1. Bug real que rompía el type-check (ya lo tenías al editar el módulo)

`types.ts` define `ResultadoAprendizaje` con el campo `codigoRap` (y `horasTrabajoDirecto`,
`duracionHoras`, sin `competenciaId`/`horasDirectas`/`horasEstimadas`), pero `SeguimientoView.tsx`
y dos puntos de `App.tsx` seguían usando `rap.codigo`, `rap.competenciaId`, `rap.horasDirectas`,
`rap.horasEstimadas` — campos que no existen en el tipo real. Esto no rompía `vite dev` (Vite no
tipa en caliente) pero sí `npx tsc --noEmit` (tu propio script `lint`), y en tiempo de ejecución
esos campos daban `undefined`: los RAPs no se emparejaban bien contra `rapsSeguimiento` ni contra
los bloques de horario. Corregido en `SeguimientoView.tsx` y `App.tsx`.

## 2. Persistencia a Supabase (antes solo vivía en localStorage o en memoria)

- **`actividades` (matriz GPFI-F-134)**: no se guardaba en ningún lado, ni siquiera localStorage —
  se perdía al recargar la página. Ahora se guarda en localStorage como respaldo y se sincroniza
  con la tabla `actividades_seguimiento` de Supabase.
- **`rapsSeguimiento`** (instructor + estado por RAP): solo vivía en `localStorage` del navegador.
  Se creó la tabla nueva `raps_seguimiento` (ver la migración SQL) y ahora sincroniza igual.
- **Fichas**: existían `insertFichaInSupabase`/`fetchFichasFromSupabase` en el código pero nunca
  se llamaban desde `App.tsx` — las fichas nunca llegaban a Supabase. Fue necesario conectarlas
  también, porque `actividades_seguimiento` y `raps_seguimiento` tienen una llave foránea
  obligatoria hacia `fichas.id`.
- **Ids**: varios ids se generaban como `ficha_123`, `inst_${Date.now()}`, `rap_seg_..._${Date.now()}`,
  que no son UUID válidos para las columnas `id UUID` de Postgres. Se centralizó la generación en
  `src/lib/id.ts` (`generarUuid()`, usa `crypto.randomUUID()`) y se usa en Fichas, Instructores y
  Seguimiento por RAP. Además ahora se envía ese mismo id al insertar en Supabase (antes no se
  enviaba y Postgres generaba uno distinto al local, rompiendo cualquier `update` posterior hasta
  la siguiente sincronización).

### Pasos para aplicar esto en tu Supabase
1. Corre la migración nueva: `supabase/migrations/20260928_sync_seguimiento_curricular.sql`
   (agrega `instructor_nombre` a `actividades_seguimiento` y crea la tabla `raps_seguimiento`).
2. **Nota de seguridad**: la política RLS de la tabla nueva es la misma que ya usan todas las
   demás tablas de tu esquema — acceso total (`USING (true) WITH CHECK (true)`) para `anon` y
   `authenticated`. Es decir, cualquiera con tu anon key puede leer/escribir/borrar TODO en la
   base de datos (no solo esta tabla — ya era así desde el esquema inicial). Vale la pena
   revisarlo antes de usar esto con datos reales de aprendices.

## 3. Semáforo de cumplimiento (70%–80%)

`estadoSemaforo` tenía tres valores posibles (`OK`, `ALERTA_PROGRAMAR`, `AVANZADO`) pero el código
nunca asignaba `AVANZADO`: cualquier competencia por debajo de 70% **o por encima de 80%** se
pintaba igual, en ámbar, con el mensaje "Seguir Programando" — hasta una competencia ejecutada al
150% aparecía como si le faltara programación. Ahora: <70% = ámbar (alerta real), 70–80% = verde
(OK), >80% = azul ("Avanzada", ya no es una alerta). Se agregó un filtro nuevo "Avanzada +80%" en
la pestaña Comparativo.

## 4. Instructores "fantasma" en la fila de competencia

La columna "Instructor(es) Responsables" de la fila colapsada solo se llenaba con los datos del
Excel de horas ejecutadas. Si ya habías asignado instructor a un RAP desde el desplegable (pestaña
expandida), la fila seguía diciendo "Sin reporte de horas". Ahora se combina con los instructores
asignados en `rapsSeguimiento`.

## 5. Refactor

Se extrajo toda la lógica de negocio del componente (cálculo del comparativo, resolución de RAPs,
handlers de cambio de instructor/estado, estadísticas) a `src/hooks/useSeguimientoCurricular.ts`.
El comportamiento visual es idéntico; `SeguimientoView.tsx` bajó de ~1330 a ~1120 líneas y ahora es
mayormente JSX.

## Archivos de este paquete

- `src/App.tsx` — wiring de sincronización + ids UUID
- `src/components/SeguimientoView.tsx` — fix de tipos + semáforo + usa el hook nuevo
- `src/components/ModalCrearFicha.tsx` — id de ficha ahora es UUID real
- `src/components/ModalCrearInstructor.tsx` — id de instructor ahora es UUID real
- `src/services/supabaseService.ts` — funciones nuevas (Fichas update/delete, Actividades, RapsSeguimiento)
- `src/services/horasEjecutadasService.ts` — fix del semáforo + instructores desde rapsSeguimiento
- `src/lib/id.ts` — helper de UUID (nuevo)
- `src/hooks/useSeguimientoCurricular.ts` — lógica extraída del componente (nuevo)
- `supabase/migrations/20260928_sync_seguimiento_curricular.sql` — migración nueva
