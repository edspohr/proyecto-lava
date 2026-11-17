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
| AR Global | Solo enlace publicado en sources.json | Resumen LAVA (lectura pública de agregados) |

El archivo AR Colombia se llama `AR-col-analisis-otas`; su pestaña conserva el nombre anterior. AR Global tiene un archivo independiente con registros privados y una pestaña `Resumen LAVA` publicada en CSV, autorizada expresamente por el usuario. Solo esa pestaña contiene los conteos necesarios; sus fórmulas se actualizan desde el análisis privado. La publicación tiene activada la actualización automática.

La API lee PI y Colombia por la exportación CSV existente con lectura por vínculo; para AR Global lee exclusivamente el resumen publicado. Devuelve únicamente agregados, sin clientes, comentarios ni filas. El navegador no recibe registros individuales. Si una fuente falla o el resumen tiene un corte desactualizado, se muestra error y se retiene el global.

La página consulta al abrir, cada cinco minutos cuando está visible y con Actualizar datos. La hora de consulta no es fecha de modificación del contenido. La carga inicial corresponde a exportaciones de los tres reportes Pipefy del **17 de noviembre de 2026**. Ver [trazabilidad de la carga](docs/data-refresh-2026-11-17.md).

## Actualizar la data

1. Pegar en la misma pestaña del mismo archivo, conservando encabezados `OT`, `Fase actual`, `GRUPO DE ACCIÓN` y `ESTADO`. Se localizan por nombre, no por posición. Para la antigüedad incluir `Fecha Solicitud OT`; se admiten ISO, DD/MM/YYYY y serial de Sheets.
2. Mantener los comentarios, evidencias y gestión asociados a cada ID antes de sobrescribir un listado. No copiar estados `Listo` entre OTAS por número de fila.
3. Si el nuevo listado es más corto, limpiar las filas sobrantes para que no se sigan contando como vigentes.
4. Mantener los campos dentro de las columnas actuales (PI A:AS; AR Colombia A:AM; AR Global A:AO) para las fórmulas del dashboard. La API no limita columnas. Cambiar de pestaña/gid exige actualizar la configuración.
5. Pulsar Actualizar datos. No se requiere otro push por cada pegado. La caché interna de Google puede introducir un breve retraso.

## Cálculos y cobertura

- Se consideran filas con OT y una fase incluida en `includedPhases` por fuente. Se conservaron todas las fases observadas en los reportes actuales, incluidas migración Global y las fases PI sin prefijo OTAS. Revisar la configuración y las fórmulas del dashboard/resumen si cambia el alcance de los reportes.
- `ESTADO = Listo` indica gestión declarada. No equivale a cierre ni auditoría aprobada.
- Indicador por área: promedio simple de las cuatro categorías históricas, con cero en categorías vacías, igual que el dashboard. Se muestra aparte Listo/total y su porcentaje real por registros. Reglas oficiales 2026 pendientes.
- Global: promedio de los tres indicadores solo cuando existen las tres fuentes. No se convierte una fuente ausente en cero ni se recalcula un global con dos áreas.
- Más de 90 días: diferencia estrictamente superior a 90 días desde solicitud OT.
- Más de un año: solicitud anterior al aniversario de un año respecto al corte; se ajusta el 29 de febrero al último día válido. Criterio operativo acordado para destacar pendientes históricos, no prueba de pertenencia a la campaña 2025.
- Corte diario en America/Santiago, misma zona que el dashboard existente. Puede cambiarse en `sources.json`.
- Los focos se superponen. Se muestran por área, total detectado, sin Listo y cobertura de fechas. Fechas vacías, inválidas o futuras se señalan, no se sustituyen por creación de tarjeta. Las tres cargas actuales tienen fecha de solicitud válida.
- Un ID de tarjeta duplicado genera error; si no hay ID se usa OT. Tarjetas distintas pueden compartir OT.

## Dashboard actualizado

El consolidador existente conserva el promedio histórico por categorías. PI y Colombia usan IMPORTRANGE sin los antiguos topes de filas y ubican grupo, estado y fase por encabezados. AR Global importa el mismo resumen numérico publicado que lee la API. `Hoja 1!A11:E16` incorpora el global y los conteos por área y antigüedad. Verificado: 188 PI, 571 Colombia y 143 Global; sin errores de fuente.

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

Pruebas Node de CSV, antigüedad, fases, IDs, resumen público, API parcial/completa y presentación. Lectura real de las tres fuentes y dashboard contrastada con los exports: **902 OTAS**, **289 >1 año**, **597 >90 días**, ninguna sin fecha válida. Las gestiones vigentes parten en Pendiente; los aportes históricos se preservaron separados y hay copias de respaldo. Quedan pendientes objetivos, criterios e incentivos oficiales 2026 y la eventual escritura Sheets → Pipefy.
