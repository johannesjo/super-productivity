console.log('Procrastination Buster plugin loaded!');
let t = null;
PluginAPI.registerHook('currentTaskChange', (e) => {
  const o = e;
  o
    ? (o.id,
      t && clearTimeout(t),
      (t = setTimeout(
        () => {
          PluginAPI.showSnack({
            msg: 'Need help? Click here for procrastination strategies',
            type: 'INFO',
            ico: 'psychology',
          });
        },
        15 * 60 * 1e3,
      )))
    : t && (clearTimeout(t), (t = null));
});
PluginAPI.registerShortcut({
  id: 'open_procrastination_buster',
  label: 'Open Procrastination Help',
  onExec: () => {
    PluginAPI.showIndexHtmlAsView();
  },
});
PluginAPI.onMessage(
  async (e) => (
    console.log('Plugin received message:', e),
    e.type === 'ADD_STRATEGY_TASK'
      ? {
          success: !0,
          taskId: await PluginAPI.addTask({
            title: e.strategy,
            notes: `Strategy for ${e.blockerType}`,
            timeEstimate: 3e5,
          }),
        }
      : e.type === 'START_POMODORO'
        ? (PluginAPI.showSnack({
            msg: 'Pomodoro timer started (25 minutes)',
            type: 'SUCCESS',
          }),
          { success: !0 })
        : { error: 'Unknown message type' }
  ),
);
