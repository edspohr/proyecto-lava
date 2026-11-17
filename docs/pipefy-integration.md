# LAVA 2026 · Fuentes y propuesta de integración

Actualizado: 17 de noviembre de 2026. La landing lee las hojas Google de PI y AR Colombia y el resumen numérico publicado de AR Global en modo de solo lectura. Los registros detallados de AR Global siguen privados. La sección Sheets → Pipefy sigue siendo una propuesta para revisar con Juliana, no una automatización activa.

## Fuentes confirmadas

| Ámbito | Pipe | Reporte |
| --- | --- | --- |
| AR Colombia | 301584251 | 300633507 |
| AR Global Ops | 307290381 | 301106539 |
| PI | 301834596 | 300445475 |

Enlaces en `sources.json` y en la landing. AR reúne dos fuentes: no promediar automáticamente porcentajes ni duplicar una misma OT que aparezca en más de una. Los filtros de los reportes deben conocerse y reproducirse; consultar todos los cards de un pipe no equivale a leer el universo del reporte.

## Focos confirmados por el usuario

- Fecha base para antigüedad: **Fecha Solicitud OT**; nunca sustituirla silenciosamente por creación de tarjeta.
- Más de 90 días: OTA abierta con antigüedad estrictamente mayor a 90 días.
- Pendiente histórico: OTA abierta cuya solicitud es anterior a un año calendario respecto del corte. Es el criterio operativo indicado por el usuario para enfocar los pendientes de LAVA anterior. No prueba pertenencia al listado de campaña 2025.
- Las marcas se superponen: todo pendiente histórico también supera los 90 días. No sumar ambos grupos como si fueran disjuntos.
- Definir corte y zona de negocio; validar fechas, futuros y vacíos. A exactamente 90 días o exactamente un año todavía no se activa el umbral correspondiente. Definir tratamiento de solicitudes del 29 de febrero.
- Confirmar qué fases/estados de cada pipe equivalen a OTA abierta. `done` o “no cerrada” por sí solos pueden no representar el alcance de OTAS.
- Mantener separado “abierta” de “gestión completada”: una OTA puede cumplir ambas condiciones. La gestión y su validación requieren campos y criterios aprobados.

Cantidades a mostrar cuando haya lectura real: total de OTAS abiertas por ámbito, abiertas >90 días, abiertas >1 año, y dentro de cada foco cuántas tienen gestión pendiente/completada/validada. No confundir inexistencia de datos con cero.

## Ruta propuesta: Sheets → Pipefy por lotes

Apps Script es una opción por evaluar: puede llamar servicios HTTPS y ejecutar tareas por tiempo. Pipefy documenta lectura y actualización de tarjetas por API. La factibilidad concreta depende de acceso API, permisos, límites del plan y mapeo de campos.

1. Leer universo autorizado de Pipefy, con paginación, IDs y filtros; llevar a Sheets una fila por tarjeta, con referencia a la OT de negocio.
2. Separar columnas informativas de entradas editables. Vincular entradas por `pipefy_card_id` y `pipe_id` verificados; no por título o número de fila. Conciliar OT duplicadas entre pipes antes de calcular globales.
3. Capturar comentario, próxima acción, responsable, fecha comprometida y evidencia según reglas aprobadas. El autor del comentario es quien lo escribió; conservarlo dentro del contenido cuando la cuenta técnica sea quien publique.
4. Preparar lote de cambios al final del día o mediante ejecución de cierre del ejercicio. Primero generar una previsualización sin escribir.
5. Para comentarios, preferir un aporte nuevo con autor, fecha de edición y referencia al ejercicio; confirmar la operación de comentarios soportada por la API vigente. Para campos, usar los IDs y tipos reales de cada pipe. No reemplazar el historial por el último texto de la hoja.
6. Asignar un ID estable a cada revisión/entrada. Llevar un registro durable de lote, entrada, tarjeta, operación, hash, estado, intentos y respuesta. Prevenir duplicados incluso si una respuesta se pierde después de que Pipefy haya aplicado la operación; reconciliar antes de reintentar una publicación incierta.
7. Detectar cambios concurrentes desde la captura y revisar conflictos. Una celda vacía no borra un valor por defecto. Proteger contra filas reordenadas, IDs alterados y tarjetas de pipes distintos a los autorizados.
8. Confirmar éxito por operación y, cuando proceda, releer el dato en Pipefy. Marcar como enviado solo después de confirmación. Reportar fallos parciales; reintentar solo operaciones fallidas con límites y espera.
9. Mostrar en Sheets pendiente/enviado/error/conflicto, con fecha de envío. No confundir envío a Pipefy con validación de cumplimiento.
10. Probar un caso de cada pipe y un reintento del mismo lote antes de habilitar la tarea nocturna. Guardar credenciales fuera del frontend, repositorio y celdas.

Una tarea programada usa la identidad de su creador y no asegura un minuto exacto de ejecución. Elegir zona horaria de operación y ventana de proceso; no asumir America/Santiago por la cuenta del desarrollador.

## Pendiente de definición

Para habilitar escritura: criterio definitivo de gestión completada, fórmula oficial 2026, mapeo de campos de destino, credenciales con alcance adecuado, dueño de ejecución y tratamiento de conflictos. Las fuentes, las fases del reporte y la fecha de solicitud quedaron configuradas en la carga del 17-11-2026; el corte diario usa America/Santiago. No se han escrito comentarios ni modificado tarjetas.

## Documentación oficial consultada

- [Pipefy: tarjetas y operaciones API](https://developers.pipefy.com/reference/cards)
- [Pipefy: actualización de tarjetas por lotes](https://help.pipefy.com/en/articles/8282624-how-to-bulk-update-cards-using-the-api)
- [Google: tareas por tiempo e identidad de ejecución](https://developers.google.com/apps-script/guides/triggers/installable)
- [Google: peticiones HTTPS con UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)
