import pino from 'pino';
import { TicketEmission } from '../../domain/entities/TicketEmission';
import { ValidationError } from '../../domain/errors/ValidationError';
import {
  EmitTicketCommand,
  EmitTicketResult,
  IEmitTicketUseCase,
} from '../../domain/ports/in/IEmitTicketUseCase';
import { IBlockchainPort } from '../../domain/ports/out/IBlockchainPort';
import { IEventNotifier } from '../../domain/ports/out/IEventNotifier';
import { ITicketRepository } from '../../domain/ports/out/ITicketRepository';
import { ValidatorChain } from '../validations/ValidatorChain';

const logger = pino({ name: 'EmitTicketHandler' });

export class EmitTicketHandler implements IEmitTicketUseCase {
  constructor(
    private readonly repository: ITicketRepository,
    private readonly blockchainPort: IBlockchainPort,
    private readonly eventNotifier: IEventNotifier,
    private readonly validatorChain: ValidatorChain
  ) {}

  async execute(command: EmitTicketCommand): Promise<EmitTicketResult> {
    logger.info({ voteId: command.voteId }, 'Starting ticket emission process');

    const validationResult = await this.validatorChain.handle(command);
    if (!validationResult.isValid) {
      throw new ValidationError(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    const existingTicket = await this.repository.findById(command.voteId);
    if (existingTicket) {
      return this.toEmitResult(existingTicket);
    }

    const ticket = TicketEmission.create({
      voteId: command.voteId,
      electionId: command.electionId,
      voterToken: command.voterToken,
    });

    await this.repository.save(ticket);

    try {
      const txHash = await this.blockchainPort.emitVoteTransaction({
        voteId: ticket.voteId,
        electionId: ticket.electionId,
        voterToken: ticket.voterToken,
      });

      ticket.markAsConfirmed(txHash);
      await this.repository.update(ticket);

      await this.eventNotifier.notifyEmissionResult({
        voteId: ticket.voteId,
        status: 'CONFIRMED',
        txHash,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Stellar error';
      logger.error({ voteId: ticket.voteId, err: message }, 'Stellar emission failed');

      ticket.markAsFailed(message);
      await this.repository.update(ticket);

      await this.eventNotifier.notifyEmissionResult({
        voteId: ticket.voteId,
        status: 'FAILED',
        errorMessage: ticket.errorMessage!,
      });
    }

    return this.toEmitResult(ticket);
  }

  private toEmitResult(ticket: TicketEmission): EmitTicketResult {
    return {
      voteId: ticket.voteId,
      status: ticket.status,
      txHash: ticket.txHash,
      errorMessage: ticket.errorMessage,
    };
  }
}
