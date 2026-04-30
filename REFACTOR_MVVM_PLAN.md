# INSTRUCCIONES DE REFACTORIZACIÓN: TRANSICIÓN A ARQUITECTURA MVVM

> **Estado actual (backend):** `bvs-ticket-issuer` ya está en **MVC** (`controllers/`, `services/`, `models/`, `http/`). Las secciones de backend más abajo son históricas; el mapa vigente coincide con la estructura MVC del código.

## 1. OBJETIVO GENERAL
Transformar el ecosistema BVS (Backend y Frontend) de su arquitectura Hexagonal actual a un modelo **MVVM (Model-View-ViewModel)**. El objetivo es centralizar la lógica de estado y transformación en ViewModels, simplificar las Vistas y robustecer el Modelo de datos y servicios.

## 2. STACK TECNOLÓGICO OBLIGATORIO
- **Blockchain:** @stellar/stellar-sdk (Testnet).
- **Persistencia:** Prisma ORM con PostgreSQL.
- **Lenguaje:** TypeScript.
- **Entorno:** Docker con Dev Containers.
- **Resto del Stack (Sugerido para MVVM):** Fastify (Backend), React con Hooks/Context o Valtio/Zustand (Frontend para binding de estado).

---

## 3. MAPA DE REESTRUCTURACIÓN DE DIRECTORIOS

### A. Backend (`bvs-ticket-issuer`) — **implementado como MVC**
Estructura vigente:
```text
src/
├── models/            # Entidades, persistencia, integraciones (Stellar, eventos), validadores
│   ├── entities/
│   ├── persistence/
│   ├── services/
│   └── validators/
├── services/          # Orquestación del caso de uso (p. ej. TicketService)
├── controllers/       # HTTP + Zod (p. ej. TicketController)
├── http/              # Fastify: servidor y registro de rutas
└── config/
```

### B. Frontend (`bvs-frontend-tester`)
Reestructurar a:
```text
src/
├── models/            # Clientes de API y tipos de datos
├── viewmodels/        # Hooks personalizados o clases de estado que manejan la lógica de UI
└── views/             # Componentes React (SFC - Stateless Functional Components)
    ├── components/
    └── pages/
```

---

## 4. GUÍA DE IMPLEMENTACIÓN POR CAPA (BACKEND)

### CAPA 1: MODEL (El Corazón de Datos)
1. **Acción:** Mover la lógica de `infrastructure/persistence` y `infrastructure/blockchain` a `models/services`.
2. **Regla:** El Modelo es el único que habla con Prisma y Stellar.
3. **Stellar Service:** Debe exponer métodos simples como `emitToStellar(data): Promise<string>`. No debe contener lógica de negocio, solo ejecución técnica.

### CAPA 2: VIEWMODEL (El Cerebro)
1. **Acción:** Fusionar `application/use-cases` y los "Ports" en ViewModels.
2. **Responsabilidad:**
   - Recibir el comando desde la Vista.
   - Ejecutar la `Chain of Responsibility` para validar.
   - Llamar a los servicios del Modelo.
   - **Data Binding:** Transformar la entidad de base de datos a un formato listo para la Vista (UI/JSON).
3. **Patrón:** Cada "Vista" (Endpoint) debe tener un ViewModel o método en un ViewModel encargado de preparar su estado.

### CAPA 3: VIEW (La Interfaz HTTP)
1. **Acción:** Los controladores en `infrastructure/web/controllers` se convierten en "Views".
2. **Regla:** La Vista es pasiva. Solo captura el Request, llama al ViewModel y devuelve el resultado que el ViewModel ya preparó.

---

## 5. GUÍA DE IMPLEMENTACIÓN POR CAPA (FRONTEND)

1. **Model:** Crear servicios que encapsulen las llamadas `fetch` al Backend.
2. **ViewModel:** Implementar React Hooks (ej: `useTicketEmission`) que gestionen el estado de carga, errores y éxito. Este Hook es el ViewModel.
3. **View:** Los componentes en `src/views` no deben tener `useEffect` complejos ni lógica de validación; deben consumir el Hook (ViewModel) y renderizar.

---

## 6. CONFIGURACIÓN DEL ENTORNO (DEV CONTAINER)

Crear en la raíz un `.devcontainer/` con:
1. **docker-compose.yml:** Definir servicios para `node` y `postgres`.
2. **devcontainer.json:** 
   - Instalar extensiones de: Prisma, ESLint, Prettier y Docker.
   - Configurar `forwardPorts` para el puerto 3000 (Backend) y 5173 (Frontend).
   - Inyectar variables de entorno (`DATABASE_URL`, `STELLAR_NETWORK`).

---

## 7. PASOS DE EJECUCIÓN PARA CLAUDE CODE

1. **Fase de Preparación:** Crear el archivo `.env` y el `devcontainer` para asegurar que el entorno sea estable.
2. **Fase de Modelo:** Migrar el esquema de Prisma y los adaptadores de Stellar a la nueva carpeta `models/services`.
3. **Fase de ViewModel:** Refactorizar los `Handlers` actuales a clases `ViewModel`. Eliminar la abstracción de "Puertos" si genera sobrecarga innecesaria para el modelo MVVM, pero mantener la inyección de dependencias.
4. **Fase de Vista:** Actualizar las rutas de Fastify y los componentes de React para conectarse a los nuevos ViewModels.
5. **Fase de Limpieza:** Eliminar las carpetas `domain`, `application` e `infrastructure` del backend para consolidar la nueva arquitectura.
6. **Validación:** Ejecutar `prisma generate` y verificar la conectividad con la Testnet de Stellar.

## 8. NOTAS DE ARQUITECTO
- **Mantenimiento:** La cadena de validación del backend vive en `models/validators/`; en el frontend, los hooks de UI pueden seguir en `viewmodels/`.
- **Idempotencia:** Asegurar que el ViewModel gestione correctamente el estado de los tickets para evitar dobles emisiones en Stellar.
