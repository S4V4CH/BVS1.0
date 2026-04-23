import type { EmitPayload } from '../models/types';

/**
 * API service (cliente → backend) — mismo contrato que el fetch original.
 */
export async function postEmitTicket(payload: EmitPayload): Promise<{
  ok: boolean;
  data: { message?: string; error?: string; [k: string]: unknown };
}> {
  const response = await fetch('/api/v1/tickets/emit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { message?: string; error?: string; [k: string]: unknown };
  return { ok: response.ok, data };
}
