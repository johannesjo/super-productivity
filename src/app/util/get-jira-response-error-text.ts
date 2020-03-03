export function getJiraResponseErrorTxt(err: any) {
  if (err && err.error) {
    return (err.error.message)
      || (err.error.name)
      || (err.error.toString && err.error.toString())
      || err.error;
  } else if (err && err.toString) {
    return err.toString();
  } else {
    return err;
  }
}
