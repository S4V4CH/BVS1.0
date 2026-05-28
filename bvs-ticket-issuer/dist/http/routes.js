"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
async function setupRoutes(fastify, ticketController) {
    fastify.post('/api/v1/tickets/emit', ticketController.handleEmit.bind(ticketController));
    fastify.get('/health', async () => {
        return { status: 'OK', service: 'bvs-ticket-issuer' };
    });
}
