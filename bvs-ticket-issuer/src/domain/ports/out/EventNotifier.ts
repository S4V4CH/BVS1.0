export interface EventPayload {
  voteId: string;
  status: 'CONFIRMED' | 'FAILED';
  txHash?: string;
  errorMessage?: string;
}

export interface IEventNotifier {
  notifyEmissionResult(payload: EventPayload): Promise<void>;
}
