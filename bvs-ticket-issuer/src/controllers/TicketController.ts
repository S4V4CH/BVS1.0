import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TicketService } from '../services/TicketService';

const emitSchema = z.object({
  voteId: z.string().uuid(),
  electionId: z.string().min(1),
  voterToken: z.string().min(10)
});

export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  async handleEmit(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = emitSchema.parse(request.body);

      const result = await this.ticketService.emitTicket(payload);

      return reply.status(202).send(result);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
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
