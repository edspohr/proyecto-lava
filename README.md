# LAVA 2.0 · Edición 2026

Propuesta local de landing interactiva. Abrir `index.html` en el navegador o ejecutar `python3 -m http.server 8765` en esta carpeta.

## Decisiones confirmadas

- Vista global: una meta y un beneficio compartido.
- Se mide gestión completada de OTAS, no necesariamente cierre.
- Tono lúdico: aventura, niveles y celebración.
- Sin el banner de 2025.

## Implementación

HTML, CSS y JavaScript sin framework ni compilación. Simulación global, hitos, celebración al alcanzar 100%, reinicio del avance y preguntas desplegables. Adaptaciones móviles y respeto por movimiento reducido. Las fuentes Google son opcionales y tienen alternativas del sistema.

El avance global de 64% es ilustrativo; no se calcula a partir de promedios de equipos. Los hitos 25/50/75/100 son una propuesta visual. No existe conexión a datos reales; el simulador solo cambia estado en memoria. No hay una fórmula de cumplimiento implementada: depende de las reglas por confirmar.

## Pendientes con Juliana

Base inicial y meta global, criterios de gestión completa, beneficio compartido, fecha límite, fuente de datos y frecuencia de actualización. Al conectar datos: validar denominadores, duplicados y alcance del período; separar o retirar el simulador y mostrar fecha real de corte.

## Archivos

- `index.html`: estructura y contenido.
- `styles.css`: diseño y adaptaciones.
- `app.js`: interacciones de demostración.
- `archive/index-2025.html`: versión anterior conservada; sus rutas de imágenes requieren servirla desde la raíz o adaptar `img/` a `../img/`.
- CSV, Excel, correos y PDF: históricos de 2025; no consumidos por la landing.

## Verificación

Sintaxis JavaScript y verificación de hitos 0/25/50/75/100, avance global, celebración y reinicio mediante ejecución Node con DOM simulado. Revisión visual en navegador pendiente: el host de acceso al navegador no estuvo disponible en esta sesión.

## Identidad visual

Símbolo LAVA vectorial en `img/lava-mark.svg`: ascenso volcánico en naranja con acento verde de logro. Se usa en encabezado y pie. `favicon.svg` adapta el símbolo a pestañas sobre fondo oscuro.
