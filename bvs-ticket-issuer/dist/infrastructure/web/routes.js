"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
async function setupRoutes(fastify, emitTicketController) {
    fastify.post('/api/v1/tickets/emit', emitTicketController.handleEmit.bind(emitTicketController));
    fastify.get('/health', async () => {
        return { status: 'OK', service: 'bvs-ticket-issuer' };
    });
}
