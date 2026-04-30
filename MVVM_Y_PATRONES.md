# MVVM Y PATRONES EN ESTE PROYECTO

Este documento explica, en lenguaje simple, como se aplica MVVM en este proyecto y que patrones de diseno aparecen en el codigo. Tambien describe el flujo de la arquitectura y como se conectan esos patrones.

---

## 1) MVVM EN EL BACKEND (bvs-ticket-issuer)

En un backend, MVVM no significa "pantallas". Aqui se usa para separar responsabilidades:

- Model: datos y servicios tecnicos. Guarda y consulta informacion (Prisma, PostgreSQL) y hace integraciones (Stellar, eventos).
- ViewModel: orquesta el caso de uso. Valida, llama al Model y prepara el resultado.
- View: la capa HTTP. Solo recibe el request y devuelve la respuesta.

### Ejemplo real en el proyecto

- View: [bvs-ticket-issuer/src/views/http/TicketController.ts](bvs-ticket-issuer/src/views/http/TicketController.ts)
  - Recibe la solicitud HTTP.
  - Valida esquema con Zod.
  - Llama al ViewModel.

- ViewModel: [bvs-ticket-issuer/src/viewmodels/TicketViewModel.ts](bvs-ticket-issuer/src/viewmodels/TicketViewModel.ts)
  - Valida reglas de negocio.
  - Asegura idempotencia (si el ticket ya existe, no emite de nuevo).
  - Guarda en base de datos.
  - Llama a Stellar y envia notificaciones.
  - Devuelve un DTO simple para la vista.

- Model:
  - Persistencia: [bvs-ticket-issuer/src/models/persistence/TicketRepository.ts](bvs-ticket-issuer/src/models/persistence/TicketRepository.ts)
  - Entidad: [bvs-ticket-issuer/src/models/entities/TicketEmission.ts](bvs-ticket-issuer/src/models/entities/TicketEmission.ts)
  - Servicios: [bvs-ticket-issuer/src/models/services](bvs-ticket-issuer/src/models/services)

**Idea clave:** la "View" (controlador) es pasiva y delega todo al ViewModel.

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

- Donde: [bvs-ticket-issuer/src/viewmodels/validators/ValidatorChain.ts](bvs-ticket-issuer/src/viewmodels/validators/ValidatorChain.ts)
- Que hace: encadena validadores, cada uno decide si agrega errores.
- Por que ayuda: es facil agregar o quitar reglas sin tocar el flujo principal.

### Strategy (Estrategia de firma)

- Donde: [bvs-ticket-issuer/src/models/services/strategies/SigningStrategy.ts](bvs-ticket-issuer/src/models/services/strategies/SigningStrategy.ts) y [bvs-ticket-issuer/src/models/services/strategies/LocalKeyStrategy.ts](bvs-ticket-issuer/src/models/services/strategies/LocalKeyStrategy.ts)
- Que hace: define una interfaz de firma y permite varias formas de firmar.
- Por que ayuda: puedes cambiar el metodo de firma sin reescribir el servicio Stellar.

### Repository (Repositorio)

- Donde: [bvs-ticket-issuer/src/models/persistence/TicketRepository.ts](bvs-ticket-issuer/src/models/persistence/TicketRepository.ts)
- Que hace: encapsula el acceso a la base de datos.
- Por que ayuda: el ViewModel no sabe detalles de Prisma.

### DTO / Mapper (Transformacion de datos)

- Donde: metodo `mapToView()` en [bvs-ticket-issuer/src/viewmodels/TicketViewModel.ts](bvs-ticket-issuer/src/viewmodels/TicketViewModel.ts)
- Que hace: transforma la entidad a un formato simple para la respuesta.
- Por que ayuda: evita exponer el modelo interno.

### Service Layer (Capa de servicios)

- Donde: [bvs-ticket-issuer/src/models/services](bvs-ticket-issuer/src/models/services) y [bvs-frontend-tester/src/models/TicketService.ts](bvs-frontend-tester/src/models/TicketService.ts)
- Que hace: encapsula integraciones externas y logica tecnica.
- Por que ayuda: la vista y el ViewModel quedan limpios.

---

## 4) FLUJO DE LA ARQUITECTURA (FIN A FIN)

### Flujo principal: "emitir ticket"

1) UI (View) recibe accion del usuario.
2) ViewModel de frontend valida datos basicos y llama al Model (servicio).
3) Servicio del frontend llama al endpoint HTTP.
4) Controller (View del backend) valida el schema y llama al ViewModel.
5) ViewModel del backend ejecuta validaciones (cadena de responsabilidad).
6) ViewModel guarda/consulta en el repositorio.
7) ViewModel llama a Stellar y actualiza estado.
8) ViewModel retorna un DTO simple al Controller.
9) Controller devuelve la respuesta al frontend.
10) Frontend actualiza logs y estado de UI.

---

## 5) RESUMEN SIMPLE (PARA QUIEN EMPIEZA)

- MVVM divide el trabajo en tres partes: datos (Model), logica y estado (ViewModel), y presentacion (View).
- En el backend, "View" significa controlador HTTP.
- Los patrones (Repository, Strategy, Chain of Responsibility) ayudan a que el codigo sea mas ordenado y facil de mantener.
- El flujo es claro: UI -> ViewModel -> Model -> (respuesta) -> View.

Si quieres, puedo agregar un diagrama visual o un ejemplo paso a paso con datos reales.