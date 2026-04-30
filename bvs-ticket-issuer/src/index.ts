import { createServer } from './views/http/server';
import { setupRoutes } from './views/http/routes';
import { TicketController } from './views/http/TicketController';
import { TicketViewModel } from './viewmodels/TicketViewModel';
import { prisma } from './models/persistence/prisma';
import { TicketRepository } from './models/persistence/TicketRepository';
import { env } from './config/env';
import { LocalKeyStrategy } from './models/services/strategies/LocalKeyStrategy';
import { StellarService } from './models/services/StellarService';
import { EventService } from './models/services/EventService';
import { ValidUUIDFormatValidator, VoterTokenPresentValidator } from './viewmodels/validators/Rules';
import { ValidatorChain } from './viewmodels/validators/ValidatorChain';

async function start() {
  // 1. Models (Persistence & Services)
  const repository = new TicketRepository();

  const signingStrategy = new LocalKeyStrategy(env.STELLAR_ISSUER_SECRET);
  const stellarUrl = env.STELLAR_NETWORK === 'PUBLIC' 
    ? 'https://horizon.stellar.org' 
    : 'https://horizon-testnet.stellar.org';
    
  const stellarService = new StellarService(stellarUrl, signingStrategy, 15000); 
  const eventService = new EventService(env.WEBHOOK_URL);

  // 2. ViewModels (Validation & Logic)
  const uuidVal = new ValidUUIDFormatValidator();
  const tokenVal = new VoterTokenPresentValidator();
  uuidVal.setNext(tokenVal);
  const validatorChain = new ValidatorChain(uuidVal);

  const ticketViewModel = new TicketViewModel(
    repository,
    stellarService,
    eventService,
    validatorChain
  );

  // 3. Views (HTTP Interface)
  const ticketController = new TicketController(ticketViewModel);

  const server = createServer();
  await setupRoutes(server, ticketController);

  try {
    await prisma.$connect();
    server.log.info('Database connected (MVVM Model Layer)');
    
    const address = await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`MVVM Backend listening at ${address}`);
  } catch (err) {
    server.log.fatal(err);
    process.exit(1);
  }
}

// Clean shutdown
const shutdown = async () => {
    console.log("Shutting down MVVM Backend...");
    await prisma.$disconnect();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
