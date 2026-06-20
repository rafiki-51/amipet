# Evolucion del proyecto

Este documento conserva un resumen de las etapas principales de Amipet. No
pretende reemplazar un changelog detallado ni describir el estado operativo
actual completo.

## MVP inicial

Amipet inicio como una aplicacion Next.js enfocada en validar una tienda local
de productos para mascotas.

La primera etapa incluyo:

- Home comercial.
- Catalogo y detalle de productos.
- Carrito con persistencia local.
- Checkout y admin locales como prototipos.

Estos flujos permitieron validar la experiencia antes de conectar persistencia
real.

## Integracion con Supabase

El proyecto migro progresivamente a Supabase para utilizar:

- PostgreSQL.
- Supabase Auth.
- Data API.
- RLS.
- Clientes diferenciados para navegador, servidor y administracion.

El catalogo, las zonas, los pedidos y el admin dejaron de depender de datos
locales.

## Checkout real

El checkout se conecto a `POST /api/orders`. La API paso a validar productos,
zonas, cantidades y datos del cliente en el servidor, evitando confiar en
precios o totales enviados por el navegador.

Posteriormente, la creacion completa del pedido se concentro en
`public.create_checkout_order()`.

## Stock atomico e idempotencia

La creacion de pedidos incorporo:

- Llave y hash de idempotencia.
- Advisory lock por intento de checkout.
- Normalizacion de productos repetidos.
- Bloqueo determinista de productos.
- Validacion de stock bajo bloqueo.
- Descuento atomico de inventario.
- Rollback completo ante errores.

Esto reemplazo la decision inicial de descontar stock al pasar el pedido a
preparacion.

## Estados de pedido y cancelaciones

Se creo `public.transition_order_status()` para reemplazar actualizaciones
directas desde el admin.

La RPC:

- Valida transiciones operativas.
- Trata estados terminales de forma segura.
- Registra historial.
- Cancela pedidos dentro de una transaccion.
- Restaura stock exactamente una vez cuando corresponde.
- Evita restaurar inventario de pedidos historicos que nunca descontaron stock.

El admin se conecto posteriormente a esta RPC.

## Estados de pago

Se separo el estado operativo del pedido de su estado de pago mediante
`orders.payment_status`.

Los pedidos nuevos nacen con pago pendiente. La cancelacion de un pedido
pendiente cambia su estado de pago a cancelado.

## Confirmacion manual de pago

Se agrego `public.transition_order_payment_status()` para permitir confirmar
pagos manualmente de forma transaccional.

La confirmacion registra:

- Estado pagado.
- Fecha de confirmacion.
- Usuario administrativo que confirmo.

Tambien se agrego la regla que impide marcar un pedido como entregado mientras
su pago siga pendiente.

## Ownership digital y Mis Pedidos

Los pedidos incorporaron ownership digital explicito mediante
`orders.user_id`, una referencia nullable hacia `auth.users`.

El ownership no se determina por telefono, email ni `customer_id`. Los pedidos
invitados e historicos sin owner permanecen con `user_id = null`.

Se agregaron APIs privadas de solo lectura para listar pedidos propios y
consultar su detalle. Ambas validan sesion, exigen rol `customer` y filtran por
`orders.user_id`.

El area de clientes incorporo las vistas `/mi-cuenta/pedidos` y
`/mi-cuenta/pedidos/[id]`, con listado, detalle, entrega, totales y timeline
publico. Un pedido ajeno, invitado o inexistente se presenta como no encontrado.

Posteriormente el checkout empezo a vincular automaticamente pedidos nuevos
cuando el comprador tiene sesion customer valida. Los pedidos invitados siguen
permitidos y nacen con `user_id = null`.

Tambien se agrego una vinculacion manual asistida por admin/soporte para
pedidos invitados o historicos. Esta accion usa `user_link_source =
'manual-support'`, exige pedido sin owner y no permite transferencias ni
desvinculacion.

## Expediente digital

El area de clientes evoluciono para incluir:

- Registro e inicio de sesion.
- Perfil del cliente.
- Gestion y archivado de mascotas.
- Historial de peso.
- Vacunas.
- Recordatorios.
- Medicamentos.
- Historial medico.

Los datos se protegen mediante RLS y las operaciones de escritura se realizan
principalmente con Server Actions autenticadas.

## Endurecimiento de seguridad

Se completo una ronda de hardening tecnico:

- Dependencias principales fijadas para Next.js y `eslint-config-next`.
- Rate limiting en `POST /api/orders` con Upstash Redis.
- Headers defensivos minimos configurados globalmente en `next.config.ts`.
- Auditoria de RLS para tablas customer, expediente y pedidos.
- Auditoria de RPCs, `service_role` y operaciones administrativas.

El rate limiter cuenta intentos validos e invalidos, usa hash de IP y aplica
fail-open si Redis no esta disponible para no bloquear checkout legitimo.

## Auth y roles

Los roles de aplicacion se centralizaron como:

- `customer`
- `operator`
- `admin`

Se agregaron helpers compartidos para:

- Validar roles.
- Obtener usuario autenticado y rol.
- Proteger APIs admin.
- Proteger APIs customer.
- Proteger Server Actions customer.
- Proteger paginas `/mi-cuenta`.

Esto redujo duplicacion de `auth.getUser()`, consultas a `profiles.role` y
checks manuales de rol en las rutas principales.

## Mejoras del admin

El listado de pedidos del admin incorporo paginacion server-side con:

- `page` default `1`.
- `limit` default `25`.
- maximo `50`.
- filtros por estado, estado de pago, metodo de pago y zona.
- orden estable por `created_at DESC, id DESC`.

Esto evita cargar todos los pedidos en memoria cuando crezca el historial.

## Estado de la evolucion

Amipet paso de un prototipo local a una aplicacion conectada a PostgreSQL con
flujos transaccionales para pedidos, stock, cancelaciones, pagos y ownership de
pedidos, ademas de un area autenticada para clientes y expediente digital.

La documentacion detallada de cada dominio se mantendra separada de este
resumen historico.
