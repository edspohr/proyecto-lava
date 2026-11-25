# Migración no destructiva de gestión LAVA

## Comportamiento

El lector reconoce encabezados con asterisco y mantiene las reglas de cumplimiento existentes. OT Cancelada cuenta cuando tiene fecha de gestión válida y observación. Las columnas informativas de Pipefy no intervienen en el cumplimiento. PIPE ID se mantiene disponible y oculto.

El plan reconcilia por ID inmutable, añade filas nuevas y conserva las excluidas como histórico inactivo. Las filas de gestión existentes no se eliminan ni se reordenan. Los traslados conservan las celdas humanas y bloquean gestiones incompatibles entre equipos. PI conserva su universo congelado y ADMIN sus reglas por frente.

Las fórmulas y resúmenes excluyen las filas inactivas. Los filtros mantienen criterios y orden; la extensión de sus rangos requiere una opción explícita. Los desplegables conservan opciones que los usuarios hayan añadido. Las fechas válidas de filas nuevas se convierten a fechas nativas de Sheets; no se reescriben fechas existentes.

## Herramientas

- `lib/migration.js`: planificador puro, comprobaciones, hash y rollback selectivo.
- `scripts/lava-migrate.cjs`: dry-run por defecto, captura y aplicación controlada.
- `lib/pipefy-read.js` e integraciones de preview: descubrimiento y lectura de campos sin mutaciones.
- `lib/sheet-schema.js`: normalización de encabezados y estado activo.

Credenciales, capturas, exports, respaldos y resultados del operador se guardan fuera de Git y del build. Las excepciones por acceso denegado deben quedar aprobadas explícitamente por ID y equipo en la entrada privada; añaden una nota informativa sin inventar datos.

## Validación

`npm test`: 34 pruebas aprobadas. Incluyen preservación de gestión, cancelación, encabezados, fechas nativas, histórico inactivo, conflictos, idempotencia, filtros, rollback y lector de acceso parcial. `npm run build` verifica sintaxis y empaqueta solo el runtime permitido.

La validación en una copia nativa debe comprobar valores efectivos, fechas, resúmenes, filtros, validación y ausencia de errores. Si el control visual no está disponible, registrar esa limitación en el informe privado del operador.

## Aplicación y despliegue

1. Obtener autorización para producción y verificar los reportes actuales.
2. Crear respaldos completos y recientes de todos los libros afectados, sin cambiar sus permisos.
3. Capturar de nuevo datos y metadatos; conciliar cualquier edición posterior.
4. Generar dry-run sin conflictos ni advertencias. Validar el hash exacto de la entrada de aplicación.
5. Coordinar una pausa de edición. No hay transacción atómica entre varios libros.
6. Aplicar por libro con bitácora durable. Verificar gestión humana, filtros y protecciones después de cada escritura. Ante resultado incierto, reconciliar antes de reintentar.
7. Actualizar el lector de Apps Script manteniendo deshabilitadas las escrituras a Pipefy. Publicar la aplicación por el flujo existente únicamente cuando los resúmenes sean consistentes.
8. Verificar API agregada, dashboard, reglas de beneficios y exclusión de rutas privadas.

## Rollback

`planRollback(before, after, current)` revierte únicamente celdas afectadas por la migración y bloquea cambios concurrentes. Conserva gestiones posteriores y filas nuevas, desactivando estas últimas; restaura los estados activos anteriores. No restaurar ciegamente un libro completo sobre ediciones nuevas. Revertir aplicación, configuración y resúmenes de forma coordinada, manteniendo las escrituras a Pipefy deshabilitadas.
