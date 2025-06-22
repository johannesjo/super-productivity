console.log('Procrastination Buster: Initializing plugin...');
const o = async (a) => {
  switch ((console.log('Procrastination Buster received message:', a), a.type)) {
    case 'ADD_STRATEGY_TASK':
      const e = `Strategy: ${a.strategy}`,
        s = `Strategy for ${a.blockerType}: ${a.strategy}`;
      try {
        const t = await PluginAPI.addTask({ title: e, notes: s });
        PluginAPI.dispatchAction({ type: '[Layout] Show AddTaskBar' }),
          PluginAPI.dispatchAction({ type: '[Task] SetCurrentTask', id: t }),
          PluginAPI.showSnack({
            msg: 'Strategy task created! You can edit it in the task bar.',
            type: 'SUCCESS',
          });
      } catch (t) {
        console.error('Failed to create task:', t),
          PluginAPI.showSnack({ msg: 'Failed to create task', type: 'ERROR' });
      }
      break;
    case 'START_POMODORO':
      PluginAPI.dispatchAction({ type: '[Pomodoro] Start Pomodoro' }),
        PluginAPI.showSnack({ msg: 'Pomodoro started! Time to focus.', type: 'SUCCESS' });
      break;
    case 'START_FOCUS_MODE':
      PluginAPI.dispatchAction({ type: '[FocusMode] Show Focus Overlay' }),
        PluginAPI.showSnack({
          msg: 'Focus mode activated! Distractions minimized.',
          type: 'SUCCESS',
        });
      break;
    case 'QUICK_ADD_TASK':
      PluginAPI.dispatchAction({ type: '[Layout] Show AddTaskBar' }),
        PluginAPI.showSnack({
          msg: 'Add task bar opened. Create your task!',
          type: 'INFO',
        });
      break;
    default:
      console.warn('Unknown message type:', a.type);
  }
};
PluginAPI.onMessage(o);
window.__pluginMessageHandler = o;
console.log(
  'Procrastination Buster plugin loaded, message handler exposed:',
  !!window.__pluginMessageHandler,
);
window.addEventListener('message', async (a) => {
  var e;
  if (((e = a.data) == null ? void 0 : e.type) === 'PLUGIN_MESSAGE' && a.data.message) {
    console.log('Plugin received message from iframe:', a.data.message);
    try {
      const s = await o(a.data.message);
      a.source &&
        a.data.messageId &&
        a.source.postMessage(
          { type: 'PLUGIN_MESSAGE_RESPONSE', messageId: a.data.messageId, result: s },
          '*',
        );
    } catch (s) {
      console.error('Error handling iframe message:', s),
        a.source &&
          a.data.messageId &&
          a.source.postMessage(
            {
              type: 'PLUGIN_MESSAGE_ERROR',
              messageId: a.data.messageId,
              error: s.message,
            },
            '*',
          );
    }
  }
});
PluginAPI.showSnack({
  msg: 'Procrastination Buster loaded successfully!',
  type: 'SUCCESS',
});
setTimeout(() => {
  console.log('Testing dispatchAction directly from plugin.js...');
  try {
    PluginAPI.dispatchAction({ type: '[Layout] Show AddTaskBar' }),
      PluginAPI.showSnack({
        msg: 'Action dispatched! Task bar should be visible.',
        type: 'INFO',
      });
  } catch (a) {
    console.error('Failed to dispatch action:', a),
      PluginAPI.showSnack({
        msg: 'Failed to dispatch action: ' + a.message,
        type: 'ERROR',
      });
  }
}, 2e3);
