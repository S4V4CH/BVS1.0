# Checklist de regresión — bvs-ticket-issuer (hexagonal)

Validar tras cada fase de migración con Docker (`docker compose up`) y/o `npm run dev`.

## Contrato HTTP

- [ ] `GET /health` → `200` con `{ status: 'OK', service: 'bvs-ticket-issuer' }`
- [ ] `POST /api/v1/tickets/emit` con body válido → `202` y cuerpo:
  ```json
  { "voteId": "<uuid>", "status": "CONFIRMED|FAILED|PENDING", "txHash": "<hash|null>", "errorMessage": "<string|null>" }
  ```
- [ ] Body inválido (UUID mal formado) → `400` con detalles Zod
- [ ] Error de validación de negocio (cadena) → `500` con mensaje (comportamiento legacy)

## Flujo feliz

- [ ] Primera emisión con `voteId` nuevo → estado `CONFIRMED` y `txHash` presente (testnet + fondos)
- [ ] Webhook recibe POST con `{ voteId, status, txHash? }` en éxito

## Idempotencia

- [ ] Segundo `POST` con el mismo `voteId` → `202` con el mismo estado/hash sin duplicar fila en BD

## Fallo Stellar

- [ ] Sin fondos / red caída → estado `FAILED`, `errorMessage` poblado, webhook con `status: FAILED`

## Frontend tester

- [ ] Panel emite ticket y polling Horizon sigue funcionando (proxy `/api` → backend)

## Build

- [ ] `npm run build` sin errores TypeScript
- [ ] `npm test` (cuando existan tests unitarios)
