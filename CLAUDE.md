# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Userland** - A browser-based Linux virtual machine using v86 (x86 emulator compiled to WebAssembly) with Alpine Linux. Features a React UI with OPFS for persistent VM state storage.

## Build Commands

```bash
# Web app development
cd web
npm install          # Install dependencies
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # Production build

# Alpine guest image (requires Docker)
cd alpine-guest
./build.sh           # Build Alpine i386 rootfs

# v86 setup (if rebuilding from source)
./scripts/setup-v86.sh
```

## Architecture

### Tech Stack

- **Emulator**: v86 - x86 emulator compiled to WebAssembly
- **Guest OS**: Alpine Linux i386 3.21 with Node.js
- **Frontend**: React 18 + TypeScript + Vite
- **Terminal**: xterm.js connected to v86 serial console
- **Storage**: OPFS (Origin Private File System) for VM state persistence

### Directory Structure

```
userland/
├── web/                         # React frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── contexts/            # V86Provider, DBProvider
│   │   ├── hooks/               # useV86, useOPFS, useDB
│   │   └── lib/                 # v86 wrapper, profiles, OPFS utils
│   └── public/
│       ├── v86/                 # v86 WASM + BIOS files
│       └── alpine/              # Alpine rootfs + kernel
├── alpine-guest/                # Docker build for Alpine image
└── scripts/                     # Setup scripts
```

### Browser Requirements

Required headers for SharedArrayBuffer (v86 threading):
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Vite dev server sends these automatically.

## Key Components

### v86 Wrapper (`src/lib/v86.ts`)

TypeScript wrapper for v86 emulator:
- `start()` - Boot VM with kernel + initramfs + 9p filesystem
- `stop()` - Shutdown and cleanup
- `saveState()` / `restoreState()` - VM snapshots
- `onSerialOutput()` - Serial console output callback
- `sendSerial()` - Send input to VM

### Profile System (`src/lib/profiles.ts`)

Predefined package bundles:
- Node.js 22, Python 3, Rust, Go
- Dev Tools (GCC, Git, curl, wget)

Generates `apk add` scripts for the VM.

### OPFS Manager (`src/lib/opfs.ts`)

Persistent browser storage:
- Save/restore VM state snapshots
- Track storage quota
- List saved states

## v86 Configuration

The VM boots with:
- **Kernel**: `vmlinuz-virt` (Alpine virt kernel)
- **Initramfs**: `initramfs-virt` (with 9p + virtio modules)
- **Filesystem**: 9p mount from `alpine-rootfs-flat/`
- **Console**: Serial on ttyS0 with auto-login

Boot cmdline:
```
console=ttyS0 root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose rw init=/sbin/init
```

## Building Alpine Image

1. Build Docker image: `docker build --platform linux/386 -t alpine-v86 .`
2. Export rootfs: `docker export alpine-v86 > rootfs.tar`
3. Convert with v86 tools:
   - `fs2json.py` → `alpine-fs.json`
   - `copy-to-sha256.py` → `alpine-rootfs-flat/`
4. Extract kernel/initramfs from `boot/`

## Troubleshooting

- **VM not booting**: Check that `vmlinuz-virt` and `initramfs-virt` exist in `public/alpine/`
- **No serial output**: Verify kernel cmdline includes `console=ttyS0`
- **SharedArrayBuffer errors**: Must use dev server, not `file://` protocol
- **Slow boot**: Normal (~15s); use Save State for faster resume
