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
 * `recordLog` caps only `args[0]`, and `exportLogHistory` caps each arg at 400
 * characters — but a task title or event title is far shorter than 400 chars,
 * so it exports verbatim. `exportLogHistoryAsText` caps nothing at all.
 *
 * Heuristic (deliberately narrow, low-false-positive): every logged value must
 * be an EXPLICIT expression, so the author has to say which field they want.
 * Handing over a whole variable — at any depth — is what actually leaked in
 * #7870 / #9112:
 *
 *   Log.log('addEvToShow', calEv)        // bare identifier      -> reported
 *   Log.log({ taskForEvent, allEvs })    // shorthand property   -> reported
 *   Log.log({ ev: calEv })               // longhand identifier  -> reported
 *   Log.log({ ctx: { task } })           // nested               -> reported
 *   Log.log('x', { calEvId: calEv.id })  // explicit field       -> fine
 *
 * Longhand is reported as well as shorthand on purpose. `object-shorthand` is
 * not enforced in this repo, so if only shorthand were flagged the cheapest way
 * to clear the warning would be to type `: calEv` — a tripwire whose evasion is
 * shorter than its fix gets evaded, not fixed.
 *
 * A name that states its own shape is allowed bare, so the common cases stay
 * ergonomic: ids and counts (`projectId`, `taskCount`), booleans (`isNative`),
 * and module constants. The safe words match either the whole name or a
 * camelCase-capitalised suffix (`Id`, `Count`), never a lowercase tail — that
 * distinction is load-bearing: a plain `/count$/i` would silently allow
 * `account`, and `/ms$/i` would allow `params`, `items`, `alarms` and `teams`.
 *
 * Error values are allowed by name (`e`, `err`, `statError`). Note the limit of
 * that carve-out: `recordLog`/`exportLogHistory` narrow to name/message/stack
 * only for a real `instanceof Error` (log.ts), and this rule cannot check the
 * runtime type. Angular's `HttpErrorResponse` is NOT an Error — it is
 * JSON-stringified whole, exporting `.url` and the response body — so an HTTP
 * catch block still needs the hand-written scrub that
 * `calendar-integration.service.ts` uses for iCal URLs carrying a secret token.
 * The allowlist keeps `Log.err(e)` usable; it does not certify the value.
 *
 * Known gaps (accepted — heuristic, not proof). The rule reasons about shape,
 * never about what a value holds at runtime, so it does not catch:
 * - a named member access: `Log.log('t', task.title)`;
 * - an interpolation: `` Log.log(`title: ${task.title}`) ``;
 * - a call result: `Log.log('t', ev.getFirstPropertyValue('summary'))`;
 * - a variable that was itself assigned user content earlier;
 * - a logger reached through a member chain (`api.log.err(...)` in bundled
 *   plugins under packages/, which write to this same history);
 * - a deliberately mislabelled key (`{ taskId: task }` judges the key, so an
 *   author who names a field wrongly defeats it — an accident this shape does
 *   not produce, a lie it cannot detect).
 * It is a tripwire against the common accident, not proof of absence — a
 * reviewer still has to think.
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

// Names that state their own shape. Matched as the WHOLE name, or as a
// capitalised camelCase suffix — never a lowercase tail (see docstring: that is
// what keeps `account`, `params` and `items` out).
const SAFE_WORDS = [
  'id',
  'ids',
  'count',
  'length',
  'len',
  'size',
  'index',
  'idx',
  'ms',
  'nr',
  'num',
  'type',
  'kind',
  'status',
  'version',
  'flag',
  'enabled',
];
const SAFE_WHOLE = new Set(SAFE_WORDS);
const SAFE_SUFFIX_RE = new RegExp(
  `(?:${SAFE_WORDS.map((w) => w[0].toUpperCase() + w.slice(1)).join('|')})$`,
);

// Errors, by convention. See the docstring for what this does and does not
// guarantee — notably it does NOT certify an Angular HttpErrorResponse.
const ERROR_WHOLE = new Set(['e', 'ex', 'err', 'error', 'exception', 'reason']);
const ERROR_SUFFIX_RE = /(?:Error|Err|Exception)$/;

// A boolean says its own shape. `do`/`did`/`does` are deliberately absent —
// they would allow `doNotDisturbList`.
const BOOLEAN_PREFIX_RE =
  /^(?:is|are|was|were|has|have|had|should|can|could|will|would|use|allow|enable|disable|skip|force|needs|need)[A-Z0-9]/;

// SCREAMING_SNAKE_CASE is a module constant, not a runtime payload.
const CONST_NAME_RE = /^[A-Z][A-Z0-9_]*$/;

const isSafeName = (name) => {
  if (typeof name !== 'string') return false;
  const lower = name.toLowerCase();
  return (
    SAFE_WHOLE.has(lower) ||
    SAFE_SUFFIX_RE.test(name) ||
    ERROR_WHOLE.has(lower) ||
    ERROR_SUFFIX_RE.test(name) ||
    BOOLEAN_PREFIX_RE.test(name) ||
    CONST_NAME_RE.test(name)
  );
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Log history is exportable — log explicit ids/counts, never a whole object handed over as a bare identifier, a property value, or a spread',
      category: 'Possible Errors',
      recommended: true,
    },
    messages: {
      bareValue:
        'Do not log `{{name}}` whole — log history is exportable and is often attached to public bug reports, so an unexamined value risks carrying user content (titles, notes, paths). Log the specific fields you need, as `{ someId: x.id, someCount: x.length }`. See rule #9 in CLAUDE.md.',
      spreadValue:
        'Do not spread `{{name}}` into a logged value — the exportable log would receive every own property, including any user content. List the fields you need explicitly. See rule #9 in CLAUDE.md.',
    },
    schema: [],
  },

  create(context) {
    // `Log.log(...)`, `TaskLog.warn(...)`, `SyncLog.err(...)` — any receiver
    // named `Log` or ending in `Log`, so new context loggers are covered the
    // moment they are introduced.
    const isLogCall = (node) => {
      const callee = node.callee;
      if (!callee || callee.type !== 'MemberExpression' || callee.computed) return false;
      if (callee.property.type !== 'Identifier') return false;
      if (!LOG_METHODS.has(callee.property.name)) return false;
      return callee.object.type === 'Identifier' && /Log$/.test(callee.object.name);
    };

    const nameOf = (node) =>
      node && node.type === 'Identifier' ? node.name : 'this value';

    // Walks any expression handed to a log method. Only bare identifiers are
    // reported; a member access, call or literal is the author having already
    // chosen what to expose. Object/array literals are traversed so nesting
    // cannot be used to smuggle a whole value past the check.
    const checkValue = (node, seen) => {
      if (!node || seen.has(node)) return;
      seen.add(node);

      switch (node.type) {
        case 'Identifier':
          if (!isSafeName(node.name)) {
            context.report({ node, messageId: 'bareValue', data: { name: node.name } });
          }
          return;
        case 'SpreadElement':
        case 'RestElement':
          if (node.argument && node.argument.type === 'Identifier') {
            if (!isSafeName(node.argument.name)) {
              context.report({
                node,
                messageId: 'spreadValue',
                data: { name: node.argument.name },
              });
            }
            return;
          }
          context.report({
            node,
            messageId: 'spreadValue',
            data: { name: nameOf(node.argument) },
          });
          return;
        case 'ObjectExpression':
          for (const prop of node.properties) {
            if (
              prop.type === 'SpreadElement' ||
              prop.type === 'ExperimentalSpreadProperty'
            ) {
              checkValue(prop, seen);
              continue;
            }
            // Getters/setters/methods carry no value to disclose here.
            if (prop.type !== 'Property' || prop.kind !== 'init' || prop.method) continue;
            // For a bare identifier value, the name the AUTHOR CHOSE is the
            // signal. Shorthand has only one name to go on; longhand means they
            // labelled the field, so `{ bannerCount: nrOfAllBanners }` is the
            // discipline we want and passes, while `{ calEv: calEv }` — the
            // one-keystroke evasion of the shorthand check — does not.
            if (prop.value && prop.value.type === 'Identifier') {
              const judged =
                !prop.shorthand && prop.key && prop.key.type === 'Identifier'
                  ? prop.key.name
                  : prop.value.name;
              if (!isSafeName(judged)) {
                context.report({
                  node: prop,
                  messageId: 'bareValue',
                  data: { name: prop.value.name },
                });
              }
              continue;
            }
            checkValue(prop.value, seen);
          }
          return;
        case 'ArrayExpression':
          for (const el of node.elements) {
            if (el) checkValue(el, seen);
          }
          return;
        case 'ConditionalExpression':
          checkValue(node.consequent, seen);
          checkValue(node.alternate, seen);
          return;
        case 'LogicalExpression':
          checkValue(node.left, seen);
          checkValue(node.right, seen);
          return;
        default:
          // MemberExpression, CallExpression, literals, template literals,
          // unary (`!!x`) — the author named something specific, or the rule
          // documents it as a known gap.
          return;
      }
    };

    return {
      CallExpression(node) {
        if (!isLogCall(node)) return;
        const seen = new Set();
        for (const arg of node.arguments) {
          checkValue(arg, seen);
        }
      },
    };
  },
};
