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

### Binary Encoding (SPEC: memory64.md :: Binary format)

```
limits ::= 0x00 n:u32        ⇒ i32, {min n, max ϵ}    ;; memory32, no max
        |  0x01 n:u32 m:u32  ⇒ i32, {min n, max m}    ;; memory32, with max
        |  0x04 n:u64        ⇒ i64, {min n, max ϵ}    ;; memory64, no max
        |  0x05 n:u64 m:u64  ⇒ i64, {min n, max m}    ;; memory64, with max
```

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

## Actual Implementation

### wasm_builder.rs Changes

**Added fields and methods**:
```rust
pub struct WasmBuilder {
    // ... existing fields ...
    use_memory64: bool,  // Enable memory64 mode
}

impl WasmBuilder {
    pub fn set_memory64(&mut self, use_memory64: bool) {
        self.use_memory64 = use_memory64;
    }

    pub fn use_memory64(&self) -> bool {
        self.use_memory64
    }
}
```

**Memory import encoding**:
```rust
pub fn write_memory_import(&mut self) {
    // ... existing code ...
    if self.use_memory64 {
        // SPEC: memory64.md :: Binary format -> 0x04 for i64 limits, no max
        self.output.push(0x04);
        write_leb_u64(&mut self.output, 64);  // min pages as u64
    } else {
        self.output.push(0);
        write_leb_u32(&mut self.output, 64);
    }
}
```

**Memory64 load functions**:
```rust
/// Load i32 using 64-bit address constant
pub fn load_fixed_i32_mem64(&mut self, addr: u64) {
    self.const_i64(addr as i64);
    self.load_aligned_i32_from_stack(0);
}

/// Load i64 using 64-bit address constant
pub fn load_fixed_i64_mem64(&mut self, addr: u64) {
    self.const_i64(addr as i64);
    self.load_aligned_i64_from_stack(0);
}

/// Load u8 using 64-bit address constant
pub fn load_fixed_u8_mem64(&mut self, addr: u64) {
    self.const_i64(addr as i64);
    self.load_u8_from_stack(0);
}

/// Load u16 using 64-bit address constant
pub fn load_fixed_u16_mem64(&mut self, addr: u64) {
    self.const_i64(addr as i64);
    self.load_aligned_u16_from_stack(0);
}
```

**New i64 operations**:
```rust
pub fn and_i64(&mut self) { self.instruction_body.push(op::OP_I64AND); }
pub fn xor_i64(&mut self) { self.instruction_body.push(op::OP_I64XOR); }
```

### codegen.rs Changes

**64-bit register access**:
```rust
/// Load 64-bit register value onto WASM stack as i64
pub fn gen_get_reg64(ctx: &mut JitContext, r: u32) {
    ctx.builder.load_fixed_i64(global_pointers::get_reg64_offset(r));
}

/// Store i64 from WASM stack to 64-bit register
pub fn gen_set_reg64(ctx: &mut JitContext, r: u32) {
    let value = ctx.builder.set_new_local_i64();
    ctx.builder.const_i32(global_pointers::get_reg64_offset(r) as i32);
    ctx.builder.get_local_i64(&value);
    ctx.builder.store_aligned_i64(0);
    ctx.builder.free_local_i64(value);
}

/// Load low 32 bits of 64-bit register as i32
pub fn gen_get_reg64_low32(ctx: &mut JitContext, r: u32) {
    ctx.builder.load_fixed_i32(global_pointers::get_reg64_offset(r) as u32);
}

/// Store i32 to low 32 bits of 64-bit register, zero-extending to 64 bits
/// (per x86_64 semantics: writing to 32-bit reg clears upper 32 bits)
pub fn gen_set_reg64_low32(ctx: &mut JitContext, r: u32) {
    let value = ctx.builder.set_new_local();  // i32 local
    // Zero-extend to i64 and store full 64-bit value
    ctx.builder.const_i32(global_pointers::get_reg64_offset(r) as i32);
    ctx.builder.get_local(&value);
    ctx.builder.extend_unsigned_i32_to_i64();
    ctx.builder.store_aligned_i64(0);
    ctx.builder.free_local(value);
}

/// Load low 16 bits of 64-bit register as i32
pub fn gen_get_reg64_low16(ctx: &mut JitContext, r: u32) {
    ctx.builder.load_fixed_u16(global_pointers::get_reg64_offset(r) as u32);
}

/// Store i32 (low 16 bits) to low 16 bits of 64-bit register, preserving upper bits
pub fn gen_set_reg64_low16(ctx: &mut JitContext, r: u32) {
    let value = ctx.builder.set_new_local();
    let offset = global_pointers::get_reg64_offset(r) as u32;
    ctx.builder.const_i32(offset as i32);
    ctx.builder.get_local(&value);
    ctx.builder.store_aligned_u16(0);
    ctx.builder.free_local(value);
}
```

### modrm.rs Changes

**64-bit address generation dispatch**:
```rust
pub fn gen(ctx: &mut JitContext, modrm_byte: ModrmByte, esp_offset: i32) {
    // Route to 64-bit handler when in long mode with 64-bit addressing
    if ctx.cpu.is_64() && !ctx.cpu.asize_32() {
        gen_64(ctx, modrm_byte, esp_offset as i64);
        return;
    }
    // ... existing 32-bit logic ...
}
```

**64-bit effective address calculation**:
```rust
fn gen_64(ctx: &mut JitContext, modrm_byte: ModrmByte, rsp_offset: i64) {
    // SPEC: intel-64bit-architecture.md :: Vol 1 Ch 3.7.5 -> 64-bit addressing
    // Uses 64-bit registers, i64 arithmetic, sign-extends 32-bit displacements

    fn gen_base_64(ctx: &mut JitContext, base: u32, rsp_offset: i64) {
        codegen::gen_get_reg64(ctx, base);
        if base == regs::RSP || base == regs::RBP {
            if rsp_offset != 0 {
                ctx.builder.const_i64(rsp_offset);
                ctx.builder.add_i64();
            }
        }
    }

    fn gen_index_64(ctx: &mut JitContext, index: u32, scale: u8) {
        codegen::gen_get_reg64(ctx, index);
        if scale > 0 {
            ctx.builder.const_i64(scale as i64);
            ctx.builder.shl_i64();
        }
    }

    // ... ModR/M decoding with 64-bit arithmetic ...
    // Sign-extend 32-bit displacements to 64-bit
    // Wrap final address to i32 for physical memory access (TLB is still 32-bit)
    ctx.builder.wrap_i64_to_i32();
}
```

### jit.rs and cpu.rs Changes

**Removed 64-bit skip**:
```rust
// jit.rs::jit_analyze_and_generate() - REMOVED:
// if state_flags.is_64() || unsafe { *global_pointers::is_64 } { return; }

// jit.rs::jit_increase_hotness_and_maybe_compile() - REMOVED:
// if state_flags.is_64() { return; }

// cpu.rs - JIT execution now unconditional:
// Before: if let Some((wasm_table_index, initial_state)) = jit_entry.filter(|_| !*is_64)
// After:  if let Some((wasm_table_index, initial_state)) = jit_entry

// Before: if !*is_64 { jit::jit_increase_hotness_and_maybe_compile(...); }
// After:  jit::jit_increase_hotness_and_maybe_compile(...);
```

### cpu_context.rs Changes

**Mode detection helpers**:
```rust
pub fn is_64(&self) -> bool { self.state_flags.is_64() }

pub fn asize_32(&self) -> bool {
    // SPEC: intel-64bit-architecture.md :: Vol 1 Ch 3.6.1 -> Address Size in 64-Bit Mode
    // In 64-bit mode: default is 64-bit, 67h prefix makes it 32-bit
    // In 32-bit/16-bit mode: standard XOR logic applies
    if self.state_flags.is_64() {
        self.prefixes & PREFIX_MASK_ADDRSIZE != 0
    } else {
        self.state_flags.is_32() != (self.prefixes & PREFIX_MASK_ADDRSIZE != 0)
    }
}
```

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `v86/src/rust/wasmgen/wasm_builder.rs` | `use_memory64` flag, memory64 limit encoding (0x04), `load_fixed_*_mem64()`, `and_i64()`, `xor_i64()` |
| `v86/src/rust/codegen.rs` | `gen_get_reg64()`, `gen_set_reg64()`, `gen_*_reg64_low32/16()` |
| `v86/src/rust/modrm.rs` | `gen_64()` for 64-bit EA with i64 arithmetic |
| `v86/src/rust/cpu_context.rs` | `is_64()`, updated `asize_32()` for 64-bit mode |
| `v86/src/rust/jit.rs` | Removed `is_64` early returns |
| `v86/src/rust/cpu/cpu.rs` | Removed JIT disable filter for 64-bit mode |
| `v86/src/rust/wasmgen/wasm_opcodes.rs` | i64 load/store opcodes (already present) |

---

## Remaining Work

### jit_instructions.rs

Wire up 64-bit register access for stack operations:
```rust
// Need to implement:
gen_push64()  // Use gen_get_reg64(RSP), sub, gen_set_reg64(RSP), store 64-bit value
gen_pop64()   // Load 64-bit value, gen_get_reg64(RSP), add, gen_set_reg64(RSP)
gen_call64()  // Push 64-bit return address, update RIP
gen_ret64()   // Pop 64-bit return address, jump
```

### Browser Feature Detection

```javascript
// Check for memory64 support
const hasMemory64 = WebAssembly.validate(new Uint8Array([
    0x00, 0x61, 0x73, 0x6d,  // magic
    0x01, 0x00, 0x00, 0x00,  // version
    0x05, 0x04, 0x01,        // memory section
    0x04, 0x00, 0x01         // memory i64 0 1 (flag 0x04 = i64 limits)
]));
```
