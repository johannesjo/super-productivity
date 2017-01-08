const spawn = require('child_process').spawn;
let py;

module.exports = {
  init: init,
  setCurrentTitle: setCurrentTitle
};

function init(app, mainWindow) {
  py = spawn('python', [__dirname + '/py-gtk-indicator.py'], {
    stdio: [null, null, null, 'ipc']
  });

  py.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    let strData = data.toString('utf8').trim();
    if (strData === 'QUIT') {
      app.isQuiting = true;
      app.quit();
    } else if (strData === 'SHOW_APP') {
      mainWindow.show();
    }
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
}

function setCurrentTitle(title, app, mainWindow) {
  if (py) {
    py.kill('SIGHUP');
  }
  init(app, mainWindow);
  py.stdin.write(title);
  py.stdin.end();
}


