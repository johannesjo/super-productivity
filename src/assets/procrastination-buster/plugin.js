const o = {
    ADD_STRATEGY_TASK: 'ADD_STRATEGY_TASK',
    START_POMODORO: 'START_POMODORO',
    START_FOCUS_MODE: 'START_FOCUS_MODE',
    QUICK_ADD_TASK: 'QUICK_ADD_TASK',
  },
  t = {
    SHOW_ADD_TASK_BAR: '[Layout] Show AddTaskBar',
    SET_CURRENT_TASK: '[Task] SetCurrentTask',
    START_POMODORO: '[Pomodoro] Start Pomodoro',
    SHOW_FOCUS_OVERLAY: '[FocusMode] Show Focus Overlay',
  },
  e = { SUCCESS: 'SUCCESS', ERROR: 'ERROR', INFO: 'INFO' },
  c = {
    PLUGIN_MESSAGE: 'PLUGIN_MESSAGE',
    PLUGIN_MESSAGE_RESPONSE: 'PLUGIN_MESSAGE_RESPONSE',
    PLUGIN_MESSAGE_ERROR: 'PLUGIN_MESSAGE_ERROR',
  },
  i = async (a) => {
    switch (a.type) {
      case o.ADD_STRATEGY_TASK:
        const S = `Strategy: ${a.strategy}`,
          s = `Strategy for ${a.blockerType}: ${a.strategy}`;
        try {
          const A = await PluginAPI.addTask({ title: S, notes: s });
          PluginAPI.dispatchAction({ type: t.SHOW_ADD_TASK_BAR }),
            PluginAPI.dispatchAction({ type: t.SET_CURRENT_TASK, id: A }),
            PluginAPI.showSnack({
              msg: 'Strategy task created! You can edit it in the task bar.',
              type: e.SUCCESS,
            });
        } catch (A) {
          console.error('Failed to create task:', A),
            PluginAPI.showSnack({ msg: 'Failed to create task', type: e.ERROR });
        }
        break;
      case o.START_POMODORO:
        PluginAPI.dispatchAction({ type: t.SHOW_FOCUS_OVERLAY }),
          PluginAPI.showSnack({
            msg: 'Focus mode activated! Distractions minimized.',
            type: e.SUCCESS,
          });
        break;
      case o.START_FOCUS_MODE:
        PluginAPI.dispatchAction({ type: t.SHOW_FOCUS_OVERLAY }),
          PluginAPI.showSnack({
            msg: 'Focus mode activated! Distractions minimized.',
            type: e.SUCCESS,
          });
        break;
      case o.QUICK_ADD_TASK:
        PluginAPI.dispatchAction({ type: t.SHOW_ADD_TASK_BAR }),
          PluginAPI.showSnack({
            msg: 'Add task bar opened. Create your task!',
            type: e.INFO,
          });
        break;
      default:
        console.warn('Unknown message type:', a.type);
    }
  };
PluginAPI.onMessage(i);
window.__pluginMessageHandler = i;
window.addEventListener('message', async (a) => {
  var S;
  if (((S = a.data) == null ? void 0 : S.type) === c.PLUGIN_MESSAGE && a.data.message)
    try {
      const s = await i(a.data.message);
      a.source &&
        a.data.messageId &&
        a.source.postMessage(
          { type: c.PLUGIN_MESSAGE_RESPONSE, messageId: a.data.messageId, result: s },
          '*',
        );
    } catch (s) {
      console.error('Error handling iframe message:', s),
        a.source &&
          a.data.messageId &&
          a.source.postMessage(
            {
              type: c.PLUGIN_MESSAGE_ERROR,
              messageId: a.data.messageId,
              error: s.message,
            },
            '*',
          );
    }
});
PluginAPI.showSnack({
  msg: 'Procrastination Buster loaded successfully!',
  type: e.SUCCESS,
});
