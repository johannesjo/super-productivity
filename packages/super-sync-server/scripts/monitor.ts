import { prisma, disconnectDb } from '../src/db';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const LOG_FILE_PATH = path.join(process.cwd(), 'logs', 'app.log');

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const showStats = async () => {
  console.log('\n--- System Vitals ---');
  console.log(`Hostname: ${os.hostname()}`);
  console.log(`OS: ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`CPUs: ${os.cpus().length}`);

  const loadAvg = os.loadavg();
  console.log(
    `Load Avg: ${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}`,
  );

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  console.log(`Memory: ${formatBytes(usedMem)} used / ${formatBytes(totalMem)} total`);

  console.log('\n--- Database Connection ---');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Status: Connected ✅');

    // Get DB Size
    const dbSizeResult: any[] = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `;
    console.log(`DB Size: ${dbSizeResult[0]?.size}`);
  } catch (error) {
    console.log('Status: Disconnected ❌');
    console.error('Error:', error);
  }
};

const showUsage = async () => {
  console.log('\n--- User Storage Usage (Top 20) ---');
  try {
    // Calculate size of operations and snapshot data per user
    const users: any[] = await prisma.$queryRaw`
      SELECT
        u.id,
        u.email,
        (
          COALESCE(SUM(pg_column_size(o.payload)), 0) +
          COALESCE(SUM(pg_column_size(s.snapshot_data)), 0)
        ) as total_bytes
      FROM users u
      LEFT JOIN operations o ON u.id = o.user_id
      LEFT JOIN user_sync_state s ON u.id = s.user_id
      GROUP BY u.id
      ORDER BY total_bytes DESC
      LIMIT 20;
    `;

    if (users.length === 0) {
      console.log('No users found.');
    } else {
      console.table(
        users.map((u) => ({
          ID: u.id,
          Email: u.email,
          Usage: formatBytes(Number(u.total_bytes)),
        })),
      );
    }
  } catch (error) {
    console.error('Error fetching usage data:', error);
  }
};

const showLogs = async (args: string[]) => {
  console.log('\n--- Server Logs ---');

  if (!fs.existsSync(LOG_FILE_PATH)) {
    console.error(`Log file not found at: ${LOG_FILE_PATH}`);
    console.error(
      'Ensure LOG_TO_FILE=true is set in .env and the server has written logs.',
    );
    return;
  }

  const searchIndex = args.indexOf('--search');
  const searchTerm = searchIndex !== -1 ? args[searchIndex + 1] : null;

  const tailIndex = args.indexOf('--tail');
  const tailCount = tailIndex !== -1 ? parseInt(args[tailIndex + 1], 10) : 100;

  const onlyErrors = args.includes('--error');

  const fileStream = fs.createReadStream(LOG_FILE_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const lines: string[] = [];

  for await (const line of rl) {
    let include = true;

    if (onlyErrors && !line.includes('"level":"ERROR"') && !line.includes('[ERROR]')) {
      include = false;
    }

    if (searchTerm && !line.toLowerCase().includes(searchTerm.toLowerCase())) {
      include = false;
    }

    if (include) {
      lines.push(line);
      if (lines.length > tailCount) {
        lines.shift(); // Keep only the last N lines
      }
    }
  }

  lines.forEach((line) => console.log(line));
};

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'stats':
        await showStats();
        break;
      case 'usage':
        await showUsage();
        break;
      case 'logs':
        await showLogs(args);
        break;
      default:
        console.log('SuperSync Monitor CLI');
        console.log('Usage: npm run monitor -- <command> [flags]');
        console.log('\nCommands:');
        console.log('  stats       Show system vitals and DB status');
        console.log('  usage       Show top 20 users by storage usage');
        console.log('  logs        Show server logs');
        console.log('    --tail <n>    Show last n lines (default 100)');
        console.log('    --search "s"  Filter logs by term');
        console.log('    --error       Show only errors');
        break;
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    await disconnectDb();
  }
};

main();
