# Migraciones de base de datos

## Objetivo

Este documento explica el rol de los archivos SQL del proyecto y las reglas
generales para aplicar cambios de base de datos de forma controlada.

## Archivos principales

### `database/schema.sql`

Representa el esquema consolidado esperado para Amipet:

- Extensiones.
- Funciones y triggers.
- Tablas y relaciones.
- Indices.
- RPCs.
- RLS y policies.
- Permisos.

Se utiliza como referencia del estado completo esperado y para preparar una
base nueva. No sustituye el historial incremental de migraciones.

### `database/seed.sql`

Contiene datos iniciales para desarrollo o preparacion del MVP, como productos
y zonas de entrega.

Debe revisarse antes de ejecutarlo en un entorno con datos existentes. No debe
asumirse que puede ejecutarse repetidamente sin efectos secundarios.

### `database/migrations/`

Contiene cambios incrementales que evolucionan una base existente. Cada archivo
debe representar una fase concreta y revisable.

Ejemplos de areas cubiertas actualmente:

- Mascotas y expediente digital.
- Endurecimiento de RLS.
- Idempotencia y stock atomico del checkout.
- Estado de pago.
- Transiciones seguras y restauracion de stock.
- Confirmacion manual de pago.

## Orden general de aplicacion

### Base nueva

1. Crear y configurar el proyecto Supabase.
2. Revisar y ejecutar `database/schema.sql`.
3. Revisar y ejecutar `database/seed.sql` cuando corresponda.
4. Crear usuarios iniciales y perfiles requeridos.
5. Validar tablas, permisos, RLS, RPCs y flujos principales.

El esquema consolidado ya contiene el estado esperado; no se deben aplicar
automaticamente todas las migraciones historicas despues de `schema.sql` sin
verificar si sus cambios ya estan incluidos.

### Base existente

1. Confirmar cuales migraciones ya fueron aplicadas.
2. Revisar dependencias y orden cronologico de las migraciones pendientes.
3. Aplicar una migracion por vez.
4. Validar el resultado antes de continuar con la siguiente.
5. Actualizar `database/schema.sql` para mantenerlo sincronizado.

## Regla sobre migraciones aplicadas

Una migracion que ya fue aplicada en un entorno compartido no debe modificarse.

Si hace falta corregir o extender su comportamiento:

1. Crear una migracion nueva.
2. Mantener el cambio pequeno y explicito.
3. Actualizar `database/schema.sql`.
4. Documentar la dependencia con migraciones anteriores.

Editar una migracion ya aplicada hace que el repositorio deje de representar
fielmente el historial real de la base.

## Preparacion antes de aplicar

Antes de ejecutar una migracion:

- Confirmar el entorno objetivo.
- Revisar el estado actual de la base.
- Revisar datos existentes que puedan violar nuevos constraints.
- Evaluar bloqueos de tabla y efecto sobre trafico activo.
- Confirmar que las RPCs conservan firma, retorno y permisos esperados.
- Preparar consultas de validacion y, cuando sea posible, un plan de rollback.
- Confirmar que existe un backup o punto de recuperacion apropiado.

## Validacion posterior

Despues de aplicar una migracion:

1. Verificar columnas, constraints, indices y funciones creadas.
2. Confirmar permisos `REVOKE` y `GRANT`.
3. Confirmar que `database/schema.sql` coincide con el estado esperado.
4. Ejecutar pruebas manuales del flujo afectado.
5. Ejecutar pruebas de concurrencia cuando el cambio involucre stock, pedidos,
   cancelaciones o pagos.
6. Revisar logs y errores de la aplicacion.
7. Ejecutar validaciones del repositorio:

```bash
git diff --check
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## Migraciones criticas actuales

Los siguientes grupos requieren especial cuidado:

- Checkout idempotente y stock atomico.
- Cancelacion con restauracion unica de stock.
- Confirmacion manual de pago.
- RLS del expediente digital.

Antes de aplicar cualquiera de estos cambios, se debe revisar su SQL completo y
probar primero en staging o en un entorno controlado.

## Responsabilidades documentales

Cada cambio de base de datos debe mantener sincronizados:

- La migracion incremental.
- `database/schema.sql`.
- La documentacion del dominio afectado.
- Las instrucciones de prueba y operacion relacionadas.
