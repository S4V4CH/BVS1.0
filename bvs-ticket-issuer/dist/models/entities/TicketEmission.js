"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketEmission = void 0;
class TicketEmission {
    props;
    constructor(props) {
        this.props = props;
    }
    // Factory para nuevas emisiones
    static create(props) {
        if (!props.voteId || !props.electionId || !props.voterToken) {
            throw new Error("Missing required fields for TicketEmission");
        }
        return new TicketEmission({
            ...props,
            status: 'PENDING',
            txHash: null,
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    // Factoría para reconstituir la entidad desde Base de Datos
    static reconstitute(props) {
        return new TicketEmission(props);
    }
    markAsConfirmed(txHash) {
        if (this.props.status !== 'PENDING') {
            throw new Error("Cannot confirm a ticket that is not PENDING");
        }
        this.props.status = 'CONFIRMED';
        this.props.txHash = txHash;
        this.props.updatedAt = new Date();
    }
    markAsFailed(errorMessage) {
        if (this.props.status !== 'PENDING') {
            throw new Error("Cannot fail a ticket that is not PENDING");
        }
        this.props.status = 'FAILED';
        this.props.errorMessage = errorMessage;
        this.props.updatedAt = new Date();
    }
    // Getters inmutables
    get voteId() { return this.props.voteId; }
    get electionId() { return this.props.electionId; }
    get voterToken() { return this.props.voterToken; }
    get status() { return this.props.status; }
    get txHash() { return this.props.txHash || null; }
    get errorMessage() { return this.props.errorMessage || null; }
}
exports.TicketEmission = TicketEmission;
