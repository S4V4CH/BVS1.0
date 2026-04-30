import { prisma } from './prisma';
import { TicketEmission } from '../entities/TicketEmission';

export class TicketRepository {
  async findById(voteId: string): Promise<TicketEmission | null> {
    const raw = await prisma.ticketEmission.findUnique({ where: { voteId } });
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
    await prisma.ticketEmission.create({
      data: {
        voteId: ticket.voteId,
        electionId: ticket.electionId,
        voterToken: ticket.voterToken,
        status: ticket.status,
      }
    });
  }

  async update(ticket: TicketEmission): Promise<void> {
    await prisma.ticketEmission.update({
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
