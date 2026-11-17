# LAVA 2.0 · SPI Américas · 2026

Visualizador de cumplimiento con PI, AR Colombia y AR Global por separado, beneficio colectivo y foco en OTAS abiertas de más de un año y de más de 90 días.

## Ejecutar

Node 22 o posterior, sin dependencias:

```sh
npm start
npm test
```

Abrir http://127.0.0.1:8765. Se requiere conexión a Google para leer las hojas. `index.html` solo o un servidor estático no ejecutan `/api/metrics`. En Vercel, `api/metrics.js` se publica como función Node; no hay paso de compilación. La publicación y su lectura deben verificarse en el entorno destino.

## Fuentes

`sources.json` registra los reportes Pipefy y las hojas Google que alimentan tanto la landing como el dashboard:

| Área | Archivo de análisis | Pestaña |
| --- | --- | --- |
| PI | 1o8ishaXM2x-radoxCsKOd4GllC1I9bFQc37hEISIkK0 | spi-analisis-otas |
| AR Colombia | 19s9kD3_Gz73hheFxCRkbK5E63szhhiIWbLBVqBudnaM | AR-analisis-otas |
| AR Global | Pendiente de definir | Pendiente |

El archivo AR Colombia se llama `AR-col-analisis-otas`; su pestaña conserva el nombre anterior. Las dos pestañas de navegador identificadas apuntaban al mismo ID. No se reutiliza el archivo Colombia para Global.

La API lee la exportación CSV de las hojas compartidas con lectura por vínculo, por su ID/gid, sin rangos de filas fijos. No cambia permisos. Devuelve únicamente agregados; no envía clientes, comentarios ni filas al navegador ni al repositorio. La lectura pública dejará de funcionar si cambia la visibilidad: mostrar error y configurar un acceso autenticado antes de continuar, sin hacer pública una hoja privada.

La página consulta al abrir, cada cinco minutos cuando está visible y con el botón Actualizar datos. La hora de consulta no es fecha de modificación del contenido. Los archivos aún pueden contener registros de 2025: validar el reemplazo del export antes de declarar resultados de campaña.

## Actualizar la data

1. Pegar en la misma pestaña del mismo archivo, conservando encabezados `OT`, `Fase actual`, `GRUPO DE ACCIÓN` y `ESTADO`. Se localizan por nombre, no por posición. Para la antigüedad incluir `Fecha Solicitud OT`; se admiten ISO, DD/MM/YYYY y serial de Sheets.
2. Mantener los comentarios, evidencias y gestión asociados a cada ID antes de sobrescribir un listado. No copiar estados `Listo` entre OTAS por número de fila.
3. Si el nuevo listado es más corto, limpiar las filas sobrantes para que no se sigan contando como vigentes.
4. Mantener los campos dentro de las columnas actuales (PI A:AB; AR A:AC) para las fórmulas del dashboard. La API no limita columnas. Cambiar de pestaña/gid exige actualizar la configuración.
5. Pulsar Actualizar datos. No se requiere otro push por cada pegado. La caché interna de Google puede introducir un breve retraso.

## Cálculos y cobertura

- Se consideran filas con OT y una fase que comienza por `OTAS`. Confirmar este alcance si cambian los estados de Pipefy.
- `ESTADO = Listo` indica gestión declarada. No equivale a cierre ni auditoría aprobada.
- Indicador por área: promedio simple de las cuatro categorías históricas, con cero en categorías vacías, igual que el dashboard. Se muestra aparte Listo/total y su porcentaje real por registros. Reglas oficiales 2026 pendientes.
- Global: promedio de los tres indicadores solo cuando existen las tres fuentes. No se convierte una fuente ausente en cero ni se recalcula un global con dos áreas.
- Más de 90 días: diferencia estrictamente superior a 90 días desde solicitud OT.
- Más de un año: solicitud anterior al aniversario de un año respecto al corte; se ajusta el 29 de febrero al último día válido. Criterio operativo acordado para destacar pendientes históricos, no prueba de pertenencia a la campaña 2025.
- Corte diario en America/Santiago, misma zona que el dashboard existente. Puede cambiarse en `sources.json`.
- Los focos se superponen. Se muestran por área, total detectado, sin Listo y cobertura de fechas. Fechas vacías, inválidas o futuras se señalan, no se sustituyen por creación de tarjeta. PI actualmente carece de fecha de solicitud.
- Un ID de tarjeta duplicado genera error; si no hay ID se usa OT. Tarjetas distintas pueden compartir OT.

## Dashboard actualizado

Se actualizaron `Hoja 1!C1:E7` y `datos!B1:G5` del consolidador existente. PI y Colombia usan IMPORTRANGE sin los antiguos topes 134/481 y ubican grupo, estado y fase por sus encabezados. Global queda pendiente. Se amplió la tabla nativa para incluir su columna y se corrigieron los conteos que apuntaban a pestañas locales inexistentes. No se modificaron los registros de análisis.

## Archivos

- `lib/otas.js`: CSV, fechas, filtros y agregación.
- `api/metrics.js`: lectura de hojas y respuesta agregada de solo lectura.
- `app.js`: tres áreas, actualización y cobertura.
- `index.html`, `styles.css`: presentación clara basada en SPI, azul #0170DD, Inter y acentos de lava.
- `scripts/serve.cjs`: servidor local, sirve solo recursos de la aplicación.
- `tests/otas.test.cjs`: límites temporales, CSV multilinea, columnas reordenadas, datos incompletos, IDs y API parcial.
- `archive/index-2025.html`: versión anterior conservada.
- `docs/pipefy-integration.md`: propuesta de escritura por lotes, todavía no activada.

## Verificación

Nueve pruebas Node aprobadas, lectura real de ambas fuentes verificada localmente y revisión de landing en Chrome. Dashboard verificado por lecturas de fórmulas y resultados; su tabla nativa incluye los tres frentes. No se publican copias de filas de las fuentes. Sigue pendiente el archivo AR Global y la definición final de objetivos, criterios e incentivos 2026.
