export interface EmitTransactionPayload {
  voteId: string;
  electionId: string;
  voterToken: string;
}

// Devuelve el txHash al completarse la emisión
export interface IBlockchainPort {
  emitVoteTransaction(payload: EmitTransactionPayload): Promise<string>;
}
