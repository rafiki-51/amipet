Amipet MVP — Documentación inicial
Información general del proyecto

Proyecto: Amipet MVP
Fecha de inicio: 8 de marzo de 2026

Amipet es una plataforma web orientada a la venta local de alimento para mascotas con entrega en zonas específicas del este de San José, Costa Rica.

El objetivo inicial del proyecto es desarrollar un MVP (Minimum Viable Product) que permita validar el modelo de negocio antes de escalar el sistema a una arquitectura más compleja.

Stack tecnológico
Frontend

Next.js

Tailwind CSS

TypeScript

Backend

API Routes dentro de Next.js

Base de datos (planeada)

PostgreSQL

Infraestructura (planeada)

Google Cloud Platform

Servicios previstos:

Cloud Run (ejecución de la aplicación)

Cloud SQL (base de datos PostgreSQL)

Cloud Storage (imágenes de productos)

Cloud DNS (gestión del dominio)

Entorno de desarrollo validado

Se verificó que el entorno local de desarrollo cuente con las siguientes herramientas:

Node.js v22.14.0

npm 10.9.2

Git 2.46.2

Esto permite ejecutar el proyecto localmente y gestionar dependencias y control de versiones.

Inicialización del proyecto

El proyecto fue creado utilizando el generador oficial de Next.js.

Comando utilizado:

npx create-next-app@latest .

Este comando inicializa un proyecto Next.js en la carpeta actual.

Resultado esperado:

Proyecto funcional ejecutándose en entorno local

Acceso a la aplicación en:

http://localhost:3000
Configuración seleccionada durante la creación

Durante la inicialización se eligieron las siguientes opciones:

TypeScript: Yes

ESLint: Yes

React Compiler: No

Tailwind CSS: Yes

src directory: Yes

App Router: Yes

Turbopack: Yes

Import alias por defecto (@/ → src)

Estas configuraciones establecen una base moderna para el desarrollo del proyecto.

Ajustes iniciales realizados

Una vez generado el proyecto base se realizaron varios ajustes para adaptarlo a Amipet:

Limpieza del template inicial

Se eliminó el contenido demo de Next.js y se creó una página inicial temporal del proyecto.

Actualización de metadata

Se configuró el layout global con información del sitio:

título del sitio

descripción básica

idioma del documento (lang="es")

Simplificación de estilos globales

Se ajustó globals.css para utilizar Tailwind como base y mantener estilos mínimos.

Estructura base del proyecto

Se creó una estructura inicial de carpetas para mantener el proyecto organizado desde el inicio.

src
├ app
├ components
├ config
├ lib
├ services
└ types
Descripción de carpetas

app
Contiene las rutas y páginas del sistema utilizando el App Router de Next.js.

components
Componentes reutilizables de la interfaz.

config
Configuraciones globales del negocio.

lib
Funciones utilitarias y lógica compartida.

services
Capa futura de servicios o integración con APIs.

types
Definiciones de tipos TypeScript reutilizables.

Capa base del negocio

Antes de conectar base de datos se creó una capa básica para modelar la lógica del negocio.

Archivos de configuración
src/config/site.ts
src/config/orders.ts

Estos archivos contienen:

nombre del sitio

descripción

zonas de cobertura

estados de pedidos

Tipos del dominio

Se definieron tipos principales del sistema:

src/types/product.ts
src/types/order.ts

Estos tipos modelan:

productos

pedidos

cliente

ítems del pedido

estados del pedido

Esto permite mantener consistencia en toda la aplicación.

Datos mock para desarrollo

Se creó un conjunto inicial de productos para desarrollo frontend.

src/lib/products.ts

Esto permite trabajar el catálogo sin depender todavía de PostgreSQL.

Utilidades

Se agregó un helper para formateo de moneda:

src/lib/format.ts

Este helper convierte números a formato de colones costarricenses (CRC).

Ejemplo:

18500 → ₡18 500
Catálogo visual inicial

Se creó el componente reutilizable:

src/components/products/ProductCard.tsx

La página de catálogo:

src/app/catalogo/page.tsx

Ahora:

consume datos mock

renderiza productos dinámicamente

muestra precios en colones

presenta zonas de cobertura del negocio

Esto permite visualizar el catálogo sin backend.

Detalle de producto con ruta dinámica

Se implementó navegación a páginas individuales de producto utilizando rutas dinámicas.

Ruta creada:

src/app/producto/[slug]/page.tsx

Cada producto ahora tiene una URL propia basada en su slug.

Ejemplo:

/producto/dog-chow-adultos-8kg
Archivos actualizados

src/lib/products.ts

src/components/products/ProductCard.tsx

Mejoras implementadas

navegación desde el catálogo al detalle

generación dinámica de páginas de producto

manejo de producto inexistente con notFound() (404)

Objetivo de esta fase

Preparar la base del sistema para:

navegación real del catálogo

SEO básico por producto

futuras funciones de carrito

integración posterior con base de datos

Estado actual del proyecto

El sistema actualmente incluye:

estructura de aplicación

layout global

navegación básica

catálogo funcional con datos mock

páginas individuales de producto

El siguiente paso del desarrollo será implementar el carrito de compras y manejo de estado del pedido.

Mae, esto ya parece documentación de proyecto real, no de tutorial.
Muy bien hecho.

Cuando retomemos el desarrollo, el siguiente bloque natural será:

1️⃣ Carrito con Context API
2️⃣ Agregar productos al carrito
3️⃣ Vista real del carrito
4️⃣ Preparar checkout

Eso ya convierte el sitio en e-commerce funcional MVP.

Por ahora descanse comandante 😄
Hoy ya construimos la base de Amipet. 🐶🐱🚀


## Implementación del carrito

Se agregó un sistema de carrito funcional usando Context API y localStorage.

Archivos principales:

- src/context/CartContext.tsx
- src/components/cart/AddToCartButton.tsx
- src/components/cart/CartNavLink.tsx
- src/app/carrito/page.tsx

Funcionalidades implementadas:

- Agregar productos al carrito
- Persistencia usando localStorage
- Contador global en header
- Aumentar/disminuir cantidades
- Límite por stock
- Eliminar productos
- Vaciar carrito
- Subtotal dinámico
- Feedback visual al usuario
- Manejo seguro de localStorage
- Confirmación al vaciar carrito

Objetivo:
Convertir el catálogo estático en un flujo de compra funcional para el MVP.

## Rediseño comercial de la home

Se actualizó `src/app/page.tsx` para reemplazar la página temporal del MVP por una home comercial.

La nueva home incluye:
- Hero principal orientado a venta
- CTA hacia catálogo
- Espacio visual para logo/isotipo futuro
- Mensaje de delivery gratis
- Zonas de cobertura desde `siteConfig`
- Categorías principales
- Productos destacados desde `products`
- Precios formateados con `formatCurrency`
- Links hacia detalle de producto
- Sección “Cómo funciona”
- CTA final hacia catálogo

Objetivo:
Hacer que la página principal se sienta como una tienda real de alimento para mascotas y no como una página técnica en construcción.

## Checkout local MVP

Se implementó un checkout funcional local en `src/app/checkout/page.tsx`.

Archivos agregados/modificados:
- src/app/checkout/page.tsx
- src/config/payment.ts

Funcionalidades:
- Resumen del carrito
- Formulario de datos del cliente
- Selección de zona de entrega desde `siteConfig.coverage`
- Selección de método de pago
- Validaciones mínimas
- Confirmación con número de pedido local
- Guardado del último pedido en `localStorage`
- Vaciado del carrito después de confirmar

Limitación:
Este checkout es temporal y local. Antes de recibir pedidos reales debe migrarse a una API/backend con validación de precios, stock y persistencia en PostgreSQL.


## Admin local MVP de pedidos

Se implementó `/admin/pedidos` como panel operativo local.

Incluye:
- lectura de pedidos desde `amipet-orders`
- lista de pedidos
- detalle completo
- filtros por estado, zona y método de pago
- cambio de estado
- marcar como entregado
- persistencia en localStorage

Limitación:
No es productivo todavía. No tiene autenticación, backend ni base de datos.

# Integración inicial de Supabase

Fecha: (hoy)

## Objetivo

Preparar la transición del MVP local basado en localStorage hacia una arquitectura con persistencia real usando PostgreSQL.

## Arquitectura actual

GitHub
↓
Vercel
↓
amipet.pro
↓
Supabase PostgreSQL

## Proyecto Supabase

Nombre del proyecto:

amipet

Configuración utilizada:

- Data API: habilitado
- Automatically expose new tables: deshabilitado
- Automatic RLS: deshabilitado

## Estructura local agregada

database/
├── schema.sql
├── seed.sql
└── README.md

Descripción:

schema.sql
- extensiones
- funciones
- triggers
- tablas
- índices
- RLS
- policies

seed.sql
- zonas de entrega
- productos iniciales

README.md
- documentación y pasos de ejecución

## Tablas creadas en Supabase

- products
- delivery_zones
- customers
- addresses
- pets
- orders
- order_items
- profiles
- order_status_history

## Decisiones de negocio actuales

Stock:
- se descontará cuando el pedido pase a estado "preparando"

Número de pedido:
Formato planeado:

AMI-YYYYMMDD-XXXX

Ejemplo:

AMI-20260525-0001

Primer usuario administrador:

Rafael
Rol: admin

## Estado actual del roadmap

Completado:

✅ Home comercial
✅ Catálogo
✅ Detalle producto
✅ Carrito funcional
✅ Checkout local MVP
✅ Historial local
✅ Admin local MVP
✅ Diseño SQL
✅ Proyecto Supabase
✅ Base de datos inicial creada

Pendiente:

⬜ instalar cliente Supabase
⬜ variables .env.local
⬜ conectar catálogo a DB real
⬜ migrar pedidos
⬜ autenticación
⬜ admin protegido

## Integración catálogo → Supabase

Estado: Completado

Cambios realizados:

- Se instaló @supabase/supabase-js
- Se creó cliente Supabase
- Se creó capa products-db
- Se migró /catalogo
- Se configuró RLS
- Se agregaron GRANT SELECT para productos y zonas

Validación realizada:

Se modificó el precio de:

Cat Chow Adultos 1.5kg

6500 → 7550

Resultado:

El cambio se reflejó automáticamente en localhost sin modificar código.

## Migración de catálogo y detalle a Supabase

Se migraron las rutas públicas de productos para consumir datos desde Supabase/PostgreSQL.

Rutas migradas:
- /catalogo
- /producto/[slug]

Validaciones:
- Catálogo muestra productos desde Supabase.
- Cambios de precio en la base se reflejan en catálogo.
- Detalle de producto carga por slug desde Supabase.
- Slug inexistente devuelve 404.
- Agregar al carrito desde detalle sigue funcionando.

## Migración de zonas a Supabase

Se migraron las zonas de cobertura para consumir datos desde la tabla `delivery_zones` en Supabase.

Rutas actualizadas:
- `/`
- `/catalogo`
- `/checkout`

Implementación:
- Se reutilizó `getActiveDeliveryZones()` desde `src/lib/products-db.ts`.
- Las zonas se cargan desde Supabase cuando está disponible.
- Se mantiene fallback temporal a `siteConfig.coverage`.

Decisión:
En checkout, la zona se sigue guardando como texto (`district`) para mantener compatibilidad con el flujo actual. La migración a `delivery_zone_id` queda pendiente para una fase posterior.

## API real de pedidos

Se implementó `POST /api/orders` para crear pedidos reales en Supabase/PostgreSQL.

Archivos principales:
- `src/app/api/orders/route.ts`
- `src/lib/supabase/admin.ts`

Funcionalidades:
- Validación server-side del payload.
- Validación de zona activa.
- Validación de productos activos.
- Validación de stock suficiente.
- Cálculo server-side de subtotal, delivery y total.
- Generación de número de pedido.
- Inserción en:
  - `customers`
  - `addresses`
  - `orders`
  - `order_items`
  - `order_status_history`

Decisiones:
- El cliente no envía precios ni totales.
- El servidor es la fuente de verdad.
- No se descuenta stock al crear el pedido.
- El stock se descontará cuando el pedido pase a `preparando`.

## Checkout conectado a backend real

Se actualizó el checkout para crear pedidos reales usando `POST /api/orders`.

Archivo principal:
- `src/components/checkout/CheckoutClient.tsx`

Cambios:
- El checkout construye un payload mínimo con datos del cliente, zona, dirección, método de pago, notas e ítems.
- Envía únicamente `productId` y `quantity`.
- No envía precios, subtotales, totales ni número de pedido.
- Limpia el carrito solo si la API responde correctamente.
- Muestra confirmación usando el `orderNumber` real generado por backend.
- Si la API falla, conserva carrito y formulario.

Estado:
El checkout ya no usa `amipet-orders` ni `amipet-last-order` como backend de pedidos.

## Admin real conectado a Supabase

Se migró `/admin/pedidos` desde localStorage hacia Supabase.

APIs creadas:
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/[id]/status`

Archivos principales:
- `src/app/api/admin/orders/route.ts`
- `src/app/api/admin/orders/[id]/status/route.ts`
- `src/types/admin-order.ts`
- `src/app/admin/pedidos/page.tsx`
- `src/components/admin/OrderCard.tsx`
- `src/components/admin/OrderDetail.tsx`
- `src/components/admin/OrderFilters.tsx`

Funcionalidades:
- El admin lee pedidos reales desde Supabase.
- Muestra datos del cliente, dirección, zona, productos, totales y método de pago.
- Permite cambiar estado del pedido.
- Permite marcar pedido como entregado.
- Cada cambio de estado se registra en `order_status_history`.
- Los filtros se mantienen en cliente.

Estados soportados:
- `recibido`
- `preparando`
- `en-ruta`
- `entregado`
- `cancelado`

Estado:
El admin ya no usa `localStorage` ni `amipet-orders`.

## Supabase Auth para admin

Se agregó autenticación administrativa con Supabase Auth.

Dependencias:
- `@supabase/ssr`

Archivos creados:
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/app/admin/login/page.tsx`

Funcionamiento:
- Login admin con email/password.
- Sesión gestionada mediante cookies.
- Primer usuario admin creado manualmente en Supabase Auth.
- Perfil admin registrado en la tabla `profiles`.

Primer admin:
- Rafael
- role: `admin`

## Protección de rutas admin

Se implementó middleware para proteger la UI administrativa.

Archivo principal:
- `src/middleware.ts`

Protección:
- `/admin/login` permanece público.
- `/admin/*` requiere sesión Supabase.
- Se consulta `profiles` para validar rol.
- Solo roles permitidos:
  - `admin`
  - `operator`

Comportamiento:
- Sin sesión: redirección a `/admin/login`.
- Con sesión pero sin rol válido: redirección a `/admin/login?error=unauthorized`.
- Con rol válido: acceso permitido a `/admin/pedidos`.

Permiso adicional requerido:
- Se agregó `GRANT SELECT` sobre `profiles` para el rol `authenticated`.

```sql
grant select on public.profiles to authenticated;

## Seguridad administrativa

Se implementó autenticación y protección para el área administrativa usando Supabase Auth.

### Login admin

Ruta creada:

- `/admin/login`

Funcionalidad:
- Login con email/password usando Supabase Auth.
- Sesión gestionada con cookies mediante `@supabase/ssr`.
- Redirección automática a `/admin/pedidos` después de login exitoso.

### Roles administrativos

Se utiliza la tabla `profiles` para validar roles.

Roles permitidos:
- `admin`
- `operator`

Primer usuario admin:
- Rafael
- role: `admin`

### Middleware admin

Se implementó middleware para proteger rutas administrativas.

Protección:
- `/admin/login` permanece público.
- `/admin/*` requiere sesión activa.
- El middleware consulta `profiles`.
- Solo usuarios con rol `admin` u `operator` pueden acceder.

Comportamiento:
- Sin sesión: redirige a `/admin/login`.
- Sin rol válido: redirige a `/admin/login?error=unauthorized`.

### APIs admin protegidas

Se protegieron las APIs administrativas:

- `GET /api/admin/orders`
- `PATCH /api/admin/orders/[id]/status`

Validación:
- Sin sesión: responde `401 Unauthorized`.
- Con sesión pero sin rol válido: responde `403 Forbidden`.
- Con rol válido: permite consultar o actualizar pedidos.

### Logout admin

Se agregó botón de cierre de sesión en `/admin/pedidos`.

Funcionalidad:
- Ejecuta `supabase.auth.signOut()`.
- Redirige a `/admin/login`.
- Después de cerrar sesión, `/admin/pedidos` vuelve a estar protegido.

## Estado actual actualizado

Completado:

✅ Home comercial  
✅ Catálogo desde Supabase  
✅ Detalle de producto desde Supabase  
✅ Zonas desde Supabase  
✅ Carrito funcional  
✅ Checkout conectado a API real  
✅ Pedidos reales en PostgreSQL  
✅ Admin conectado a Supabase  
✅ Cambio de estado real  
✅ Historial de estados  
✅ Supabase Auth admin  
✅ Middleware protegiendo `/admin/*`  
✅ APIs admin protegidas  
✅ Logout admin  

Pendiente:

⬜ Deploy en Vercel  
⬜ Configurar variables de entorno en Vercel  
⬜ Apuntar `amipet.pro` a Vercel  
⬜ Imágenes reales de productos  
⬜ Política de privacidad básica  
⬜ Términos y condiciones básicos  
⬜ Contacto/WhatsApp visible  
⬜ Descuento de stock al pasar a `preparando`  
⬜ Gestión de productos desde admin  
⬜ Login/registro opcional para clientes  
⬜ Perfil de cliente, mascotas e historial  