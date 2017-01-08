const spawn = require('child_process').spawn;
let py;

function init() {
  py = spawn('python', [__dirname + '/py-gtk-indicator.py'], {
    stdio: [null, null, null, 'ipc']
  });

  py.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  py.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
    // kill process to prevent further trouble
    //py.kill('SIGINT');
  });

  py.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });

  py.on('message', function (message) {
    console.log('Received message...');
    console.log(message);
  });

  //py.stdin.write('DDDSDx');
  //py.stdin.end();


  //setTimeout(function () {
  //  console.log('timeoutDone');
  //  console.log('WRITE');

  //py.stdin.write('DDDSD\n');
  //py.stdin.end();
  //}, 1000);

}
init();

module.exports = {
  init: init,
  setCurrentTitle: (title) => {
    py.stdin.write('\n' + title);
  }
};

