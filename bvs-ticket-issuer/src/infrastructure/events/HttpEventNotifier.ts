import { IEventNotifier, EventPayload } from '../../domain/ports/out/EventNotifier';
import pino from 'pino';

const logger = pino({ name: 'HttpEventNotifier' });

export class HttpEventNotifier implements IEventNotifier {
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
