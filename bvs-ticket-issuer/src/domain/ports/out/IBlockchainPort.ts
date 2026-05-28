export interface EmitTransactionPayload {
  voteId: string;
  electionId: string;
  voterToken: string;
}

export interface IBlockchainPort {
  emitVoteTransaction(payload: EmitTransactionPayload): Promise<string>;
}
