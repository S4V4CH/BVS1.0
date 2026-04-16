Contexto del proyecto
El proyecto se llama BVS (Blockchain Voting System). Es un sistema de votación estudiantil universitario que utiliza blockchain para garantizar transparencia e inmutabilidad en los resultados. El sistema completo tiene cuatro módulos: Censo KYC, Emisor de Tickets, Urna Digital y Panel de Resultados. Sin embargo, el módulo a desarrollar ahora es únicamente el Emisor de Tickets.
¿Qué hace el Emisor de Tickets?
Es un microservicio independiente que actúa como puente entre el backend principal del sistema y la red blockchain Stellar. Su responsabilidad es: recibir una solicitud de emisión de ticket ya validada, construir y firmar una transacción en Stellar, emitirla a la red, persistir el estado de esa emisión off-chain, y comunicar el resultado hacia afuera sin exponer detalles internos del SDK ni de Stellar.
Stack tecnológico definido

Lenguaje: TypeScript
Runtime: Node.js
Framework: Fastify
Blockchain: @stellar/stellar-sdk (Testnet)
Base de datos off-chain: PostgreSQL
ORM: Prisma
Logs: Pino
Contenedor: Docker

Arquitectura
El módulo debe seguir arquitectura hexagonal (puertos y adaptadores). El núcleo de dominio no debe referenciar directamente el SDK de Stellar ni Prisma; esas dependencias deben vivir en adaptadores intercambiables.
Patrones de diseño a aplicar

Adapter: puente entre el núcleo y el SDK de Stellar
Repository: abstracción del almacenamiento off-chain con Prisma
Strategy: para la lógica de firma de transacciones (intercambiable)
Command: cada solicitud de emisión se encapsula como un comando
Chain of Responsibility: pipeline de validaciones antes de emitir
Observer / Event Emitter: para notificar resultados sin acoplar módulos

Requisitos funcionales del módulo

RF-ME-01: Aceptar solicitud de emisión desde el backend y construir la operación para Stellar
RF-ME-02: Enviar la transacción a Stellar y capturar el resultado o error
RF-ME-03: Persistir y actualizar el estado de la emisión off-chain (pendiente, confirmada, fallida) con correlación al registro local
RF-ME-04: Validar integridad y consistencia de los datos de entrada, rechazando solicitudes inválidas con causa trazable
RF-ME-05: Comunicar resultados mediante puertos, sin que el dominio dependa del SDK ni de Stellar directamente
RF-ME-06: Registrar logs estructurados para auditoría y gestionar reintentos o finalización ante fallos

Requisitos no funcionales clave

La lógica de armado de la transacción debe estar aislada del transporte y bibliotecas externas
Las credenciales criptográficas no deben exponerse en logs ni respuestas de error
Las llamadas a Stellar deben tener timeouts explícitos para evitar bloqueos
El estado off-chain debe ser coherente incluso ante caídas del almacenamiento
Debe existir trazabilidad entre el identificador local del voto y los datos on-chain
La auditoría no debe almacenar datos que comprometan el anonimato del votante
Debe definirse política explícita de reintentos con límites e idempotencia
