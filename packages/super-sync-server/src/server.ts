import { v2 as webdav } from 'webdav-server';
import * as fs from 'fs';

export function createServer(
  port: number = 1900,
  dataDir: string = './data',
): webdav.WebDAVServer {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const userManager = new webdav.SimpleUserManager();
  const server = new webdav.WebDAVServer({
    port: port,
    requireAuthentification: true,
    httpAuthentication: new webdav.HTTPBasicAuthentication(
      userManager,
      'SuperSync Realm',
    ),
  });

  // Default user for now - in a real app this would be configurable
  // TODO: Load from env or config
  userManager.addUser('user', 'password', false);

  server.setFileSystem('/', new webdav.PhysicalFileSystem(dataDir), (success) => {
    if (!success) {
      console.error('Failed to mount physical file system at ' + dataDir);
    }
  });

  return server;
}
