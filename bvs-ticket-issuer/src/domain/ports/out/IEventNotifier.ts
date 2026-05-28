export interface EmissionEventPayload {
  voteId: string;
  status: 'CONFIRMED' | 'FAILED';
  txHash?: string;
  errorMessage?: string;
}

export interface IEventNotifier {
  notifyEmissionResult(payload: EmissionEventPayload): Promise<void>;
}
