# Vision general de arquitectura

## Resumen

Amipet es una aplicacion Next.js con App Router que combina paginas publicas,
un checkout con API server-side, un panel administrativo protegido y un area
autenticada para clientes.

Supabase proporciona autenticacion, PostgreSQL, Data API y RLS. Las operaciones
criticas de pedidos se ejecutan mediante RPCs transaccionales en PostgreSQL.

```text
Navegador
  |
  v
Next.js App Router
  |-- Paginas y componentes
  |-- API Routes
  |-- Server Actions
  |
  v
Supabase
  |-- Auth
  |-- PostgreSQL
  |-- RLS
  `-- RPCs transaccionales
```

## Clientes Supabase

### Cliente de navegador

Se utiliza para operaciones autenticadas iniciadas desde componentes cliente.
Usa la URL publica y la llave anonima de Supabase. Sus operaciones deben estar
protegidas por RLS.

Archivos relacionados:

- `src/lib/supabase/browser.ts`
- `src/lib/supabase/client.ts`

### Cliente server-side

Se utiliza en paginas de servidor, Server Actions y validacion de sesiones.
Trabaja con la sesion del usuario almacenada en cookies y sigue sujeto a sus
permisos y politicas RLS.

Archivos relacionados:

- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/middleware.ts`

### Cliente administrativo

Se utiliza exclusivamente en el servidor para operaciones que requieren
`service_role`, como el checkout publico y APIs administrativas protegidas.
Nunca debe importarse desde codigo ejecutado en el navegador.

Archivo relacionado:

- `src/lib/supabase/admin.ts`

## APIs

### API publica

`POST /api/orders` recibe el checkout, valida el payload y llama a
`public.create_checkout_order()`. El cliente no controla precios, totales ni
stock.

### APIs administrativas

Las APIs bajo `/api/admin/` requieren una sesion con rol `admin` u `operator`.
Permiten consultar pedidos, ejecutar transiciones operativas y confirmar pagos
mediante RPCs.

Archivos principales:

- `src/app/api/admin/orders/route.ts`
- `src/app/api/admin/orders/[id]/status/route.ts`
- `src/app/api/admin/orders/[id]/payment-status/route.ts`
- `src/lib/admin/auth.ts`

## Server Actions

El area de clientes y expediente digital utiliza Server Actions para crear,
actualizar y archivar datos asociados al usuario autenticado.

Dominios cubiertos:

- Mascotas.
- Peso.
- Vacunas.
- Recordatorios.
- Medicamentos.
- Historial medico.

Las acciones trabajan con la sesion del cliente y dependen de RLS para limitar
el acceso a datos propios.

## RLS

RLS protege las tablas expuestas mediante Supabase Data API. El catalogo y las
zonas tienen lectura publica limitada; los datos de clientes, mascotas y
expediente se restringen por usuario.

El cliente administrativo con `service_role` omite RLS, por lo que solo debe
usarse despues de autenticar y autorizar la solicitud en el servidor.

## RPCs transaccionales

Las operaciones criticas se concentran en PostgreSQL para ejecutarse dentro de
una sola transaccion:

- `public.create_checkout_order()`: crea pedidos idempotentes y descuenta stock
  de forma atomica.
- `public.transition_order_status()`: valida transiciones, cancela pedidos y
  restaura stock de forma segura.
- `public.transition_order_payment_status()`: confirma manualmente un pago y
  registra su auditoria basica.

Estas RPCs usan permisos restrictivos y deben ejecutarse mediante
`service_role`.

## Dominios principales

### Comercio publico

Incluye home, catalogo, detalle de productos, carrito y checkout.

### Pedidos y stock

Incluye creacion idempotente, validacion server-side, descuento atomico,
transiciones operativas, cancelacion y restauracion unica de stock.

### Pagos

El estado de pago esta separado del estado operativo. Los pagos nacen
pendientes y pueden confirmarse manualmente desde el admin. Un pedido no puede
marcarse como entregado sin pago confirmado.

### Administracion

El panel administrativo requiere Supabase Auth y un rol autorizado. Todas las
transiciones criticas se delegan a RPCs.

### Clientes y expediente digital

Los clientes pueden registrarse, administrar sus mascotas y mantener
informacion de salud y cuidado. Las mascotas archivadas conservan su expediente
para consulta, pero restringen cambios posteriores.

## Limites actuales

Esta vision no documenta contratos detallados de tablas, RPCs, RLS ni pruebas.
Esos temas se separaran en documentos especializados durante las siguientes
fases documentales.
