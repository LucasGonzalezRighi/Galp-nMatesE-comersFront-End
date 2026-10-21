# 0004. Mercado Pago: redirección y tarjeta en la página con Secure Fields

- **Estado**: Aceptada; la API concreta de Mercado Pago se fija en la fase 2
- **Fecha**: 2026-10-20

## Contexto

La tienda cobra con Mercado Pago. Lucas pidió dos formas de pagar: llevar al cliente a Mercado Pago, y que pague con tarjeta sin salir del sitio. El front nunca debe tocar los datos de la tarjeta (PCI): el pago real, la confirmación y los reembolsos son del back.

Qué API de Mercado Pago usa el back (Orders, que Mercado Pago recomienda para integraciones nuevas, o Payments y Preferences) depende de cómo se diseñe el back, que es la fase 2.

## Decisión

**Dos modos de pago**, elegidos en el paso 3 del checkout:

1. **Mercado Pago (Checkout Pro)**: el back crea una _preferencia_ (`POST /orders/{number}/payments/mercadopago/preference`) y el front redirige a `initPoint`. El cliente vuelve a `/checkout/resultado?pedido=GLP-12345`.
2. **Tarjeta en la página (Secure Fields de MercadoPago.js v2)**: los campos de número, vencimiento y CVC son iframes de Mercado Pago. El front genera un token de un solo uso (`createCardToken`) y lo envía a `POST /orders/{number}/payments/mercadopago/card`. Si el banco pide verificación, la respuesta trae `challenge.url` y el front abre **3-D Secure** en un iframe dentro de un diálogo accesible.

**Reglas comunes**

- **El pedido solo pasa a pagado cuando el back lo confirma** con la notificación (webhook) de Mercado Pago. Los parámetros de la redirección no prueban nada.
- **Idempotencia**: `POST /orders` y los dos endpoints de pago llevan `Idempotency-Key` (un UUID por intento); el back usa `X-Idempotency-Key` en cada pago hacia Mercado Pago.
- **Un intento de pago activo por pedido**: al iniciar uno nuevo, el back cancela la preferencia o el pago pendiente anterior. Si igual entra un segundo pago aprobado, se marca para devolver y aparece como alerta en el dashboard.
- **Estados normalizados** en el contrato (`paymentStatus`): `none`, `pending`, `action_required`, `approved`, `rejected`, `cancelled`, `refunded`, `partially_refunded`, `in_dispute` y `charged_back`. El back traduce los de Mercado Pago (por ejemplo `in_process` a `pending`, `pending_challenge` a `action_required`, `in_mediation` a `in_dispute`).
- **Token del pedido** en la cabecera `X-Order-Token`, nunca en la URL; la URL de regreso lleva solo el número de pedido.
- **Reserva de stock de 30 minutos** (D4) y exclusión de pagos en efectivo, `ticket` y `atm` (D3).
- **Datos que el back manda a Mercado Pago**: `external_reference` con el número de pedido, `statement_descriptor` "GALPON MATES", `notification_url`, `back_urls` a `/checkout/resultado?pedido=…`, `auto_return: 'approved'` y el vencimiento de la preferencia igual al de la reserva.
- **Cuotas**: el front muestra lo que devuelve Mercado Pago (`payer_costs`, con CFT y TEA). "Sin interés" solo si el CFT es 0.
- **Modo de prueba** (ADR 0003): la redirección apunta a una página simulada (`/checkout/mp-simulado`) y la tarjeta usa campos simulados que deciden el resultado por el nombre del titular. Ningún dato de tarjeta sale del navegador.

**Se fija en la fase 2**: qué API de Mercado Pago se usa (Orders o Payments y Preferences) y la tabla completa de mapeo de estados. Ese cambio no toca el contrato del front, porque los estados ya están normalizados.

## Consecuencias

- Los datos de la tarjeta nunca pasan por nuestros servidores ni por nuestro JavaScript: cumplimos con menos alcance de PCI.
- Hay mucho estado que mostrar bien (pendiente, desafío, rechazo con motivo, vencido); el contrato lo normaliza y el checkout tiene una pantalla por caso.
- La prueba real de Secure Fields, cuotas, 3-D Secure y Checkout Pro con credenciales de prueba de Mercado Pago es **manual** y se hace antes de salir a producción.
- Sumar otro proveedor (Stripe) más adelante es un adaptador nuevo en el back, no un cambio de contrato.

## Alternativas consideradas

- **Solo redirección** (Checkout Pro): lo más simple y seguro, pero el cliente sale del sitio y se pierde la experiencia del diseño.
- **Solo tarjeta en la página**: obligaría a ofrecer el resto de los medios (dinero en cuenta, otras tarjetas guardadas) por otro lado.
- **Card Payment Brick** (formulario armado por Mercado Pago): menos código, pero no respeta el diseño de la tarjeta animada ni los mensajes de error propios.
- **Confiar en la vuelta de la redirección para marcar el pedido pagado**: descartado, se puede falsificar.
