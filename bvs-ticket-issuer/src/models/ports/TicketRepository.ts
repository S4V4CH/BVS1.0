import { TicketEmission } from '../entities/TicketEmission';

export interface ITicketRepository {
  findById(voteId: string): Promise<TicketEmission | null>;
  save(ticket: TicketEmission): Promise<void>;
  update(ticket: TicketEmission): Promise<void>;
}
