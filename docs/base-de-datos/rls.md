# Row Level Security

## Objetivo

Este documento resume el estado actual de Row Level Security en Amipet y los
hallazgos conocidos de la auditoria AUTH-1B.

La referencia consolidada es `database/schema.sql`.

## Principios actuales

- Las tablas customer y expediente digital se protegen por `auth.uid()`.
- Las tablas con `user_id` exigen ownership propio en `USING` y `WITH CHECK`.
- Las tablas hijas del expediente validan tambien que `pet_id` pertenezca al
  usuario autenticado.
- `orders`, `order_items` y `order_status_history` estan cerradas al acceso
  directo customer y se exponen mediante APIs server-side.
- `products` y `delivery_zones` tienen lectura publica intencional solo para
  registros activos.
- `service_role` omite RLS y solo debe usarse en servidor despues de validar
  permisos.

## Resumen por tabla

| Tabla | RLS | Acceso actual |
|---|---:|---|
| `profiles` | Si | Cada usuario authenticated lee su propio profile e inserta profile customer propio. |
| `customer_profiles` | Si | Customer lee, inserta y actualiza su propio registro por `user_id`. |
| `customer_addresses` | Si | Customer administra sus propias direcciones por `user_id`. |
| `pets` | Si | Customer administra sus propias mascotas por `user_id`. |
| `pet_weight_logs` | Si | Customer administra logs propios y solo de mascotas propias. |
| `pet_vaccinations` | Si | Customer administra vacunas propias y solo de mascotas propias. |
| `pet_reminders` | Si | Customer administra recordatorios propios y solo de mascotas propias. |
| `pet_medications` | Si | Customer administra medicamentos propios y solo de mascotas propias. |
| `pet_medical_records` | Si | Customer administra historial propio y solo de mascotas propias. |
| `orders` | Si | Sin policies para anon/authenticated; acceso directo denegado. |
| `order_items` | Si | Sin policies para anon/authenticated; acceso directo denegado. |
| `order_status_history` | Si | Sin policies para anon/authenticated; acceso directo denegado. |
| `products` | Si | Lectura publica de productos activos. |
| `delivery_zones` | Si | Lectura publica de zonas activas. |
| `customers` | Si | Sin policies para anon/authenticated; `service_role` only. |
| `addresses` | Si | Sin policies para anon/authenticated; `service_role` only. |

No existe tabla `categories`; la categoria vive como columna en `products`.

## Tablas customer y expediente digital

### `profiles`

Policies:

- SELECT propio: `auth.uid() = id`.
- INSERT propio customer: `auth.uid() = id and role = 'customer'`.

No existe UPDATE propio. Los cambios de rol deben hacerse desde codigo
confiable con `service_role` o desde Supabase Dashboard.

### `customer_profiles`

Policies:

- SELECT propio por `user_id`.
- INSERT propio por `user_id`.
- UPDATE propio por `user_id`.

No hay DELETE para authenticated.

### `customer_addresses`

Policies:

- SELECT propio por `user_id`.
- INSERT propio por `user_id`.
- UPDATE propio por `user_id`.
- DELETE propio por `user_id`.

### `pets`

Policies:

- SELECT propio por `user_id`.
- INSERT propio por `user_id`.
- UPDATE propio por `user_id`.
- DELETE propio por `user_id`.

`WITH CHECK` evita crear o mover mascotas a `user_id` ajeno.

### Expediente digital

Aplica a:

- `pet_weight_logs`
- `pet_vaccinations`
- `pet_reminders`
- `pet_medications`
- `pet_medical_records`

Cada tabla exige:

```text
auth.uid() = user_id
```

Ademas, valida que exista una mascota con:

```text
pets.id = pet_id
pets.user_id = auth.uid()
```

Esto evita que un usuario cree registros propios apuntando a una mascota ajena.

## Pedidos

### `orders`

RLS esta habilitado, pero no existen policies para `anon` ni `authenticated`.

Consecuencia:

- Un customer no puede leer pedidos directamente por Supabase Data API.
- Un customer no puede modificar pedidos directamente.
- Mis Pedidos usa API server-side con `service_role` despues de validar rol
  customer y filtrar por `orders.user_id`.

### `order_items`

RLS esta habilitado sin policies publicas/customer. Los items se exponen al
cliente solo mediante DTOs de Mis Pedidos.

### `order_status_history`

RLS esta habilitado sin policies publicas/customer. El timeline publico se
expone en Mis Pedidos con campos limitados: estado y fecha.

## Catalogo publico

### `products`

Lectura publica para `anon` y `authenticated` cuando:

```text
is_active = true
```

Esto permite catalogo publico. El stock exacto puede ser consultable si el
cliente selecciona columnas directas usando la anon key; esto es una decision
aceptada para el estado actual.

### `delivery_zones`

Lectura publica para zonas activas:

```text
is_active = true
```

Esto permite mostrar zonas y tarifas en catalogo/checkout.

## Grants

Las tablas customer y expediente tienen grants para `authenticated`, pero RLS
limita las filas disponibles.

Las tablas operativas de pedidos (`customers`, `addresses`, `orders`,
`order_items`, `order_status_history`) tienen grants efectivos para
`service_role` y no policies para clientes.

## Respuestas de auditoria

### Puede un customer leer datos de otro customer?

No en las tablas protegidas por `user_id` y policies actuales.

### Puede modificar datos de otro customer?

No en customer profiles, addresses, pets ni expediente digital. `USING` y
`WITH CHECK` usan `auth.uid()`.

### Puede crear registros con `user_id` ajeno?

No en las tablas auditadas con ownership customer. `WITH CHECK` lo bloquea.

### Puede leer pedidos ajenos?

No por acceso directo. `orders` no tiene policy para authenticated. Por API,
Mis Pedidos filtra por `orders.user_id = authenticatedUserId`.

### Puede modificar pedidos ajenos?

No por acceso directo. Las modificaciones de pedidos ocurren por APIs
administrativas con `service_role` y rol admin/operator.

## Hallazgos pendientes conocidos

| Severidad | Hallazgo | Estado actual |
|---|---|---|
| Media | `orders`, `order_items` y `order_status_history` no tienen policies customer de lectura propia. | Cerradas al acceso directo; APIs server-side hacen ownership. |
| Media | RPCs admin validan existencia de `p_changed_by`, pero el rol admin/operator se valida en API. | Aceptado actualmente; hardening futuro recomendado. |
| Media | `pet_reminders.related_vaccination_id` no tiene una condicion RLS especifica sobre vacunacion propia. | La tabla valida `pet_id` propio; revisar si se usa relacion a vacuna en nuevas features. |
| Baja/Media | `products` publicos pueden exponer stock exacto de productos activos. | Aceptado para catalogo actual. |

## Relacion con `service_role`

`service_role` omite RLS. En Amipet se usa solamente desde codigo server-side
para:

- checkout;
- APIs admin;
- Mis Pedidos;
- RPCs transaccionales.

Las rutas deben validar sesion, rol y ownership antes de consultar o modificar
datos con privilegios elevados.

## Fuentes relacionadas

- `database/schema.sql`
- `database/migrations/harden_pet_expediente_rls.sql`
- `src/lib/account/orders.ts`
- `src/app/api/account/orders/route.ts`
- `src/app/api/account/orders/[id]/route.ts`
- [Autenticacion y seguridad](../arquitectura/autenticacion-y-seguridad.md)
- [RPCs transaccionales](./rpcs.md)
