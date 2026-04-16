import { FastifyInstance } from 'fastify';
import { EmitTicketController } from './controllers/EmitTicketController';

export async function setupRoutes(
  fastify: FastifyInstance, 
  emitTicketController: EmitTicketController
) {
  // Integración principal
  fastify.post('/api/v1/tickets/emit', emitTicketController.handleEmit.bind(emitTicketController));
  
  // Endpoint de salud útil para Docker Healthchecks o Kubernetes
  fastify.get('/health', async () => {
    return { status: 'OK', service: 'bvs-ticket-issuer' };
  });
}
