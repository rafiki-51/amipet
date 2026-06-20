# Autenticacion y seguridad

## Objetivo

Este documento describe el estado actual de autenticacion, roles, autorizacion
y controles de seguridad de Amipet.

La fuente de verdad del comportamiento sigue siendo el codigo en `src/` y el
esquema consolidado en `database/schema.sql`.

## Roles

Amipet utiliza tres roles de aplicacion:

| Rol | Uso |
|---|---|
| `customer` | Cliente autenticado. Accede a `/mi-cuenta`, expediente digital y Mis Pedidos. |
| `operator` | Usuario operativo del admin. Accede a pedidos y acciones administrativas permitidas. |
| `admin` | Usuario administrativo. Accede al mismo panel protegido de pedidos. |

Los roles validos estan centralizados en:

```text
src/lib/auth/roles.ts
```

## Matriz de acceso

| Recurso / accion | anon | customer | operator | admin |
|---|---:|---:|---:|---:|
| Home/catalogo/producto | Si | Si | Si | Si |
| Carrito | Si | Si | Si | Si |
| Checkout invitado | Si | No aplica | No aplica | No aplica |
| Checkout autenticado customer | No | Si | No | No |
| `/mi-cuenta` | No | Si | Redirige a admin | Redirige a admin |
| Expediente digital | No | Propio | No | No |
| Mis Pedidos | No | Propios | No | No |
| Admin pedidos | No | No | Si | Si |
| Cambiar estado de pedido | No | No | Si | Si |
| Confirmar pago | No | No | Si | Si |
| Vincular pedido invitado a customer | No | No | Si | Si |

## Helpers actuales

### `src/lib/auth/roles.ts`

Define:

- `AppRole`
- `AdminRole`
- `appRoles`
- `adminRoles`
- `isAppRole`
- `isAdminRole`
- `isCustomerRole`

Es un modulo puro: no consulta Supabase.

### `src/lib/auth/server.ts`

Centraliza la lectura server-side de:

- usuario autenticado
- profile
- role

Devuelve estados diferenciados para sesion ausente, error de perfil, rol
invalido y autenticacion correcta.

### `src/lib/auth/customer-pages.ts`

Protege paginas customer. Comportamiento actual:

- Sin sesion: redirige a `/login?redirect=...` o al override configurado.
- Error consultando profile: registra `console.error`.
- `admin`/`operator`: redirige a `/admin/pedidos`.
- Sin profile o rol no customer: redirige a `/login`.
- Exito: devuelve `supabase`, `user` y `profile`.

### `src/lib/auth/customer-actions.ts`

Protege Server Actions customer para mascotas y expediente digital. Conserva
los redirects y errores funcionales actuales de las acciones.

### `src/lib/admin/auth.ts`

Protege APIs administrativas. Exige rol `admin` u `operator`.

Respuestas:

- `401` si no hay sesion.
- `403` si hay sesion pero el rol no esta autorizado.

### `src/lib/account/auth.ts`

Protege APIs privadas de cliente. Exige rol `customer`.

Respuestas:

- `401` si no hay sesion.
- `403` si hay sesion pero no es customer.
- `500` si falla la consulta del profile.

## Seguridad implementada

### SEC-2A: Dependencias

Next.js y `eslint-config-next` quedaron fijados en version exacta `16.2.9`.
Tambien se reviso el estado de dependencias y supply chain.

### SEC-2B: Rate limiting checkout

`POST /api/orders` aplica rate limiting por IP:

- 10 requests cada 10 minutos.
- Cuenta requests validos e invalidos.
- Usa Upstash Redis o variables compatibles de Vercel KV.
- Hashea IPs antes de almacenarlas en keys.
- No guarda PII en Redis.
- Usa fail-open si Redis falla.

### SEC-2C: Security headers

`next.config.ts` aplica headers globales:

- `X-Content-Type-Options`
- `Referrer-Policy`
- `X-Frame-Options`
- `Permissions-Policy`
- `Strict-Transport-Security`
- `Cross-Origin-Opener-Policy`

No existe actualmente una `Content-Security-Policy` estricta.

### SEC-2D: Admin Orders pagination

`GET /api/admin/orders` usa paginacion server-side:

- `page` default `1`.
- `limit` default `25`, maximo `50`.
- filtros validados.
- orden estable por `created_at DESC, id DESC`.

Esto evita cargar todo el historial de pedidos en memoria.

### AUTH-1A: Centralizacion Auth/Roles

Roles y validaciones comunes se centralizaron en helpers compartidos. Las
paginas `/mi-cuenta`, Server Actions customer y APIs principales dejaron de
duplicar checks manuales de rol.

### AUTH-1B: RLS audit

Se audito que las tablas customer/pets/expediente esten protegidas por RLS y
`auth.uid()`. Pedidos operativos permanecen cerrados al acceso directo de
customers y se exponen mediante APIs server-side.

### AUTH-1C: RPC/service_role audit

Se audito el uso de `service_role`, RPCs `SECURITY DEFINER` y APIs que las
invocan. Las APIs actuales validan rol antes de ejecutar operaciones
privilegiadas.

## `service_role`

### Donde se usa

- `src/lib/supabase/admin.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/admin/orders/route.ts`
- `src/app/api/admin/orders/[id]/status/route.ts`
- `src/app/api/admin/orders/[id]/payment-status/route.ts`
- `src/app/api/admin/orders/[id]/link-customer/route.ts`
- `src/lib/account/orders.ts`

### Por que se usa

`service_role` se usa para:

- ejecutar RPCs restringidas;
- crear pedidos desde checkout publico;
- consultar datos relacionados de pedidos para admin;
- consultar pedidos propios para Mis Pedidos despues de validar ownership;
- saltar RLS solo desde rutas server-side autorizadas.

### Riesgos

`service_role` omite RLS. Si se usa antes de validar sesion, rol u ownership,
puede exponer o modificar datos de forma indebida.

### Reglas de uso seguro

- Importar `supabaseAdmin` solo en codigo server-side.
- Validar sesion antes de usarlo cuando la accion no sea publica.
- Validar rol `admin/operator` antes de operaciones administrativas.
- Validar rol `customer` y filtrar por `orders.user_id` para Mis Pedidos.
- No aceptar ownership desde body, query, headers personalizados ni cookies no
  confiables.
- No devolver errores crudos de Supabase al cliente.
- No loguear PII innecesaria.

## RPCs privilegiadas

Las RPCs criticas usan `SECURITY DEFINER`, `search_path = public`, revocan
ejecucion a `public`, `anon` y `authenticated`, y conceden ejecucion solo a
`service_role`.

| RPC | Uso actual |
|---|---|
| `create_checkout_order` | Checkout invitado y autenticado customer. |
| `transition_order_status` | Cambios operativos de pedido desde admin. |
| `transition_order_payment_status` | Confirmacion manual de pago desde admin. |
| `link_order_to_customer_manual` | Vinculacion manual admin/soporte de pedido invitado a customer. |

Las RPCs administrativas validan que `p_changed_by` exista en `auth.users`.
La validacion de rol admin/operator ocurre actualmente en la API antes de
llamar la RPC.

## Pendientes conocidos

Estos puntos no estan implementados actualmente:

- Validar rol `admin/operator` dentro de las RPCs administrativas para defensa
  en profundidad.
- Agregar una CSP estricta.
- Migrar `src/middleware.ts` a la convencion `proxy` de Next.js.
- Evaluar policies RLS futuras para lectura directa de pedidos propios.

## Fuentes relacionadas

- `src/lib/auth/roles.ts`
- `src/lib/auth/server.ts`
- `src/lib/auth/customer-pages.ts`
- `src/lib/auth/customer-actions.ts`
- `src/lib/admin/auth.ts`
- `src/lib/account/auth.ts`
- `src/lib/rate-limit.ts`
- `src/lib/supabase/admin.ts`
- `next.config.ts`
- `database/schema.sql`
- [RLS](../base-de-datos/rls.md)
- [RPCs transaccionales](../base-de-datos/rpcs.md)
