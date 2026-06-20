# Configuracion inicial de Amipet

## Que es Amipet

Amipet es una aplicacion web de ecommerce para productos de mascotas con
entrega local en Costa Rica. Ademas del flujo de compra, incluye un area de
clientes para administrar mascotas y su expediente digital.

El proyecto utiliza:

- Next.js con App Router.
- React y TypeScript.
- Tailwind CSS.
- Supabase Auth y Supabase PostgreSQL.
- Upstash Redis para rate limiting del checkout.
- API Routes para checkout y administracion.
- Server Actions para el area de clientes y expediente digital.
- RLS para proteger datos de usuarios.
- RPCs transaccionales para operaciones criticas de pedidos, stock y pagos.

## Estado actual resumido

La aplicacion cuenta actualmente con:

- Home, catalogo y detalle de productos conectados a Supabase.
- Carrito persistido en el navegador.
- Checkout conectado a `POST /api/orders`.
- Checkout invitado y checkout autenticado para clientes.
- Creacion idempotente de pedidos y descuento atomico de stock.
- Rate limiting del checkout publico.
- Admin protegido para consultar y procesar pedidos.
- Paginacion server-side en Admin Orders.
- Transiciones seguras de estado y cancelacion con restauracion unica de stock.
- Estado de pago separado del estado operativo.
- Confirmacion manual de pago desde el admin.
- Vinculacion manual de pedidos invitados/historicos a cuentas customer.
- Registro e inicio de sesion de clientes.
- Gestion de mascotas y expediente digital con pesos, vacunas, recordatorios,
  medicamentos e historial medico.
- Helpers centralizados para roles `customer`, `operator` y `admin`.
- Headers defensivos minimos configurados en `next.config.ts`.

## Requisitos

- Node.js 22 o una version compatible con el proyecto.
- npm.
- Git.
- Un proyecto de Supabase configurado para Amipet.

## Instalacion

Desde la raiz del repositorio:

```bash
npm install
```

## Variables de entorno

Crear un archivo `.env.local` en la raiz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_IP_HASH_SECRET=
```

Reglas importantes:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son utilizadas
  por los clientes publicos y autenticados de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` es privada y solo debe utilizarse en codigo
  server-side.
- `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` se usan para rate
  limiting de `POST /api/orders`.
- Tambien se aceptan `KV_REST_API_URL` y `KV_REST_API_TOKEN` como nombres
  compatibles con Vercel KV.
- `RATE_LIMIT_IP_HASH_SECRET` es recomendado para hashear IPs sin depender del
  token de Redis.
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al navegador ni versionar
  `.env.local`.

## Autenticacion y roles

Los roles actuales son:

- `customer`
- `operator`
- `admin`

`operator` y `admin` pueden usar el admin de pedidos. `customer` puede usar
`/mi-cuenta`, expediente digital y Mis Pedidos.

El checkout mantiene compras invitadas. Si existe sesion customer valida, el
pedido nuevo se vincula automaticamente por `orders.user_id`. Si no existe
sesion, el pedido nace como invitado.

## Seguridad HTTP

`next.config.ts` aplica headers defensivos globales:

- `X-Content-Type-Options`
- `Referrer-Policy`
- `X-Frame-Options`
- `Permissions-Policy`
- `Strict-Transport-Security`
- `Cross-Origin-Opener-Policy`

No existe todavia una `Content-Security-Policy` estricta.

## Preparacion de base de datos

La estructura principal se encuentra en:

- `database/schema.sql`: representacion consolidada del esquema actual.
- `database/seed.sql`: datos iniciales para desarrollo.
- `database/migrations/`: cambios incrementales de base de datos.

Antes de aplicar SQL, revisar
[Migraciones de base de datos](./base-de-datos/migraciones.md). No se deben
modificar migraciones que ya hayan sido aplicadas en un entorno compartido.

## Ejecucion local

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abrir:

```text
http://localhost:3000
```

## Validaciones

Antes de entregar cambios:

```bash
git diff --check
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Las validaciones que requieran Supabase necesitan variables de entorno validas
y una base de datos con las migraciones correspondientes aplicadas.

## Documentacion relacionada

- [Indice de documentacion](./README.md)
- [Vision general de arquitectura](./arquitectura/vision-general.md)
- [Migraciones de base de datos](./base-de-datos/migraciones.md)
- [Evolucion del proyecto](./historial/evolucion-del-proyecto.md)

## Alcance de esta guia

Este archivo explica como preparar y levantar el proyecto. Los contratos
detallados de RPCs, pedidos, pagos y Mis Pedidos se documentan en archivos
especializados dentro de `docs/`.
