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
