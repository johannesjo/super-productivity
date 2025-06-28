// Plugin entry point for SuperProductivity
// This file is built as an IIFE and doesn't use ES modules

declare const PluginAPI: any;

(function () {
  console.log('Sync MD Plugin initializing...');

  // Helper to send messages to the iframe
  function sendMessage(action: string, data?: any) {
    const iframe = document.querySelector('#sync-md-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action, ...data }, '*');
    }
  }

  // Create iframe for the plugin UI
  const iframe = document.createElement('iframe');
  iframe.id = 'sync-md-iframe';
  iframe.src = PluginAPI.getPluginPath() + '/index.html';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  // Add iframe to the plugin container
  const container = document.querySelector('#plugin-container');
  if (container) {
    container.appendChild(iframe);
  }

  // Set up message handler for communication from iframe
  window.addEventListener('message', async (event) => {
    if (event.source !== iframe.contentWindow) return;

    const { action, ...data } = event.data;

    switch (action) {
      case 'getAllProjects':
        try {
          const projects = await PluginAPI.getAllProjects();
          event.source.postMessage({ action: 'projectsResponse', projects }, '*');
        } catch (error) {
          event.source.postMessage({ action: 'error', error: error.message }, '*');
        }
        break;

      case 'getTasks':
        try {
          const tasks = await PluginAPI.getTasks();
          event.source.postMessage({ action: 'tasksResponse', tasks }, '*');
        } catch (error) {
          event.source.postMessage({ action: 'error', error: error.message }, '*');
        }
        break;

      case 'addTask':
        try {
          const task = await PluginAPI.addTask(data.task);
          event.source.postMessage({ action: 'addTaskResponse', task }, '*');
        } catch (error) {
          event.source.postMessage({ action: 'error', error: error.message }, '*');
        }
        break;

      case 'updateTask':
        try {
          const task = await PluginAPI.updateTask(data.id, data.changes);
          event.source.postMessage({ action: 'updateTaskResponse', task }, '*');
        } catch (error) {
          event.source.postMessage({ action: 'error', error: error.message }, '*');
        }
        break;

      case 'deleteTask':
        try {
          await PluginAPI.deleteTask(data.id);
          event.source.postMessage({ action: 'deleteTaskResponse', id: data.id }, '*');
        } catch (error) {
          event.source.postMessage({ action: 'error', error: error.message }, '*');
        }
        break;

      case 'persistDataSynced':
        try {
          await PluginAPI.persistDataSynced(data.data);
          event.source.postMessage({ action: 'persistDataResponse' }, '*');
        } catch (error) {
          event.source.postMessage({ action: 'error', error: error.message }, '*');
        }
        break;

      case 'loadSyncedData':
        try {
          const savedData = await PluginAPI.loadSyncedData();
          event.source.postMessage({ action: 'loadDataResponse', data: savedData }, '*');
        } catch (error) {
          event.source.postMessage({ action: 'error', error: error.message }, '*');
        }
        break;

      case 'executeNodeScript':
        try {
          const result = await PluginAPI.executeNodeScript(data);
          event.source.postMessage({ action: 'nodeScriptResponse', result }, '*');
        } catch (error) {
          event.source.postMessage({ action: 'error', error: error.message }, '*');
        }
        break;

      case 'showSnack':
        PluginAPI.showSnack(data);
        break;
    }
  });

  // Listen for messages from the host
  if (PluginAPI.onMessage) {
    PluginAPI.onMessage((message: any) => {
      sendMessage('hostMessage', { message });
    });
  }

  console.log('Sync MD Plugin initialized successfully');
})();
