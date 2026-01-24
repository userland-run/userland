#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ALPINE_DIR="$ROOT_DIR/web/public/alpine"

echo "==> Downloading pre-built Alpine Linux for v86"

mkdir -p "$ALPINE_DIR"
cd "$ALPINE_DIR"

# Download from v86's example images
# These are maintained by the v86 project
BASE_URL="https://copy.sh/v86/images/alpine"

echo "==> Downloading Alpine filesystem JSON..."
curl -L -o alpine-fs.json "${BASE_URL}/alpine-fs.json" || {
    echo "Note: Pre-built image not available, you'll need to build from scratch"
    echo "Run: cd alpine-guest && ./build.sh"
    exit 1
}

echo "==> Downloading Alpine rootfs..."
# The flat files are typically served from a directory structure
# For now, create a placeholder that indicates manual setup is needed

cat > README.txt << 'EOF'
Alpine Linux for v86

To set up the Alpine image:

1. Option A: Use v86's Docker build (recommended)
   cd /path/to/v86
   docker-compose -f tools/docker/alpine/docker-compose.yml up

2. Option B: Build manually
   cd alpine-guest
   ./build.sh
   # Then use v86's tools to convert the rootfs

The v86 emulator expects:
- alpine-fs.json: Filesystem metadata
- alpine-rootfs-flat/: Directory with SHA256-named files

See https://github.com/copy/v86 for more details.
EOF

echo "==> Setup instructions created"
echo ""
echo "To complete setup, you need to build the Alpine image."
echo "See $ALPINE_DIR/README.txt for instructions."
