export interface EmitTicketCommand {
  voteId: string;
  electionId: string;
  voterToken: string;
}

export interface IEmitTicketUseCase {
  execute(command: EmitTicketCommand): Promise<void>;
}
