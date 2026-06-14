# Documentacion de Amipet

Este directorio contiene la documentacion tecnica del proyecto. El objetivo es
mantener separadas la configuracion inicial, la arquitectura, la base de datos,
los dominios funcionales y la operacion del sistema.

## Inicio rapido

- [Configuracion inicial](./setup-inicial.md)
- [Vision general de arquitectura](./arquitectura/vision-general.md)
- [Migraciones de base de datos](./base-de-datos/migraciones.md)
- [Evolucion del proyecto](./historial/evolucion-del-proyecto.md)

## Dominios criticos

- [RPCs transaccionales](./base-de-datos/rpcs.md)
- [Checkout y pedidos](./dominios/checkout-y-pedidos.md)
- [Mis Pedidos](./dominios/mis-pedidos.md)
- [Pagos](./dominios/pagos.md)

## Estado documental

DOCS-1A y DOCS-1B reducido establecen la base documental actual:

- Guia corta para instalar y levantar Amipet.
- Resumen de arquitectura.
- Reglas generales para migraciones.
- Historia resumida del proyecto.
- Contratos de RPCs transaccionales.
- Flujos criticos de checkout, pedidos, stock y pagos.
- Ownership digital y consulta privada de pedidos del cliente.

Los siguientes documentos estan previstos para fases posteriores:

```text
docs/
|-- arquitectura/
|   |-- autenticacion-y-seguridad.md
|   `-- variables-de-entorno.md
|-- base-de-datos/
|   |-- modelo-de-datos.md
|   `-- rls.md
|-- dominios/
|   `-- expediente-digital.md
`-- operaciones/
    |-- pruebas-manuales.md
    |-- despliegue.md
    `-- monitoreo-y-backups.md
```

## Convenciones

- Documentar el comportamiento actual, no planes como si ya estuvieran
  implementados.
- Evitar duplicar SQL o codigo completo; enlazar al archivo fuente cuando sea
  necesario.
- Usar fechas concretas para decisiones o cambios relevantes.
- Actualizar el documento del dominio cuando cambie un contrato, RPC, permiso
  o flujo critico.
- No incluir secretos, tokens ni valores reales de variables privadas.
- Mantener la historia resumida separada de las instrucciones operativas.

## Fuentes de verdad

- `database/schema.sql` representa el esquema consolidado esperado.
- `database/migrations/` contiene cambios incrementales.
- El codigo de `src/` define el comportamiento actual de la aplicacion.
- La documentacion explica esos contratos, pero no sustituye su validacion
  contra el codigo y la base de datos aplicada.
