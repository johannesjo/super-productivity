import querystring from 'querystring';

const CLIENT_ID = '37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.install',
];
// const {codeVerifier, codeChallenge} = generatePKCECodes();
// <
// export const DROPBOX_CODE_VERIFIER = codeVerifier;

const _getGoogleAuthUrl = (opts = {}) => {
  if (opts.code_challenge_method && !opts.code_challenge) {
    throw new Error('If a code_challenge_method is provided, code_challenge must be included.');
  }
  opts.response_type = opts.response_type || 'code';
  opts.client_id = opts.client_id || CLIENT_ID;
  opts.redirect_uri = opts.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob';
  // Allow scopes to be passed either as array or a string
  if (opts.scope instanceof Array) {
    opts.scope = opts.scope.join(' ');
  }
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  return rootUrl + '?' + querystring.stringify(opts);
};

export const getGoogleAuthUrl = (opts = {}) => _getGoogleAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
});

console.log(getGoogleAuthUrl());
