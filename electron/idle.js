const exec = require('child_process').exec;
const cmd = 'xprintidle';
module.exports = (cb) => {
  exec(cmd, function (error, stdout) {
    // command output is in stdout
    cb(stdout);
  });
};