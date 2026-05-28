import { Keypair, Transaction } from '@stellar/stellar-sdk';
import { SigningStrategy } from './SigningStrategy';

export class LocalKeyStrategy implements SigningStrategy {
  private keypair: Keypair;

  constructor(secretKey: string) {
    this.keypair = Keypair.fromSecret(secretKey);
  }

  async getPublicKey(): Promise<string> {
    return this.keypair.publicKey();
  }

  async sign(transaction: Transaction): Promise<Transaction> {
    transaction.sign(this.keypair);
    return transaction;
  }
}
