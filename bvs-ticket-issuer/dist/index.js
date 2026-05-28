"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EmitTicketHandler_1 = require("./application/handlers/EmitTicketHandler");
const Rules_1 = require("./application/validations/Rules");
const ValidatorChain_1 = require("./application/validations/ValidatorChain");
const env_1 = require("./config/env");
const StellarAdapter_1 = require("./infrastructure/blockchain/StellarAdapter");
const LocalKeyStrategy_1 = require("./infrastructure/blockchain/strategies/LocalKeyStrategy");
const HttpEventNotifier_1 = require("./infrastructure/events/HttpEventNotifier");
const prisma_client_1 = require("./infrastructure/persistence/prisma.client");
const PrismaTicketRepository_1 = require("./infrastructure/persistence/PrismaTicketRepository");
const server_1 = require("./infrastructure/web/server");
const routes_1 = require("./infrastructure/web/routes");
const EmitTicketController_1 = require("./infrastructure/web/controllers/EmitTicketController");
async function start() {
    const repository = new PrismaTicketRepository_1.PrismaTicketRepository();
    const signingStrategy = new LocalKeyStrategy_1.LocalKeyStrategy(env_1.env.STELLAR_ISSUER_SECRET);
    const stellarUrl = env_1.env.STELLAR_NETWORK === 'PUBLIC'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org';
    const blockchainPort = new StellarAdapter_1.StellarAdapter(stellarUrl, signingStrategy, 15000);
    const eventNotifier = new HttpEventNotifier_1.HttpEventNotifier(env_1.env.WEBHOOK_URL);
    const uuidVal = new Rules_1.ValidUUIDFormatValidator();
    const tokenVal = new Rules_1.VoterTokenPresentValidator();
    uuidVal.setNext(tokenVal);
    const validatorChain = new ValidatorChain_1.ValidatorChain(uuidVal);
    const emitTicketUseCase = new EmitTicketHandler_1.EmitTicketHandler(repository, blockchainPort, eventNotifier, validatorChain);
    const emitTicketController = new EmitTicketController_1.EmitTicketController(emitTicketUseCase);
    const server = (0, server_1.createServer)();
    await (0, routes_1.setupRoutes)(server, emitTicketController);
    try {
        await prisma_client_1.prisma.$connect();
        server.log.info('Database connected (hexagonal architecture)');
        const address = await server.listen({ port: env_1.env.PORT, host: '0.0.0.0' });
        server.log.info(`Ticket issuer listening at ${address}`);
    }
    catch (err) {
        server.log.fatal(err);
        process.exit(1);
    }
}
const shutdown = async () => {
    console.log('Shutting down ticket issuer...');
    await prisma_client_1.prisma.$disconnect();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
start();
