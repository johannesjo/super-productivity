#!/usr/bin/env bash
#
# Runs the instrumented suite against the minified r8Test variant and captures
# device state whatever happens.
#
# A file, not an inline `script:` block, because android-emulator-runner
# executes the script one line per `sh -c`: variables, `set -u` and multi-line
# `if` do not survive between lines, so an inline block silently ran `mkdir -p
# ""` and never reached Gradle.
#
# Bounded at 15 minutes because the first r8Test run hung before printing
# "Starting N tests" and burned the job's whole 30-minute budget, leaving a
# bare "operation was canceled" and no artifact.
set -uo pipefail

DIAG=build/instrumentation-diagnostics
mkdir -p "$DIAG"
adb logcat -c || true

# --info so the install is visible: it is the only place AGP logs it, and the
# hang may be there. Scaffolding for that investigation — drop it once the
# cause is known, since logcat covers any hang that reaches the device.
timeout 900 ./gradlew :app:connectedPlayR8TestAndroidTest --info
status=$?

# Unconditional: a hang produces no test report at all, so this is the only
# record of what the device and the app process were doing.
adb logcat -d > "$DIAG/logcat.txt" 2>&1 || true
adb shell dumpsys activity processes > "$DIAG/activity-processes.txt" 2>&1 || true
adb shell pm list instrumentation > "$DIAG/instrumentation.txt" 2>&1 || true
adb root > /dev/null 2>&1 || true
adb pull /data/anr "$DIAG/anr" > /dev/null 2>&1 || true

if [ "$status" -eq 124 ]; then
  echo "::error::connectedPlayR8TestAndroidTest exceeded 15 minutes — see the android-instrumentation-diagnostics artifact"
fi
exit $status
