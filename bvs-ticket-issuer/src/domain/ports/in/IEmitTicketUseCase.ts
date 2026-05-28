export interface EmitTicketCommand {
  voteId: string;
  electionId: string;
  voterToken: string;
}

export interface EmitTicketResult {
  voteId: string;
  status: string;
  txHash: string | null;
  errorMessage: string | null;
}

export interface IEmitTicketUseCase {
  execute(command: EmitTicketCommand): Promise<EmitTicketResult>;
}
