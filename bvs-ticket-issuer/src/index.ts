import { EmitTicketHandler } from './application/handlers/EmitTicketHandler';
import {
  ValidUUIDFormatValidator,
  VoterTokenPresentValidator,
} from './application/validations/Rules';
import { ValidatorChain } from './application/validations/ValidatorChain';
import { env } from './config/env';
import { StellarAdapter } from './infrastructure/blockchain/StellarAdapter';
import { LocalKeyStrategy } from './infrastructure/blockchain/strategies/LocalKeyStrategy';
import { HttpEventNotifier } from './infrastructure/events/HttpEventNotifier';
import { prisma } from './infrastructure/persistence/prisma.client';
import { PrismaTicketRepository } from './infrastructure/persistence/PrismaTicketRepository';
import { createServer } from './infrastructure/web/server';
import { setupRoutes } from './infrastructure/web/routes';
import { EmitTicketController } from './infrastructure/web/controllers/EmitTicketController';

async function start() {
  const repository = new PrismaTicketRepository();

  const signingStrategy = new LocalKeyStrategy(env.STELLAR_ISSUER_SECRET);
  const stellarUrl =
    env.STELLAR_NETWORK === 'PUBLIC'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';

  const blockchainPort = new StellarAdapter(stellarUrl, signingStrategy, 15000);
  const eventNotifier = new HttpEventNotifier(env.WEBHOOK_URL);

  const uuidVal = new ValidUUIDFormatValidator();
  const tokenVal = new VoterTokenPresentValidator();
  uuidVal.setNext(tokenVal);
  const validatorChain = new ValidatorChain(uuidVal);

  const emitTicketUseCase = new EmitTicketHandler(
    repository,
    blockchainPort,
    eventNotifier,
    validatorChain
  );

  const emitTicketController = new EmitTicketController(emitTicketUseCase);

  const server = createServer();
  await setupRoutes(server, emitTicketController);

  try {
    await prisma.$connect();
    server.log.info('Database connected (hexagonal architecture)');

    const address = await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`Ticket issuer listening at ${address}`);
  } catch (err) {
    server.log.fatal(err);
    process.exit(1);
  }
}

const shutdown = async () => {
  console.log('Shutting down ticket issuer...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
