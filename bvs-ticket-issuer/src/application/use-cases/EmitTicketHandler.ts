import pino from 'pino';
import { IEmitTicketUseCase, EmitTicketCommand } from '../../domain/ports/in/EmitTicketUseCase';
import { ITicketRepository } from '../../domain/ports/out/TicketRepository';
import { IBlockchainPort } from '../../domain/ports/out/BlockchainPort';
import { IEventNotifier } from '../../domain/ports/out/EventNotifier';
import { TicketEmission } from '../../domain/entities/TicketEmission';
import { TicketAlreadyExistsError, BlockchainBroadcastError, ValidationError } from '../../domain/errors/DomainErrors';
import { ValidatorChain } from '../validations/ValidatorChain';

// Normalmente el logger vendría inyectado, pero pino es estándar en el sistema
const logger = pino({ name: 'EmitTicketHandler' });

export class EmitTicketHandler implements IEmitTicketUseCase {
  constructor(
    private readonly repository: ITicketRepository,
    private readonly blockchainPort: IBlockchainPort,
    private readonly eventNotifier: IEventNotifier,
    private readonly validatorChain: ValidatorChain // Patrón Chain of Responsibility
  ) {}

  async execute(command: EmitTicketCommand): Promise<void> {
    logger.info({ voteId: command.voteId }, "Received EmitTicketCommand");

    // 1. Ejecutar validaciones de la cadena (Chain of Responsibility)
    const validationResult = await this.validatorChain.handle(command);
    if (!validationResult.isValid) {
      logger.warn({ voteId: command.voteId, errors: validationResult.errors }, "Validation failed");
      throw new ValidationError(validationResult.errors.join(', '));
    }

    // 2. Control de Idempotencia Local
    const existingTicket = await this.repository.findById(command.voteId);
    if (existingTicket) {
      logger.warn({ voteId: command.voteId }, "Ticket already exists, skipping workflow");
      throw new TicketAlreadyExistsError(command.voteId);
    }

    // 3. Reconstituir la Entidad de Dominio en estado PENDING
    const ticket = TicketEmission.create({
      voteId: command.voteId,
      electionId: command.electionId,
      voterToken: command.voterToken
    });

    await this.repository.save(ticket);
    logger.info({ voteId: ticket.voteId }, "Ticket saved as PENDING off-chain");

    // 4. Intentar emitir la transacción en la cadena (Stellar)
    try {
      const txHash = await this.blockchainPort.emitVoteTransaction({
        voteId: ticket.voteId,
        electionId: ticket.electionId,
        voterToken: ticket.voterToken
      });

      // 5. Éxito: Actualizar a CONFIRMED
      ticket.markAsConfirmed(txHash);
      await this.repository.update(ticket);
      logger.info({ voteId: ticket.voteId, txHash }, "Ticket CONFIRMED");
      
      // 6. Notificar Éxito
      await this.eventNotifier.notifyEmissionResult({
        voteId: ticket.voteId,
        status: 'CONFIRMED',
        txHash
      });

    } catch (error: any) {
      logger.error({ voteId: ticket.voteId, err: error.message }, "Blockchain emit failed");
      
      // 7. Fallo: Actualizar a FAILED
      ticket.markAsFailed(error.message || 'Unknown error during blockchain operation');
      await this.repository.update(ticket);

      // 8. Notificar Fallo
      await this.eventNotifier.notifyEmissionResult({
        voteId: ticket.voteId,
        status: 'FAILED',
        errorMessage: ticket.errorMessage!
      });

      throw new BlockchainBroadcastError(error.message);
    }
  }
}
