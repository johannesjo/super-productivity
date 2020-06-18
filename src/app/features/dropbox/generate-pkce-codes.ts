// let crypto: Crypto;
// try {
//   crypto = require('crypto');
//   console.log(crypto);
// } catch (e) {
//   console.log(e);
// crypto = window.crypto;
// }
// import * as crypto from "crypto";
// console.log(crypto);
export const generatePKCECodes = (): { codeVerifier: string; codeChallenge: string } => {
  // const PKCELength = 128;
  // let codeVerifier = crypto.randomBytes(PKCELength);
  // codeVerifier = codeVerifier.toString('base64')
  //   .replace(/\+/g, '-')
  //   .replace(/\//g, '_')
  //   .replace(/=/g, '')
  //   .substr(0, 128);
  //
  // const encoder = new TextEncoder();
  // const codeData = encoder.encode(codeVerifier);
  // let codeChallenge = crypto.createHash('sha256').update(codeData).digest();
  // codeChallenge = codeChallenge.toString('base64')
  //   .replace(/\+/g, '-')
  //   .replace(/\//g, '_')
  //   .replace(/=/g, '');

  const codeVerifier = '';
  const codeChallenge = '';
  return {codeVerifier, codeChallenge};
}
