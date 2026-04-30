import { randomUUID } from 'crypto';

export type EmissionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface TicketProps {
  voteId: string;
  electionId: string;
  voterToken: string;
  status?: EmissionStatus;
  txHash?: string | null;
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TicketEmission {
  private props: TicketProps;

  private constructor(props: TicketProps) {
    this.props = props;
  }

  // Factory para nuevas emisiones
  public static create(props: Omit<TicketProps, 'status' | 'txHash' | 'errorMessage' | 'createdAt' | 'updatedAt'>): TicketEmission {
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
  public static reconstitute(props: TicketProps): TicketEmission {
    return new TicketEmission(props);
  }

  public markAsConfirmed(txHash: string): void {
    if (this.props.status !== 'PENDING') {
      throw new Error("Cannot confirm a ticket that is not PENDING");
    }
    this.props.status = 'CONFIRMED';
    this.props.txHash = txHash;
    this.props.updatedAt = new Date();
  }

  public markAsFailed(errorMessage: string): void {
    if (this.props.status !== 'PENDING') {
      throw new Error("Cannot fail a ticket that is not PENDING");
    }
    this.props.status = 'FAILED';
    this.props.errorMessage = errorMessage;
    this.props.updatedAt = new Date();
  }

  // Getters inmutables
  get voteId(): string { return this.props.voteId; }
  get electionId(): string { return this.props.electionId; }
  get voterToken(): string { return this.props.voterToken; }
  get status(): EmissionStatus { return this.props.status!; }
  get txHash(): string | null { return this.props.txHash || null; }
  get errorMessage(): string | null { return this.props.errorMessage || null; }
}
