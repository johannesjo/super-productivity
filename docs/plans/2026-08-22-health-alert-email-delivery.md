# Implementation plan: make `health-alert.sh` email failure visible

**Status:** Implemented and reviewed; committed on this branch · **Date:** 2026-08-22 ·
**Baseline:** master `0ece8896d7`
**Removal condition:** delete once merged.
**Related:** #9191 (monitoring/alerting)

## The defect

Alerting can be completely unable to deliver mail while every surface an operator looks
at reports green.

`health-alert.sh` requires `ALERT_EMAIL` and exits 0 with a clear message when it is
unset (`:34-38`). It never checked that a `mail` binary exists. A stock Debian or Ubuntu
VPS has none — neither `mailutils` nor `bsd-mailx` is installed by default and no MTA is
configured. `scripts/MONITORING-README.md:243-251` presented `ALERT_EMAIL` plus a crontab
line as the complete setup, and `scripts/deploy.sh:503` prints that same line as the
remediation. No MTA package is referenced anywhere in the repo. An operator who followed
the documented setup exactly could end up with alerting that had never been capable of
sending anything.

The sibling script gets the guard right: `tools/backup-rotate.sh:122` checks
`command -v mail`.

What makes it silent is that the send path only runs once a problem already exists. On a
healthy server it has never executed, so no `mail-failed` marker was ever written, and
`deploy.sh:511` prints "no recorded failure (verified only when mail is attempted)".
`MONITORING-README.md:253-256` stated the gap outright: _"It cannot prove delivery while
the system is healthy because no email is sent then."_ It was known, documented, and
unfixed.

The existing tests could not catch it: `tests/health-alert-script.spec.ts:107` sets
`PATH: ${binDir}:${process.env.PATH}`, so the fakes _shadow_ real binaries and "no `mail`
binary" was a state the harness could not produce.

## What is deliberately not built

An earlier draft added a `--test` flag, a second `mail-unavailable` marker file, a
three-state `deploy.sh` branch, and argument parsing. Review rejected all four:

- **`--test`** cannot deliver what it promises. A queuing MTA exits 0 on accept, not on
  delivery, so it never proves receipt — and one documentation line saying "check the
  inbox" costs nothing and covers every past and future version of the script. It also
  introduced two false-green paths of its own: `health-alert.sh:67` exits 0 when the
  5-minute cron holds the `flock`, and `:34-38` exits 0 with no recipient set.
- **Argument parsing** contradicts `:21-22` — _"Do NOT use `set -e` — a monitoring script
  must never silently abort."_ Rejecting an unknown argument before the checks run is
  exactly that abort, and the crontab-detection awk in `deploy.sh:465-474` would keep
  reporting "cron installed" while every run exited early.
- **A second marker file** duplicates a field `mail-failed` is already gaining. Both can
  be present with no defined precedence, and `deploy.sh:507` tests `mail-failed` first —
  so a stale relay error would mask the actual current cause.
- **A `deploy.sh` "delivery has succeeded" branch** is not implementable. `state` is
  deleted on the recovery send (`:360`), so a server that alerted and recovered is
  indistinguishable from one that never sent anything.

Also out of scope: a `curl`-over-SMTP transport reusing the server's existing `SMTP_*`
credentials (a real option — `health-alert.sh` already reads `.env` and already depends on
`curl` — but a larger change than this defect warrants), and #9695's separate finding that
the restart check at `:132` reads `{{.RestartCount}}` and is therefore blind to PostgreSQL
crash-restarts.

## Step 1: preflight the transport — and gate the sends on it

Placed after the `flock` gate, not beside the config validation at `:42-51`:
`ALERT_STATE_DIR` does not exist until `:59`, and under `set -u` an earlier reference
aborts the script. After the lock, so two overlapping cron runs cannot interleave a
truncate-and-write on the marker, and so a lock-contended run stays as silent as it is
today.

```bash
MAIL_CMD="${MAIL_CMD:-mail}"
MAIL_AVAILABLE=true
if ! command -v "$MAIL_CMD" >/dev/null 2>&1; then
  MAIL_AVAILABLE=false
  echo "health-alert: no '$MAIL_CMD' binary on PATH — install mailutils or bsd-mailx." >&2
  record_mail_failure "no $MAIL_CMD binary on PATH — install mailutils or bsd-mailx"
fi
```

**Writing the marker is not sufficient on its own, and a draft that only did that was
actively wrong.** Creating `mail-failed` makes the recovery condition at `:356` true, so
the healthy branch fires a send, `timeout 30 mail` exits 127, and `:364` overwrites the
marker with a bare timestamp — the reason string never survived a single complete run.
Reproduced end to end before the fix. Both send conditions therefore also require
`$MAIL_AVAILABLE`, which additionally stops a doomed send being retried, and two extra
stderr lines being printed, every five minutes forever.

`MAIL_CMD` exists so the spec can express "no transport at all". Filtering `mail` out of
`PATH` means dropping the directory that provides it, which takes `date`, `sed`, `flock`
and `sha256sum` with it — the script then dies before it does anything assertable. It
matches the script's existing env-var config style and is not the rejected flag surface.

This writes the _existing_ marker, so `deploy.sh:507-509` already surfaces it with wording
that is already correct for this case: _"Checks are running but nobody is being told.
Verify `mail` works."_ No new file, no precedence rule.

Deliberately **not** appended to `CONFIG_PROBLEMS`/`PROBLEMS`: that string is both the
alert body (`:343-344`) and the dedupe hash input (`:330-337`), so putting "I cannot reach
you" in it would report the broken channel _through_ the broken channel, and would keep
`PROBLEMS` permanently non-empty — disabling the recovery branch at `:356`, which with
`:347` is one of the two things that clear the marker.

One caveat accepted knowingly: `deploy.sh:508` says "delivery FAILED" when nothing was
attempted. That is the correct operational conclusion (nobody is being told) even if the
verb is imprecise.

**Verify:** a spec case running with `MAIL_CMD` set to a nonexistent binary asserts the
marker exists and names it, that the run still performed its checks, and that no send was
attempted (`mailLog` empty, no "Failed to send" on stderr).

## Step 2: capture why a real send failed

`:345` and `:359` ended in `2>/dev/null`, so "not installed", "relay refused" and "auth
failed" were indistinguishable afterwards. Both sites now route through one
`send_alert_mail` helper — one send path, so stderr capture and the failure record cannot
drift apart — which captures stderr to a temp file and records it. (The gate on
`$MAIL_AVAILABLE` lives at the two call sites, not in the helper: a copy inside it was
unreachable and was removed in `bef0c160`.)

Three constraints:

- **Keep `timeout 30`, but do not rely on it alone.** Under a 5-minute cron, an MTA
  hanging on an unreachable relay is a process-pileup vector. `timeout` bounds the `mail`
  process only — it does **not** bound a `$(...)` reading its output, which waits for pipe
  EOF and so outlives it whenever the MTA forks a delivery child. That is why stderr goes
  to a temp file rather than a command substitution; see "What review caught" below.
- **Bound and sanitize at write time _and_ at read time.** SMTP response text is written
  by the remote relay and `deploy.sh` echoes the file straight to a terminal. Write-time is
  `LC_ALL=C tr -d '\000-\010\013-\037\177'` plus `sed 's/\xc2[\x80-\x9f]//g'`, capped at 4096. Three separate mistakes were made here before it was right, so read the whole list
  before touching the filter:
  1. An early draft used `'\000-\010\013\014\016-\037'`, leaving **CR (13) and DEL (127)**
     intact. CR is precisely the byte that lets relay text overwrite the line it prints on.
  2. Extending the range to `\200-\237` to catch C1 **corrupts UTF-8** — those are also
     continuation bytes, and it mangled this script's own em-dash message. Committed as
     `096c93ca`, reverted in `bef0c160`. Do not re-attempt it.
  3. The residual was then wrongly written off as "a lone C1 byte is invalid UTF-8, so it
     is only a CSI in a legacy 8-bit locale". False: `\xC2\x9B` is the _well-formed_ UTF-8
     encoding of CSI, both bytes are >= 0x80, and a UTF-8 terminal decodes a real control.
     Removing the two-byte sequence is exact — `\xc2` + `\x80-\x9f` encodes U+0080-U+009F
     and nothing else — so CSI/OSC go while em-dash, NBSP and CJK survive.

  Write-time is not sufficient on its own. The marker is operator data that survives
  `git pull` and may predate the filter, so `deploy.sh` sanitizes again at the point of
  printing, via `printf` (not `echo`, which re-expands a printable `\033` under `xpg_echo`).
  The same applies to `last-run`, read from the same directory by the same function.
  Tab and LF are kept at write time; the reader flattens them.

- **`deploy.sh:508` must not stay `$(cat …)`.** That strips only _trailing_ newlines, so a
  multi-line marker interpolates mid-sentence. It now takes `head -1` for the timestamp
  and prints the reason on its own indented line — `head -1` alone would have meant the
  captured reason reached nobody, since `deploy.sh:507-512` is the only reader of
  `mail-failed` in the repo. The reason extraction is `|| true`-guarded: `deploy.sh` runs
  `set -euo pipefail` and `report_monitoring_status` is called immediately before
  `exit 0`, so a SIGPIPE'd pipeline there would turn a successful deploy into a failing
  one. Steps 1 and 2 are one atomic change with `deploy.sh`, not two: the marker is
  operator data that survives `git pull`, so old-reader/new-marker is reachable.

Keep the file owner-only, and enforce rather than infer it. `umask 077` at `:23` applies
only at _creation_; a `.health-alert/` created earlier by anything else keeps its old mode.
`chmod 700` on the directory and `chmod 600` on the marker, both `2>/dev/null || true` —
if the directory belongs to another user the chmod fails, and a monitoring script must not
start emitting errors every five minutes over it. This matters more after this step than
before: the file gains the recipient address and possibly the relay hostname or username.

**Verify:** spec cases with a failing fake `mail` that writes a recognisable stderr string;
assert the first line still parses as a timestamp and the string appears, at **both** send
sites. A separate case asserts CR, DEL, BEL and ESC are all stripped and the length is
capped.

## Step 3: document the MTA

`scripts/MONITORING-README.md`, after the crontab fence (which ends at `:251` — inserting
after `:250` lands _inside_ the code block):

> Alerting needs a working MTA. `mailutils` or `bsd-mailx` provides the `mail` command;
> bare `msmtp` does **not** — it is a transport, so pair it with `msmtp-mta`. Stock Debian
> and Ubuntu ship neither. Before trusting the cron entry, confirm delivery end to end:
>
> ```bash
> echo test | mail -s 'SuperSync test' you@example.com
> ```
>
> A queuing MTA exits 0 on accept, not on delivery — check that the message actually
> arrived. If it did not, `mailx` writes the undelivered body to `~/dead.letter` for the
> cron user.

The `:253-256` "cannot prove delivery while healthy" paragraph is now **false**, and step 1
is what made it false: the missing-binary marker makes the first healthy run after the MTA
is installed send one `SuperSync OK: Health Check Recovered` message and clear the marker.
That single mail is a genuine end-to-end delivery proof — better evidence than `--test`
could have produced, arriving without any new surface. It is only confusing if
undocumented ("recovered" from a failure that never happened), so the paragraph now says
so explicitly. The same one-line MTA pointer goes next to `deploy.sh:503`, which is the
screen operators actually read.

Do **not** add this to `DOCKER-MONITORING.md`: it contains no `ALERT_EMAIL` or `mail`
content at all (`health-alert.sh` appears once, at `:260`, only to explain the
`supersync-monitor` application name).

Preserve the no-default-recipient reasoning at `:27-29` exactly as it stands: the script
ships in the repo and the image, so a default address would mail a self-hoster's hostname,
disk usage and container state to a stranger.

**Verify:** docs review, per `docs/documentation-guide.md`.

## Step 4: fix `backup-rotate.sh`

`tools/backup-rotate.sh:121-125` guarded on `command -v mail` correctly and then sent to a
hardcoded `admin@example.com` — IANA-reserved, so the "all backups deleted during rotation"
alert reached nobody by construction. Now `"${ALERT_EMAIL:-}"`, skipped when unset, matching
`health-alert.sh:34-38`.

An earlier draft argued this had to land _first_ because step 3 arms it fleet-wide. That
reasoning does not survive checking and has been dropped: the send sits inside
`if [ "$TOTAL_BACKUPS" -eq 0 ]` (`:118`), a far bigger gate than the `mail` check; nothing
in the repo references `backup-rotate.sh` (no doc, cron installer, test or compose file);
and the runtime image does not ship it — `Dockerfile:60` copies `scripts/`, while `tools/`
exists only in the builder stage. Ordering is free. The fix is still right: a hardcoded
recipient in a shipped script is a defect on its own terms.

**Verify:** the guard skips cleanly with `ALERT_EMAIL` unset.

## What review caught after implementation

Recorded because each was a defect the implementation introduced, not a pre-existing one.

- **`err=$(timeout 30 ...)` hung the script forever on a forking MTA.** Command
  substitution waits for pipe EOF, not for the process, so a delivery child that outlives
  `mail` keeps it open and `timeout` does nothing — measured 45s against a stub sleeping
  45s. A queuing MTA daemonizes exactly like that: the run never returns, the `flock` is
  held, and every later cron run exits silently at the lock. This was a _regression_ — the
  original code piped straight into `mail` with no substitution. Fixed by capturing stderr
  to a temp file, which also bounds a verbose MTA's output instead of buffering it whole.
- **`chmod 700` on the state dir was removed.** It re-locked a directory an operator may
  have widened so a non-root `deploy.sh` could read it; after that `deploy.sh` cannot stat
  the marker and prints "no recorded failure" — the change manufacturing the exact
  false-green it exists to expose. It also chmod'd through a symlink. The marker write uses
  `mktemp` + `mv` instead, which cannot follow a planted symlink and makes `chmod 600`
  redundant.
- **The MTA advice was wrong.** `msmtp-mta` supplies the `sendmail` interface, not the
  `mail` command, so an operator following the first draft still failed the preflight.
- **"Delivery is provable while healthy" was over-claimed.** The free proof exists only if
  the cron ran _before_ the MTA was installed — the opposite of the order the same section
  recommends. Now stated conditionally.

## Risk

The captured reason narrows the silent-failure window; it does not close it. A local
`sendmail` that queues returns success and the message can still be dropped later as
unauthenticated. The documentation says so; nothing here should imply otherwise.

The reason line `deploy.sh` prints can name the recipient address and the relay host. It is
a 0600 file, but the printed excerpt lands in CI logs and support pastes; `MONITORING-README`
says so.
