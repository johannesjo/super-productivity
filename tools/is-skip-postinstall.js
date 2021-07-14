console.log(process.env.SKIP_POST_INSTALL);
// NOTE: this is just a script to make conditionally executing ngcc work via ||
if (
  process.env.SKIP_POST_INSTALL &&
  process.env.SKIP_POST_INSTALL !== 'false' &&
  process.env.SKIP_POST_INSTALL !== '0'
) {
  console.log('\n\n!!! WARN: skipping postInstall !!!\n\n');
  process.exit(0);
} else {
  console.log('Exiting with error code on purpose! No worries :)');
  process.exit(123456789);
}
