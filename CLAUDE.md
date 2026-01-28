# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Autonomous Operation

Work autonomously on tasks without asking for permission at each step. When given a task:
- Execute the full task end-to-end
- Run tests and type-checks after making changes
- Fix issues you discover along the way
- Use subagents for parallel work (e.g., researching while implementing)
- Only ask questions when genuinely blocked or facing ambiguous requirements

### Decision Making
- Prefer simple, working solutions over complex architectures
- Follow existing patterns in the codebase
- When unsure between approaches, pick one and proceed (can iterate later)
- Use `ultrathink` for complex architectural decisions

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

# v86 Rust development
cd v86
/Users/drietsch/.cargo/bin/cargo check --lib  # Type check Rust code
/Users/drietsch/.cargo/bin/cargo build --lib  # Build library
make build/v86-debug.wasm                      # Build debug WASM
```

## Build Tools Location

- **Cargo/Rust**: `~/.cargo/bin/cargo` (linked to rustup)
- **Rustup**: `~/.cargo/bin/rustup`
- v86 uses Rust compiled to WebAssembly via wasm32-unknown-unknown target

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

## Code Style

- TypeScript with strict mode
- Functional React components with hooks
- Use existing utilities from `src/lib/` before adding new dependencies
- Keep components small and focused
- No `any` types without explicit justification

## Testing & Validation

After code changes, always run:
```bash
cd web && npx tsc --noEmit  # Type check
npm run build               # Ensure production build works
```

## v86 64-bit Testing

The v86 submodule includes a 64-bit test infrastructure for validating long mode implementation.

### Running 64-bit Tests

```bash
cd v86

# Run all 44 NASM64 tests (should pass)
node tests/nasm64/run64.js

# Regenerate golden master fixtures
node tests/nasm64/gen_golden.js --force

# Run specific test pattern
TEST_NAME=rex node tests/nasm64/run64.js

# Single worker mode for debugging
MAX_PARALLEL_TESTS=1 node tests/nasm64/run64.js
```

### Key Technical Details

**WASM Memory Layout for 64-bit Registers:**
- 64-bit registers (RAX-R15) stored at WASM memory offset 1280
- Each register is 8 bytes, index 0-15 (RAX=0, RCX=1, ..., R15=15)
- RIP stored at offset 1408
- Access via `DataView` on `cpu.wasm_memory.buffer`

**cpu_exception_hook Behavior (DEBUG builds only):**
- Return `false` → Exception delivered to guest IDT handler
- Return `true` → Exception suppressed (NOT delivered to guest)
- Default hook returns `undefined` (falsy = delivered)

**Fixture Generation:**
- QEMU's `-kernel` uses Linux boot protocol, NOT Multiboot
- Use `gen_golden.js` to generate fixtures from v86 itself
- Both `gen_golden.js` and `run64.js` must use identical settings (JIT disabled, same exception hook behavior)

### Test Infrastructure Files

| File | Purpose |
|------|---------|
| `tests/nasm64/run64.js` | Test runner comparing v86 against fixtures |
| `tests/nasm64/gen_golden.js` | Generates fixtures using v86 execution |
| `tests/nasm64/header64.inc` | Bootstrap into 64-bit long mode |
| `tests/nasm64/header64_idt.inc` | Bootstrap with IDT for exception tests |
| `tests/nasm64/footer64.inc` | Test completion (HLT) |

### KVM Unit Tests

Located at `v86/tests/kvm-unit-tests/`. These ARE x86_64 tests but require Linux GCC to build (flags like `-mno-red-zone` and `-no-pie` are incompatible with macOS clang).

**Building KVM unit tests on macOS (via Docker):**

```bash
cd v86/tests/kvm-unit-tests
./build-docker.sh   # Builds x86_64 tests using Docker
```

This creates a Docker container with Debian + GCC, runs `./configure --arch=x86_64`, and builds the tests. The compiled `.flat` binaries appear in `x86/`.

**Note**: Some tests like `pae.c` are explicitly 32-bit only and will be skipped. The build produces 37 x86_64 test binaries.

**Current Status**:
- `realmode.flat` passes (many subtests completed)
- 64-bit tests enter long mode but get stuck in `smp_init` (APIC/IPI handling)
- The NASM64 tests (44/44 pass) are more reliable for 64-bit validation

For quick macOS development without Docker, use the NASM64 tests which provide comprehensive 64-bit coverage.

## Git Workflow

- Commit messages: imperative mood, concise (e.g., "Add VM state persistence")
- One logical change per commit
- Run type-check before committing
