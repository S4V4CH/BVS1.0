"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketController = void 0;
const zod_1 = require("zod");
const emitSchema = zod_1.z.object({
    voteId: zod_1.z.string().uuid(),
    electionId: zod_1.z.string().min(1),
    voterToken: zod_1.z.string().min(10)
});
class TicketController {
    ticketService;
    constructor(ticketService) {
        this.ticketService = ticketService;
    }
    async handleEmit(request, reply) {
        try {
            const payload = emitSchema.parse(request.body);
            const result = await this.ticketService.emitTicket(payload);
            return reply.status(202).send(result);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return reply.status(400).send({ error: 'Bad Request', details: error.errors });
            }
            request.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: error.message
            });
        }
    }
}
exports.TicketController = TicketController;
