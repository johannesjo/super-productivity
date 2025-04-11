export interface DatabaseAdapter {
  init(): Promise<unknown>;

  teardown(): Promise<void>;

  load<T>(key: string): Promise<T>;

  save(key: string, data: unknown): Promise<void>;

  remove(key: string): Promise<unknown>;

  loadAll<A extends Record<string, unknown>>(): Promise<A>;

  clearDatabase(): Promise<void>;
}
