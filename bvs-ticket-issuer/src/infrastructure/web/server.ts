import Fastify, { FastifyInstance } from 'fastify';

export function createServer(): FastifyInstance {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    }
  });

  return server;
}
