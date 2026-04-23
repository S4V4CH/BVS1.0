"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.BlockchainBroadcastError = exports.TicketAlreadyExistsError = void 0;
class TicketAlreadyExistsError extends Error {
    constructor(voteId) {
        super(`Ticket with voteId ${voteId} already exists`);
        this.name = 'TicketAlreadyExistsError';
    }
}
exports.TicketAlreadyExistsError = TicketAlreadyExistsError;
class BlockchainBroadcastError extends Error {
    constructor(message) {
        super(`Blockchain broadcast failed: ${message}`);
        this.name = 'BlockchainBroadcastErpror';
    }
}
exports.BlockchainBroadcastError = BlockchainBroadcastError;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
