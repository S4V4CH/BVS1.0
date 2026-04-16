import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { IEmitTicketUseCase } from '../../../domain/ports/in/EmitTicketUseCase';
import { TicketAlreadyExistsError, BlockchainBroadcastError, ValidationError } from '../../../domain/errors/DomainErrors';

const emitSchema = z.object({
  voteId: z.string().uuid(),
  electionId: z.string().min(1),
  voterToken: z.string().min(10)
});

export class EmitTicketController {
  constructor(private readonly useCase: IEmitTicketUseCase) {}

  async handleEmit(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = emitSchema.parse(request.body);

      // Delegar todo el peso al Dominio/Aplicación
      await this.useCase.execute(payload);

      return reply.status(202).send({
        status: 'ACCEPTED',
        message: 'Ticket emission flow completed successfully'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Bad Request', details: error.errors });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: 'Validation Error', message: error.message });
      }
      if (error instanceof TicketAlreadyExistsError) {
        return reply.status(409).send({ error: 'Conflict', message: error.message });
      }
      if (error instanceof BlockchainBroadcastError) {
        // En una API robusta, una falla remota de un tercero es un Bad Gateway o Service Unavailable
        return reply.status(502).send({ error: 'Bad Gateway', message: 'Failed to interact with the blockchain' });
      }
      
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
}
