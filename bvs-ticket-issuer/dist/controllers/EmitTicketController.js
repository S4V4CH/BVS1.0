"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmitTicketController = void 0;
const zod_1 = require("zod");
const DomainErrors_1 = require("../models/errors/DomainErrors");
const emitSchema = zod_1.z.object({
    voteId: zod_1.z.string().uuid(),
    electionId: zod_1.z.string().min(1),
    voterToken: zod_1.z.string().min(10)
});
class EmitTicketController {
    useCase;
    constructor(useCase) {
        this.useCase = useCase;
    }
    async handleEmit(request, reply) {
        try {
            const payload = emitSchema.parse(request.body);
            // Delegar todo el peso al Dominio/Aplicación
            await this.useCase.execute(payload);
            return reply.status(202).send({
                status: 'ACCEPTED',
                message: 'Ticket emission flow completed successfully'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return reply.status(400).send({ error: 'Bad Request', details: error.errors });
            }
            if (error instanceof DomainErrors_1.ValidationError) {
                return reply.status(400).send({ error: 'Validation Error', message: error.message });
            }
            if (error instanceof DomainErrors_1.TicketAlreadyExistsError) {
                return reply.status(409).send({ error: 'Conflict', message: error.message });
            }
            if (error instanceof DomainErrors_1.BlockchainBroadcastError) {
                // En una API robusta, una falla remota de un tercero es un Bad Gateway o Service Unavailable
                return reply.status(502).send({ error: 'Bad Gateway', message: 'Failed to interact with the blockchain' });
            }
            request.log.error(error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    }
}
exports.EmitTicketController = EmitTicketController;
