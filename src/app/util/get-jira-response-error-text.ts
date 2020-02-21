export function getJiraResponseErrorTxt(err: any) {
  return (
    (err && err.error)
    && (err.error.message)
    || (err.error.name)
    || (err.error.toString
      ? err.error.toString()
      : err.toString())
  );
}
