# Arquitectura del sistema BVS

---

## Por qué el backend usa MVC

El backend (`bvs-ticket-issuer`) es una **API REST**: recibe una petición HTTP, hace trabajo y devuelve JSON. No hay pantalla, no hay estado de interfaz. Por eso el patrón que mejor describe su forma de trabajar es **MVC**:

- **Model** — los datos y las reglas del negocio: la entidad `TicketEmission`, el repositorio que guarda en PostgreSQL y los servicios que se comunican con Stellar y webhooks.
- **View** — en una API, la "vista" es la **respuesta JSON**. El controlador arma ese JSON y elige el código HTTP (202, 400, 500).
- **Controller** — `TicketController` recibe la petición, valida el formato con Zod y delega todo el trabajo al Service.

Hay una capa extra entre Controller y Model: el **Service** (`TicketService`). Es el responsable de orquestar el caso de uso completo: validar las reglas de negocio, guardar el ticket, llamar a Stellar y notificar el resultado. Esto es normal en MVC moderno; el Service evita que el Controller crezca con lógica y que el Model haga cosas que no le corresponden.

---

## Por qué el frontend usa MVVM

El frontend (`bvs-frontend-tester`) es una **interfaz de usuario en React**. Aquí sí hay estado visual: campos de formulario, logs en pantalla, botones que se deshabilitan, un hash que aparece al confirmar. Por eso aplica **MVVM**:

- **Model** — `TicketService.ts`: hace el `fetch` al backend y consulta Stellar Horizon. No sabe nada de la pantalla.
- **View** — el componente `Dashboard.tsx`: solo renderiza lo que le llega. No tiene lógica propia.
- **ViewModel** — `useTicketViewModel.ts`: un hook de React que maneja todo el estado (carga, logs, hash, errores), llama al Model y expone datos y acciones a la View.

La diferencia clave con MVC es que en MVVM **el ViewModel no devuelve una respuesta puntual**: mantiene **estado observable** que la View refleja en todo momento. Eso encaja con cómo funciona React (renderizado reactivo al estado).

---

## Patrones de diseño usados

### Cadena de responsabilidad — backend
Los validadores del backend están encadenados: cada uno revisa una regla y pasa al siguiente si todo está bien. Así se pueden agregar o quitar reglas sin tocar el flujo principal.

Ejemplo: primero se valida que `voteId` sea un UUID válido, luego que `voterToken` tenga al menos 10 caracteres.

### Strategy — backend
La forma de firmar transacciones en Stellar está separada del resto. Hoy se usa una clave local (`LocalKeyStrategy`), pero se puede cambiar por otra estrategia (HSM, KMS) sin reescribir el servicio Stellar.

### Repository — backend
`TicketRepository` encapsula todo lo relacionado con Prisma. El Service nunca escribe SQL ni llama a Prisma directamente; le pide al repositorio que guarde o busque tickets. Esto facilita cambiar la base de datos en el futuro.

---

## Cómo se conectan los dos sistemas

```
Usuario
   │
   ▼
Dashboard.tsx  (View — React)
   │  llama a
   ▼
useTicketViewModel.ts  (ViewModel — hook)
   │  llama a
   ▼
TicketService.ts  (Model — fetch)
   │  POST /api/v1/tickets/emit
   │  (Vite reenvía al backend en localhost:3000)
   ▼
TicketController.ts  (Controller — Fastify)
   │  delega a
   ▼
TicketService.ts  (Service — orquestación)
   │  usa
   ├─▶ TicketRepository  →  PostgreSQL
   ├─▶ StellarService    →  Stellar Testnet
   └─▶ EventService      →  Webhook
```

El proxy de Vite es el puente en desarrollo: el frontend hace `fetch('/api/...')` a su propio puerto (5173/5174) y Vite reenvía silenciosamente esa petición al backend en el puerto 3000. El navegador nunca habla directamente con el puerto 3000, lo que evita problemas de CORS.

---

## Resumen en una frase por patrón

| Parte | Patrón | Por qué |
|-------|--------|---------|
| Backend | **MVC** | API REST sin UI; Controller + Service + Model separan entrada, lógica y datos. |
| Frontend | **MVVM** | UI reactiva; el ViewModel mantiene estado observable que la View refleja. |
| Validaciones | **Cadena de responsabilidad** | Reglas encadenadas, fáciles de ampliar sin tocar el flujo. |
| Firma Stellar | **Strategy** | Permite cambiar el método de firma sin reescribir la integración. |
| Acceso a BD | **Repository** | Abstrae Prisma; el resto del código no sabe cómo se persiste. |
