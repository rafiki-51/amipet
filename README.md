# Amipet

Amipet es una aplicacion web de ecommerce para productos de mascotas con
entrega local en Costa Rica. Incluye catalogo, carrito, checkout, panel
administrativo, autenticacion de clientes, Mis Pedidos y expediente digital de
mascotas.

## Stack

- Next.js App Router.
- React y TypeScript.
- Tailwind CSS.
- Supabase Auth y PostgreSQL.
- Supabase RLS para datos de clientes y expediente digital.
- RPCs PostgreSQL transaccionales para pedidos, stock, pagos y vinculacion
  manual de pedidos.
- Upstash Redis para rate limiting del checkout.

## Arquitectura general

```text
Navegador
  |
  v
Next.js App Router
  |-- Paginas publicas
  |-- Area de cliente
  |-- Admin
  |-- API Routes
  |-- Server Actions
  |
  v
Supabase
  |-- Auth
  |-- PostgreSQL
  |-- RLS
  `-- RPCs SECURITY DEFINER
```

El cliente de navegador usa la llave anonima de Supabase y depende de RLS.
Las APIs server-side validan sesion y rol antes de usar `service_role`.

## Modulos existentes

- Home, catalogo y detalle de producto.
- Carrito con persistencia local en navegador.
- Checkout invitado.
- Checkout autenticado para cuentas `customer`, con vinculacion automatica del
  pedido por `orders.user_id`.
- Rate limiting de `POST /api/orders` por IP.
- Pedidos con idempotencia, stock atomico e historial inicial.
- Admin de pedidos con paginacion server-side, filtros, cambios de estado y
  confirmacion manual de pago.
- Vinculacion manual asistida por admin/soporte de pedidos invitados a cuentas
  customer existentes.
- Mis Pedidos para clientes autenticados.
- Registro, login y area `/mi-cuenta`.
- Expediente digital: mascotas, peso historico, vacunas, recordatorios,
  medicamentos e historial medico.

## Seguridad implementada

- Roles centralizados: `customer`, `operator`, `admin`.
- Helpers compartidos para auth/roles en APIs, paginas customer y Server
  Actions customer.
- RLS en tablas de clientes, mascotas y expediente digital.
- RPCs criticas con `SECURITY DEFINER`, `search_path = public` y ejecucion solo
  para `service_role`.
- Headers defensivos basicos en `next.config.ts`.
- Rate limiting fail-open para checkout cuando Redis no esta disponible.

## Variables de entorno

Crear `.env.local` en la raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_IP_HASH_SECRET=
```

Tambien se aceptan los nombres compatibles con Vercel KV:

```env
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

`RATE_LIMIT_IP_HASH_SECRET` es recomendado para hashear IPs sin depender del
token de Redis. No debe exponerse en el navegador.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:3000
```

## Base de datos

- `database/schema.sql` representa el esquema consolidado esperado.
- `database/migrations/` contiene cambios incrementales.
- `database/seed.sql` contiene datos iniciales para desarrollo o preparacion
  del MVP.

Antes de aplicar SQL, revisar `docs/base-de-datos/migraciones.md`.

## Validaciones

Antes de entregar cambios:

```bash
git diff --check
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

En Windows, si PowerShell bloquea `npm`, usar `npm.cmd`.

## Documentacion

El indice principal esta en:

```text
docs/README.md
```

Documentos criticos:

- `docs/setup-inicial.md`
- `docs/arquitectura/vision-general.md`
- `docs/base-de-datos/migraciones.md`
- `docs/base-de-datos/rpcs.md`
- `docs/dominios/checkout-y-pedidos.md`
- `docs/dominios/mis-pedidos.md`
- `docs/dominios/pagos.md`
- `docs/historial/evolucion-del-proyecto.md`
