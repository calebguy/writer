#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
BINARY_NAME="writer"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

build_target() {
    local target="$1"
    local outfile="$2"
    echo "Building ${outfile} (${target})"
    bun build "${ROOT_DIR}/index.ts" \
        --compile \
        --target="$target" \
        --outfile="${DIST_DIR}/${outfile}"
}

build_target "bun-darwin-arm64" "${BINARY_NAME}-darwin-arm64"
build_target "bun-darwin-x64" "${BINARY_NAME}-darwin-x64"
build_target "bun-linux-arm64" "${BINARY_NAME}-linux-arm64"
build_target "bun-linux-x64" "${BINARY_NAME}-linux-x64"

chmod +x "${DIST_DIR}/${BINARY_NAME}-"*

(
    cd "$DIST_DIR"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "${BINARY_NAME}-"* > SHA256SUMS
    else
        shasum -a 256 "${BINARY_NAME}-"* > SHA256SUMS
    fi
)

echo "Release artifacts written to ${DIST_DIR}"
