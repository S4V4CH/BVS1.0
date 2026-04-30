import * as StellarSdk from '@stellar/stellar-sdk';
import { SigningStrategy } from './strategies/SigningStrategy';

export interface EmitTransactionPayload {
  voteId: string;
  electionId: string;
  voterToken: string;
}

export class StellarService {
  private server: StellarSdk.Horizon.Server;

  constructor(
    networkUrl: string,
    private readonly signingStrategy: SigningStrategy,
    private readonly timeoutMs: number = 10000
  ) {
    this.server = new StellarSdk.Horizon.Server(networkUrl);
  }

  async emitToStellar(payload: EmitTransactionPayload): Promise<string> {
    const sourcePublicKey = await this.signingStrategy.getPublicKey();
    
    const executeBlockchainTalk = async () => {
      const accountResponse = await this.server.loadAccount(sourcePublicKey);
      
      const memo = StellarSdk.Memo.text(payload.voterToken.substring(0, 28));

      const transaction = new StellarSdk.TransactionBuilder(accountResponse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
        timebounds: await this.server.fetchTimebounds(100),
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: sourcePublicKey,
        asset: StellarSdk.Asset.native(),
        amount: "0.0000100"
      }))
      .addMemo(memo)
      .build();

      const signedTx = await this.signingStrategy.sign(transaction as any);
      const rawResponse = await this.server.submitTransaction(signedTx);
      
      return rawResponse.hash;
    };

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error("Stellar Network Timeout")), this.timeoutMs);
    });

    return Promise.race([executeBlockchainTalk(), timeoutPromise]);
  }
}
