#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
readonly ARTIFACT_DIR="$REPO_ROOT/.tmp/app-builds"

dry_run=false
temp_dir=
temp_deb=

cleanup() {
  if [[ -n "$temp_deb" ]]; then
    rm -f -- "$temp_deb"
  fi
  if [[ -n "$temp_dir" ]]; then
    rmdir -- "$temp_dir" 2>/dev/null || true
  fi
}

trap cleanup EXIT

usage() {
  cat <<'EOF'
Usage: ./scripts/install-deb.sh [--dry-run] [path/to/package.deb]

Install a Debian package built by scripts/build-deb.sh. If no path is given,
the newest .deb file in .tmp/app-builds is selected automatically.

Options:
  --dry-run    Validate and show the selected package without installing it
  -h, --help   Show this help
EOF
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

case "${1:-}" in
  --dry-run)
    dry_run=true
    shift
    ;;
  -h | --help)
    usage
    exit 0
    ;;
esac

(($# <= 1)) || {
  usage >&2
  die "Too many arguments."
}

command -v dpkg-deb >/dev/null 2>&1 ||
  die "dpkg-deb is required. This installer only supports Debian-based systems."

if (($# == 1)); then
  [[ -f "$1" ]] || die "Package not found: $1"
  deb_file="$(readlink -f -- "$1")"
else
  shopt -s nullglob
  deb_files=("$ARTIFACT_DIR"/*.deb)
  ((${#deb_files[@]} > 0)) ||
    die "No .deb package found. Run ./scripts/build-deb.sh first."

  deb_file="${deb_files[0]}"
  for candidate in "${deb_files[@]:1}"; do
    if [[ "$candidate" -nt "$deb_file" ]]; then
      deb_file="$candidate"
    fi
  done
fi

[[ "$deb_file" == *.deb ]] || die "Not a .deb file: $deb_file"

package_name="$(dpkg-deb -f "$deb_file" Package)"
package_version="$(dpkg-deb -f "$deb_file" Version)"
package_architecture="$(dpkg-deb -f "$deb_file" Architecture)"

[[ "$package_name" == "superproductivity" ]] ||
  die "Unexpected Debian package '$package_name'; refusing to install it."

printf 'Selected package:\n'
printf '  File:         %s\n' "$deb_file"
printf '  Package:      %s\n' "$package_name"
printf '  Version:      %s\n' "$package_version"
printf '  Architecture: %s\n' "$package_architecture"

if [[ "$dry_run" == true ]]; then
  printf '\nDry run complete; nothing was installed.\n'
  exit 0
fi

command -v apt-get >/dev/null 2>&1 ||
  die "apt-get is required. This installer only supports Debian-based systems."

temp_dir="$(mktemp -d /tmp/super-productivity-install.XXXXXX)"
chmod 0755 "$temp_dir"
temp_deb="$temp_dir/superproductivity.deb"
install -m 0644 -- "$deb_file" "$temp_deb"

printf '\n==> Staged package at %s for access by _apt.\n' "$temp_deb"
printf '\n==> Installing %s %s...\n' "$package_name" "$package_version"
if ((EUID == 0)); then
  apt-get install -y --reinstall "$temp_deb"
else
  command -v sudo >/dev/null 2>&1 || die "sudo is required to install the package."
  sudo apt-get install -y --reinstall "$temp_deb"
fi

printf '\nInstallation complete:\n  '
dpkg-query -W -f='${Package} ${Version} (${Status})\n' "$package_name"
