import * as StellarSdk from '@stellar/stellar-sdk';
import { IBlockchainPort, EmitTransactionPayload } from '../../models/ports/BlockchainPort';
import { SigningStrategy } from './strategies/SigningStrategy';

export class StellarAdapter implements IBlockchainPort {
  private server: StellarSdk.Horizon.Server;

  constructor(
    networkUrl: string,
    private readonly signingStrategy: SigningStrategy,
    private readonly timeoutMs: number = 10000 // Timeout explícito requerido
  ) {
    this.server = new StellarSdk.Horizon.Server(networkUrl);
  }

  async emitVoteTransaction(payload: EmitTransactionPayload): Promise<string> {
    const sourcePublicKey = await this.signingStrategy.getPublicKey();

    // Configuración de timeout custom via Promise.race
    const executeBlockchainTalk = async () => {
      const accountResponse = await this.server.loadAccount(sourcePublicKey);

      const memo = StellarSdk.Memo.text(payload.voterToken.substring(0, 28));

      const transaction = new StellarSdk.TransactionBuilder(accountResponse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
        timebounds: await this.server.fetchTimebounds(100),
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: sourcePublicKey, // Enviamos un micro-asset genérico contra un contrato propio
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
