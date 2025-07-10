import { Log } from '../log';

export class AdditionalLogErrorBase extends Error {
  constructor(...additional: any) {
    super(...additional);
    Log.log(1, this.name, ...additional);
  }
}

/// -------------------------
