'use strict';
const dbus = require('dbus-native');

const CONFIG = require('./CONFIG');
const serviceName = CONFIG.D_BUS_ID;

const interfaceName = serviceName;
const objectPath = '/' + serviceName.replace(/\./g, '/');
const sessionBus = dbus.sessionBus();
let mainWindow;
let ifaceDesc;
let iface;

function init(params) {

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

// Function called when we have successfully got the service name we wanted
  function proceed() {
    // First, we need to create our interface description (here we will only expose method calls)
    ifaceDesc = {
      name: interfaceName,
      methods: {
        // Simple types
        markAsDone: [],
        startTask: [],
        pauseTask: [],
        showApp: [],
        quitApp: [],
      },
      properties: {},
      signals: {
        taskChanged: ['ss', 'task_id', 'task_text'],
      },
    };

    // Then we need to create the interface implementation (with actual functions)
    iface = {
      markAsDone: function () {
        if (!mainWindow) {
          console.error('mainWindow not ready');
        }
        console.log('markAsDone');

      },
     startTask: function () {
        if (!mainWindow) {
          console.error('mainWindow not ready');
        }
       console.log('startTask');
     },
      pauseTask: function () {
        if (!mainWindow) {
          console.error('mainWindow not ready');
        }
        console.log('pauseTask');
      },
      showApp: function () {
        if (!mainWindow) {
          console.error('mainWindow not ready');
        }
        console.log('show app');
        params.showApp();
      },
      quitApp: function () {
        if (!mainWindow) {
          console.error('mainWindow not ready');
        }
        params.quitApp();
        console.log('quit app');
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
}

module.exports = {
  init: init,
  setMainWindow: (mainWindowPassed) => {
    mainWindow = mainWindowPassed;
  },
  setTask: (taskId, taskText) => {
    if (!iface) {
      console.error('interface not ready yet');
      return;
    }

    iface.emit('taskChanged', taskId + '', taskText + '')
  }
};