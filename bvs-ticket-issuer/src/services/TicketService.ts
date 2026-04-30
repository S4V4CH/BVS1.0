import pino from 'pino';
import { TicketRepository } from '../models/persistence/TicketRepository';
import { StellarService } from '../models/services/StellarService';
import { EventService } from '../models/services/EventService';
import { TicketEmission } from '../models/entities/TicketEmission';
import { ValidatorChain } from '../models/validators/ValidatorChain';

const logger = pino({ name: 'TicketService' });

export interface EmitTicketRequest {
  voteId: string;
  electionId: string;
  voterToken: string;
}

/** Cuerpo de respuesta JSON del caso emit (capa de presentación del recurso). */
export interface EmitTicketResponse {
  voteId: string;
  status: string;
  txHash: string | null;
  errorMessage: string | null;
}

export class TicketService {
  constructor(
    private readonly repository: TicketRepository,
    private readonly stellarService: StellarService,
    private readonly eventService: EventService,
    private readonly validatorChain: ValidatorChain
  ) {}

  async emitTicket(request: EmitTicketRequest): Promise<EmitTicketResponse> {
    logger.info({ voteId: request.voteId }, "Starting ticket emission process");

    // 1. Validation
    const validationResult = await this.validatorChain.handle(request);
    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    // 2. Idempotency Check
    const existingTicket = await this.repository.findById(request.voteId);
    if (existingTicket) {
      return this.toEmitResponse(existingTicket);
    }

    // 3. Create Model
    const ticket = TicketEmission.create({
      voteId: request.voteId,
      electionId: request.electionId,
      voterToken: request.voterToken
    });

    await this.repository.save(ticket);

    // 4. Stellar Interaction (Async background task would be better, but keeping flow for now)
    try {
      const txHash = await this.stellarService.emitToStellar({
        voteId: ticket.voteId,
        electionId: ticket.electionId,
        voterToken: ticket.voterToken
      });

      ticket.markAsConfirmed(txHash);
      await this.repository.update(ticket);
      
      await this.eventService.notifyEmissionResult({
        voteId: ticket.voteId,
        status: 'CONFIRMED',
        txHash
      });

    } catch (error: any) {
      logger.error({ voteId: ticket.voteId, err: error.message }, "Stellar emission failed");
      
      ticket.markAsFailed(error.message || 'Stellar error');
      await this.repository.update(ticket);

      await this.eventService.notifyEmissionResult({
        voteId: ticket.voteId,
        status: 'FAILED',
        errorMessage: ticket.errorMessage!
      });
    }

    return this.toEmitResponse(ticket);
  }

  private toEmitResponse(ticket: TicketEmission): EmitTicketResponse {
    return {
      voteId: ticket.voteId,
      status: ticket.status,
      txHash: ticket.txHash,
      errorMessage: ticket.errorMessage
    };
  }
}
