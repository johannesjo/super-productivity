#!/usr/bin/env bash

set -euo pipefail

UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-upstream}"
FORK_REMOTE="${FORK_REMOTE:-origin}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-master}"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Error: run this script inside a Git repository." >&2
  exit 1
}
cd "$repo_root"

current_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null)" || {
  echo "Error: cannot sync while HEAD is detached." >&2
  exit 1
}

if [[ "$current_branch" == "$UPSTREAM_BRANCH" ]]; then
  echo "Error: switch to your feature branch before syncing." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: commit or stash your local changes before syncing." >&2
  git status --short >&2
  exit 1
fi

if ! git remote get-url "$UPSTREAM_REMOTE" >/dev/null 2>&1; then
  echo "Error: remote '$UPSTREAM_REMOTE' is not configured." >&2
  exit 1
fi

if ! git remote get-url "$FORK_REMOTE" >/dev/null 2>&1; then
  echo "Error: remote '$FORK_REMOTE' is not configured." >&2
  echo "Add your fork with: git remote add $FORK_REMOTE <fork-url>" >&2
  exit 1
fi

remote_branch_ref="refs/heads/$current_branch"
remote_branch="$(git ls-remote --heads "$FORK_REMOTE" "$remote_branch_ref")" || {
  echo "Error: could not query $FORK_REMOTE/$current_branch." >&2
  exit 1
}

if [[ -n "$remote_branch" ]]; then
  echo "Refreshing the force-with-lease baseline from $FORK_REMOTE/$current_branch..."
  git fetch "$FORK_REMOTE" \
    "$remote_branch_ref:refs/remotes/$FORK_REMOTE/$current_branch"
fi

echo "Fetching $UPSTREAM_REMOTE/$UPSTREAM_BRANCH..."
git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH"

echo "Rebasing $current_branch onto $UPSTREAM_REMOTE/$UPSTREAM_BRANCH..."
if ! git rebase "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"; then
  echo "Rebase stopped because of conflicts." >&2
  echo "Resolve them and run 'git rebase --continue', or undo with 'git rebase --abort'." >&2
  exit 1
fi

echo "Pushing $current_branch to $FORK_REMOTE..."
git push --force-with-lease --set-upstream "$FORK_REMOTE" "$current_branch"

echo "Done: $current_branch is synced with $UPSTREAM_REMOTE/$UPSTREAM_BRANCH."
