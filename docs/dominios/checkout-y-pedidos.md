# Checkout y pedidos

## Objetivo

Este documento describe el flujo actual desde el checkout publico hasta el
procesamiento, pago, cancelacion y vinculacion de pedidos.

PostgreSQL es la autoridad final para precios, stock, creacion del pedido y
transiciones operativas.

## Checkout

### Endpoint

```text
POST /api/orders
```

El endpoint permite checkout invitado y checkout autenticado de clientes. El
payload publico es el mismo en ambos casos; el frontend no envia `user_id`.

### Payload

```json
{
  "customer": {
    "name": "Cliente de prueba",
    "phone": "88888888"
  },
  "delivery": {
    "zoneName": "Nombre de zona",
    "address": "Direccion completa",
    "references": "Referencia opcional"
  },
  "paymentMethod": "sinpe-movil",
  "notes": "Nota opcional",
  "honeypot": "",
  "idempotencyKey": "UUID v4",
  "items": [
    {
      "productId": "UUID del producto",
      "quantity": 1
    }
  ]
}
```

Reglas principales:

- `idempotencyKey` debe ser un UUID v4.
- El nombre debe tener al menos 3 caracteres.
- El telefono debe contener al menos 8 digitos.
- La direccion debe tener al menos 10 caracteres.
- Debe existir al menos un item.
- Cada cantidad debe ser un entero seguro entre 1 y 99.
- La cantidad total normalizada por producto no puede superar 99.
- `honeypot` debe permanecer vacio.
- El metodo de pago debe ser uno de los configurados.
- El cliente no envia ni controla `user_id`.

El cliente no controla precios, subtotales, tarifa de entrega, total, numero de
pedido, estado operativo ni estado de pago.

### Rate limiting

`POST /api/orders` aplica rate limiting server-side antes de llamar la RPC:

- 10 requests por IP cada 10 minutos.
- Cuenta requests validos e invalidos.
- Usa Upstash Redis o variables compatibles de Vercel KV.
- Hashea la IP antes de usarla en la key.
- No guarda nombre, telefono, direccion, email, user agent completo ni llave de
  idempotencia.
- Si Redis falla, usa fail-open y registra el error con `console.error`.

Al exceder el limite responde:

```json
{
  "error": "Demasiados intentos. Intentá nuevamente en unos minutos.",
  "code": "RATE_LIMITED"
}
```

Incluye headers `Retry-After`, `X-RateLimit-Limit`,
`X-RateLimit-Remaining` y `X-RateLimit-Reset`.

## Checkout invitado

Si no hay sesion de Supabase Auth, la API mantiene el checkout invitado:

```text
p_user_id = null
```

La RPC crea el pedido con:

```text
orders.user_id = null
orders.user_linked_at = null
orders.user_link_source = null
```

El pedido no aparece en Mis Pedidos hasta que sea vinculado manualmente por un
admin/operator.

## Checkout autenticado

Si hay sesion, la API valida el perfil:

- Debe existir `profiles`.
- `profiles.role` debe ser `customer`.
- `admin` y `operator` no pueden crear pedidos por checkout.
- Si hay error consultando Auth o perfil, la API responde error interno
  sanitizado y no crea pedido como invitado.

Cuando la sesion es customer:

```text
p_user_id = auth.users.id
```

La RPC crea el pedido con:

```text
orders.user_id = auth.users.id
orders.user_linked_at = now()
orders.user_link_source = 'authenticated-checkout'
```

Nombre, telefono, email y `customer_id` no se usan como ownership digital.

## Respuesta exitosa

La API responde `201`:

```json
{
  "orderId": "UUID",
  "orderNumber": "AMI-YYYYMMDD-XXXXXXXX",
  "status": "recibido",
  "subtotal": 10000,
  "deliveryFee": 0,
  "total": 10000
}
```

## Flujo de creacion

1. La API aplica rate limiting.
2. Valida y normaliza el payload.
3. Consolida items repetidos y los ordena por UUID.
4. Genera hash SHA-256 del payload normalizado.
5. Resuelve sesion opcional.
6. Si hay usuario, exige rol `customer`.
7. Llama a `public.create_checkout_order()` con `p_user_id` o `null`.
8. La RPC serializa intentos con la misma llave de idempotencia.
9. Bloquea productos y valida stock.
10. Calcula precios y totales desde PostgreSQL.
11. Crea cliente, direccion, pedido, items e historial.
12. Descuenta stock dentro de la misma transaccion.
13. Registra `stock_deducted_at`.
14. Retorna la orden creada o el resultado idempotente existente.

## Idempotencia

La llave identifica un intento logico de checkout.

- Misma llave, mismo payload y mismo owner: retorna la orden existente.
- Misma llave con payload diferente: `IDEMPOTENCY_CONFLICT`.
- Misma llave con owner diferente: `IDEMPOTENCY_CONFLICT`.
- Un reintento no crea otra orden ni vuelve a descontar stock.

El hash no incluye ownership; la RPC compara ownership por separado con
`IS NOT DISTINCT FROM`.

## Stock y concurrencia

El stock se descuenta cuando se crea el pedido.

La RPC:

- Normaliza cantidades duplicadas.
- Bloquea productos en orden determinista con `FOR UPDATE`.
- Valida actividad y stock bajo bloqueo.
- Descuenta stock antes de completar la transaccion.
- Verifica que todos los productos esperados fueron actualizados.

Si cualquier paso falla, no quedan descuentos ni pedidos parciales.

## Errores del checkout

| Codigo | HTTP | Significado |
|---|---:|---|
| `RATE_LIMITED` | 429 | Se excedio el limite de intentos. |
| `INVALID_JSON` | 400 | JSON invalido. |
| `INVALID_PAYLOAD` | 400 | Payload invalido. |
| `FORBIDDEN` | 403 | Sesion autenticada sin rol customer. |
| `IDEMPOTENCY_CONFLICT` | 409 | Llave usada con payload u owner distinto. |
| `PRODUCT_NOT_FOUND` | 404 | Producto inexistente o inactivo. |
| `DELIVERY_ZONE_NOT_FOUND` | 404 | Zona inexistente o inactiva. |
| `INSUFFICIENT_STOCK` | 409 | Stock insuficiente. |
| `INTERNAL_ERROR` | 500 | Error no reconocido. |

## Estados operativos

| Estado | Significado |
|---|---|
| `recibido` | Pedido creado y recibido por Amipet. |
| `preparando` | Pedido en preparacion. |
| `en-ruta` | Pedido enviado para entrega. |
| `entregado` | Pedido entregado; estado terminal. |
| `cancelado` | Pedido cancelado; estado terminal. |

### Transiciones permitidas

| Estado actual | Estados permitidos |
|---|---|
| `recibido` | `preparando`, `cancelado` |
| `preparando` | `en-ruta`, `cancelado` |
| `en-ruta` | `entregado`, `cancelado` |
| `entregado` | Ninguno |
| `cancelado` | Ninguno |

`en-ruta -> entregado` requiere `payment_status = 'paid'`.

## Estados de pago

| Estado | Significado |
|---|---|
| `pending` | Pago pendiente. |
| `paid` | Pago confirmado manualmente. |
| `canceled` | Pago pendiente cancelado junto con el pedido. |

Todos los pedidos nuevos nacen con `payment_status = 'pending'`.

## Administracion de pedidos

### Consultar pedidos

```text
GET /api/admin/orders
```

Requiere rol `admin` u `operator`.

La respuesta usa paginacion server-side:

- `page`, default `1`.
- `limit`, default `25`.
- maximo `50`.
- filtros por estado, estado de pago, metodo de pago y zona.
- orden estable por `created_at DESC, id DESC`.

### Cambiar estado operativo

```text
PATCH /api/admin/orders/[id]/status
```

El endpoint exige sesion admin/operator y llama exclusivamente a
`public.transition_order_status()`.

### Confirmar pago

```text
PATCH /api/admin/orders/[id]/payment-status
```

Payload exacto:

```json
{
  "paymentStatus": "paid"
}
```

El endpoint exige sesion admin/operator y llama exclusivamente a
`public.transition_order_payment_status()`.

### Vincular pedido invitado a customer

```text
POST /api/admin/orders/[id]/link-customer
```

Payload:

```json
{
  "userId": "uuid-del-auth-user-customer"
}
```

El endpoint:

- Exige rol `admin` u `operator`.
- Valida UUIDs.
- Acepta solo `userId` en el payload.
- Llama a `public.link_order_to_customer_manual()`.
- Solo vincula pedidos con `user_id IS NULL`.
- No permite transferencia ni desvinculacion.

La vinculacion manual usa:

```text
orders.user_link_source = 'manual-support'
```

## Cancelacion y restauracion de stock

Cancelar un pedido:

- Requiere motivo.
- Falla si el pedido esta pagado.
- Cambia `status` a `cancelado`.
- Cambia `payment_status` de `pending` a `canceled`.
- Registra fecha y motivo.
- Inserta historial operativo.

El stock se restaura solo cuando:

- `stock_deducted_at` tiene valor.
- `stock_restored_at` sigue nulo.
- Los items son restaurables.

## Decisiones arquitectonicas

- La API publica valida formato y genera el hash de idempotencia.
- El frontend nunca envia `user_id`.
- PostgreSQL calcula precios, totales y stock real.
- Las operaciones criticas se ejecutan mediante RPCs transaccionales.
- Las APIs administrativas validan rol antes de usar `service_role`.
- La base de datos aplica reglas de transicion aunque la UI este
  desactualizada.
- El estado de pago permanece separado del estado operativo.

## Limitaciones actuales

- No existen reservas temporales de stock.
- No existe administracion de productos dentro de este flujo.
- No existe reclamo publico de pedidos invitados.
- No existe desvinculacion ni transferencia de owner.
- La respuesta publica del checkout no incluye `payment_status`.

## Fuentes relacionadas

- `src/app/api/orders/route.ts`
- `src/lib/rate-limit.ts`
- `src/app/api/admin/orders/route.ts`
- `src/app/api/admin/orders/[id]/status/route.ts`
- `src/app/api/admin/orders/[id]/payment-status/route.ts`
- `src/app/api/admin/orders/[id]/link-customer/route.ts`
- `database/schema.sql`
- [Mis Pedidos](./mis-pedidos.md)
- [RPCs transaccionales](../base-de-datos/rpcs.md)
- [Pagos](./pagos.md)
