"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketRepository = void 0;
const prisma_1 = require("./prisma");
const TicketEmission_1 = require("../entities/TicketEmission");
class TicketRepository {
    async findById(voteId) {
        const raw = await prisma_1.prisma.ticketEmission.findUnique({ where: { voteId } });
        if (!raw)
            return null;
        return TicketEmission_1.TicketEmission.reconstitute({
            voteId: raw.voteId,
            electionId: raw.electionId,
            voterToken: raw.voterToken,
            status: raw.status,
            txHash: raw.txHash,
            errorMessage: raw.errorMessage,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }
    async save(ticket) {
        await prisma_1.prisma.ticketEmission.create({
            data: {
                voteId: ticket.voteId,
                electionId: ticket.electionId,
                voterToken: ticket.voterToken,
                status: ticket.status,
            }
        });
    }
    async update(ticket) {
        await prisma_1.prisma.ticketEmission.update({
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
exports.TicketRepository = TicketRepository;
