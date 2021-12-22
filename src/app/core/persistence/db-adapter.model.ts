export interface DBAdapter {
  init(): Promise<unknown>;

  teardown(): Promise<void>;

  load(key: string): Promise<unknown>;

  save(key: string, data: unknown): Promise<unknown>;

  remove(key: string): Promise<unknown>;

  clearDatabase(): Promise<unknown>;
}
