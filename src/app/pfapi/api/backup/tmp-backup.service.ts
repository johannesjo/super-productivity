import { DBNames } from '../pfapi.const';
import { Database } from '../db/database';
import { PFLog } from '../../../core/log';

export class TmpBackupService<BD extends Record<string, any>> {
  private static readonly L = 'TmpBackupService';
  public static readonly DB_KEY = DBNames.TmpBackup;
  private _inMemoryBackup?: BD;

  constructor(private readonly _db: Database) {}

  /**
   * Loads the backup from memory or database.
   * @returns The backup data or null if not found.
   */
  async load(): Promise<BD | null> {
    PFLog.verbose(`${TmpBackupService.L}.${this.load.name}()`);
    return (
      this._inMemoryBackup ||
      ((await this._db.load(TmpBackupService.DB_KEY)) as BD) ||
      null
    );
  }

  /**
   * Saves the backup to memory and database.
   * @param backup The backup data to save.
   * @returns A promise resolving when the save is complete.
   */
  async save(backup: BD): Promise<unknown> {
    PFLog.normal(
      `${TmpBackupService.L}.${this.save.name}()`,
      TmpBackupService.DB_KEY,
      backup,
    );
    this._inMemoryBackup = backup;
    return this._db.save(TmpBackupService.DB_KEY, backup, true);
  }

  /**
   * Clears the backup from memory and database.
   */
  async clear(): Promise<void> {
    PFLog.normal(`${TmpBackupService.L}.${this.clear.name}()`);
    this._inMemoryBackup = undefined;
    await this._db.remove(TmpBackupService.DB_KEY, true);
  }
}
