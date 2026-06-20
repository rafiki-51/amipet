# Mis Pedidos

## Objetivo

Este documento describe la consulta privada de pedidos vinculados
explicitamente a una cuenta customer.

El modulo de cliente es de solo lectura. No permite cancelar pedidos,
confirmar pagos, cambiar estados ni reclamar pedidos invitados desde la UI
publica.

## Ownership digital

`orders.user_id` es la unica fuente de ownership digital:

```text
orders.user_id = auth.users.id
```

Reglas:

- Un pedido con `user_id` pertenece digitalmente a esa cuenta.
- Un pedido con `user_id = null` es invitado o historico sin owner digital.
- Nombre, telefono, email y `customer_id` no conceden acceso.
- Un pedido sin owner digital no aparece en Mis Pedidos.

`orders.user_linked_at` y `orders.user_link_source` registran metadata de la
vinculacion. Estos campos no se exponen al cliente.

La FK de `orders.user_id` utiliza `ON DELETE SET NULL`.

## Formas actuales de vinculacion

### Checkout autenticado

Si un cliente autenticado con rol `customer` hace checkout, la API pasa
`p_user_id = auth.users.id` a `public.create_checkout_order()`.

La orden nace con:

```text
user_id = auth.users.id
user_linked_at = now()
user_link_source = 'authenticated-checkout'
```

### Checkout invitado

Si no hay sesion, el pedido nace sin owner:

```text
user_id = null
user_linked_at = null
user_link_source = null
```

### Vinculacion manual por admin/soporte

Existe una API administrativa para vincular manualmente un pedido invitado o
historico a una cuenta customer existente:

```text
POST /api/admin/orders/[id]/link-customer
```

Esta accion:

- Requiere rol `admin` u `operator`.
- Valida que el pedido exista.
- Exige que el pedido tenga `user_id IS NULL`.
- Valida que el usuario destino exista y tenga rol `customer`.
- No permite transferir owner.
- No permite desvincular.
- Setea `user_link_source = 'manual-support'`.

No existe reclamo publico por token o email en el estado actual.

## API privada

Las APIs privadas requieren:

1. Sesion valida de Supabase Auth.
2. Perfil con rol `customer`.
3. Filtro de ownership por `orders.user_id = auth.users.id`.

El servidor valida sesion y rol con cliente server-side. Solamente despues usa
`service_role` para consultar pedidos y relaciones protegidas.

### Listar pedidos propios

```text
GET /api/account/orders
```

Retorna como maximo 20 pedidos propios recientes, ordenados por:

```text
created_at DESC, id DESC
```

Cada elemento contiene:

- ID y numero del pedido.
- Estado operativo.
- Estado de pago.
- Fecha de creacion.
- Total.
- Cantidad total de unidades.
- Vista previa de hasta tres productos.

### Consultar detalle propio

```text
GET /api/account/orders/[id]
```

La consulta exige simultaneamente:

```text
orders.id = requestedOrderId
orders.user_id = authenticatedUserId
```

Retorna:

- Numero, estados y fechas del pedido.
- Metodo de pago y fecha de pago cuando existe.
- Notas ingresadas por el cliente.
- Items historicos con cantidades y precios.
- Subtotal, tarifa de entrega y total.
- Zona, direccion y referencias.
- Timeline publico con estado y fecha.

## Errores

| HTTP | Significado |
|---:|---|
| `400` | ID de pedido invalido. |
| `401` | No existe sesion autenticada. |
| `403` | La cuenta autenticada no tiene rol `customer`. |
| `404` | Pedido inexistente, invitado o ajeno. |
| `500` | Error interno sanitizado. |

Un pedido ajeno, invitado o inexistente produce la misma respuesta `404`.

## Datos no expuestos

Las respuestas privadas no incluyen:

- `user_id`, `user_linked_at` ni `user_link_source`.
- `customer_id`, `address_id` ni datos del registro `customers`.
- `admin_notes` ni `payment_confirmed_by`.
- Llave o hash de idempotencia.
- Datos internos de descuento o restauracion de stock.
- `order_status_history.changed_by` ni notas internas.
- Motivo de cancelacion.

Los DTOs de cliente son independientes de los tipos administrativos.

## UI

### Listado

```text
/mi-cuenta/pedidos
```

Muestra pedidos vinculados a la cuenta con estados, fecha, total, cantidad,
preview de productos y acceso al detalle.

### Detalle

```text
/mi-cuenta/pedidos/[id]
```

Muestra productos, entrega, notas del cliente, pago, totales y timeline
publico.

La UI consume exclusivamente las APIs privadas. No consulta Supabase
directamente, no aplica ownership en el navegador y no usa almacenamiento local
para pedidos.

## Restricciones customer

Un customer:

- Solo ve pedidos con `orders.user_id = auth.users.id`.
- No puede ver pedidos invitados.
- No puede reclamar pedidos desde la UI.
- No puede cancelar pedidos.
- No puede confirmar pagos.
- No puede cambiar estados.
- No puede vincular ni desvincular pedidos.

## Limitaciones actuales

- No existen filtros ni cursor pagination para Mis Pedidos.
- No existe reclamo publico de pedidos invitados.
- No existe transferencia ni desvinculacion de owner.
- La vinculacion manual no tiene tabla de auditoria estructurada; registra el
  evento en logs server-side.

## Fuentes relacionadas

- `database/migrations/add_order_user_ownership.sql`
- `database/migrations/add_authenticated_checkout_ownership.sql`
- `database/migrations/link_order_to_customer_manual.sql`
- `database/schema.sql`
- `src/lib/account/auth.ts`
- `src/lib/account/orders.ts`
- `src/types/customer-order.ts`
- `src/app/api/account/orders/route.ts`
- `src/app/api/account/orders/[id]/route.ts`
- `src/app/api/admin/orders/[id]/link-customer/route.ts`
- `src/app/mi-cuenta/pedidos/page.tsx`
- `src/app/mi-cuenta/pedidos/[id]/page.tsx`
- [Checkout y pedidos](./checkout-y-pedidos.md)
