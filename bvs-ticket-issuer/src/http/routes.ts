import { FastifyInstance } from 'fastify';
import { TicketController } from '../controllers/TicketController';

export async function setupRoutes(
  fastify: FastifyInstance, 
  ticketController: TicketController
) {
  fastify.post('/api/v1/tickets/emit', ticketController.handleEmit.bind(ticketController));
  
  fastify.get('/health', async () => {
    return { status: 'OK', service: 'bvs-ticket-issuer' };
  });
}
