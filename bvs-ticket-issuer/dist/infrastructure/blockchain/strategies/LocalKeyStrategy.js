"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalKeyStrategy = void 0;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
class LocalKeyStrategy {
    keypair;
    constructor(secretKey) {
        this.keypair = stellar_sdk_1.Keypair.fromSecret(secretKey);
    }
    async getPublicKey() {
        return this.keypair.publicKey();
    }
    async sign(transaction) {
        transaction.sign(this.keypair);
        return transaction;
    }
}
exports.LocalKeyStrategy = LocalKeyStrategy;
