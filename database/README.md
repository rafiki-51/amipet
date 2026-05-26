# Amipet Database

Esta carpeta contiene el SQL inicial para preparar la base de datos de Amipet en Supabase/PostgreSQL.

## Archivos

### `schema.sql`

Contiene la estructura de base de datos:

- extensiones
- funciones
- triggers
- tablas
- llaves foraneas
- indices
- RLS
- policies iniciales

No contiene inserts de datos.

### `seed.sql`

Contiene datos iniciales para desarrollo/MVP:

- `delivery_zones`
- productos mock

No contiene estructura de base de datos.

## Instrucciones

### Paso 1

Ejecutar `schema.sql` en Supabase SQL Editor.

### Paso 2

Ejecutar `seed.sql` en Supabase SQL Editor.

### Paso 3

Verificar que existan las tablas:

- `products`
- `delivery_zones`
- `customers`
- `addresses`
- `pets`
- `orders`
- `order_items`
- `profiles`
- `order_status_history`

## Nota

No ejecutar `seed.sql` dos veces si se eliminan restricciones `ON CONFLICT`.
