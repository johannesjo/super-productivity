'use strict';
const dbus = require('dbus-native');

const CONFIG = require('./CONFIG');
const serviceName = CONFIG.D_BUS_ID;

const interfaceName = serviceName;
const objectPath = '/' + serviceName.replace(/\./g, '/');
const sessionBus = dbus.sessionBus();
let mainWindow;

// Check the connection was successful
if (!sessionBus) {
  throw new Error('Could not connect to the DBus session bus.')
}

sessionBus.requestName(serviceName, 0x4, (e, retCode) => {
  // If there was an error, warn user and fail
  if (e) {
    throw new Error(`Could not request service name ${serviceName}, the error was: ${e}.`)
  }

  // Return code 0x1 means we successfully had the name
  if (retCode === 1) {
    console.log(`Successfully requested service name '${serviceName}'!`)
    proceed();
  }
  /* Other return codes means various errors, check here
  (https://dbus.freedesktop.org/doc/api/html/group__DBusShared.html#ga37a9bc7c6eb11d212bf8d5e5ff3b50f9) for more
  information
  */
  else {
    throw new Error(`Failed to request service name '${serviceName}'.Check what
        return code '${retCode}'
        means.`);
  }
});

let ifaceDesc;
let iface;

// Function called when we have successfully got the service name we wanted
function proceed() {
  // First, we need to create our interface description (here we will only expose method calls)
  ifaceDesc = {
    name: interfaceName,
    methods: {
      // Simple types
      startTask: ['s', 's', ['task_id'],
        ['task_id']
      ],
      pauseTask: ['s', 's', ['task_id'],
        ['taskId']
      ],
      showApp: ['', '', [],
        ['']
      ],
      quitApp: ['', '', [],
        ['']
      ],
    },
    properties: {},
    signals: {
      taskChanged: ['s', 'taskText'],
    },
  };

  // Then we need to create the interface implementation (with actual functions)
  iface = {
    startTask: function (taskId) {
      if (!mainWindow) {
        console.error('mainWindow not ready');
        return;
      }
      console.log('task changed');
      iface.emit('taskChanged', taskId)
    },
    pauseTask: function (taskId) {
      if (!mainWindow) {
        console.error('mainWindow not ready');
        return;
      }
      console.log('task changed');
      iface.emit('taskChanged', taskId)
    },
    showApp: function () {
      if (!mainWindow) {
        console.error('mainWindow not ready');
        return;
      }
      console.log('show app');
      return true;
    },
    quitApp: function () {
      if (!mainWindow) {
        console.error('mainWindow not ready');
        return;
      }
      console.log('quit app');
      return true;
    },
    emit: function () {
      // no nothing, as usual
    }
  };

  // Now we need to actually export our interface on our object
  sessionBus.exportInterface(iface, objectPath, ifaceDesc);

  // Say our service is ready to receive function calls (you can use `gdbus call` to make function calls)
  console.log('Interface exposed to DBus, ready to receive function calls!');
}

module.exports = {
  setMainWindow: (mainWindowPassed) => {
    mainWindow = mainWindowPassed;
  },
  setTask: (taskId, taskText) => {
    if (!iface) {
      console.error('interface not ready yet');
      return;
    }

    iface.emit('taskChanged', taskId, taskText)
  }
};