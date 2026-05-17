#!/usr/bin/env bash
set -euo pipefail

# Writer CLI Installer
# Usage:
#   curl -fsSL https://writer.place/install.sh | bash
#   curl -fsSL https://writer.place/install.sh | WRITER_VERSION=0.1.0 bash
#   curl -fsSL https://writer.place/install.sh | WRITER_INSTALL_DIR=$HOME/.local/bin bash

REPO="${WRITER_REPO:-calebguy/writer}"
INSTALL_DIR="${WRITER_INSTALL_DIR:-$HOME/.writer/bin}"
BINARY_NAME="writer"
TAG_PREFIX="writer-cli-v"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() {
    printf "${GREEN}info${NC}: %s\n" "$1" >&2
}

warn() {
    printf "${YELLOW}warn${NC}: %s\n" "$1" >&2
}

error() {
    printf "${RED}error${NC}: %s\n" "$1" >&2
    exit 1
}

need_cmd() {
    command -v "$1" >/dev/null 2>&1 || error "Required command not found: $1"
}

detect_platform() {
    local os arch

    case "$(uname -s)" in
        Linux*)  os="linux" ;;
        Darwin*) os="darwin" ;;
        *)       error "Unsupported operating system: $(uname -s)" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64)  arch="x64" ;;
        arm64|aarch64) arch="arm64" ;;
        *)             error "Unsupported architecture: $(uname -m)" ;;
    esac

    echo "${os}-${arch}"
}

get_latest_version() {
    local latest
    latest=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases" | \
        grep '"tag_name"' | \
        sed -E 's/.*"([^"]+)".*/\1/' | \
        grep -E "^${TAG_PREFIX}[0-9]+\.[0-9]+\.[0-9]+$" | \
        head -n 1 || true)

    if [[ -z "$latest" ]]; then
        error "Failed to fetch latest Writer CLI version. Check your connection or specify WRITER_VERSION=X.Y.Z."
    fi

    echo "$latest"
}

normalize_version() {
    local version="$1"
    if [[ "$version" == ${TAG_PREFIX}* ]]; then
        echo "$version"
    else
        echo "${TAG_PREFIX}${version}"
    fi
}

download_file() {
    local url="$1"
    local tmp_file
    tmp_file=$(mktemp)

    if ! curl -fsSL "$url" -o "$tmp_file"; then
        rm -f "$tmp_file"
        error "Failed to download ${url}"
    fi

    echo "$tmp_file"
}

checksum_file() {
    local file="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" | awk '{print $1}'
    else
        error "Required command not found: sha256sum or shasum"
    fi
}

verify_checksum() {
    local binary_file="$1"
    local checksums_file="$2"
    local asset_name="$3"
    local expected actual

    expected=$(grep "[[:space:]]${asset_name}$" "$checksums_file" | awk '{print $1}' || true)
    if [[ -z "$expected" ]]; then
        rm -f "$binary_file" "$checksums_file"
        error "Checksum for ${asset_name} not found in SHA256SUMS"
    fi

    actual=$(checksum_file "$binary_file")
    if [[ "$actual" != "$expected" ]]; then
        rm -f "$binary_file" "$checksums_file"
        error "Checksum verification failed for ${asset_name}"
    fi

    info "Verified SHA256 checksum"
}

install_binary() {
    local tmp_file="$1"
    local install_path="${INSTALL_DIR}/${BINARY_NAME}"

    mkdir -p "$INSTALL_DIR"
    mv "$tmp_file" "$install_path"
    chmod +x "$install_path"

    info "Installed writer to ${install_path}"
}

setup_path_instructions() {
    local shell_name rc_file
    shell_name=$(basename "${SHELL:-}")

    case "$shell_name" in
        bash)
            if [[ -f "$HOME/.bash_profile" ]]; then
                rc_file="$HOME/.bash_profile"
            else
                rc_file="$HOME/.bashrc"
            fi
            ;;
        zsh)  rc_file="$HOME/.zshrc" ;;
        fish) rc_file="$HOME/.config/fish/config.fish" ;;
        *)    rc_file="your shell's config file" ;;
    esac

    if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
        info "writer is ready to use"
        return
    fi

    echo "" >&2
    printf "${YELLOW}writer is not in your PATH.${NC}\n" >&2
    echo "" >&2

    if [[ "${WRITER_NO_MODIFY_PATH:-}" == "1" || ! -r /dev/tty ]]; then
        warn "Add writer to your PATH manually: export PATH=\"${INSTALL_DIR}:\$PATH\""
        return
    fi

    printf "Would you like to add it automatically? [Y/n] " >&2

    local response
    if [[ -t 0 ]]; then
        read -r response
    else
        read -r response < /dev/tty
    fi

    case "$response" in
        [Yy]|"")
            if [[ "$shell_name" == "fish" ]]; then
                mkdir -p "$(dirname "$rc_file")"
                echo "fish_add_path $INSTALL_DIR" >> "$rc_file"
            elif [[ "$rc_file" != "your shell's config file" ]]; then
                echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$rc_file"
            else
                warn "Could not detect shell config. Add ${INSTALL_DIR} to PATH manually."
                return
            fi
            info "Added writer to PATH in ${rc_file}"
            warn "Restart your terminal or run: source ${rc_file}"
            ;;
        [Nn])
            warn "Add writer to your PATH manually: export PATH=\"${INSTALL_DIR}:\$PATH\""
            ;;
        *)
            warn "Invalid response. Add ${INSTALL_DIR} to your PATH manually."
            ;;
    esac
}

main() {
    need_cmd curl
    need_cmd grep
    need_cmd sed
    need_cmd awk

    local version="${WRITER_VERSION:-}"
    local platform asset_name base_url binary_file checksums_file

    info "Writer CLI Installer"

    platform=$(detect_platform)
    info "Detected platform: ${platform}"

    if [[ -z "$version" ]]; then
        info "Fetching latest version..."
        version=$(get_latest_version)
    else
        version=$(normalize_version "$version")
    fi
    info "Version: ${version}"

    asset_name="${BINARY_NAME}-${platform}"
    base_url="https://github.com/${REPO}/releases/download/${version}"

    info "Downloading ${asset_name}..."
    binary_file=$(download_file "${base_url}/${asset_name}")
    checksums_file=$(download_file "${base_url}/SHA256SUMS")

    verify_checksum "$binary_file" "$checksums_file" "$asset_name"
    rm -f "$checksums_file"

    install_binary "$binary_file"
    setup_path_instructions

    info "Installation complete"
    info "Try: writer --help"
}

main "$@"
