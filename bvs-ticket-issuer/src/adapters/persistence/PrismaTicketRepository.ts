import { PrismaClient } from '@prisma/client';
import { ITicketRepository } from '../../models/ports/TicketRepository';
import { TicketEmission } from '../../models/entities/TicketEmission';

export class PrismaTicketRepository implements ITicketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(voteId: string): Promise<TicketEmission | null> {
    const raw = await this.prisma.ticketEmission.findUnique({ where: { voteId } });
    if (!raw) return null;

    return TicketEmission.reconstitute({
      voteId: raw.voteId,
      electionId: raw.electionId,
      voterToken: raw.voterToken,
      status: raw.status as any,
      txHash: raw.txHash,
      errorMessage: raw.errorMessage,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async save(ticket: TicketEmission): Promise<void> {
    await this.prisma.ticketEmission.create({
      data: {
        voteId: ticket.voteId,
        electionId: ticket.electionId,
        voterToken: ticket.voterToken,
        status: ticket.status,
      }
    });
  }

  async update(ticket: TicketEmission): Promise<void> {
    await this.prisma.ticketEmission.update({
      where: { voteId: ticket.voteId },
      data: {
        status: ticket.status,
        txHash: ticket.txHash,
        errorMessage: ticket.errorMessage,
        updatedAt: new Date()
      }
    });
  }
}
