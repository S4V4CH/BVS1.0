# Arquitectura del sistema BVS

---

## Backend: arquitectura hexagonal

El backend (`bvs-ticket-issuer`) sigue **puertos y adaptadores**:

- **Dominio** (`src/domain/`) — entidad `TicketEmission`, puertos (`ITicketRepository`, `IBlockchainPort`, `IEventNotifier`, `IEmitTicketUseCase`) y errores de negocio. Sin Prisma, Stellar ni Fastify.
- **Aplicación** (`src/application/`) — `EmitTicketHandler` orquesta el caso de uso; validadores en cadena de responsabilidad.
- **Infraestructura** (`src/infrastructure/`) — adaptadores: `PrismaTicketRepository`, `StellarAdapter`, `HttpEventNotifier`, `EmitTicketController` + Fastify.
- **Composition root** — `src/index.ts` ensambla dependencias concretas.

---

## Frontend: MVVM

El frontend (`bvs-frontend-tester`) usa **MVVM** (sin cambios en esta migración):

- **Model** — cliente HTTP y polling Horizon.
- **View** — `Dashboard.tsx`.
- **ViewModel** — `useTicketViewModel.ts`.

---

## Flujo de emisión de ticket

```
Usuario → Dashboard (View)
       → useTicketViewModel (ViewModel)
       → TicketService cliente (Model)
       → POST /api/v1/tickets/emit
       → EmitTicketController (adaptador entrante)
       → EmitTicketHandler (caso de uso)
       → PrismaTicketRepository | StellarAdapter | HttpEventNotifier
```

---

## Patrones de diseño

| Patrón | Ubicación |
|--------|-----------|
| Command | `EmitTicketCommand` / `IEmitTicketUseCase` |
| Chain of Responsibility | `application/validations/` |
| Factory Method | `domain/entities/TicketEmission` |
| Strategy | `infrastructure/blockchain/strategies/` |
| Adapter | `StellarAdapter`, `HttpEventNotifier` |
| Repository | `PrismaTicketRepository` implementa `ITicketRepository` |

---

## Resumen

| Parte | Arquitectura |
|-------|----------------|
| Backend | Hexagonal (dominio + aplicación + infraestructura) |
| Frontend | MVVM |
