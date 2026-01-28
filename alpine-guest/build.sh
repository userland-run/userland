#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Building Alpine x86_64 rootfs for v86"

# Build Alpine x86_64 rootfs using Docker
echo "==> Building Docker image..."
docker build --platform linux/amd64 -t alpine-v86 .

echo "==> Exporting rootfs..."
docker create --name alpine-v86-container alpine-v86 || true
docker export alpine-v86-container > rootfs.tar
docker rm alpine-v86-container

echo "==> Extracting kernel and initramfs..."
mkdir -p extract
tar -xf rootfs.tar -C extract boot/
cp extract/boot/vmlinuz-virt vmlinuz-virt
cp extract/boot/initramfs-virt initramfs-virt
rm -rf extract

echo "==> Compressing rootfs..."
gzip -f rootfs.tar

echo "==> Build complete!"
echo "Files created:"
ls -lh vmlinuz-virt initramfs-virt rootfs.tar.gz

echo ""
echo "Next steps:"
echo "1. Clone v86 and run tools/fs2json.py to convert rootfs"
echo "2. Run tools/copy-to-sha256.py to create flat file structure"
echo "3. Copy files to web/public/alpine/"
