"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventService = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'EventService' });
class EventService {
    webhookUrl;
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }
    async notifyEmissionResult(payload) {
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voteId: payload.voteId,
                    status: payload.status,
                    txHash: payload.txHash || undefined
                })
            });
            if (!response.ok) {
                logger.error({ status: response.status }, "Webhook responded with non-ok status");
            }
            else {
                logger.info({ voteId: payload.voteId }, "Webhook notified successfully");
            }
        }
        catch (error) {
            logger.error({ err: error.message }, "Failed to notify via webhook");
        }
    }
}
exports.EventService = EventService;
