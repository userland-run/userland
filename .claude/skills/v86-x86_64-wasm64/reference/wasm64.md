# wasm64/memory64 Engineering Reference

This document covers wasm64/memory64 implications for adding 64-bit guest support to v86.

## Overview

v86 uses WebAssembly for JIT-compiled guest code. Adding 64-bit guest support requires:
1. 64-bit linear memory addressing (memory64)
2. 64-bit integer operations throughout
3. Larger guest physical address space

**Note**: v86 continues to support 32-bit guests. The wasm64 target enables 64-bit capabilities without removing 32-bit support.

---

## memory64 Proposal (Wasm 3.0)

### Key changes from memory32

| Feature | memory32 | memory64 |
|---------|----------|----------|
| Index type | i32 | i64 |
| Max memory | 4 GiB | 16 EiB (theoretical) |
| memory.size return | i32 (pages) | i64 (pages) |
| memory.grow arg | i32 (pages) | i64 (pages) |
| Load/store offsets | i32 | i64 |

### Memory declaration

```wat
;; memory32 (current v86)
(memory 1 100)  ;; 1 initial page, 100 max pages

;; memory64
(memory i64 1 100)  ;; Same, but with i64 indexing
```

---

## v86 Memory Model Changes

### Current (32-bit guests only)

```rust
// Current v86: 32-bit addresses everywhere
pub fn safe_read32(addr: i32) -> OrPageFault<i32>
pub fn safe_write32(addr: i32, value: i32) -> OrPageFault<()>
```

### Target (32-bit + 64-bit guests)

```rust
// Guest virtual address: 64-bit in long mode, 32-bit otherwise
pub type GuestVirtAddr = u64;

// Guest physical address: Always 64-bit for uniformity
pub type GuestPhysAddr = u64;

// Memory operations take 64-bit addresses
pub fn safe_read64(addr: GuestVirtAddr) -> OrPageFault<u64>
pub fn safe_write64(addr: GuestVirtAddr, value: u64) -> OrPageFault<()>

// 32-bit operations still supported for compatibility
pub fn safe_read32(addr: GuestVirtAddr) -> OrPageFault<i32>
```

---

## Wasm Codegen Changes

### Load/Store instructions

```wat
;; Current (memory32)
i32.load offset=0 align=2  ;; addr on stack is i32

;; memory64
i64.load offset=0 align=3  ;; addr on stack is i64
```

### Address calculation

```rust
// Current: 32-bit effective address calculation
fn gen_effective_address_32(base: i32, index: i32, scale: i32, disp: i32) -> i32

// New: 64-bit effective address in long mode
fn gen_effective_address_64(base: i64, index: i64, scale: i32, disp: i64) -> i64

// The codegen must check CPU mode and emit appropriate code
fn gen_effective_address(ctx: &CodegenContext) {
    if ctx.is_64bit_mode() {
        gen_effective_address_64(...)
    } else {
        gen_effective_address_32(...)
    }
}
```

---

## Type System Considerations

### Register representation

```rust
// Option A: Unified 64-bit storage
pub struct CpuRegs {
    pub gpr: [u64; 16],  // RAX-R15, always 64-bit storage
    pub rip: u64,
    pub rflags: u64,
}

// For 32-bit mode: use lower 32 bits, upper bits cleared on write

// Option B: Conditional (more complex, not recommended)
// enum RegValue { Bits32(u32), Bits64(u64) }
```

### Wasm value types

| Wasm type | Use case |
|-----------|----------|
| i32 | 32-bit operands, flags, small immediates |
| i64 | 64-bit operands, addresses in long mode |
| f32/f64 | FPU/SSE operands |
| v128 | SSE/AVX vector operands |

---

## JIT Considerations

### Mode-dependent codegen

The JIT must track:
- Current CPU mode (real/protected/long/compatibility)
- Default operand size (16/32/64)
- Default address size (16/32/64)
- REX prefix presence and bits

```rust
struct JitContext {
    mode: CpuMode,
    default_operand_size: u8,  // 16, 32, or 64
    default_address_size: u8,  // 16, 32, or 64
    rex: Option<RexPrefix>,
}
```

### Hot paths

Critical hot paths that need 64-bit versions:
1. Memory load/store
2. Effective address calculation
3. Stack push/pop
4. Instruction pointer update
5. Page table walks

---

## Browser Support Status

### memory64 support (as of Wasm 3.0)

| Browser | Status |
|---------|--------|
| Chrome | Supported (flag → default) |
| Firefox | Supported |
| Safari | Supported |
| Node.js | Supported |

### Feature detection

```javascript
// Check for memory64 support
const hasMemory64 = WebAssembly.validate(new Uint8Array([
    0x00, 0x61, 0x73, 0x6d,  // magic
    0x01, 0x00, 0x00, 0x00,  // version
    0x05, 0x04, 0x01,        // memory section
    0x04, 0x00, 0x01         // memory i64 0 1
]));
```

---

## Migration Strategy

### Phase 1: Unified 64-bit state

- Store all GPRs as 64-bit
- Store RIP as 64-bit
- 32-bit mode uses lower 32 bits

### Phase 2: Dual-mode address calculation

- Address calculation checks CPU mode
- 64-bit mode uses full 64-bit EA
- 32-bit mode truncates to 32 bits

### Phase 3: memory64 Wasm output

- Wasm codegen emits i64 loads/stores
- Memory declared with i64 index type

### Phase 4: Validation

- Both 32-bit and 64-bit guests boot
- Performance regression testing

---

## Files to modify

| File | Changes |
|------|---------|
| `v86/src/rust/wasmgen/wasm_builder.rs` | i64 memory ops, memory64 section |
| `v86/src/rust/wasmgen/wasm_opcodes.rs` | i64 load/store opcodes |
| `v86/src/rust/jit.rs` | Mode-aware codegen |
| `v86/src/rust/jit_instructions.rs` | 64-bit instruction variants |
| `v86/src/rust/cpu/memory.rs` | 64-bit address types |
| `v86/src/rust/cpu/cpu.rs` | 64-bit register storage |
| `v86/src/browser/starter.js` | memory64 feature detection |
