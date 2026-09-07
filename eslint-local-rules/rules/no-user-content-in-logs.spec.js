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

// TS-only syntax needs the TS parser; kept as a second tester so the plain
// cases above still prove the rule works on the default parser.
const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
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
    // Explicit fields at any depth stay fine.
    { code: `Log.log({ ctx: { taskId: t.id, count: xs.length } });` },
    { code: `Log.log('x', [a.id, b.id]);` },
    { code: `Log.log('x', hasData ? 'y' : 'n');` },
    // Judged on key OR value: a labelled id is already the discipline we want,
    // so it must not be reported and told to log an id.
    { code: `Log.log({ task: taskId });` },
    { code: `Log.log({ parent: parentId });` },
    { code: `Log.log({ result: hasData });` },
    // A named helper is the author choosing what to expose, like any call arg.
    { code: `Log.log('x', ...getSafeErrorLogMeta(e));` },
    { code: `Log.log('x', ...[taskId]);` },
    // Not a logger.
    { code: `analytics.log(task);` },
    { code: `console.log(task);` },
  ],

  invalid: [
    // The exact shape that leaked private calendar content (#7870).
    {
      code: `Log.log('addEvToShow', curVal, calEv);`,
      errors: [
        { messageId: 'bareValue', data: { name: 'curVal' } },
        { messageId: 'bareValue', data: { name: 'calEv' } },
      ],
    },
    // Shorthand hands over whole entities.
    {
      code: `Log.log({ taskForEvent, allEvsToShow });`,
      errors: [
        { messageId: 'bareValue', data: { name: 'taskForEvent' } },
        { messageId: 'bareValue', data: { name: 'allEvsToShow' } },
      ],
    },
    {
      code: `TaskLog.log({ reminderCfg, nonArchiveInstancesWithSubTasks, archiveInstances });`,
      errors: [
        { messageId: 'bareValue' },
        { messageId: 'bareValue' },
        { messageId: 'bareValue' },
      ],
    },
    // A bare arg that is not obviously an id/count (#9112).
    {
      code: `Log.log('Updated reminders in worker', reminders);`,
      errors: [{ messageId: 'bareValue', data: { name: 'reminders' } }],
    },
    {
      code: `Log.log('Error INFO Today:', arg);`,
      errors: [{ messageId: 'bareValue', data: { name: 'arg' } }],
    },
    // A bare first argument is a payload too.
    {
      code: `TaskLog.log(taskTitleEditEl);`,
      errors: [{ messageId: 'bareValue', data: { name: 'taskTitleEditEl' } }],
    },
    // Spreading is opaque — every own property lands in the export.
    {
      code: `Log.log('ctx', { ...task });`,
      errors: [{ messageId: 'spreadValue', data: { name: 'task' } }],
    },
    // Mixed: the explicit half is fine, the shorthand half is not.
    {
      code: `Log.log({ taskId: task.id, calEv });`,
      errors: [{ messageId: 'bareValue', data: { name: 'calEv' } }],
    },
    // Longhand must not be an escape hatch: `object-shorthand` is not enforced,
    // so `: calEv` would otherwise be a shorter fix than naming the field.
    {
      code: `Log.log({ calEv: calEv });`,
      errors: [{ messageId: 'bareValue', data: { name: 'calEv' } }],
    },
    // Nesting must not smuggle a whole value past the check.
    {
      code: `Log.log({ ctx: { task } });`,
      errors: [{ messageId: 'bareValue', data: { name: 'task' } }],
    },
    {
      code: `Log.log('x', [task]);`,
      errors: [{ messageId: 'bareValue', data: { name: 'task' } }],
    },
    // A spread of a literal is traversed, so the contents are judged.
    {
      code: `Log.log('x', ...[task]);`,
      errors: [{ messageId: 'bareValue', data: { name: 'task' } }],
    },
    {
      code: `Log.log('x', ...rest);`,
      errors: [{ messageId: 'spreadValue', data: { name: 'rest' } }],
    },
    // Names that a lowercase-tail regex would have wrongly allowed.
    {
      code: `Log.log('reducer', state);`,
      errors: [{ messageId: 'bareValue', data: { name: 'state' } }],
    },
    {
      code: `Log.log('cfg', apiKey);`,
      errors: [{ messageId: 'bareValue', data: { name: 'apiKey' } }],
    },
    {
      code: `Log.log('req', { params });`,
      errors: [{ messageId: 'bareValue', data: { name: 'params' } }],
    },
    {
      code: `Log.log('acct', account);`,
      errors: [{ messageId: 'bareValue', data: { name: 'account' } }],
    },
    {
      code: `Log.log('dnd', doNotDisturbList);`,
      errors: [{ messageId: 'bareValue', data: { name: 'doNotDisturbList' } }],
    },
    // `…ById` is an entity dictionary keyed by id, not an id.
    {
      code: `Log.log('x', tasksById);`,
      errors: [{ messageId: 'bareValue', data: { name: 'tasksById' } }],
    },
    {
      code: `Log.log('x', byId);`,
      errors: [{ messageId: 'bareValue', data: { name: 'byId' } }],
    },
    // Every context logger is covered, not just `Log`.
    {
      code: `PluginLog.warn('plugin cfg', cfg);`,
      errors: [{ messageId: 'bareValue', data: { name: 'cfg' } }],
    },
    {
      code: `IssueLog.log('issue', issue);`,
      errors: [{ messageId: 'bareValue', data: { name: 'issue' } }],
    },
  ],
});

// Wrappers that carry a value through unchanged. Without these the rule is
// `error` and `task!` is a one-keystroke way to make CI green while still
// exporting the whole object.
tsRuleTester.run('no-user-content-in-logs (typescript)', rule, {
  valid: [
    { code: `Log.err('x', e as Error);` },
    { code: `Log.log('x', t.id as string);` },
    { code: `Log.log('x', { taskId: task!.id });` },
  ],
  invalid: [
    {
      code: `Log.log('x', task!);`,
      errors: [{ messageId: 'bareValue', data: { name: 'task' } }],
    },
    {
      code: `Log.log('x', task as any);`,
      errors: [{ messageId: 'bareValue', data: { name: 'task' } }],
    },
    {
      code: `Log.log('x', task satisfies Task);`,
      errors: [{ messageId: 'bareValue', data: { name: 'task' } }],
    },
    {
      code: `Log.log('x', await task);`,
      errors: [{ messageId: 'bareValue', data: { name: 'task' } }],
    },
    {
      code: `Log.log('x', (0, task));`,
      errors: [{ messageId: 'bareValue', data: { name: 'task' } }],
    },
    // An `as *Response` asserts the value is NOT an Error, so the error-name
    // allowlist must not cover it — log.ts only narrows a real Error.
    {
      code: `Log.log('http', e as HttpErrorResponse);`,
      errors: [{ messageId: 'bareValue', data: { name: 'e' } }],
    },
  ],
});
