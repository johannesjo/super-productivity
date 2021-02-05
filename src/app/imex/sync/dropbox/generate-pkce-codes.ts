import pkceChallenge from 'pkce-challenge';

export const generatePKCECodes = (length?: number): { codeVerifier: string; codeChallenge: string } => {
  const {code_verifier, code_challenge} = pkceChallenge(length);
  return {codeVerifier: code_verifier, codeChallenge: code_challenge};
};

