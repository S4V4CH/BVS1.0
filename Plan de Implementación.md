# Plan de Implementación: Emisor de Tickets (BVS)

Este documento detalla la estructura base de carpetas y archivos, junto con los pasos de construcción para el microservicio Emisor de Tickets del Blockchain Voting System, siguiendo los principios de Arquitectura Hexagonal y los requerimientos especificados.

## 1. Estructura de Carpetas y Archivos Base

La estructura refleja la segregación del dominio y la infraestructura, garantizando que el núcleo (Domain) no tenga dependencias de Prisma o Stellar SDK.

```text
bvs-ticket-issuer/
├── Dockerfile
├── docker-compose.yml       # Contiene PostgreSQL y configuración del servicio
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma        # Modelo de datos off-chain
├── src/
│   ├── config/              # Configuraciones globales y variables de entorno
│   │   └── env.ts
│   ├── domain/              # NÚCLEO DE DOMINIO (Cero dependencias externas)
│   │   ├── entities/        # Modelos puros del dominio (ej. TicketEmission)
│   │   ├── ports/           # Interfaces (Puertos)
│   │   │   ├── in/          # Casos de uso
│   │   │   └── out/         # Repositorios, EventBus, StellarService
│   │   └── errors/          # Excepciones de negocio (ej. InvalidTicketError)
│   ├── application/         # LOGICA DE APLICACION (Casos de uso)
│   │   ├── commands/        # Comandos (ej. EmitTicketCommand)
│   │   ├── handlers/        # Manejadores de los comandos
│   │   └── validations/     # Chain of Responsibility para validar el comando
│   ├── infrastructure/      # ADAPTADORES (Implementación de los puertos)
│   │   ├── web/             # Adaptador de entrada (Fastify)
│   │   │   ├── server.ts
│   │   │   ├── routes.ts
│   │   │   └── controllers/
│   │   ├── persistence/     # Adaptador de salida (Prisma / PostgreSQL)
│   │   │   ├── prisma.client.ts
│   │   │   └── repositories/
│   │   ├── blockchain/      # Adaptador de salida (Stellar SDK)
│   │   │   ├── stellar.adapter.ts
│   │   │   ├── strategies/  # Strategy Pattern para firmas
│   │   │   └── timeout.wrapper.ts
│   │   ├── events/          # Adaptador de salida (Observer/Event Emitter)
│   │   └── logging/         # Adaptador para Pino
│   └── index.ts             # Composition Root (Ensamblador base)
```

## 2. Estructura Completa de Pasos para la Construcción

### Fase 1: Inicialización y Fundamentos
1. **Configuración del Proyecto**: Inicializar Node.js, TypeScript y definir configuración de compilación (`tsconfig.json`).
2. **Configuración de Herramientas Transversales**: Instalar y configurar Pino para logs estructurados y crear el módulo de configuración para validar fuertemente variables de entorno.
3. **Infraestructura Base**: Crear el `docker-compose.yml` local con PostgreSQL y definir el esquema inicial en Prisma (`schema.prisma`) para rastrear el estado de emisión (`PENDING`, `CONFIRMED`, `FAILED`).

### Fase 2: Núcleo de Dominio (Domain)
1. **Entidades**: Crear la entidad principal `TicketEmission` con su ciclo de vida y validación de invariantes.
2. **Puertos de Entrada (In)**: Definir la interfaz del caso de uso principal (ej. `IEmitTicketUseCase`).
3. **Puertos de Salida (Out)**: Definir interfaces para persistencia (`ITicketRepository`), conexión abstracta blockchain (`IBlockchainPort`) y notificaciones (`IEventNotifier`).
4. **Errores de Dominio**: Crear clases de error específicas para encapsular fallos de validación, firma y caídas transitorias, asegurando que no expongan detalles del sistema.

### Fase 3: Casos de Uso (Application)
1. **Command Pattern**: Definir el `EmitTicketCommand` que encapsule inmutablemente los datos analizados y listos.
2. **Chain of Responsibility**: Construir un pipeline de validación para el comando entrante para asegurar consistencia e integridad de origen antes delegar al Handler.
3. **Handler del Caso de Uso**: Implementar la orquestación maestra:
   - Almacenar el registro off-chain en estado `PENDING`.
   - Usar el puerto blockchain para armar y emitir transacción.
   - Actualizar registro off-chain a estado `CONFIRMED` o `FAILED` basado en la respuesta.
   - Publicar el evento a través del puerto de notificador de eventos.

### Fase 4: Adaptadores de Salida (Driven Adapters)
1. **Prisma / PostgreSQL Adapter**: Implementar el puerto de base de datos traduciendo modelos Prisma a entidades de dominio.
2. **Stellar Adapter**:
   - Compilar el adaptador de red Stellar usando `@stellar/stellar-sdk`.
   - **Timeout wrapper**: Añadir controles de tiempo explícitos al envío hacia testnet.
   - **Strategy Pattern**: Aplicar este patrón para la resolución de clave secreta/mecanismo de firmas, aislando estas credenciales fuertemente.
3. **Events Adapter**: Consumir la notificación de estado y distribuirla sin crear dependencias circulares (puede ser base `EventEmitter` de Node.

### Fase 5: Adaptador de Entrada (Driving Adapter - API)
1. **Configuración de Fastify**: Inicializar validación global (esquemas) y gestor de errores centralizado (prevenir fuga de detalles).
2. **Rutas y Controladores**: Crear el endpoint `POST /api/v1/tickets/emit` que tome un payload HTTP, levante el comando, e invoque a la capa Application.

### Fase 6: Ensamblaje y Resiliencia
1. **Composition Root (`src/index.ts`)**: Realizar la inyección de dependencias general. Inicializar prisma, inyectarlo al repositorio, instanciar servicios inyectando interfaces, montándolo todo sobre Fastify.
2. **Políticas de Reintento**: Asegurarse que el manejo de caídas de base de datos y/o timeouts on-chain mantengan el servicio de forma idempotente, impidiendo doble gasto local.

> [!WARNING]
> Seguridad de Credenciales: Las claves del Testnet de Stellar y passwords de BD jamás deben escribirse en disco o loguearse; usar abstracciones strictas alrededor de los adaptadores de logging (`redact`) y de blockchain.

## Decisiones de Diseño

1. **Estructura del Request Payload (Endpoint Emisión)**: 
   Dado que el servicio debe enfocarse en idempotencia y anonimato, la estructura de entrada desde el backend será:
   ```json
   {
     "voteId": "UUID",         // Identificador único (usado para idempotencia local)
     "electionId": "string",   // Contexto de la elección activa
     "voterToken": "string"    // Token anónimo representativo (sin PII)
   }
   ```
   Todo requerirá validación estricta al entrar por el API.

2. **Notificación de Resultados**:
   Se utilizará un **Webhook HTTP (POST)**. El adaptador de Eventos enviará el resultado de la emisión a una URL preconfigurada en las variables de entorno (`WEBHOOK_URL`).
   El payload que recibirá el sub-sistema destino será:
   ```json
   {
     "voteId": "UUID",
     "status": "CONFIRMED | FAILED",
     "txHash": "hash_cadena_stellar_si_aplica"
   }
   ```

