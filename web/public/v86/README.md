# v86 Files

This directory should contain the v86 emulator files:

- `libv86.js` - Main v86 library
- `v86.wasm` - WebAssembly module
- `seabios.bin` - SeaBIOS firmware
- `vgabios.bin` - VGA BIOS

## Setup

Run the setup script to download and build v86:

```bash
./scripts/setup-v86.sh
```

Or manually:

1. Clone v86: `git clone https://github.com/copy/v86.git`
2. Build: `cd v86 && make build/libv86.js`
3. Copy files:
   - `v86/build/libv86.js` → here
   - `v86/build/v86.wasm` → here
   - `v86/bios/seabios.bin` → here
   - `v86/bios/vgabios.bin` → here
