export interface TicketRequest {
  voteId: string;
  electionId: string;
  voterToken: string;
}

export interface TicketResponse {
  voteId: string;
  status: string;
  txHash: string | null;
  errorMessage: string | null;
}

export class TicketService {
  async emitTicket(payload: TicketRequest): Promise<TicketResponse> {
    const response = await fetch('/api/v1/tickets/emit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to emit ticket');
    }

    return response.json();
  }

  async pollStellarTransaction(voterToken: string): Promise<string> {
    const ISSUER_PUBLIC_KEY = 'GBITOPOZ63GKSDNJSBVV3RXVCCF3TLWZJS2FKXERXA6LEND6XAC6DNBC';
    const HORIZON_URL = 'https://horizon-testnet.stellar.org';
    const expectedMemo = voterToken.substring(0, 28);
    
    // Simple polling logic moved to service
    for (let i = 0; i < 20; i++) {
      try {
        const resp = await fetch(`${HORIZON_URL}/accounts/${ISSUER_PUBLIC_KEY}/transactions?order=desc&limit=5`);
        const data = await resp.json();
        const found = data._embedded.records.find((tx: any) => tx.memo === expectedMemo);
        
        if (found) return found.hash;
      } catch (e) {
        console.error("Horizon poll error", e);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error("Transaction not found on Stellar after timeout");
  }
}
