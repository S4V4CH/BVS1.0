export class TicketAlreadyExistsError extends Error {
  constructor(voteId: string) {
    super(`Ticket with voteId ${voteId} already exists`);
    this.name = 'TicketAlreadyExistsError';
  }
}

export class BlockchainBroadcastError extends Error {
  constructor(message: string) {
    super(`Blockchain broadcast failed: ${message}`);
    this.name = 'BlockchainBroadcastErpror';
  }
}
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
