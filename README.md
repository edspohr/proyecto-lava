# LAVA 2.0 · Edición 2026

Propuesta local de landing interactiva. Abrir `index.html` en el navegador o ejecutar `python3 -m http.server 8765` en esta carpeta.

## Decisiones confirmadas

- Vista global: una meta y un beneficio compartido.
- Se mide gestión completada de OTAS, no necesariamente cierre.
- Tono lúdico: aventura, niveles y celebración.
- Sin el banner de 2025.

## Implementación

HTML, CSS y JavaScript sin framework ni compilación. Simulación PI/AR con resultado global ilustrativo, hitos, celebración al alcanzar 100%, reinicio del avance y preguntas desplegables. Adaptaciones móviles y respeto por movimiento reducido. Tipografía Inter con alternativas del sistema.

PI 72%, AR 56% y global 64% son datos de ejemplo. Solo en el simulador se calcula un promedio simple de PI/AR con igual peso; no es la fórmula oficial. Los hitos 25/50/75/100 son una propuesta visual. No existe conexión a datos reales; el simulador solo cambia estado en memoria. No hay una fórmula de cumplimiento implementada: depende de las reglas por confirmar.

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

## Dirección visual SPI · Noviembre 2026

Referencia: https://spiamericas.com/ y su hoja pública `/_astro/BaseLayout.DHIF-uJQ.css`, consultadas el 16 de noviembre de 2026. Se toman Inter, azul #0170DD, tinta #14202E, fondo #FAFAFB y divisores #E0E2E5. El logo institucional existente `img/logo.png` preside la página. La campaña mantiene su símbolo LAVA; naranja y efectos de calor quedan como acentos. Favicon de campaña conservado.

El beneficio confirmado conceptualmente es días libres de fin de año; cantidad, fechas, meta y condiciones 2026 siguen pendientes. La vista es global. Gestión completada no equivale a cierre. Los criterios de 2025 se presentan como antecedentes, nunca como reglas 2026 aprobadas. La fórmula histórica por categorías no se presume equivalente al porcentaje real de OTAS gestionadas. No se añadieron integraciones ni módulos operacionales a partir del documento de contexto.

## Propuesta con avance protagonista

El primer bloque muestra cumplimiento global, barra de lava, desglose PI/AR y beneficio colectivo. Se elimina el símbolo LAVA de la página y su ilustración decorativa. SPI es la marca principal, Proyecto LAVA un nombre discreto. Favicon simplificado a una L. El simulador está plegado por defecto y permite explorar cada área, mostrando su efecto global con una fórmula explícitamente ilustrativa. Visibilidad por área no significa incentivos independientes.

Verificación actual: sintaxis JS, estado por área, cálculo ilustrativo, límites 0/100, celebración conjunta, reinicio y estructura HTML. Revisión visual de navegador pendiente.

## Fuentes y focos · 17 de noviembre de 2026

Tres reportes confirmados (AR Colombia, AR Global Ops y PI), registrados en `sources.json` y enlazados desde la landing. No hay lectura de registros ni sincronización activa. Las tarjetas de foco muestran “Por calcular”, nunca cantidades inventadas o cero por falta de acceso.

Criterios confirmados: OTA abierta de más de 90 días y OTA abierta de más de un año, ambos desde Fecha Solicitud OT. “Más de un año” es el criterio operativo del usuario para enfocar los pendientes históricos; no acredita participación en el listado de campaña 2025. Ambos focos se superponen. Corte, zona horaria, estados abiertos y fórmula oficial pendientes.

Diseño de integración Sheets → Pipefy por lotes, dependencias y validaciones en [docs/pipefy-integration.md](docs/pipefy-integration.md). No se ha habilitado escritura ni programación nocturna.
