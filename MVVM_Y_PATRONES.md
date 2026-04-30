# MVVM Y PATRONES EN ESTE PROYECTO

Este documento explica, en lenguaje simple, como se aplica MVVM en este proyecto y que patrones de diseno aparecen en el codigo. Tambien describe el flujo de la arquitectura y como se conectan esos patrones.

---

## 1) MVC EN EL BACKEND (bvs-ticket-issuer)

En la API REST, MVC se entiende asi:

- **Controller:** capa HTTP (Fastify). Recibe el request, valida entrada (Zod), delega y devuelve JSON.
- **Service:** orquesta el caso de uso (validacion en cadena, idempotencia, persistencia, Stellar, webhooks). Equivale a la capa de aplicacion entre Controller y Model.
- **Model:** entidades, persistencia (Prisma), integraciones tecnicas (Stellar, eventos).

### Ejemplo real en el proyecto

- Controller: [bvs-ticket-issuer/src/controllers/TicketController.ts](bvs-ticket-issuer/src/controllers/TicketController.ts)
  - Valida el cuerpo con Zod.
  - Llama a `TicketService.emitTicket` y envia la respuesta HTTP.

- Service: [bvs-ticket-issuer/src/services/TicketService.ts](bvs-ticket-issuer/src/services/TicketService.ts)
  - Valida reglas de negocio.
  - Idempotencia (si el ticket ya existe, devuelve el estado existente).
  - Persistencia, Stellar y notificaciones.
  - Devuelve un DTO JSON (`EmitTicketResponse`).

- Model:
  - Persistencia: [bvs-ticket-issuer/src/models/persistence/TicketRepository.ts](bvs-ticket-issuer/src/models/persistence/TicketRepository.ts)
  - Entidad: [bvs-ticket-issuer/src/models/entities/TicketEmission.ts](bvs-ticket-issuer/src/models/entities/TicketEmission.ts)
  - Servicios de integracion: [bvs-ticket-issuer/src/models/services](bvs-ticket-issuer/src/models/services)
  - Validadores de cadena: [bvs-ticket-issuer/src/models/validators](bvs-ticket-issuer/src/models/validators)

- Arranque HTTP: [bvs-ticket-issuer/src/http](bvs-ticket-issuer/src/http) (servidor Fastify y rutas).

**Idea clave:** el Controller es delgado; la orquestacion vive en el Service; datos y adaptadores en Model.

---

## 2) MVVM EN EL FRONTEND (bvs-frontend-tester)

En el frontend, MVVM es mas cercano al concepto clasico:

- Model: servicios que hablan con el backend (fetch).
- ViewModel: maneja el estado de UI (loading, errores, logs, datos).
- View: componentes React que solo renderizan.

### Ejemplo real en el proyecto

- Model: [bvs-frontend-tester/src/models/TicketService.ts](bvs-frontend-tester/src/models/TicketService.ts)
  - Hace requests al backend.
  - Consulta Horizon de Stellar.

- ViewModel: [bvs-frontend-tester/src/viewmodels/useTicketViewModel.ts](bvs-frontend-tester/src/viewmodels/useTicketViewModel.ts)
  - Maneja estados de carga y mensajes.
  - Orquesta la accion "emitir ticket".

- View: [bvs-frontend-tester/src/views/pages/Dashboard.tsx](bvs-frontend-tester/src/views/pages/Dashboard.tsx)
  - Renderiza UI.
  - Solo llama al ViewModel.

---

## 3) PATRONES DE DISENO PRESENTES

### Chain of Responsibility (Cadena de Validacion)

- Donde: [bvs-ticket-issuer/src/models/validators/ValidatorChain.ts](bvs-ticket-issuer/src/models/validators/ValidatorChain.ts)
- Que hace: encadena validadores, cada uno decide si agrega errores.
- Por que ayuda: es facil agregar o quitar reglas sin tocar el flujo principal.

### Strategy (Estrategia de firma)

- Donde: [bvs-ticket-issuer/src/models/services/strategies/SigningStrategy.ts](bvs-ticket-issuer/src/models/services/strategies/SigningStrategy.ts) y [bvs-ticket-issuer/src/models/services/strategies/LocalKeyStrategy.ts](bvs-ticket-issuer/src/models/services/strategies/LocalKeyStrategy.ts)
- Que hace: define una interfaz de firma y permite varias formas de firmar.
- Por que ayuda: puedes cambiar el metodo de firma sin reescribir el servicio Stellar.

### Repository (Repositorio)

- Donde: [bvs-ticket-issuer/src/models/persistence/TicketRepository.ts](bvs-ticket-issuer/src/models/persistence/TicketRepository.ts)
- Que hace: encapsula el acceso a la base de datos.
- Por que ayuda: el Service no sabe detalles de Prisma.

### DTO / Mapper (Transformacion de datos)

- Donde: metodo `toEmitResponse()` en [bvs-ticket-issuer/src/services/TicketService.ts](bvs-ticket-issuer/src/services/TicketService.ts)
- Que hace: transforma la entidad a un formato simple para la respuesta.
- Por que ayuda: evita exponer el modelo interno.

### Service Layer (Capa de servicios)

- Donde: [bvs-ticket-issuer/src/models/services](bvs-ticket-issuer/src/models/services) y [bvs-frontend-tester/src/models/TicketService.ts](bvs-frontend-tester/src/models/TicketService.ts)
- Que hace: encapsula integraciones externas y logica tecnica.
- Por que ayuda: el Controller y el Service quedan limpios respecto a integraciones externas.

---

## 4) FLUJO DE LA ARQUITECTURA (FIN A FIN)

### Flujo principal: "emitir ticket"

1) UI (View) recibe accion del usuario.
2) ViewModel de frontend valida datos basicos y llama al Model (servicio).
3) Servicio del frontend llama al endpoint HTTP.
4) Controller del backend valida el schema (Zod) y llama al Service.
5) Service ejecuta validaciones (cadena de responsabilidad).
6) Service guarda/consulta en el repositorio (Model).
7) Service llama a Stellar y actualiza estado.
8) Service retorna un DTO simple al Controller.
9) Controller devuelve la respuesta al frontend.
10) Frontend actualiza logs y estado de UI.

---

## 5) RESUMEN SIMPLE (PARA QUIEN EMPIEZA)

- En el **backend**, el patron es **MVC** (Controller + Service + Model); la "View" de la API es el JSON que arma el Controller.
- En el **frontend** sigue siendo **MVVM** (View + ViewModel + Model).

Si quieres, puedo agregar un diagrama visual o un ejemplo paso a paso con datos reales.