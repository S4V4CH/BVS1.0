import { createServer } from './infrastructure/web/server';
import { setupRoutes } from './infrastructure/web/routes';
import { EmitTicketController } from './infrastructure/web/controllers/EmitTicketController';
import { EmitTicketHandler } from './application/use-cases/EmitTicketHandler';
import { PrismaClient } from '@prisma/client';
import { PrismaTicketRepository } from './infrastructure/persistence/PrismaTicketRepository';
import { env } from './config/env';
import { LocalKeyStrategy } from './infrastructure/blockchain/strategies/LocalKeyStrategy';
import { StellarAdapter } from './infrastructure/blockchain/StellarAdapter';
import { HttpEventNotifier } from './infrastructure/events/HttpEventNotifier';
import { ValidUUIDFormatValidator, VoterTokenPresentValidator } from './application/validations/Rules';
import { ValidatorChain } from './application/validations/ValidatorChain';

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

  // Inyección final asimilable al núcleo (Dominio)
  const emitTicketUseCase = new EmitTicketHandler(
    repository,
    blockchainPort,
    eventNotifier,
    chain
  );

  // Web Adapter
  const emitController = new EmitTicketController(emitTicketUseCase);

  // Node Server HTTP Bootstrap
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
