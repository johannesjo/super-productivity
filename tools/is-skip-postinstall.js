console.log(process.env.SKIP_POST_INSTALL);
if (process.env.SKIP_POST_INSTALL && process.env.SKIP_POST_INSTALL !== 'false' && process.env.SKIP_POST_INSTALL !== '0') {
  console.log('\n\n!!! WARN: skipping postInstall !!!\n\n');
  process.exit(0);
} else {
  process.exit(1);
}
