import { DBNames } from '../pfapi.const';
import { Database } from '../db/database';
import { pfLog } from '../util/log';

export class TmpBackupService<ALL> {
  public static readonly DB_KEY = DBNames.TmpBackup;
  private readonly _db: Database;
  private _inMemoryBackup?: ALL;

  constructor(private db: Database) {
    this._db = db;
  }

  async load(): Promise<ALL | null> {
    pfLog(3, `${TmpBackupService.name}.${this.load.name}`);
    return (
      this._inMemoryBackup ||
      ((await this._db.load(TmpBackupService.DB_KEY)) as any) ||
      null
    );
  }

  async save(backup: ALL): Promise<unknown> {
    pfLog(
      2,
      `${TmpBackupService.name}.${this.save.name}()`,
      TmpBackupService.DB_KEY,
      backup,
    );
    this._inMemoryBackup = backup;
    return this._db.save(TmpBackupService.DB_KEY, backup, true);
  }

  async clear(): Promise<void> {
    pfLog(2, `${TmpBackupService.name}.${this.clear.name}()`);
    this._inMemoryBackup = undefined;
    await this._db.remove(TmpBackupService.DB_KEY, true);
  }
}
