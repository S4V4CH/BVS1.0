"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmitTicketHandler = void 0;
const pino_1 = __importDefault(require("pino"));
const TicketEmission_1 = require("../../domain/entities/TicketEmission");
const ValidationError_1 = require("../../domain/errors/ValidationError");
const logger = (0, pino_1.default)({ name: 'EmitTicketHandler' });
class EmitTicketHandler {
    repository;
    blockchainPort;
    eventNotifier;
    validatorChain;
    constructor(repository, blockchainPort, eventNotifier, validatorChain) {
        this.repository = repository;
        this.blockchainPort = blockchainPort;
        this.eventNotifier = eventNotifier;
        this.validatorChain = validatorChain;
    }
    async execute(command) {
        logger.info({ voteId: command.voteId }, 'Starting ticket emission process');
        const validationResult = await this.validatorChain.handle(command);
        if (!validationResult.isValid) {
            throw new ValidationError_1.ValidationError(`Validation failed: ${validationResult.errors.join(', ')}`);
        }
        const existingTicket = await this.repository.findById(command.voteId);
        if (existingTicket) {
            return this.toEmitResult(existingTicket);
        }
        const ticket = TicketEmission_1.TicketEmission.create({
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Stellar error';
            logger.error({ voteId: ticket.voteId, err: message }, 'Stellar emission failed');
            ticket.markAsFailed(message);
            await this.repository.update(ticket);
            await this.eventNotifier.notifyEmissionResult({
                voteId: ticket.voteId,
                status: 'FAILED',
                errorMessage: ticket.errorMessage,
            });
        }
        return this.toEmitResult(ticket);
    }
    toEmitResult(ticket) {
        return {
            voteId: ticket.voteId,
            status: ticket.status,
            txHash: ticket.txHash,
            errorMessage: ticket.errorMessage,
        };
    }
}
exports.EmitTicketHandler = EmitTicketHandler;
