import { createServer } from './server';
import * as path from 'path';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 1900;
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

const server = createServer(port, dataDir);

server.start((s) => {
  if (!s) {
    console.error('Server failed to start');
    return;
  }
  const address = s.address();
  const serverPort = typeof address === 'string' ? address : address?.port;
  console.log(`SuperSync Server running on http://localhost:${serverPort}`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Default credentials: user / password`);
});
