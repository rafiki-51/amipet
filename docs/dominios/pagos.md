# Pagos

## Objetivo

Amipet utiliza un modelo MVP de pagos basado en estado y confirmacion manual.
El estado de pago esta separado del estado operativo del pedido.

PostgreSQL es la autoridad final para confirmar pagos y aplicar las reglas que
relacionan pagos, entregas y cancelaciones.

## Metodos de pago

| Metodo | Identificador |
|---|---|
| SINPE movil | `sinpe-movil` |
| Efectivo contra entrega | `efectivo-contra-entrega` |
| Coordinar por WhatsApp | `coordinar-whatsapp` |

Actualmente, ningun metodo confirma el pago automaticamente. Todos los pedidos
nuevos nacen con pago pendiente.

## Estados de pago

| Estado | Significado |
|---|---|
| `pending` | El pago todavia no fue confirmado. |
| `paid` | Un usuario administrativo confirmo el pago. |
| `canceled` | El pago pendiente fue cancelado junto con el pedido. |

`orders.payment_status` no reemplaza `orders.status`:

- `orders.status` representa preparacion, entrega o cancelacion operativa.
- `orders.payment_status` representa la situacion del pago.

## Creacion del pedido

`public.create_checkout_order()` crea todos los pedidos con:

```text
status = recibido
payment_status = pending
```

El metodo elegido se almacena en `orders.payment_method`, pero no cambia
automaticamente el estado del pago.

## Transiciones de pago

### Permitidas

| Estado actual | Solicitud | Resultado |
|---|---|---|
| `pending` | `paid` | Confirma el pago. |
| `paid` | `paid` | Reintento idempotente sin cambios. |

### Bloqueadas

- `canceled -> paid`.
- `paid -> pending`.
- `paid -> canceled`.
- Confirmar pago cuando `orders.status = 'cancelado'`.
- Cualquier estado o solicitud fuera del conjunto permitido.

No existe actualmente una operacion para revertir un pago confirmado.

## Confirmacion manual desde admin

### Endpoint

```text
PATCH /api/admin/orders/[id]/payment-status
```

### Payload exacto

```json
{
  "paymentStatus": "paid"
}
```

El endpoint rechaza propiedades adicionales, valores `pending`, `canceled` y
estados desconocidos.

Requiere una sesion administrativa con rol `admin` u `operator`. Envia el UUID
del usuario autenticado como `p_changed_by`.

El endpoint llama exclusivamente a:

```text
public.transition_order_payment_status()
```

No realiza `UPDATE orders` directo.

### Respuesta exitosa

```json
{
  "orderId": "UUID",
  "status": "preparando",
  "previousPaymentStatus": "pending",
  "paymentStatus": "paid",
  "paidAt": "timestamp",
  "paymentConfirmedBy": "UUID",
  "updatedAt": "timestamp"
}
```

## Auditoria disponible

Cuando se confirma un pago, la RPC actualiza atomica y conjuntamente:

- `payment_status = 'paid'`.
- `paid_at`.
- `payment_confirmed_by`.
- `updated_at`, mediante el trigger de actualizacion de `orders`.

Un reintento `paid -> paid` retorna los valores existentes y no modifica
`paid_at`, `payment_confirmed_by` ni `updated_at`.

El admin muestra el estado, la fecha y el UUID del usuario que confirmo.

## Reglas relacionadas con pedidos

### Entrega

`public.transition_order_status()` bloquea `en-ruta -> entregado` cuando
`payment_status <> 'paid'` y lanza `PAYMENT_REQUIRED`.

La UI oculta la accion de entrega y muestra un mensaje mientras el pago no este
confirmado. La validacion definitiva permanece en PostgreSQL.

### Cancelacion

- Un pedido pagado no puede cancelarse.
- Cancelar un pedido pendiente cambia `payment_status` a `canceled`.
- Una cancelacion y una confirmacion concurrentes bloquean la misma fila de
  `orders`; solamente una puede completar primero.
- Despues del bloqueo, la segunda operacion vuelve a validar el estado y falla
  si ya no es compatible.

## Errores del endpoint de pago

| Codigo | HTTP | Significado |
|---|---:|---|
| `INVALID_JSON` | 400 | El cuerpo no contiene JSON valido. |
| `INVALID_PAYMENT_STATUS` | 400 | El payload no es exactamente `{ "paymentStatus": "paid" }`. |
| `INVALID_PAYLOAD` | 400 | La RPC recibio datos o usuario invalidos. |
| `ORDER_NOT_FOUND` | 404 | El pedido no existe. |
| `INVALID_PAYMENT_TRANSITION` | 409 | La transicion de pago no esta permitida. |
| `ORDER_CANCELED` | 409 | El pedido operativo ya esta cancelado. |
| `INTERNAL_ERROR` | 500 | Error no reconocido del servidor. |

Error relacionado del flujo operativo:

| Codigo | HTTP | Significado |
|---|---:|---|
| `PAYMENT_REQUIRED` | 409 | Se intento entregar un pedido sin pago confirmado. |

## Comportamiento por metodo de pago

### SINPE movil

El pago permanece `pending` hasta que un usuario administrativo confirme que
fue recibido. No existe carga ni validacion automatica de comprobantes.

### Efectivo contra entrega

El pago permanece `pending` durante el procesamiento y debe confirmarse antes
de marcar el pedido como `entregado`.

### Coordinar por WhatsApp

El metodo permite coordinar el pago fuera de la aplicacion. Una vez recibido,
un usuario administrativo lo confirma manualmente.

## Decisiones arquitectonicas

- Estado operativo y estado de pago son campos separados.
- Confirmar pagos es una operacion irreversible en el MVP actual.
- La confirmacion se ejecuta mediante una RPC transaccional.
- La API administrativa valida y traduce errores, pero no modifica pagos
  directamente.
- La UI limita acciones, pero PostgreSQL aplica las reglas definitivas.
- La auditoria minima vive en la orden; no existe una tabla de pagos.

## Limitaciones actuales

No existen todavia:

- Tabla `payments`.
- Historial completo de transiciones de pago.
- Comprobantes SINPE.
- Integracion bancaria.
- Confirmacion automatica.
- Reembolsos.
- Reversion de pagos.
- Conciliacion financiera.
- Registro separado del monto realmente recibido.

Estas limitaciones deben tratarse como trabajo futuro y no como comportamiento
implementado.

## Fuentes relacionadas

- `src/config/payment.ts`
- `src/config/payment-status.ts`
- `src/app/api/admin/orders/[id]/payment-status/route.ts`
- `src/app/api/admin/orders/[id]/status/route.ts`
- `database/schema.sql`
- [RPCs transaccionales](../base-de-datos/rpcs.md)
- [Checkout y pedidos](./checkout-y-pedidos.md)
