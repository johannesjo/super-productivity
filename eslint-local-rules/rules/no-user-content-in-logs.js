/**
 * ESLint rule: no-user-content-in-logs
 *
 * Log history is exportable — `Log.exportLogHistory()` backs the config-page
 * download and is auto-triggered by the global error handler — and exported
 * logs are routinely attached to public bug reports. User content (task
 * titles, notes, calendar event titles/locations, project names, reminder
 * titles) must therefore never reach a Log method. See src/app/core/log.ts and
 * rule #9 in CLAUDE.md.
 *
 * `MAX_DATA_LENGTH` is NOT a safety net and must not be treated as one:
 * `recordLog` caps only `args[0]`, and the export caps each arg at 400
 * characters — but a task title or event title is far shorter than 400 chars,
 * so it exports verbatim.
 *
 * Heuristic (deliberately narrow, low-false-positive): every logged value must
 * be an EXPLICIT expression, so the author has to say which field they want.
 * Two shapes mean "I handed over a whole variable without looking inside it",
 * and those are what actually leaked in #7870 / #9112:
 *
 *   Log.log('addEvToShow', calEv)        // bare identifier      -> reported
 *   Log.log({ taskForEvent, allEvs })    // shorthand property   -> reported
 *   Log.log('x', { calEvId: calEv.id })  // explicit            -> fine
 *
 * A name that is self-evidently an id/count/flag is allowed in both shapes, so
 * `{ projectId }` and `{ taskCount }` stay ergonomic. Error values are allowed
 * by name (`e`, `err`, `error`, …): `recordLog`/`exportLogHistory` serialize an
 * Error to name/message/stack ONLY, which is the one object shape the logger
 * already narrows on purpose.
 *
 * Known gaps (accepted — heuristic, not proof). The rule reasons about shape,
 * never about what a value holds at runtime, so it does not catch:
 * - a named member access: `Log.log('t', task.title)`;
 * - an interpolation: `` Log.log(`title: ${task.title}`) ``;
 * - a call result: `Log.log('t', buildDebugInfo(task))`;
 * - a variable that was itself assigned user content earlier.
 * It is a tripwire against the common accident, not a proof of absence — a
 * reviewer still has to think. It is wired as `warn` because it starts with a
 * backlog of pre-existing hits (117, measured 2026-09); that count may shrink,
 * never grow.
 *
 * Scoped to src/app (excluding specs) via eslint.config.js.
 */

// Methods on a `*Log` object that record to the exportable history. Anything
// else on the class (setLevel, setContext, getLogHistory) is untouched — those
// take config values, not payloads.
const LOG_METHODS = new Set([
  'log',
  'warn',
  'err',
  'error',
  'info',
  'debug',
  'verbose',
  'critical',
  'normal',
  'x',
]);

// Errors are the one object shape the logger deliberately narrows: both
// `recordLog` and `exportLogHistory` serialize an Error to name/message/stack
// only, so passing one whole is safe by construction. Matches bare `e` / `err`
// as well as the conventional suffixed forms (`statError`, `cleanupErr`).
const ERROR_NAME_RE = /^(?:e|ex|reason)$|(?:error|err|exception)$/i;

// A boolean says its own shape: `isNative`, `hasTaskData`, `useAlarmStyle`.
// Logging one whole discloses nothing beyond the flag.
const BOOLEAN_NAME_RE =
  /^(?:is|are|was|were|has|have|had|should|can|could|will|would|did|does|do|use|allow|enable|disable|skip|force|needs|need)[A-Z0-9]/;

// Names that state their own shape: an id, a count, a flag, an enum-ish tag.
// Allowed bare so `{ projectId }` / `{ taskCount }` need no ceremony.
const SAFE_NAME_RE =
  /(?:^|[a-z])(?:id|ids|count|len|length|size|nr|num|index|idx|ms|type|kind|status|state|key|version|flag|enabled|mode)$/i;

// SCREAMING_SNAKE_CASE is a module constant, not a runtime payload.
const CONST_NAME_RE = /^[A-Z][A-Z0-9_]*$/;

const isSafeName = (name) =>
  ERROR_NAME_RE.test(name) ||
  BOOLEAN_NAME_RE.test(name) ||
  SAFE_NAME_RE.test(name) ||
  CONST_NAME_RE.test(name);

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Log history is exportable — log explicit ids/counts, never a whole object handed over as a bare identifier or shorthand property',
      category: 'Possible Errors',
      recommended: true,
    },
    messages: {
      bareIdentifier:
        'Do not log `{{name}}` whole — log history is exportable and is often attached to public bug reports, so an unexamined value risks carrying user content (titles, notes, paths). Log the specific fields you need, as `{ someId: x.id, someCount: x.length }`. See rule #9 in CLAUDE.md.',
      shorthandProperty:
        'Do not log `{{name}}` as a shorthand property — `{ {{name}} }` puts the whole value into the exportable log. Name what you actually need instead of handing over the object, e.g. an id, a count, or a boolean. See rule #9 in CLAUDE.md.',
      spreadProperty:
        'Do not spread `{{name}}` into a logged object — the exportable log would receive every own property, including any user content. List the fields you need explicitly. See rule #9 in CLAUDE.md.',
    },
    schema: [],
  },

  create(context) {
    // `Log.log(...)`, `TaskLog.warn(...)`, `SyncLog.err(...)` — any receiver
    // named `Log` or ending in `Log`, so new context loggers are covered the
    // moment they are introduced.
    const isLogCall = (node) => {
      const callee = node.callee;
      if (callee.type !== 'MemberExpression' || callee.computed) return false;
      if (callee.property.type !== 'Identifier') return false;
      if (!LOG_METHODS.has(callee.property.name)) return false;
      return callee.object.type === 'Identifier' && /Log$/.test(callee.object.name);
    };

    const checkObjectExpression = (objNode) => {
      for (const prop of objNode.properties) {
        if (prop.type === 'SpreadElement') {
          const name =
            prop.argument.type === 'Identifier' ? prop.argument.name : 'this value';
          if (prop.argument.type === 'Identifier' && isSafeName(name)) continue;
          context.report({ node: prop, messageId: 'spreadProperty', data: { name } });
          continue;
        }
        // Only shorthand is ambiguous. `key: expr` means the author already
        // chose what to expose, which is exactly the discipline we want.
        if (prop.type === 'Property' && prop.shorthand) {
          const name = prop.key.name;
          if (isSafeName(name)) continue;
          context.report({
            node: prop,
            messageId: 'shorthandProperty',
            data: { name },
          });
        }
      }
    };

    return {
      CallExpression(node) {
        if (!isLogCall(node)) return;

        for (const arg of node.arguments) {
          if (arg.type === 'Identifier') {
            if (isSafeName(arg.name)) continue;
            context.report({
              node: arg,
              messageId: 'bareIdentifier',
              data: { name: arg.name },
            });
            continue;
          }
          if (arg.type === 'ObjectExpression') {
            checkObjectExpression(arg);
          }
        }
      },
    };
  },
};
