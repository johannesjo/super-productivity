import { PfapiModelCfg } from './pfapi.model';

// export class Pfapi<PCfg extends PfapiCfg, Ms extends PfapiModelCfg<any>[]> {
export class Pfapi<Ms extends PfapiModelCfg<any>[]> {
  // TODO
  setActiveProvider(activeProvider: any): void {}

  on(evName: string, cb: (ev: any) => void): any {}

  init(): void {}

  model(modelId: keyof Ms): void {}

  sync(): void {
    /*
    (0. maybe write lock file)
    1. Download main file (if changed rev)
    2. Check updated timestamps for conflicts (=> on conflict check for incomplete data on remote)

    A remote newer than local
    1. Check which revisions don't match the local version
    2. Download all files that don't match the local
    3. Do complete data import to Database
    4. update local revs and meta file data from remote
    5. inform about completion and pass back complete data to developer for import

    B local newer than remote
    1. Check which revisions don't match the local version
    2. Upload all files that don't match remote
    3. Update local meta and upload to remote
    4. inform about completion

On Conflict:
Offer to use remote or local (always create local backup before this)
     */
  }
}
