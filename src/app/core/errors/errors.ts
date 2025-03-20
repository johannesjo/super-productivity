export class AdditionalLogErrorBase extends Error {
  constructor(...additional: any) {
    super(...additional);
    console.log(1, this.name, ...additional);
  }
}

/// -------------------------
