/** Test-only real HTTP server with consume-on-accept installed. */
import { prisma } from '../../src/db';
import { createServer } from '../../src/server';
import { createAgentCaptureConsumeHarness } from './agent-capture-consume.harness';

const main = async (): Promise<void> => {
  const harness = createAgentCaptureConsumeHarness(prisma);
  await harness.initialize();
  const dispose = harness.install();
  const server = createServer();
  const shutdown = async (): Promise<void> => {
    dispose();
    await server.stop();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  await server.start();
};
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
