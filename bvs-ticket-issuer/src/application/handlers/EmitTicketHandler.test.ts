import { describe, expect, it, vi } from 'vitest';
import { TicketEmission } from '../../domain/entities/TicketEmission';
import { ValidationError } from '../../domain/errors/ValidationError';
import { EmitTransactionPayload, IBlockchainPort } from '../../domain/ports/out/IBlockchainPort';
import { EmissionEventPayload, IEventNotifier } from '../../domain/ports/out/IEventNotifier';
import { ITicketRepository } from '../../domain/ports/out/ITicketRepository';
import { ValidatorChain } from '../validations/ValidatorChain';
import { ValidUUIDFormatValidator, VoterTokenPresentValidator } from '../validations/Rules';
import { EmitTicketHandler } from './EmitTicketHandler';

function buildValidatorChain(): ValidatorChain {
  const uuidVal = new ValidUUIDFormatValidator();
  const tokenVal = new VoterTokenPresentValidator();
  uuidVal.setNext(tokenVal);
  return new ValidatorChain(uuidVal);
}

describe('EmitTicketHandler', () => {
  const validCommand = {
    voteId: '550e8400-e29b-41d4-a716-446655440000',
    electionId: 'election-1',
    voterToken: 'abcdefghijklmnopqrst',
  };

  it('returns existing ticket on idempotent request', async () => {
    const existing = TicketEmission.reconstitute({
      ...validCommand,
      status: 'CONFIRMED',
      txHash: 'existing-hash',
      errorMessage: null,
    });

    const repository: ITicketRepository = {
      findById: vi.fn().mockResolvedValue(existing),
      save: vi.fn(),
      update: vi.fn(),
    };
    const blockchainPort: IBlockchainPort = {
      emitVoteTransaction: vi.fn(),
    };
    const eventNotifier: IEventNotifier = {
      notifyEmissionResult: vi.fn(),
    };

    const handler = new EmitTicketHandler(
      repository,
      blockchainPort,
      eventNotifier,
      buildValidatorChain()
    );

    const result = await handler.execute(validCommand);

    expect(result.status).toBe('CONFIRMED');
    expect(result.txHash).toBe('existing-hash');
    expect(blockchainPort.emitVoteTransaction).not.toHaveBeenCalled();
  });

  it('confirms emission and notifies on blockchain success', async () => {
    const store = new Map<string, TicketEmission>();

    const repository: ITicketRepository = {
      findById: vi.fn(async (id) => store.get(id) ?? null),
      save: vi.fn(async (ticket) => {
        store.set(ticket.voteId, ticket);
      }),
      update: vi.fn(async (ticket) => {
        store.set(ticket.voteId, ticket);
      }),
    };

    const blockchainPort: IBlockchainPort = {
      emitVoteTransaction: vi.fn(async (_payload: EmitTransactionPayload) => 'tx-hash-1'),
    };

    const notified: EmissionEventPayload[] = [];
    const eventNotifier: IEventNotifier = {
      notifyEmissionResult: vi.fn(async (payload) => {
        notified.push(payload);
      }),
    };

    const handler = new EmitTicketHandler(
      repository,
      blockchainPort,
      eventNotifier,
      buildValidatorChain()
    );

    const result = await handler.execute(validCommand);

    expect(result.status).toBe('CONFIRMED');
    expect(result.txHash).toBe('tx-hash-1');
    expect(notified).toHaveLength(1);
    expect(notified[0].status).toBe('CONFIRMED');
  });

  it('marks failed and notifies when blockchain throws', async () => {
    const store = new Map<string, TicketEmission>();

    const repository: ITicketRepository = {
      findById: vi.fn(async (id) => store.get(id) ?? null),
      save: vi.fn(async (ticket) => {
        store.set(ticket.voteId, ticket);
      }),
      update: vi.fn(async (ticket) => {
        store.set(ticket.voteId, ticket);
      }),
    };

    const blockchainPort: IBlockchainPort = {
      emitVoteTransaction: vi.fn(async () => {
        throw new Error('Stellar Network Timeout');
      }),
    };

    const eventNotifier: IEventNotifier = {
      notifyEmissionResult: vi.fn(),
    };

    const handler = new EmitTicketHandler(
      repository,
      blockchainPort,
      eventNotifier,
      buildValidatorChain()
    );

    const result = await handler.execute(validCommand);

    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toContain('Timeout');
    expect(eventNotifier.notifyEmissionResult).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED' })
    );
  });

  it('throws ValidationError when command is invalid', async () => {
    const handler = new EmitTicketHandler(
      { findById: vi.fn(), save: vi.fn(), update: vi.fn() },
      { emitVoteTransaction: vi.fn() },
      { notifyEmissionResult: vi.fn() },
      buildValidatorChain()
    );

    await expect(
      handler.execute({ ...validCommand, voteId: 'not-a-uuid' })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
