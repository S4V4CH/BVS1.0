import { FastifyInstance } from 'fastify';
import { EmitTicketController } from './controllers/EmitTicketController';

export async function setupRoutes(
  fastify: FastifyInstance,
  emitTicketController: EmitTicketController
) {
  fastify.post(
    '/api/v1/tickets/emit',
    emitTicketController.handleEmit.bind(emitTicketController)
  );

  fastify.get('/health', async () => {
    return { status: 'OK', service: 'bvs-ticket-issuer' };
  });
}
