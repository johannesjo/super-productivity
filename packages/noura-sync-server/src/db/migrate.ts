import 'dotenv/config';
import { migrate } from 'drizzle-orm/bun-sql/migrator';
import { disconnectDb, getDrizzleDb } from '../db';

try {
  await migrate(getDrizzleDb(), {
    migrationsFolder: new URL('../../drizzle', import.meta.url).pathname,
  });
  console.info('NouraSync database migrations are up to date');
} finally {
  await disconnectDb();
}
