import * as querystring from 'querystring';
import { GOOGLE_API_SCOPES_ARRAY, GOOGLE_SETTINGS_ELECTRON } from './google.const';

const _getGoogleAuthUrl = (opts: any = {}) => {
  if (opts.code_challenge_method && !opts.code_challenge) {
    throw new Error(
      'If a code_challenge_method is provided, code_challenge must be included.',
    );
  }
  opts.response_type = opts.response_type || 'code';
  opts.client_id = opts.client_id || GOOGLE_SETTINGS_ELECTRON.CLIENT_ID;
  opts.redirect_uri = opts.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob';
  // Allow scopes to be passed either as array or a string
  if (opts.scope instanceof Array) {
    opts.scope = opts.scope.join(' ');
  }
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  return rootUrl + '?' + querystring.stringify(opts);
};

export const getGoogleAuthUrl = (codeChallenge: string): string =>
  _getGoogleAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_API_SCOPES_ARRAY,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    // TODO make real code challenge work
    // code_challenge: codeChallenge,
    code_challenge: codeChallenge,
  });
