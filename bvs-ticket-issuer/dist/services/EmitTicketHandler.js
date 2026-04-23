"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmitTicketHandler = void 0;
const pino_1 = __importDefault(require("pino"));
const TicketEmission_1 = require("../models/entities/TicketEmission");
const DomainErrors_1 = require("../models/errors/DomainErrors");
// Normalmente el logger vendría inyectado, pero pino es estándar en el sistema
const logger = (0, pino_1.default)({ name: 'EmitTicketHandler' });
class EmitTicketHandler {
    repository;
    blockchainPort;
    eventNotifier;
    validatorChain;
    constructor(repository, blockchainPort, eventNotifier, validatorChain // Patrón Chain of Responsibility
    ) {
        this.repository = repository;
        this.blockchainPort = blockchainPort;
        this.eventNotifier = eventNotifier;
        this.validatorChain = validatorChain;
    }
    async execute(command) {
        logger.info({ voteId: command.voteId }, "Received EmitTicketCommand");
        // 1. Ejecutar validaciones de la cadena (Chain of Responsibility)
        const validationResult = await this.validatorChain.handle(command);
        if (!validationResult.isValid) {
            logger.warn({ voteId: command.voteId, errors: validationResult.errors }, "Validation failed");
            throw new DomainErrors_1.ValidationError(validationResult.errors.join(', '));
        }
        // 2. Control de Idempotencia Local
        const existingTicket = await this.repository.findById(command.voteId);
        if (existingTicket) {
            logger.warn({ voteId: command.voteId }, "Ticket already exists, skipping workflow");
            throw new DomainErrors_1.TicketAlreadyExistsError(command.voteId);
        }
        // 3. Reconstituir la Entidad de Dominio en estado PENDING
        const ticket = TicketEmission_1.TicketEmission.create({
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
        }
        catch (error) {
            logger.error({ voteId: ticket.voteId, err: error.message }, "Blockchain emit failed");
            // 7. Fallo: Actualizar a FAILED
            ticket.markAsFailed(error.message || 'Unknown error during blockchain operation');
            await this.repository.update(ticket);
            // 8. Notificar Fallo
            await this.eventNotifier.notifyEmissionResult({
                voteId: ticket.voteId,
                status: 'FAILED',
                errorMessage: ticket.errorMessage
            });
            throw new DomainErrors_1.BlockchainBroadcastError(error.message);
        }
    }
}
exports.EmitTicketHandler = EmitTicketHandler;
