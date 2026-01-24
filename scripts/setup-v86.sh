#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
V86_DIR="$ROOT_DIR/web/public/v86"
ALPINE_DIR="$ROOT_DIR/web/public/alpine"

echo "==> Setting up v86 for VM Workbench"

# Create directories
mkdir -p "$V86_DIR" "$ALPINE_DIR"

# Clone v86 if needed
V86_REPO="$ROOT_DIR/.v86-src"
if [ ! -d "$V86_REPO" ]; then
    echo "==> Cloning v86 repository..."
    git clone --depth 1 https://github.com/copy/v86.git "$V86_REPO"
fi

# Check for pre-built releases
echo "==> Downloading v86 release..."
V86_VERSION="latest"
RELEASE_URL="https://github.com/nickreese/nickreese.github.io/releases/download/v86/${V86_VERSION}/libv86.js"

# Try to use pre-built v86 from a known location or build from source
if [ -f "$V86_REPO/build/libv86.js" ]; then
    echo "==> Using pre-built v86 from repository..."
    cp "$V86_REPO/build/libv86.js" "$V86_DIR/"
    cp "$V86_REPO/build/v86.wasm" "$V86_DIR/"
else
    echo "==> Building v86 from source..."
    cd "$V86_REPO"
    make build/libv86.js
    cp build/libv86.js "$V86_DIR/"
    cp build/v86.wasm "$V86_DIR/"
fi

# Copy BIOS files
echo "==> Copying BIOS files..."
cp "$V86_REPO/bios/seabios.bin" "$V86_DIR/"
cp "$V86_REPO/bios/vgabios.bin" "$V86_DIR/"

echo "==> v86 setup complete!"
echo "Files in $V86_DIR:"
ls -la "$V86_DIR"

echo ""
echo "Next steps:"
echo "1. Run alpine-guest/build.sh to build the Alpine image"
echo "2. Use v86's fs2json.py to convert the rootfs"
echo "3. Copy the results to web/public/alpine/"
