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

