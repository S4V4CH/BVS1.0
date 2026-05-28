import { describe, expect, it } from 'vitest';
import { TicketEmission } from './TicketEmission';

describe('TicketEmission', () => {
  it('create initializes PENDING state', () => {
    const ticket = TicketEmission.create({
      voteId: '550e8400-e29b-41d4-a716-446655440000',
      electionId: 'election-1',
      voterToken: 'token-with-enough-length',
    });

    expect(ticket.status).toBe('PENDING');
    expect(ticket.txHash).toBeNull();
    expect(ticket.errorMessage).toBeNull();
  });

  it('markAsConfirmed updates status and txHash', () => {
    const ticket = TicketEmission.create({
      voteId: '550e8400-e29b-41d4-a716-446655440000',
      electionId: 'election-1',
      voterToken: 'token-with-enough-length',
    });

    ticket.markAsConfirmed('hash-abc');
    expect(ticket.status).toBe('CONFIRMED');
    expect(ticket.txHash).toBe('hash-abc');
  });

  it('markAsFailed updates status and errorMessage', () => {
    const ticket = TicketEmission.create({
      voteId: '550e8400-e29b-41d4-a716-446655440000',
      electionId: 'election-1',
      voterToken: 'token-with-enough-length',
    });

    ticket.markAsFailed('network error');
    expect(ticket.status).toBe('FAILED');
    expect(ticket.errorMessage).toBe('network error');
  });

  it('cannot confirm when not PENDING', () => {
    const ticket = TicketEmission.create({
      voteId: '550e8400-e29b-41d4-a716-446655440000',
      electionId: 'election-1',
      voterToken: 'token-with-enough-length',
    });
    ticket.markAsFailed('err');

    expect(() => ticket.markAsConfirmed('hash')).toThrow();
  });
});
