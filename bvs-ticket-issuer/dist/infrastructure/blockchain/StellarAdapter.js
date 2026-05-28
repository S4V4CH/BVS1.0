"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StellarAdapter = void 0;
const StellarSdk = __importStar(require("@stellar/stellar-sdk"));
class StellarAdapter {
    signingStrategy;
    timeoutMs;
    server;
    constructor(networkUrl, signingStrategy, timeoutMs = 10000) {
        this.signingStrategy = signingStrategy;
        this.timeoutMs = timeoutMs;
        this.server = new StellarSdk.Horizon.Server(networkUrl);
    }
    async emitVoteTransaction(payload) {
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
                amount: '0.0000100',
            }))
                .addMemo(memo)
                .build();
            const signedTx = await this.signingStrategy.sign(transaction);
            const rawResponse = await this.server.submitTransaction(signedTx);
            return rawResponse.hash;
        };
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Stellar Network Timeout')), this.timeoutMs);
        });
        return Promise.race([executeBlockchainTalk(), timeoutPromise]);
    }
}
exports.StellarAdapter = StellarAdapter;
