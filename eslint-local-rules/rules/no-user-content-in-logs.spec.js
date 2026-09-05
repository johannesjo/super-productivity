/**
 * Tests for no-user-content-in-logs ESLint rule
 */
const { RuleTester } = require('eslint');
const rule = require('./no-user-content-in-logs');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-user-content-in-logs', rule, {
  valid: [
    // A plain message.
    { code: `Log.log('Calendar poll complete');` },
    // Explicit fields — the shape the rule exists to encourage.
    { code: `Log.log('addEvToShow', { shownCount: curVal.length, calEvId: calEv.id });` },
    {
      code: `Log.log({ taskForEventId: taskForEvent?.id, bannerCount: nrOfAllBanners });`,
    },
    {
      code: `TaskLog.log({ hasReminderCfg: !!reminderCfg, archiveInstanceCount: archiveInstances.length });`,
    },
    // Errors are the one whole object the logger deliberately narrows to
    // name/message/stack, in both recordLog and exportLogHistory.
    { code: `Log.err(e);` },
    { code: `Log.err('Something failed', err);` },
    { code: `SyncLog.err('Failed to parse', error);` },
    // Self-describing names stay ergonomic bare or shorthand.
    { code: `Log.log('Task dropped on Project', { taskId, projectId });` },
    { code: `Log.log('counts', { taskCount, nullTaskCount });` },
    { code: `Log.log('state', { activeId, isEnabled });` },
    { code: `Log.debug(taskId);` },
    // Booleans say their own shape — logging one whole discloses only the flag.
    { code: `Log.log('a', { isNative, hasTaskData, useAlarmStyle });` },
    { code: `Log.log('update', isUpdateAvailable);` },
    { code: `Log.log('a', { shouldRetry, canEdit, needsRepair });` },
    // Suffixed errors, not just the bare conventional names.
    { code: `Log.err('cleanup failed', cleanupError);` },
    { code: `Log.err('stat failed', statErr);` },
    // A module constant is not a runtime payload.
    { code: `Log.log(MAX_VECTOR_CLOCK_SIZE);` },
    // Non-payload methods on the logger are untouched.
    { code: `Log.setContext(ctx);` },
    { code: `Log.setLevel(level);` },
    // Not a logger.
    { code: `analytics.log(task);` },
    { code: `console.log(task);` },
  ],

  invalid: [
    // The exact shape that leaked private calendar content (#7870).
    {
      code: `Log.log('addEvToShow', curVal, calEv);`,
      errors: [
        { messageId: 'bareIdentifier', data: { name: 'curVal' } },
        { messageId: 'bareIdentifier', data: { name: 'calEv' } },
      ],
    },
    // Shorthand hands over whole entities.
    {
      code: `Log.log({ taskForEvent, allEvsToShow });`,
      errors: [
        { messageId: 'shorthandProperty', data: { name: 'taskForEvent' } },
        { messageId: 'shorthandProperty', data: { name: 'allEvsToShow' } },
      ],
    },
    {
      code: `TaskLog.log({ reminderCfg, nonArchiveInstancesWithSubTasks, archiveInstances });`,
      errors: [
        { messageId: 'shorthandProperty' },
        { messageId: 'shorthandProperty' },
        { messageId: 'shorthandProperty' },
      ],
    },
    // A bare arg that is not obviously an id/count (#9112).
    {
      code: `Log.log('Updated reminders in worker', reminders);`,
      errors: [{ messageId: 'bareIdentifier', data: { name: 'reminders' } }],
    },
    {
      code: `Log.log('Error INFO Today:', arg);`,
      errors: [{ messageId: 'bareIdentifier', data: { name: 'arg' } }],
    },
    // A bare first argument is a payload too.
    {
      code: `TaskLog.log(taskTitleEditEl);`,
      errors: [{ messageId: 'bareIdentifier', data: { name: 'taskTitleEditEl' } }],
    },
    // Spreading is opaque — every own property lands in the export.
    {
      code: `Log.log('ctx', { ...task });`,
      errors: [{ messageId: 'spreadProperty', data: { name: 'task' } }],
    },
    // Mixed: the explicit half is fine, the shorthand half is not.
    {
      code: `Log.log({ taskId: task.id, calEv });`,
      errors: [{ messageId: 'shorthandProperty', data: { name: 'calEv' } }],
    },
    // Every context logger is covered, not just `Log`.
    {
      code: `PluginLog.warn('plugin cfg', cfg);`,
      errors: [{ messageId: 'bareIdentifier', data: { name: 'cfg' } }],
    },
    {
      code: `IssueLog.log('issue', issue);`,
      errors: [{ messageId: 'bareIdentifier', data: { name: 'issue' } }],
    },
  ],
});
