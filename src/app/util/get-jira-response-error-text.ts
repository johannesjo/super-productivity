export function getJiraResponseErrorTxt(err: any) {
  return (err && err.error && (typeof err.error === 'string' && err.error || err.error.name || err.error));
}
