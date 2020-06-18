import pkceChallenge from 'pkce-challenge';

export const generatePKCECodes = (): { codeVerifier: string; codeChallenge: string } => {
  const {code_verifier, code_challenge} = pkceChallenge();
  return {codeVerifier: code_verifier, codeChallenge: code_challenge};
};

