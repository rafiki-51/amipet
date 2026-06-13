# RPCs transaccionales

## Objetivo

Amipet concentra las operaciones criticas de pedidos, stock y pagos en
funciones PostgreSQL. Esto permite validar reglas, bloquear filas y ejecutar
todos los cambios relacionados dentro de una sola transaccion.

Las APIs de Next.js validan y traducen solicitudes HTTP, pero PostgreSQL es la
autoridad final para estas operaciones.

## Seguridad y permisos

Las tres RPCs documentadas aqui:

- Utilizan `SECURITY DEFINER`.
- Fijan `search_path = public`.
- Revocan ejecucion a `public`, `anon` y `authenticated`.
- Conceden ejecucion solamente a `service_role`.

Por esta razon, deben llamarse exclusivamente desde codigo server-side despues
de aplicar las validaciones y autorizaciones correspondientes.

La referencia consolidada actual es `database/schema.sql`.

## `public.create_checkout_order()`

### Responsabilidad

Crea un pedido completo desde checkout, mantiene idempotencia y descuenta stock
de forma atomica.

### Firma

```text
public.create_checkout_order(
  p_customer_name text,
  p_customer_phone text,
  p_zone_name text,
  p_address text,
  p_references text,
  p_payment_method text,
  p_notes text,
  p_idempotency_key text,
  p_idempotency_payload_hash text,
  p_items jsonb
)
```

### Retorno

| Columna | Tipo |
|---|---|
| `order_id` | `uuid` |
| `order_number` | `text` |
| `status` | `text` |
| `subtotal` | `integer` |
| `delivery_fee` | `integer` |
| `total` | `integer` |

### Flujo transaccional

1. Valida campos obligatorios, metodo de pago e items.
2. Obtiene un advisory lock transaccional por `p_idempotency_key`.
3. Busca un pedido existente con la misma llave.
4. Si existe con el mismo hash, retorna ese pedido sin volver a descontar
   stock.
5. Si existe con un hash diferente, lanza `IDEMPOTENCY_CONFLICT`.
6. Normaliza cantidades repetidas por producto y aplica un maximo total de 99
   unidades por producto.
7. Valida la zona de entrega activa.
8. Bloquea productos en orden determinista mediante `FOR UPDATE`.
9. Valida existencia, actividad y stock suficiente bajo bloqueo.
10. Calcula precios y totales desde la base de datos.
11. Crea cliente cuando corresponde, direccion, pedido e items.
12. Crea el pedido con `status = 'recibido'` y
    `payment_status = 'pending'`.
13. Descuenta el stock y verifica que todos los productos fueron actualizados.
14. Registra `stock_deducted_at`.
15. Inserta el historial inicial del pedido.

Si cualquier paso falla, PostgreSQL revierte la transaccion completa. No deben
quedar pedidos, items ni descuentos parciales.

### Errores estables

| Error | Significado |
|---|---|
| `INVALID_PAYLOAD` | El payload o alguna cantidad no cumple el contrato. |
| `IDEMPOTENCY_CONFLICT` | La llave ya fue utilizada con un payload diferente. |
| `DELIVERY_ZONE_NOT_FOUND` | La zona no existe o no esta activa. |
| `PRODUCT_NOT_FOUND` | Un producto no existe o no esta activo. |
| `INSUFFICIENT_STOCK` | Al menos un producto no tiene stock suficiente. |

### Limitaciones

- No crea reservas temporales.
- No procesa ni confirma pagos.
- No restaura stock; la restauracion pertenece al flujo de cancelacion.
- No devuelve `payment_status` en su respuesta publica actual.

## `public.transition_order_status()`

### Responsabilidad

Aplica transiciones operativas validas, registra historial y ejecuta
cancelaciones con restauracion segura de stock.

### Firma

```text
public.transition_order_status(
  p_order_id uuid,
  p_next_status text,
  p_changed_by uuid,
  p_cancellation_reason text default null
)
```

`p_changed_by` debe corresponder a un usuario existente en `auth.users`.

### Retorno

| Columna | Tipo |
|---|---|
| `order_id` | `uuid` |
| `previous_status` | `text` |
| `status` | `text` |
| `payment_status` | `text` |
| `updated_at` | `timestamptz` |
| `canceled_at` | `timestamptz` |
| `stock_restored_at` | `timestamptz` |

### Transiciones permitidas

| Estado actual | Estados permitidos |
|---|---|
| `recibido` | `preparando`, `cancelado` |
| `preparando` | `en-ruta`, `cancelado` |
| `en-ruta` | `entregado`, `cancelado` |
| `entregado` | Ninguno |
| `cancelado` | Ninguno |

Solicitar el mismo estado actual es idempotente: retorna la orden sin insertar
otro historial ni repetir efectos secundarios.

### Flujo general

1. Valida payload, estado solicitado y usuario.
2. Bloquea la orden mediante `FOR UPDATE`.
3. Valida la transicion.
4. Bloquea `en-ruta -> entregado` si `payment_status <> 'paid'`.
5. Actualiza el pedido.
6. Inserta `order_status_history` dentro de la misma transaccion.

### Cancelacion y stock

Una cancelacion:

- Exige motivo.
- Bloquea pedidos pagados.
- Cambia `payment_status` de `pending` a `canceled`.
- Registra `canceled_at` y `cancellation_reason`.
- Restaura stock solo si `stock_deducted_at` tiene valor y
  `stock_restored_at` sigue nulo.
- Bloquea productos en orden determinista antes de restaurar.
- No filtra productos por `is_active`.
- Falla si una orden elegible no tiene items restaurables.
- Registra `stock_restored_at` solamente despues de completar la restauracion.

La fila de la orden permanece bloqueada durante la operacion. Dos
cancelaciones concurrentes no pueden restaurar stock dos veces.

Las ordenes historicas con `stock_deducted_at` nulo pueden cancelarse, pero no
restauran inventario porque no existe evidencia de un descuento previo.

### Errores estables

| Error | Significado |
|---|---|
| `INVALID_PAYLOAD` | Payload, estado o usuario invalidos. |
| `ORDER_NOT_FOUND` | El pedido no existe. |
| `INVALID_ORDER_TRANSITION` | La transicion operativa no esta permitida. |
| `PAYMENT_REQUIRED` | Se intento entregar un pedido sin pago confirmado. |
| `CANCELLATION_REASON_REQUIRED` | Falta el motivo de cancelacion. |
| `PAID_ORDER_CANNOT_BE_CANCELED` | Un pedido pagado no puede cancelarse. |
| `ORDER_ITEMS_NOT_RESTORABLE` | Los items no permiten restaurar stock con seguridad. |
| `STOCK_RESTORE_FAILED` | No se pudo restaurar todo el stock esperado. |

## `public.transition_order_payment_status()`

### Responsabilidad

Confirma manualmente el pago de un pedido y registra auditoria basica.

### Firma

```text
public.transition_order_payment_status(
  p_order_id uuid,
  p_next_payment_status text,
  p_changed_by uuid
)
```

`p_changed_by` debe corresponder a un usuario existente en `auth.users`.

### Retorno

| Columna | Tipo |
|---|---|
| `order_id` | `uuid` |
| `status` | `text` |
| `previous_payment_status` | `text` |
| `payment_status` | `text` |
| `paid_at` | `timestamptz` |
| `payment_confirmed_by` | `uuid` |
| `updated_at` | `timestamptz` |

### Flujo

1. Valida payload, estado solicitado y usuario.
2. Bloquea la orden mediante `FOR UPDATE`.
3. Bloquea la confirmacion si el pedido operativo esta `cancelado`.
4. Trata `paid -> paid` como reintento idempotente.
5. Permite solamente `pending -> paid`.
6. Actualiza atomica y conjuntamente:
   - `payment_status = 'paid'`
   - `paid_at = now()`
   - `payment_confirmed_by = p_changed_by`

El reintento idempotente no modifica `paid_at`, `payment_confirmed_by` ni
`updated_at`.

### Errores estables

| Error | Significado |
|---|---|
| `INVALID_PAYLOAD` | Payload, estado o usuario invalidos. |
| `ORDER_NOT_FOUND` | El pedido no existe. |
| `INVALID_PAYMENT_TRANSITION` | La transicion de pago no esta permitida. |
| `ORDER_CANCELED` | No se puede confirmar el pago de un pedido cancelado. |

### Limitaciones

- No permite revertir un pago.
- No registra un historial completo de estados de pago.
- No crea comprobantes, reembolsos ni conciliaciones.
- No registra el monto realmente recibido.

## Concurrencia entre RPCs

`transition_order_status()` y `transition_order_payment_status()` bloquean la
misma fila de `orders`. Si una cancelacion y una confirmacion de pago ocurren al
mismo tiempo, una operacion espera a la otra y luego valida el estado
actualizado. El resultado no puede quedar simultaneamente pagado y cancelado.

## Fuentes relacionadas

- `database/schema.sql`
- `database/migrations/make_checkout_stock_atomic.sql`
- `database/migrations/add_safe_order_status_transitions.sql`
- `database/migrations/add_manual_payment_confirmation.sql`
- [Checkout y pedidos](../dominios/checkout-y-pedidos.md)
- [Pagos](../dominios/pagos.md)
