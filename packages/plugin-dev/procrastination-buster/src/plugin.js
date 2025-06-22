// Procrastination Buster Plugin for Super Productivity

// Constants
const PluginMessageType = {
  ADD_STRATEGY_TASK: 'ADD_STRATEGY_TASK',
  START_POMODORO: 'START_POMODORO',
  START_FOCUS_MODE: 'START_FOCUS_MODE',
  QUICK_ADD_TASK: 'QUICK_ADD_TASK',
};

const SPActionType = {
  SHOW_ADD_TASK_BAR: '[Layout] Show AddTaskBar',
  SET_CURRENT_TASK: '[Task] SetCurrentTask',
  START_POMODORO: '[Pomodoro] Start Pomodoro',
  SHOW_FOCUS_OVERLAY: '[FocusMode] Show Focus Overlay',
};

const SnackType = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  INFO: 'INFO',
};

const WindowMessageType = {
  PLUGIN_MESSAGE: 'PLUGIN_MESSAGE',
  PLUGIN_MESSAGE_RESPONSE: 'PLUGIN_MESSAGE_RESPONSE',
  PLUGIN_MESSAGE_ERROR: 'PLUGIN_MESSAGE_ERROR',
};

// Message handler for plugin messages
const messageHandler = async (message) => {
  switch (message.type) {
    case PluginMessageType.ADD_STRATEGY_TASK:
      const taskTitle = `Strategy: ${message.strategy}`;
      const taskNotes = `Strategy for ${message.blockerType}: ${message.strategy}`;

      try {
        const taskId = await PluginAPI.addTask({
          title: taskTitle,
          notes: taskNotes,
        });

        // Show the add task bar to allow quick editing
        PluginAPI.dispatchAction({
          type: SPActionType.SHOW_ADD_TASK_BAR,
        });

        // Set the new task as current
        PluginAPI.dispatchAction({
          type: SPActionType.SET_CURRENT_TASK,
          id: taskId,
        });

        PluginAPI.showSnack({
          msg: 'Strategy task created! You can edit it in the task bar.',
          type: SnackType.SUCCESS,
        });
      } catch (error) {
        console.error('Failed to create task:', error);
        PluginAPI.showSnack({
          msg: 'Failed to create task',
          type: SnackType.ERROR,
        });
      }
      break;

    case PluginMessageType.START_POMODORO:
      PluginAPI.dispatchAction({
        type: SPActionType.START_POMODORO,
      });

      PluginAPI.showSnack({
        msg: 'Pomodoro started! Time to focus.',
        type: SnackType.SUCCESS,
      });
      break;

    case PluginMessageType.START_FOCUS_MODE:
      PluginAPI.dispatchAction({
        type: SPActionType.SHOW_FOCUS_OVERLAY,
      });

      PluginAPI.showSnack({
        msg: 'Focus mode activated! Distractions minimized.',
        type: SnackType.SUCCESS,
      });
      break;

    case PluginMessageType.QUICK_ADD_TASK:
      PluginAPI.dispatchAction({
        type: SPActionType.SHOW_ADD_TASK_BAR,
      });

      PluginAPI.showSnack({
        msg: 'Add task bar opened. Create your task!',
        type: SnackType.INFO,
      });
      break;

    default:
      console.warn('Unknown message type:', message.type);
  }
};

// Register the handler with PluginAPI
PluginAPI.onMessage(messageHandler);

// Expose the handler to the iframe for debugging purposes
window.__pluginMessageHandler = messageHandler;

// Listen for messages from the iframe
window.addEventListener('message', async (event) => {
  // Handle PLUGIN_MESSAGE events from our iframe
  if (event.data?.type === WindowMessageType.PLUGIN_MESSAGE && event.data.message) {
    try {
      // Process the message through our handler
      const result = await messageHandler(event.data.message);

      // Send response back to iframe if needed
      if (event.source && event.data.messageId) {
        event.source.postMessage(
          {
            type: WindowMessageType.PLUGIN_MESSAGE_RESPONSE,
            messageId: event.data.messageId,
            result,
          },
          '*',
        );
      }
    } catch (error) {
      console.error('Error handling iframe message:', error);

      if (event.source && event.data.messageId) {
        event.source.postMessage(
          {
            type: WindowMessageType.PLUGIN_MESSAGE_ERROR,
            messageId: event.data.messageId,
            error: error.message,
          },
          '*',
        );
      }
    }
  }
});

// Show a snack on plugin load
PluginAPI.showSnack({
  msg: 'Procrastination Buster loaded successfully!',
  type: SnackType.SUCCESS,
});
