import { Transaction } from '@stellar/stellar-sdk';

export interface SigningStrategy {
  getPublicKey(): Promise<string>;
  sign(transaction: Transaction): Promise<Transaction>;
}
