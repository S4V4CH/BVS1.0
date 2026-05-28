"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketService = void 0;
const pino_1 = __importDefault(require("pino"));
const TicketEmission_1 = require("../models/entities/TicketEmission");
const logger = (0, pino_1.default)({ name: 'TicketService' });
class TicketService {
    repository;
    stellarService;
    eventService;
    validatorChain;
    constructor(repository, stellarService, eventService, validatorChain) {
        this.repository = repository;
        this.stellarService = stellarService;
        this.eventService = eventService;
        this.validatorChain = validatorChain;
    }
    async emitTicket(request) {
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
        const ticket = TicketEmission_1.TicketEmission.create({
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
        }
        catch (error) {
            logger.error({ voteId: ticket.voteId, err: error.message }, "Stellar emission failed");
            ticket.markAsFailed(error.message || 'Stellar error');
            await this.repository.update(ticket);
            await this.eventService.notifyEmissionResult({
                voteId: ticket.voteId,
                status: 'FAILED',
                errorMessage: ticket.errorMessage
            });
        }
        return this.toEmitResponse(ticket);
    }
    toEmitResponse(ticket) {
        return {
            voteId: ticket.voteId,
            status: ticket.status,
            txHash: ticket.txHash,
            errorMessage: ticket.errorMessage
        };
    }
}
exports.TicketService = TicketService;
