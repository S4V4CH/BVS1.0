import { createServer } from './http/server';
import { setupRoutes } from './http/routes';
import { TicketController } from './controllers/TicketController';
import { TicketService } from './services/TicketService';
import { prisma } from './models/persistence/prisma';
import { TicketRepository } from './models/persistence/TicketRepository';
import { env } from './config/env';
import { LocalKeyStrategy } from './models/services/strategies/LocalKeyStrategy';
import { StellarService } from './models/services/StellarService';
import { EventService } from './models/services/EventService';
import { ValidUUIDFormatValidator, VoterTokenPresentValidator } from './models/validators/Rules';
import { ValidatorChain } from './models/validators/ValidatorChain';

async function start() {
  // Model: persistencia y servicios de dominio / integración
  const repository = new TicketRepository();

  const signingStrategy = new LocalKeyStrategy(env.STELLAR_ISSUER_SECRET);
  const stellarUrl = env.STELLAR_NETWORK === 'PUBLIC' 
    ? 'https://horizon.stellar.org' 
    : 'https://horizon-testnet.stellar.org';
    
  const stellarService = new StellarService(stellarUrl, signingStrategy, 15000); 
  const eventService = new EventService(env.WEBHOOK_URL);

  const uuidVal = new ValidUUIDFormatValidator();
  const tokenVal = new VoterTokenPresentValidator();
  uuidVal.setNext(tokenVal);
  const validatorChain = new ValidatorChain(uuidVal);

  // Service: orquestación del caso de uso (capa entre Controller y Model)
  const ticketService = new TicketService(
    repository,
    stellarService,
    eventService,
    validatorChain
  );

  // Controller: HTTP, validación de entrada (Zod), respuestas
  const ticketController = new TicketController(ticketService);

  const server = createServer();
  await setupRoutes(server, ticketController);

  try {
    await prisma.$connect();
    server.log.info('Database connected (MVC — model layer)');
    
    const address = await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`MVC backend listening at ${address}`);
  } catch (err) {
    server.log.fatal(err);
    process.exit(1);
  }
}

const shutdown = async () => {
    console.log("Shutting down MVC backend...");
    await prisma.$disconnect();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
