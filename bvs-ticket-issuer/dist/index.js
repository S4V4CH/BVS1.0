"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const routes_1 = require("./routes");
const EmitTicketController_1 = require("./controllers/EmitTicketController");
const EmitTicketHandler_1 = require("./services/EmitTicketHandler");
const client_1 = require("@prisma/client");
const PrismaTicketRepository_1 = require("./adapters/persistence/PrismaTicketRepository");
const env_1 = require("./config/env");
const LocalKeyStrategy_1 = require("./adapters/blockchain/strategies/LocalKeyStrategy");
const StellarAdapter_1 = require("./adapters/blockchain/StellarAdapter");
const HttpEventNotifier_1 = require("./adapters/events/HttpEventNotifier");
const Rules_1 = require("./services/validations/Rules");
const ValidatorChain_1 = require("./services/validations/ValidatorChain");
async function start() {
    const prisma = new client_1.PrismaClient();
    // Adaptadores DB
    const repository = new PrismaTicketRepository_1.PrismaTicketRepository(prisma);
    // Estrategias
    const signingStrategy = new LocalKeyStrategy_1.LocalKeyStrategy(env_1.env.STELLAR_ISSUER_SECRET);
    const stellarUrl = env_1.env.STELLAR_NETWORK === 'PUBLIC'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org';
    // Blockchain y Eventos
    const blockchainPort = new StellarAdapter_1.StellarAdapter(stellarUrl, signingStrategy, 15000);
    const eventNotifier = new HttpEventNotifier_1.HttpEventNotifier(env_1.env.WEBHOOK_URL);
    // Cadenas de Validación
    const uuidVal = new Rules_1.ValidUUIDFormatValidator();
    const tokenVal = new Rules_1.VoterTokenPresentValidator();
    uuidVal.setNext(tokenVal);
    const chain = new ValidatorChain_1.ValidatorChain(uuidVal);
    // Capa de servicio (lógica de negocio / orquestación)
    const emitTicketUseCase = new EmitTicketHandler_1.EmitTicketHandler(repository, blockchainPort, eventNotifier, chain);
    // Controlador HTTP (MVC)
    const emitController = new EmitTicketController_1.EmitTicketController(emitTicketUseCase);
    const server = (0, server_1.createServer)();
    await (0, routes_1.setupRoutes)(server, emitController);
    try {
        await prisma.$connect();
        server.log.info('Conectado exitosamente a la base de datos PostgreSQL off-chain');
        const address = await server.listen({ port: env_1.env.PORT, host: '0.0.0.0' });
        server.log.info(`Microservicio Emisor de Tickets listo y escuchando en ${address}`);
    }
    catch (err) {
        server.log.fatal(err);
        process.exit(1);
    }
}
// Apagados limpios
process.on('SIGINT', async () => {
    console.log("Apagando componentes del emisor...");
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log("Apagando componentes del emisor...");
    process.exit(0);
});
start();
