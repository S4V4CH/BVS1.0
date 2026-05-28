import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { IEmitTicketUseCase } from '../../../domain/ports/in/IEmitTicketUseCase';

const emitSchema = z.object({
  voteId: z.string().uuid(),
  electionId: z.string().min(1),
  voterToken: z.string().min(10),
});

export class EmitTicketController {
  constructor(private readonly emitTicketUseCase: IEmitTicketUseCase) {}

  async handleEmit(request: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = emitSchema.parse(request.body);

      const result = await this.emitTicketUseCase.execute(payload);

      return reply.status(202).send(result);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Bad Request', details: error.errors });
      }

      request.log.error(error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';

      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
      });
    }
  }
}
