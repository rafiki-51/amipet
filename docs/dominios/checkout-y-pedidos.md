# Checkout y pedidos

## Objetivo

Este documento describe el flujo actual desde el checkout publico hasta el
procesamiento y cancelacion de pedidos en el admin.

PostgreSQL es la autoridad final para precios, stock, creacion del pedido y
transiciones operativas.

## Checkout publico

### Endpoint

```text
POST /api/orders
```

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

Reglas principales de la API:

- `idempotencyKey` debe ser un UUID v4.
- El nombre debe tener al menos 3 caracteres.
- El telefono debe contener al menos 8 digitos.
- La direccion debe tener al menos 10 caracteres.
- Debe existir al menos un item.
- Cada cantidad debe ser un entero seguro entre 1 y 99.
- La cantidad total normalizada por producto no puede superar 99.
- `honeypot` debe permanecer vacio.
- El metodo de pago debe ser uno de los configurados.

El cliente no envia ni controla:

- Precios.
- Subtotales.
- Tarifa de entrega.
- Total.
- Numero de pedido.
- Estado operativo.
- Estado de pago.

### Respuesta exitosa

La API responde `201` con:

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

1. La API valida y normaliza el payload.
2. Consolida items repetidos por producto y los ordena por UUID.
3. Genera un hash SHA-256 del payload normalizado.
4. Llama a `public.create_checkout_order()`.
5. La RPC serializa intentos con la misma llave de idempotencia.
6. Bloquea productos y valida stock bajo bloqueo.
7. Calcula precios y totales desde PostgreSQL.
8. Crea cliente, direccion, pedido, items e historial.
9. Descuenta stock dentro de la misma transaccion.
10. Registra `stock_deducted_at`.
11. Retorna la orden creada o el resultado idempotente existente.

## Ownership digital

`orders.user_id` representa la cuenta autenticada autorizada para consultar un
pedido desde Mis Pedidos.

- Es nullable para mantener checkout invitado.
- El checkout publico actual no asigna `user_id`.
- Los pedidos invitados e historicos permanecen con `user_id = null`.
- Telefono, email y `customer_id` no se utilizan como ownership.
- Un pedido sin owner digital no aparece en Mis Pedidos.

La consulta privada de pedidos se documenta en
[Mis Pedidos](./mis-pedidos.md).

## Idempotencia

La llave de idempotencia identifica un intento logico de checkout.

- Misma llave y mismo payload: retorna la orden existente.
- Misma llave y payload diferente: responde `IDEMPOTENCY_CONFLICT`.
- Un reintento idempotente no crea otra orden ni vuelve a descontar stock.
- El hash incluye cliente, entrega, metodo de pago, notas e items normalizados.

El cliente debe reutilizar la misma llave solamente al reintentar el mismo
checkout. Un checkout nuevo debe utilizar una llave nueva.

## Stock y concurrencia

El stock se descuenta cuando se crea el pedido, no cuando pasa a preparacion.

La RPC:

- Normaliza cantidades duplicadas.
- Bloquea los productos solicitados en orden determinista con `FOR UPDATE`.
- Valida actividad y stock mientras conserva los bloqueos.
- Descuenta stock antes de completar la transaccion.
- Verifica que todos los productos esperados fueron actualizados.

Si dos clientes intentan comprar simultaneamente la ultima unidad, solamente
una transaccion puede completar el descuento. La otra recibe
`INSUFFICIENT_STOCK`.

Si cualquier paso falla, no quedan descuentos ni pedidos parciales.

## Errores del checkout

### Errores de API

| Codigo | HTTP | Significado |
|---|---:|---|
| `INVALID_JSON` | 400 | El cuerpo no contiene JSON valido. |
| `INVALID_PAYLOAD` | 400 | El payload no cumple las validaciones. |
| `IDEMPOTENCY_CONFLICT` | 409 | La llave ya fue usada con otro payload. |
| `PRODUCT_NOT_FOUND` | 404 | Un producto no existe o no esta activo. |
| `DELIVERY_ZONE_NOT_FOUND` | 404 | La zona no existe o no esta activa. |
| `INSUFFICIENT_STOCK` | 409 | No existe stock suficiente. |
| `INTERNAL_ERROR` | 500 | Error no reconocido del servidor. |

Los errores de negocio principales provienen de
`public.create_checkout_order()`.

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

## Administracion de pedidos

### Consultar pedidos

```text
GET /api/admin/orders
```

Retorna pedidos con cliente, direccion, zona, items, totales, estado operativo
y datos basicos de pago.

### Cambiar estado operativo

```text
PATCH /api/admin/orders/[id]/status
```

Payload normal:

```json
{
  "status": "preparando"
}
```

Payload de cancelacion:

```json
{
  "status": "cancelado",
  "cancellationReason": "Motivo obligatorio"
}
```

Las APIs administrativas requieren sesion y rol `admin` u `operator`. El
endpoint no actualiza `orders` directamente; llama exclusivamente a
`public.transition_order_status()`.

La UI limita las acciones visibles, pero PostgreSQL valida las reglas
definitivas.

## Cancelacion y restauracion de stock

Cancelar un pedido:

- Requiere motivo.
- Falla si el pedido esta pagado.
- Cambia `status` a `cancelado`.
- Cambia `payment_status` de `pending` a `canceled`.
- Registra fecha y motivo de cancelacion.
- Inserta historial operativo.

El stock se restaura solo cuando:

- `stock_deducted_at` tiene valor.
- `stock_restored_at` sigue nulo.
- Todos los items requeridos pueden asociarse a productos existentes.

La restauracion ocurre dentro de la misma transaccion y se registra mediante
`stock_restored_at`. El bloqueo de la orden evita restauraciones dobles ante
cancelaciones concurrentes.

Las ordenes historicas sin `stock_deducted_at` no restauran stock.

## Errores de transicion administrativa

| Codigo | HTTP | Significado |
|---|---:|---|
| `INVALID_JSON` | 400 | JSON invalido. |
| `INVALID_STATUS` | 400 | Estado solicitado desconocido. |
| `INVALID_PAYLOAD` | 400 | Payload o usuario invalidos. |
| `ORDER_NOT_FOUND` | 404 | Pedido inexistente. |
| `INVALID_ORDER_TRANSITION` | 409 | Transicion operativa no permitida. |
| `PAYMENT_REQUIRED` | 409 | El pedido no puede entregarse sin pago. |
| `CANCELLATION_REASON_REQUIRED` | 400 | Falta el motivo de cancelacion. |
| `PAID_ORDER_CANNOT_BE_CANCELED` | 409 | Un pedido pagado no puede cancelarse. |
| `ORDER_ITEMS_NOT_RESTORABLE` | 409 | Los items no permiten restaurar stock. |
| `STOCK_RESTORE_FAILED` | 500 | No se restauro todo el stock esperado. |
| `INTERNAL_ERROR` | 500 | Error no reconocido del servidor. |

## Decisiones arquitectonicas

- La API publica valida formato y genera el hash de idempotencia.
- PostgreSQL calcula precios, totales y stock real.
- Las operaciones criticas se ejecutan mediante RPCs transaccionales.
- No existen actualizaciones directas de estado desde el endpoint admin.
- La base de datos aplica las reglas aunque la UI este desactualizada.
- El estado de pago permanece separado del estado operativo.

## Limitaciones actuales

- No existen reservas temporales de stock.
- No existe administracion de productos dentro de este flujo.
- No se documentan aqui RLS, despliegue, monitoreo ni backups.
- La respuesta publica del checkout no incluye `payment_status`.
- El checkout publico no vincula automaticamente pedidos a cuentas
  autenticadas.

## Fuentes relacionadas

- `src/app/api/orders/route.ts`
- `src/app/api/admin/orders/route.ts`
- `src/app/api/admin/orders/[id]/status/route.ts`
- `database/schema.sql`
- [Mis Pedidos](./mis-pedidos.md)
- [RPCs transaccionales](../base-de-datos/rpcs.md)
- [Pagos](./pagos.md)
