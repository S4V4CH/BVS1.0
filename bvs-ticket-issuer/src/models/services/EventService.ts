import pino from 'pino';

const logger = pino({ name: 'EventService' });

export interface EventPayload {
  voteId: string;
  status: 'CONFIRMED' | 'FAILED';
  txHash?: string;
  errorMessage?: string;
}

export class EventService {
  constructor(private readonly webhookUrl: string) {}

  async notifyEmissionResult(payload: EventPayload): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voteId: payload.voteId,
          status: payload.status,
          txHash: payload.txHash || undefined
        })
      });

      if (!response.ok) {
        logger.error({ status: response.status }, "Webhook responded with non-ok status");
      } else {
        logger.info({ voteId: payload.voteId }, "Webhook notified successfully");
      }
    } catch (error: any) {
      logger.error({ err: error.message }, "Failed to notify via webhook");
    }
  }
}
