# Mis Pedidos

## Objetivo

Este documento describe la consulta privada de pedidos vinculados
explicitamente a una cuenta de cliente.

El modulo es de solo lectura. No permite cancelar pedidos, confirmar pagos,
cambiar estados ni vincular pedidos invitados.

## Ownership digital

`orders.user_id` es la unica fuente de ownership digital de un pedido:

```text
orders.user_id = auth.users.id
```

Las reglas de ownership son:

- Un pedido con `user_id` pertenece digitalmente a esa cuenta autenticada.
- Un pedido con `user_id = null` es un pedido invitado sin owner digital.
- Nombre, telefono, email y `customer_id` no conceden acceso al pedido.
- Los pedidos historicos e invitados no se vinculan automaticamente.

`orders.user_linked_at` y `orders.user_link_source` registran metadata de la
vinculacion. Estos campos no se exponen al cliente.

La FK de `orders.user_id` utiliza `ON DELETE SET NULL`, por lo que eliminar una
cuenta no elimina el pedido.

## API privada

Las APIs privadas requieren:

1. Sesion valida de Supabase Auth.
2. Perfil con `profiles.role = 'customer'`.
3. Filtro de ownership por `orders.user_id = auth.users.id`.

El servidor valida sesion y rol con el cliente server-side. Solamente despues
utiliza `service_role` para consultar pedidos y relaciones protegidas.

### Listar pedidos propios

```text
GET /api/account/orders
```

Retorna como maximo los 20 pedidos propios mas recientes, ordenados por:

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
- Vista previa de hasta tres productos con nombre y cantidad.

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
| `400` | El ID solicitado no es un UUID valido. |
| `401` | No existe una sesion autenticada. |
| `403` | La cuenta autenticada no tiene rol `customer`. |
| `404` | El pedido no existe o no pertenece a la cuenta. |
| `500` | Error interno sanitizado. |

Un pedido ajeno, invitado o inexistente produce la misma respuesta `404`. La
API no confirma la existencia de pedidos que la cuenta no puede consultar.

## Datos no expuestos

Las respuestas privadas no incluyen:

- `user_id`, `user_linked_at` ni `user_link_source`.
- `customer_id`, `address_id` ni datos del registro `customers`.
- `admin_notes` ni `payment_confirmed_by`.
- Llave o hash de idempotencia.
- Datos internos de descuento o restauracion de stock.
- `order_status_history.changed_by` ni notas internas del historial.
- Motivo de cancelacion.

Los DTOs de cliente son independientes de los tipos administrativos.

## UI

### Listado

```text
/mi-cuenta/pedidos
```

Muestra los pedidos vinculados a la cuenta con estados operativo y de pago,
fecha, total, cantidad, vista previa de productos y acceso al detalle.

La vista contempla:

- Carga.
- Listado vacio.
- Error recuperable.
- Sesion ausente.
- Cuenta sin permisos.

### Detalle

```text
/mi-cuenta/pedidos/[id]
```

Muestra productos, entrega, notas del cliente, pago, totales y timeline
publico. No expone acciones administrativas, cancelacion ni acciones de pago.

La UI consume exclusivamente las APIs privadas. No consulta Supabase
directamente, no aplica ownership en el navegador y no utiliza almacenamiento
local para pedidos.

## Limitaciones actuales

- El checkout publico no vincula automaticamente pedidos a una sesion
  autenticada.
- No existe flujo para reclamar o vincular pedidos invitados.
- Los pedidos con `user_id = null` no aparecen en Mis Pedidos.
- No existen filtros, paginacion por cursor ni acciones sobre pedidos.

## Fuentes relacionadas

- `database/migrations/add_order_user_ownership.sql`
- `database/schema.sql`
- `src/lib/account/auth.ts`
- `src/lib/account/orders.ts`
- `src/types/customer-order.ts`
- `src/app/api/account/orders/route.ts`
- `src/app/api/account/orders/[id]/route.ts`
- `src/app/mi-cuenta/pedidos/page.tsx`
- `src/app/mi-cuenta/pedidos/[id]/page.tsx`
- [Checkout y pedidos](./checkout-y-pedidos.md)
