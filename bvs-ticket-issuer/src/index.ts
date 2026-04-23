import { createServer } from './server';
import { setupRoutes } from './routes';
import { EmitTicketController } from './controllers/EmitTicketController';
import { EmitTicketHandler } from './services/EmitTicketHandler';
import { PrismaClient } from '@prisma/client';
import { PrismaTicketRepository } from './adapters/persistence/PrismaTicketRepository';
import { env } from './config/env';
import { LocalKeyStrategy } from './adapters/blockchain/strategies/LocalKeyStrategy';
import { StellarAdapter } from './adapters/blockchain/StellarAdapter';
import { HttpEventNotifier } from './adapters/events/HttpEventNotifier';
import { ValidUUIDFormatValidator, VoterTokenPresentValidator } from './services/validations/Rules';
import { ValidatorChain } from './services/validations/ValidatorChain';

async function start() {
  const prisma = new PrismaClient();

  // Adaptadores DB
  const repository = new PrismaTicketRepository(prisma);

  // Estrategias
  const signingStrategy = new LocalKeyStrategy(env.STELLAR_ISSUER_SECRET);
  const stellarUrl = env.STELLAR_NETWORK === 'PUBLIC'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';

  // Blockchain y Eventos
  const blockchainPort = new StellarAdapter(stellarUrl, signingStrategy, 15000);
  const eventNotifier = new HttpEventNotifier(env.WEBHOOK_URL);

  // Cadenas de Validación
  const uuidVal = new ValidUUIDFormatValidator();
  const tokenVal = new VoterTokenPresentValidator();
  uuidVal.setNext(tokenVal);
  const chain = new ValidatorChain(uuidVal);

  // Capa de servicio (lógica de negocio / orquestación)
  const emitTicketUseCase = new EmitTicketHandler(
    repository,
    blockchainPort,
    eventNotifier,
    chain
  );

  // Controlador HTTP (MVC)
  const emitController = new EmitTicketController(emitTicketUseCase);

  const server = createServer();
  await setupRoutes(server, emitController);

  try {
    await prisma.$connect();
    server.log.info('Conectado exitosamente a la base de datos PostgreSQL off-chain');

    const address = await server.listen({ port: env.PORT, host: '0.0.0.0' });
    server.log.info(`Microservicio Emisor de Tickets listo y escuchando en ${address}`);
  } catch (err) {
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
