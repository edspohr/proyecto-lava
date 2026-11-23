# LAVA 2.0 · 2026

Seguimiento público agregado de PI, AR COL, AR Global Ops y ADMIN. Cada equipo tiene una meta independiente de 100% de gestiones completas al 18/12/2026 y desbloquea los días libres del 24 y 31/12.

## Ejecutar

Node 22 o posterior, sin dependencias:

```sh
npm start
npm test
```

Abrir http://127.0.0.1:8765. Se requiere conexión a Google para leer los agregados.

## Reglas

Una gestión completa exige estado del catálogo cerrado, fecha válida de contacto o revisión y observación con lo pendiente y la próxima acción. En ADMIN se evalúa una revisión por cada frente aplicable; Facturada requiere número de factura y asociado completo requiere asociado, OC y detalle de factura.

El universo PI/AR se mantiene congelado al export del 17/11/2026. La antigüedad se calcula desde Fecha Solicitud OT, confirmada como fecha de negocio. Los tiers son excluyentes: >365 días, 91–365 días y hasta 90 días sin alerta. Todas las OTAs del universo cuentan en la meta.

La API lee exclusivamente el resumen numérico publicado. No devuelve clientes, observaciones, responsables, IDs de tarjetas ni enlaces privados. Las fuentes ausentes no se consideran cero ni condicionan los beneficios de otros equipos. ADMIN permanece pendiente de conciliación; no se muestra un porcentaje sin universo confirmado.

## Integración y publicación

Vercel despliega este repositorio desde GitHub. La configuración permite servir únicamente los recursos públicos de la aplicación. Los documentos, correos, CSV y herramientas operativas quedan fuera del sitio.

El envío a Pipefy sigue desactivado hasta configurar credenciales y completar el piloto real. `scripts/pipefy-batch.cjs` permite previsualizar una exportación privada de campaña; `--apply` requiere PIPEFY_TOKEN y LAVA_JOURNAL_PATH en almacenamiento privado durable. La bitácora conserva confirmaciones, detecta conflictos y evita reenvíos ciegos de operaciones inciertas. No se cambian fases ni campos operativos sin mapeo validado. No publicar exports ni resultados de previsualización.

Las hojas de trabajo, el adaptador Apps Script y las instrucciones de operación se mantienen en el entorno interno.

## ADMIN: conteo de facturación

Se cuentan OTs pendientes por facturar, sin exigir montos ni aplicar filtro de fecha. El constructor del universo acepta `pendingInvoicing: true/false`; conserva compatibilidad con un saldo numérico existente cuando no hay indicador explícito. Si se desconoce la condición, queda en conciliación. La fase o la existencia de una factura no prueban por sí solas la inclusión.

La plantilla [integrations/lava-pipefy.example.gs](integrations/lava-pipefy.example.gs) contiene placeholders para las hojas privadas. Reemplazarlos únicamente en el proyecto privado de Apps Script y configurar PIPEFY_CLIENT_ID y PIPEFY_CLIENT_SECRET en Propiedades del script. Mantener PIPEFY_ENABLED=false hasta completar el piloto.

ADMIN se conecta al resumen agregado con prefijo `admin_`. Puede mostrar revisiones identificadas por frente mientras el universo completo está en conciliación; en ese estado muestra un porcentaje provisional sobre las revisiones identificadas y no desbloquea el beneficio. `refreshLavaAdminMetrics()` publica únicamente conteos desde las hojas privadas y crea un refresco cada cinco minutos. Los candidatos de facturación se muestran aparte del universo confirmado.

El avance mide revisión registrada, no resolución operativa. Estados de pago, documentos, facturación u OC pendientes cuentan cuando tienen fecha y observación válidas. ADMIN comienza en 0% sobre su universo identificado y lo señala como parcial hasta cerrar el alcance.
