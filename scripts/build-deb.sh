#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
readonly ARTIFACT_DIR="$REPO_ROOT/.tmp/app-builds"

skip_dependencies=false
skip_wayland_helper=false
build_marker=""

usage() {
  cat <<'EOF'
Usage: ./scripts/build-deb.sh [--skip-deps] [--skip-wayland-helper]

Build a production Debian package for the current machine.

Options:
  --skip-deps            Do not install/update npm dependencies
  --skip-wayland-helper  Omit ext-idle-notify support (Rust/Cargo not needed)
  -h, --help             Show this help
EOF
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

cargo_is_compatible() {
  local cargo_command="$1"
  local cargo_output

  cargo_output="$("$cargo_command" --version 2>/dev/null)" || return 1
  if [[ "$cargo_output" =~ ^cargo[[:space:]]+([0-9]+)\.([0-9]+)\. ]]; then
    local major_version="${BASH_REMATCH[1]}"
    local minor_version="${BASH_REMATCH[2]}"
    ((major_version > 1 || (major_version == 1 && minor_version >= 78)))
    return
  fi

  return 1
}

cleanup() {
  if [[ -n "$build_marker" ]]; then
    rm -f -- "$build_marker"
  fi
}

while (($# > 0)); do
  case "$1" in
    --skip-deps)
      skip_dependencies=true
      ;;
    --skip-wayland-helper)
      skip_wayland_helper=true
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "Unknown option: $1"
      ;;
  esac
  shift
done

command -v node >/dev/null 2>&1 || die "Node.js is required."
command -v npm >/dev/null 2>&1 || die "npm is required."

cd -- "$REPO_ROOT"

if [[ -f .nvmrc ]]; then
  expected_node_version="$(tr -d '[:space:]' <.nvmrc)"
  actual_node_version="$(node --version)"
  if [[ "$actual_node_version" != "$expected_node_version" ]]; then
    die "Node.js $expected_node_version is required (current: $actual_node_version). Run 'nvm install && nvm use' first."
  fi
fi

required_npm_version="$(node -p "require('./package.json').packageManager.split('@').pop()")"
actual_npm_version="$(npm --version)"
if [[ "$actual_npm_version" != "$required_npm_version" ]]; then
  printf 'Warning: package.json recommends npm %s (current: %s).\n' \
    "$required_npm_version" \
    "$actual_npm_version"
fi

if [[ "$skip_wayland_helper" == true ]]; then
  export SP_SKIP_WAYLAND_IDLE_HELPER_BUILD=1
  printf 'Warning: the Wayland idle helper will be omitted from this package.\n'
else
  if [[ -x "${HOME:-}/.cargo/bin/cargo" ]] &&
    cargo_is_compatible "${HOME}/.cargo/bin/cargo"; then
    export PATH="${HOME}/.cargo/bin:$PATH"
  fi

  command -v cargo >/dev/null 2>&1 ||
    die "Rust/Cargo 1.78 or newer is required. Install stable Rust with rustup (https://rustup.rs) or explicitly use --skip-wayland-helper."
  cargo_is_compatible "$(command -v cargo)" ||
    die "Cargo 1.78 or newer is required for Cargo.lock v4 (current: $(cargo --version)). Update stable Rust with rustup or explicitly use --skip-wayland-helper."
fi

if [[ "$skip_dependencies" == false ]]; then
  if [[ ! -x node_modules/.bin/electron-builder ||
    ! -f node_modules/.package-lock.json ||
    package-lock.json -nt node_modules/.package-lock.json ]]; then
    printf '\n==> Installing npm dependencies from package-lock.json...\n'
    npm ci
  else
    printf '\n==> npm dependencies are up to date.\n'
  fi
fi

[[ -x node_modules/.bin/electron-builder ]] ||
  die "electron-builder is unavailable. Run without --skip-deps first."

mkdir -p -- "$ARTIFACT_DIR"
build_marker="$(mktemp "$ARTIFACT_DIR/.deb-build-start.XXXXXX")"
trap cleanup EXIT

printf '\n==> Building the production application...\n'
npm run buildAllElectron:noTests:prod

printf '\n==> Packaging the Debian installer...\n'
./node_modules/.bin/electron-builder --linux deb --publish never

shopt -s nullglob
new_deb_files=()
for deb_file in "$ARTIFACT_DIR"/*.deb; do
  if [[ "$deb_file" -nt "$build_marker" ]]; then
    new_deb_files+=("$deb_file")
  fi
done

((${#new_deb_files[@]} > 0)) ||
  die "The build finished, but no new .deb file was found in $ARTIFACT_DIR."

printf '\nBuild complete. Debian package%s:\n' \
  "$([[ ${#new_deb_files[@]} -eq 1 ]] || printf 's')"
for deb_file in "${new_deb_files[@]}"; do
  printf '  %s (%s)\n' "$deb_file" "$(du -h -- "$deb_file" | cut -f1)"
done
printf '\nInstall the newest package with:\n  ./scripts/install-deb.sh\n'
