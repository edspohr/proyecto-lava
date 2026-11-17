# Carga inicial LAVA 2026

Se reemplazaron los registros vigentes de las tres hojas con los XLSX descargados de los reportes Pipefy abiertos por el usuario el 17-11-2026. No se modificaron tarjetas ni comentarios en Pipefy.

| Fuente | Registros | >90 días | >1 año | Sin fecha válida | Vínculos históricos |
| --- | ---: | ---: | ---: | ---: | ---: |
| PI | 188 | 109 | 77 | 0 | 6 |
| AR Colombia | 571 | 390 | 177 | 0 | 173 |
| AR Global | 143 | 98 | 35 | 0 | 30 |
| Total | 902 | 597 | 289 | 0 | 209 |

Los umbrales son estrictos desde Fecha Solicitud OT al corte diario en America/Santiago. Los grupos de antigüedad se superponen. Más de un año es el foco histórico acordado, sin atribuir pertenencia exacta a LAVA 2025.

## Preservación

Antes de reemplazar se crearon copias nativas completas de PI y AR Colombia, conservadas en el Drive del usuario. Sus identificadores se mantienen fuera del repositorio público.

Las seis columnas de gestión anteriores quedaron separadas en campos 2025 cuando hubo coincidencia por ID o por OT única y mismo cliente. La columna VÍNCULO HISTÓRICO permite distinguir la procedencia; los históricos sin vínculo continúan en las copias completas. Los estados actuales se inicializaron en Pendiente y los demás campos editables actuales quedaron vacíos.

AR Global se creó como copia nativa independiente del análisis AR; sus filas detalladas no se publicaron. La pestaña Resumen LAVA (gid 9012026) contiene solo métricas y fórmulas, y se publicó expresamente con autorización del usuario para alimentar tanto dashboard como visualizador. Tiene actualización automática de publicación activada.

## Verificación

Se releyeron todas las celdas no calculadas y las marcas de antigüedad de las tres cargas. Se ajustaron las tablas nativas, tipos de fecha, validaciones y extensión de las fórmulas. Se contrastaron conteos con dashboard y API, conservando todas las fases de los reportes. Ningún registro de cliente ni nota se incorpora al repositorio.

Para futuras cargas, pegar por encabezados preservando las columnas editables y el vínculo por ID; limpiar filas sobrantes. No sobrescribir gestiones 2026 ya ingresadas. Si aparecen nuevas fases o cambian encabezados, actualizar fuentes y fórmulas antes de dar por válido el consolidado.
