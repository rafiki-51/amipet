# RPCs transaccionales

## Objetivo

Amipet concentra las operaciones criticas de pedidos, stock, pagos y
vinculacion manual de ownership en funciones PostgreSQL. Esto permite validar
reglas, bloquear filas y ejecutar cambios relacionados dentro de una misma
transaccion.

Las APIs de Next.js validan solicitudes HTTP, sesion y rol. PostgreSQL es la
autoridad final para reglas transaccionales.

## Seguridad y permisos

Las RPCs criticas actuales:

- Utilizan `SECURITY DEFINER`.
- Fijan `search_path = public`.
- Revocan ejecucion a `public`, `anon` y `authenticated`.
- Conceden ejecucion solamente a `service_role`.

Por esta razon, solo deben llamarse desde codigo server-side despues de aplicar
las validaciones correspondientes.

Referencia consolidada: `database/schema.sql`.

## Flujo de autorizacion

- Checkout: `POST /api/orders` valida payload, rate limit y sesion opcional. Si
  hay sesion `customer`, pasa `p_user_id`; si no hay sesion, pasa `null`.
- Admin status: `PATCH /api/admin/orders/[id]/status` exige rol `admin` u
  `operator` antes de llamar `transition_order_status()`.
- Admin pago: `PATCH /api/admin/orders/[id]/payment-status` exige rol `admin`
  u `operator` antes de llamar `transition_order_payment_status()`.
- Vinculacion manual: `POST /api/admin/orders/[id]/link-customer` exige rol
  `admin` u `operator` antes de llamar `link_order_to_customer_manual()`.

Las RPCs administrativas validan que `p_changed_by` exista en `auth.users`.
La validacion de rol admin/operator ocurre actualmente en las APIs.

## `public.create_checkout_order()`

### Responsabilidad

Crea un pedido completo desde checkout, mantiene idempotencia, descuenta stock
de forma atomica y, cuando corresponde, vincula el pedido a una cuenta customer
autenticada.

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
  p_items jsonb,
  p_user_id uuid default null
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

### Ownership autenticado

Si `p_user_id` viene con valor, la RPC valida que:

- Exista en `auth.users`.
- Exista profile en `public.profiles`.
- `profiles.role = 'customer'`.

Si la validacion falla, lanza `INVALID_ORDER_OWNER`.

Cuando `p_user_id` es valido, el pedido nace con:

```text
user_id = p_user_id
user_linked_at = now()
user_link_source = 'authenticated-checkout'
```

Cuando `p_user_id` es `null`, el pedido queda como invitado:

```text
user_id = null
user_linked_at = null
user_link_source = null
```

### Idempotencia y ownership

La RPC compara hash de payload y ownership:

```text
existing_order.user_id IS NOT DISTINCT FROM p_user_id
```

Esto evita que un reintento convierta un pedido invitado en autenticado,
autenticado en invitado o transfiera ownership entre usuarios.

### Flujo transaccional

1. Valida campos obligatorios, metodo de pago, items y owner opcional.
2. Obtiene advisory lock por `p_idempotency_key`.
3. Busca pedido existente con la misma llave.
4. Si existe con mismo hash y mismo owner, retorna ese pedido.
5. Si existe con hash u owner distinto, lanza `IDEMPOTENCY_CONFLICT`.
6. Normaliza cantidades repetidas por producto.
7. Valida zona de entrega activa.
8. Bloquea productos en orden determinista con `FOR UPDATE`.
9. Valida existencia, actividad y stock suficiente.
10. Calcula precios y totales desde PostgreSQL.
11. Crea cliente, direccion, pedido e items.
12. Crea el pedido con `status = 'recibido'` y
    `payment_status = 'pending'`.
13. Descuenta stock y verifica que todos los productos fueron actualizados.
14. Registra `stock_deducted_at`.
15. Inserta historial inicial del pedido.

### Errores estables

| Error | Significado |
|---|---|
| `INVALID_PAYLOAD` | Payload invalido. |
| `INVALID_ORDER_OWNER` | `p_user_id` no existe o no es customer. |
| `IDEMPOTENCY_CONFLICT` | Llave usada con payload u owner distinto. |
| `DELIVERY_ZONE_NOT_FOUND` | Zona inexistente o inactiva. |
| `PRODUCT_NOT_FOUND` | Producto inexistente o inactivo. |
| `INSUFFICIENT_STOCK` | Stock insuficiente. |

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

`p_changed_by` debe existir en `auth.users`.

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

Solicitar el mismo estado actual es idempotente.

### Cancelacion y stock

Una cancelacion:

- Exige motivo.
- Bloquea pedidos pagados.
- Cambia `payment_status` de `pending` a `canceled`.
- Registra `canceled_at` y `cancellation_reason`.
- Restaura stock solo si `stock_deducted_at` tiene valor y
  `stock_restored_at` sigue nulo.
- Bloquea productos antes de restaurar.
- Registra `stock_restored_at` despues de completar la restauracion.

### Errores estables

| Error | Significado |
|---|---|
| `INVALID_PAYLOAD` | Payload, estado o usuario invalidos. |
| `ORDER_NOT_FOUND` | Pedido inexistente. |
| `INVALID_ORDER_TRANSITION` | Transicion no permitida. |
| `PAYMENT_REQUIRED` | Entrega sin pago confirmado. |
| `CANCELLATION_REASON_REQUIRED` | Falta motivo. |
| `PAID_ORDER_CANNOT_BE_CANCELED` | Pedido pagado no cancelable. |
| `ORDER_ITEMS_NOT_RESTORABLE` | Items no restaurables. |
| `STOCK_RESTORE_FAILED` | Restauracion incompleta. |

## `public.transition_order_payment_status()`

### Responsabilidad

Confirma manualmente el pago de un pedido.

### Firma

```text
public.transition_order_payment_status(
  p_order_id uuid,
  p_next_payment_status text,
  p_changed_by uuid
)
```

`p_changed_by` debe existir en `auth.users`.

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
2. Bloquea la orden con `FOR UPDATE`.
3. Bloquea confirmacion si el pedido esta `cancelado`.
4. Trata `paid -> paid` como reintento idempotente.
5. Permite solamente `pending -> paid`.
6. Actualiza `payment_status`, `paid_at` y `payment_confirmed_by`.

### Errores estables

| Error | Significado |
|---|---|
| `INVALID_PAYLOAD` | Payload, estado o usuario invalidos. |
| `ORDER_NOT_FOUND` | Pedido inexistente. |
| `INVALID_PAYMENT_TRANSITION` | Transicion no permitida. |
| `ORDER_CANCELED` | Pedido cancelado. |

## `public.link_order_to_customer_manual()`

### Responsabilidad

Vincula manualmente un pedido invitado o historico sin owner digital a una
cuenta customer existente.

### Firma

```text
public.link_order_to_customer_manual(
  p_order_id uuid,
  p_target_user_id uuid,
  p_changed_by uuid
)
```

### Retorno

| Columna | Tipo |
|---|---|
| `order_id` | `uuid` |
| `order_number` | `text` |
| `user_id` | `uuid` |
| `user_linked_at` | `timestamptz` |
| `user_link_source` | `text` |

### Reglas

- `p_order_id`, `p_target_user_id` y `p_changed_by` son obligatorios.
- `p_changed_by` debe existir en `auth.users`.
- El target debe existir en `auth.users`.
- El target debe tener `profiles.role = 'customer'`.
- El pedido debe existir.
- El pedido debe tener `user_id IS NULL`.
- No permite transferencia de owner.
- No permite desvinculacion.
- Asigna `user_linked_at = now()` en PostgreSQL.
- Asigna `user_link_source = 'manual-support'`.

### Errores estables

| Error | Significado |
|---|---|
| `INVALID_PAYLOAD` | Payload o actor invalido. |
| `INVALID_TARGET_USER` | Usuario destino inexistente o no customer. |
| `ORDER_NOT_FOUND` | Pedido inexistente. |
| `ORDER_ALREADY_LINKED` | Pedido ya tenia owner digital. |

## Concurrencia entre RPCs

Las RPCs de estado y pago bloquean la misma fila de `orders`, por lo que una
cancelacion y una confirmacion concurrentes se serializan y vuelven a validar
el estado actualizado.

La vinculacion manual bloquea la orden y actualiza con filtro
`id = p_order_id AND user_id IS NULL`, evitando transferencias concurrentes.

## Fuentes relacionadas

- `database/schema.sql`
- `database/migrations/add_authenticated_checkout_ownership.sql`
- `database/migrations/link_order_to_customer_manual.sql`
- `src/app/api/orders/route.ts`
- `src/app/api/admin/orders/[id]/status/route.ts`
- `src/app/api/admin/orders/[id]/payment-status/route.ts`
- `src/app/api/admin/orders/[id]/link-customer/route.ts`
- [Checkout y pedidos](../dominios/checkout-y-pedidos.md)
- [Mis Pedidos](../dominios/mis-pedidos.md)
- [Pagos](../dominios/pagos.md)
