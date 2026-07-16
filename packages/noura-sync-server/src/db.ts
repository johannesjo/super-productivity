import { randomUUID } from 'node:crypto';
import { SQL as BunSQL } from 'bun';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { drizzle, type BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import * as schema from './db/schema';
import {
  operations,
  passkeys,
  pendingPasskeyRegistrations,
  syncDevices,
  users,
  userSyncState,
  type OperationRow,
  type PasskeyRow,
  type PendingPasskeyRegistrationRow,
  type SyncDeviceRow,
  type UserRow,
  type UserSyncStateRow,
} from './db/schema';

type QueryWhere = Record<string, unknown>;
type QuerySelect = Record<string, boolean>;

interface QueryArgs {
  where?: QueryWhere;
  select?: QuerySelect;
  orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  take?: number;
  skip?: number;
  distinct?: string[];
}

interface MutationArgs {
  where: QueryWhere;
  data: Record<string, unknown>;
  select?: QuerySelect;
}

export interface ModelDelegate<Row> {
  findUnique(args: QueryArgs & { where: QueryWhere }): Promise<Row | null>;
  findUniqueOrThrow(args: QueryArgs & { where: QueryWhere }): Promise<Row>;
  findFirst(args?: QueryArgs): Promise<Row | null>;
  findMany(args?: QueryArgs): Promise<Row[]>;
  create(args: { data: Record<string, unknown>; select?: QuerySelect }): Promise<Row>;
  createMany(args: {
    data: Record<string, unknown> | Array<Record<string, unknown>>;
    skipDuplicates?: boolean;
  }): Promise<{ count: number }>;
  update(args: MutationArgs): Promise<Row>;
  updateMany(args: MutationArgs): Promise<{ count: number }>;
  delete(args: { where: QueryWhere }): Promise<Row>;
  deleteMany(args?: { where?: QueryWhere }): Promise<{ count: number }>;
  upsert(args: {
    where: QueryWhere;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
    select?: QuerySelect;
  }): Promise<Row>;
  count(args?: { where?: QueryWhere }): Promise<number>;
  aggregate(args: {
    where?: QueryWhere;
    _min?: Record<string, boolean>;
    _max?: Record<string, boolean>;
  }): Promise<Record<string, Record<string, unknown>>>;
}

export interface DatabaseTransactionOptions {
  isolationLevel?: 'RepeatableRead' | 'Serializable' | 'ReadCommitted';
  timeout?: number;
  maxWait?: number;
}

export interface DatabaseClient {
  user: ModelDelegate<UserRow>;
  passkey: ModelDelegate<PasskeyRow>;
  pendingPasskeyRegistration: ModelDelegate<PendingPasskeyRegistrationRow>;
  operation: ModelDelegate<OperationRow>;
  userSyncState: ModelDelegate<UserSyncStateRow>;
  syncDevice: ModelDelegate<SyncDeviceRow>;
  $transaction<T>(
    callback: ((tx: DatabaseTransaction) => Promise<T>) | Array<Promise<unknown>>,
    options?: DatabaseTransactionOptions,
  ): Promise<T>;
  $queryRaw<T = Array<Record<string, unknown>>>(
    strings: TemplateStringsArray | SQL,
    ...values: unknown[]
  ): Promise<T>;
  $executeRaw(strings: TemplateStringsArray | SQL, ...values: unknown[]): Promise<number>;
}

export type DatabaseTransaction = DatabaseClient;
export type DbOperation = OperationRow;
export type DbUser = UserRow;
export type DbUserSyncState = UserSyncStateRow;
export type DbSyncDevice = SyncDeviceRow;
export type DbJsonValue = unknown;

interface ModelDefinition {
  table: PgTable;
  conflictColumns: string[];
  generatedId?: boolean;
}

type Executor = BunSQLDatabase<typeof schema> | Record<string, unknown>;

let client: BunSQL | undefined;
let drizzleDb: BunSQLDatabase<typeof schema> | undefined;

const requireDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for NouraSync');
  }
  return databaseUrl;
};

export const getDrizzleDb = (): BunSQLDatabase<typeof schema> => {
  if (drizzleDb) return drizzleDb;

  client = new BunSQL(requireDatabaseUrl(), {
    max: Number.parseInt(process.env.DATABASE_POOL_SIZE ?? '10', 10),
    idleTimeout: 30,
    connectionTimeout: 20,
  });
  drizzleDb = drizzle({ client, schema });
  return drizzleDb;
};

const modelDefinitions = {
  user: { table: users, conflictColumns: ['id'] },
  passkey: { table: passkeys, conflictColumns: ['id'], generatedId: true },
  pendingPasskeyRegistration: {
    table: pendingPasskeyRegistrations,
    conflictColumns: ['id'],
    generatedId: true,
  },
  operation: { table: operations, conflictColumns: ['id'] },
  userSyncState: { table: userSyncState, conflictColumns: ['userId'] },
  syncDevice: { table: syncDevices, conflictColumns: ['userId', 'clientId'] },
} satisfies Record<string, ModelDefinition>;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const flattenCompositeWhere = (where: QueryWhere): QueryWhere => {
  const flattened: QueryWhere = {};
  for (const [key, value] of Object.entries(where)) {
    if (key.includes('_') && typeof value === 'object' && value !== null) {
      Object.assign(flattened, value);
    } else {
      flattened[key] = value;
    }
  }
  return flattened;
};

const scalarCondition = (column: PgColumn, value: unknown): SQL | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return isNull(column);
  if (typeof value !== 'object' || value instanceof Date || value instanceof Uint8Array) {
    return eq(column, value);
  }

  const operators = asRecord(value);
  const conditions: Array<SQL | undefined> = [];
  for (const [operator, operand] of Object.entries(operators)) {
    switch (operator) {
      case 'equals':
        conditions.push(operand === null ? isNull(column) : eq(column, operand));
        break;
      case 'not':
        if (operand === null) conditions.push(isNotNull(column));
        else if (typeof operand === 'object') {
          const nested = scalarCondition(column, operand);
          conditions.push(nested ? not(nested) : undefined);
        } else conditions.push(ne(column, operand));
        break;
      case 'in':
        conditions.push(Array.isArray(operand) ? inArray(column, operand) : undefined);
        break;
      case 'notIn':
        conditions.push(
          Array.isArray(operand) ? not(inArray(column, operand)) : undefined,
        );
        break;
      case 'gt':
        conditions.push(gt(column, operand));
        break;
      case 'gte':
        conditions.push(gte(column, operand));
        break;
      case 'lt':
        conditions.push(lt(column, operand));
        break;
      case 'lte':
        conditions.push(lte(column, operand));
        break;
      case 'startsWith':
        conditions.push(
          typeof operand === 'string'
            ? like(column, `${operand.replace(/[\\%_]/g, '\\$&')}%`)
            : undefined,
        );
        break;
      case 'endsWith':
        conditions.push(
          typeof operand === 'string'
            ? like(column, `%${operand.replace(/[\\%_]/g, '\\$&')}`)
            : undefined,
        );
        break;
      case 'contains':
        conditions.push(
          typeof operand === 'string'
            ? like(column, `%${operand.replace(/[\\%_]/g, '\\$&')}%`)
            : undefined,
        );
        break;
      default:
        break;
    }
  }
  return and(...conditions.filter((condition): condition is SQL => Boolean(condition)));
};

const buildWhere = (
  where: QueryWhere | undefined,
  columns: Record<string, PgColumn>,
): SQL | undefined => {
  if (!where) return undefined;
  const normalized = flattenCompositeWhere(where);
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(normalized)) {
    if (key === 'OR' && Array.isArray(value)) {
      const alternatives = value
        .map((entry) => buildWhere(asRecord(entry), columns))
        .filter((condition): condition is SQL => Boolean(condition));
      if (alternatives.length > 0) conditions.push(or(...alternatives)!);
      continue;
    }
    if (key === 'AND' && Array.isArray(value)) {
      const nested = value
        .map((entry) => buildWhere(asRecord(entry), columns))
        .filter((condition): condition is SQL => Boolean(condition));
      if (nested.length > 0) conditions.push(and(...nested)!);
      continue;
    }
    if (key === 'NOT') {
      const nested = buildWhere(asRecord(value), columns);
      if (nested) conditions.push(not(nested));
      continue;
    }

    const column = columns[key];
    if (!column) continue;
    const condition = scalarCondition(column, value);
    if (condition) conditions.push(condition);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
};

const project = <Row>(row: Row, select?: QuerySelect): Row => {
  if (!select || !row) return row;
  const selected: Record<string, unknown> = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) selected[key] = (row as Record<string, unknown>)[key];
  }
  return selected as Row;
};

const mutationValues = (
  data: Record<string, unknown>,
  columns: Record<string, PgColumn>,
): Record<string, unknown> => {
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || !columns[key]) continue;
    const mutation = asRecord(value);
    if ('increment' in mutation) {
      values[key] = sql`${columns[key]} + ${mutation.increment}`;
    } else if ('decrement' in mutation) {
      values[key] = sql`${columns[key]} - ${mutation.decrement}`;
    } else {
      values[key] = value;
    }
  }
  return values;
};

const normalizeInsert = (
  data: Record<string, unknown>,
  definition: ModelDefinition,
): Record<string, unknown> => {
  if (definition.generatedId && data.id === undefined) {
    return { ...data, id: randomUUID() };
  }
  return data;
};

const makeDelegate = <Row>(
  executor: Executor,
  definition: ModelDefinition,
): ModelDelegate<Row> => {
  const queryExecutor = executor as BunSQLDatabase<typeof schema>;
  const table = definition.table;
  const columns = getTableColumns(table) as Record<string, PgColumn>;

  const findMany = async (args: QueryArgs = {}): Promise<Row[]> => {
    const distinctColumns = (args.distinct ?? [])
      .map((key) => columns[key])
      .filter((column): column is PgColumn => Boolean(column));
    let query =
      distinctColumns.length > 0
        ? queryExecutor.selectDistinctOn(distinctColumns).from(table).$dynamic()
        : queryExecutor.select().from(table).$dynamic();
    const where = buildWhere(args.where, columns);
    if (where) query = query.where(where);

    const orderByEntries = Array.isArray(args.orderBy)
      ? args.orderBy
      : args.orderBy
        ? [args.orderBy]
        : [];
    const order = orderByEntries.flatMap((entry) =>
      Object.entries(entry)
        .filter(([key]) => Boolean(columns[key]))
        .map(([key, direction]) =>
          direction === 'desc' ? desc(columns[key]) : asc(columns[key]),
        ),
    );
    if (order.length > 0) query = query.orderBy(...order);
    if (args.skip !== undefined) query = query.offset(args.skip);
    if (args.take !== undefined) query = query.limit(args.take);

    const rows = (await query) as Row[];
    return rows.map((row) => project(row, args.select));
  };

  return {
    findUnique: async (args) => (await findMany({ ...args, take: 1 }))[0] ?? null,
    findUniqueOrThrow: async (args) => {
      const row = (await findMany({ ...args, take: 1 }))[0];
      if (!row) throw new DatabaseNotFoundError('model');
      return row;
    },
    findFirst: async (args = {}) => (await findMany({ ...args, take: 1 }))[0] ?? null,
    findMany,
    create: async (args) => {
      const data = normalizeInsert(args.data, definition);
      const rows = (await queryExecutor.insert(table).values(data).returning()) as Row[];
      return project(rows[0], args.select);
    },
    createMany: async (args) => {
      const input = Array.isArray(args.data) ? args.data : [args.data];
      if (input.length === 0) return { count: 0 };
      let query = queryExecutor
        .insert(table)
        .values(input.map((data) => normalizeInsert(data, definition)))
        .$dynamic();
      if (args.skipDuplicates) query = query.onConflictDoNothing();
      const rows = await query.returning();
      return { count: rows.length };
    },
    update: async (args) => {
      const rows = (await queryExecutor
        .update(table)
        .set(mutationValues(args.data, columns))
        .where(buildWhere(args.where, columns))
        .returning()) as Row[];
      if (!rows[0]) throw new DatabaseNotFoundError('model');
      return project(rows[0], args.select);
    },
    updateMany: async (args) => {
      const rows = await queryExecutor
        .update(table)
        .set(mutationValues(args.data, columns))
        .where(buildWhere(args.where, columns))
        .returning();
      return { count: rows.length };
    },
    delete: async (args) => {
      const rows = (await queryExecutor
        .delete(table)
        .where(buildWhere(args.where, columns))
        .returning()) as Row[];
      if (!rows[0]) throw new DatabaseNotFoundError('model');
      return rows[0];
    },
    deleteMany: async (args = {}) => {
      const rows = await queryExecutor
        .delete(table)
        .where(buildWhere(args.where, columns))
        .returning();
      return { count: rows.length };
    },
    upsert: async (args) => {
      const target = definition.conflictColumns.map((key) => columns[key]);
      const updateValues = mutationValues(args.update, columns);
      const insert = queryExecutor
        .insert(table)
        .values(normalizeInsert(args.create, definition));
      const rows = (
        Object.keys(updateValues).length
          ? await insert.onConflictDoUpdate({ target, set: updateValues }).returning()
          : await insert.onConflictDoNothing({ target }).returning()
      ) as Row[];
      const row = rows[0] ?? (await findMany({ where: args.where, take: 1 }))[0];
      if (!row) throw new DatabaseNotFoundError('model');
      return project(row, args.select);
    },
    count: async (args = {}) => {
      const rows = await queryExecutor
        .select({ value: count() })
        .from(table)
        .where(buildWhere(args.where, columns));
      return Number(rows[0]?.value ?? 0);
    },
    aggregate: async (args) => {
      const result: Record<string, Record<string, unknown>> = {};
      const requestedMin = Object.keys(args._min ?? {}).filter((key) => columns[key]);
      const requestedMax = Object.keys(args._max ?? {}).filter((key) => columns[key]);
      const selection: Record<string, SQL> = {};
      for (const key of requestedMin) selection[`min_${key}`] = sql`min(${columns[key]})`;
      for (const key of requestedMax) selection[`max_${key}`] = sql`max(${columns[key]})`;
      const rows = await queryExecutor
        .select(selection)
        .from(table)
        .where(buildWhere(args.where, columns));
      result._min = Object.fromEntries(
        requestedMin.map((key) => [key, rows[0]?.[`min_${key}`] ?? null]),
      );
      result._max = Object.fromEntries(
        requestedMax.map((key) => [key, rows[0]?.[`max_${key}`] ?? null]),
      );
      return result;
    },
  };
};

const toSql = (strings: TemplateStringsArray | SQL, values: unknown[]): SQL =>
  Array.isArray(strings) && 'raw' in strings
    ? sql(strings as TemplateStringsArray, ...values)
    : (strings as SQL);

const makeDatabaseClient = (executorFactory: () => Executor): DatabaseClient => {
  const rawQuery = async <T>(
    strings: TemplateStringsArray | SQL,
    values: unknown[],
  ): Promise<T> => {
    const executor = executorFactory() as BunSQLDatabase<typeof schema>;
    return (await executor.execute(toSql(strings, values))) as T;
  };

  const result = {
    get user() {
      return makeDelegate<UserRow>(executorFactory(), modelDefinitions.user);
    },
    get passkey() {
      return makeDelegate<PasskeyRow>(executorFactory(), modelDefinitions.passkey);
    },
    get pendingPasskeyRegistration() {
      return makeDelegate<PendingPasskeyRegistrationRow>(
        executorFactory(),
        modelDefinitions.pendingPasskeyRegistration,
      );
    },
    get operation() {
      return makeDelegate<OperationRow>(executorFactory(), modelDefinitions.operation);
    },
    get userSyncState() {
      return makeDelegate<UserSyncStateRow>(
        executorFactory(),
        modelDefinitions.userSyncState,
      );
    },
    get syncDevice() {
      return makeDelegate<SyncDeviceRow>(executorFactory(), modelDefinitions.syncDevice);
    },
    $transaction: async <T>(
      callback: ((tx: DatabaseTransaction) => Promise<T>) | Array<Promise<unknown>>,
      options: DatabaseTransactionOptions = {},
    ): Promise<T> => {
      if (Array.isArray(callback)) return (await Promise.all(callback)) as T;
      const database = executorFactory() as BunSQLDatabase<typeof schema>;
      const isolationLevel =
        options.isolationLevel === 'RepeatableRead'
          ? 'repeatable read'
          : options.isolationLevel === 'Serializable'
            ? 'serializable'
            : 'read committed';
      return database.transaction(
        async (transaction) => {
          if (options.timeout) {
            await transaction.execute(
              sql`SELECT set_config('statement_timeout', ${String(Math.max(1, options.timeout))}, true)`,
            );
          }
          return callback(makeDatabaseClient(() => transaction as unknown as Executor));
        },
        { isolationLevel },
      );
    },
    $queryRaw: <T = Array<Record<string, unknown>>>(
      strings: TemplateStringsArray | SQL,
      ...values: unknown[]
    ) => rawQuery<T>(strings, values),
    $executeRaw: async (strings: TemplateStringsArray | SQL, ...values: unknown[]) => {
      await rawQuery(strings, values);
      return 0;
    },
  } satisfies DatabaseClient;

  return result;
};

export class DatabaseNotFoundError extends Error {
  readonly code = 'NOT_FOUND';

  constructor(model: unknown) {
    super(`${String(model)} record was not found`);
    this.name = 'DatabaseNotFoundError';
  }
}

export const getPostgresErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.code === 'string') return record.code;
  const cause = record.cause;
  if (typeof cause === 'object' && cause !== null) {
    const causeCode = (cause as Record<string, unknown>).code;
    return typeof causeCode === 'string' ? causeCode : undefined;
  }
  return undefined;
};

export const isUniqueViolation = (error: unknown): boolean =>
  getPostgresErrorCode(error) === '23505';

export const isRetryableTransactionError = (error: unknown): boolean => {
  const code = getPostgresErrorCode(error);
  return code === '40001' || code === '40P01';
};

export const db = makeDatabaseClient(() => getDrizzleDb());

export const healthCheckDb = async (): Promise<void> => {
  await getDrizzleDb().execute(sql`select 1`);
};

export const disconnectDb = async (): Promise<void> => {
  if (!client) return;
  await client.close();
  client = undefined;
  drizzleDb = undefined;
};
