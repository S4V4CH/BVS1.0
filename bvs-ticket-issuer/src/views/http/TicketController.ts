import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { TicketViewModel } from '../../viewmodels/TicketViewModel';

const emitSchema = z.object({
  voteId: z.string().uuid(),
  electionId: z.string().min(1),
  voterToken: z.string().min(10)
});

export class TicketController {
  constructor(private readonly viewModel: TicketViewModel) {}

  async handleEmit(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = emitSchema.parse(request.body);

      // MVVM: The View calls the ViewModel
      const result = await this.viewModel.emitTicket(payload);

      // Return the transformed data from ViewModel
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
