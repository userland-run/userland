# v86 Codebase Architecture

This document maps the v86 codebase for 64-bit enhancement work.

## Overview

v86 is an x86 emulator that runs in the browser via WebAssembly. It supports:
- Real mode, protected mode, virtual 8086 mode
- PAE paging (32-bit addresses, up to 64 GiB physical)
- JIT compilation to WebAssembly for performance
- Full PC hardware emulation (VGA, IDE, NE2000, etc.)

**Enhancement goal**: Add x86_64 long mode support (64-bit guests) while maintaining full 32-bit compatibility.

---

## Directory Structure

```
v86/
├── src/
│   ├── rust/                    # Core emulator (Rust → Wasm)
│   │   ├── cpu/                 # CPU emulation
│   │   │   ├── cpu.rs           # Main CPU state and execution
│   │   │   ├── instructions.rs  # Primary opcode handlers
│   │   │   ├── instructions_0f.rs # 0F-prefixed opcodes
│   │   │   ├── memory.rs        # Memory read/write
│   │   │   ├── modrm.rs         # ModR/M + SIB decoding
│   │   │   ├── misc_instr.rs    # Misc instructions (RDMSR, etc.)
│   │   │   ├── arith.rs         # Arithmetic operations
│   │   │   ├── string.rs        # String operations
│   │   │   ├── fpu.rs           # FPU emulation
│   │   │   ├── sse_instr.rs     # SSE instructions
│   │   │   ├── apic.rs          # Local APIC
│   │   │   ├── ioapic.rs        # I/O APIC
│   │   │   └── pic.rs           # 8259 PIC
│   │   ├── wasmgen/             # WebAssembly code generation
│   │   │   ├── wasm_builder.rs  # Wasm module construction
│   │   │   └── wasm_opcodes.rs  # Wasm opcode constants
│   │   ├── jit.rs               # JIT compiler main
│   │   ├── jit_instructions.rs  # JIT'd instruction handlers
│   │   ├── paging.rs            # Paging helpers
│   │   ├── page.rs              # Page structure
│   │   ├── modrm.rs             # ModR/M parsing (top-level)
│   │   ├── prefix.rs            # Instruction prefix handling
│   │   ├── regs.rs              # Register constants
│   │   └── state_flags.rs       # CPU state flags
│   │
│   ├── browser/                 # Browser integration (JS)
│   │   ├── starter.js           # V86 entry point
│   │   ├── main.js              # Main browser interface
│   │   └── ...                  # Device frontends
│   │
│   ├── cpu.js                   # JS CPU wrapper
│   ├── io.js                    # I/O port handling
│   ├── pci.js                   # PCI bus
│   └── ...                      # Device backends
│
├── build/                       # Build output
│   ├── libv86.js               # Main JS bundle
│   └── v86.wasm                # Compiled Wasm
│
└── tests/                       # Test suite
    ├── nasm/                    # Assembly microtests
    └── ...
```

---

## Key Components for 64-bit Work

### 1. CPU State (`src/rust/cpu/cpu.rs`)

**Current state** (32-bit oriented):
```rust
// Register constants
pub const EAX: i32 = 0;
pub const ECX: i32 = 1;
// ... through EDI = 7

// No R8-R15
// All types are i32
```

**Changes needed**:
- Add R8-R15 constants (8-15)
- Change register storage to u64
- Add RIP (64-bit instruction pointer)
- Add EFER MSR
- Add mode tracking (long mode vs protected mode)

### 2. Instruction Decode (`src/rust/cpu/instructions.rs`)

**Current**: Handles 16/32-bit operand sizes.

**Changes needed**:
- REX prefix parsing (40-4F)
- REX.W for 64-bit operand size
- REX.R, REX.X, REX.B for extended registers
- Default operand size 32 in 64-bit mode
- RIP-relative addressing

### 3. ModR/M Decoding (`src/rust/cpu/modrm.rs`)

**Current**: `resolve_modrm32()` for 32-bit effective addresses.

**Changes needed**:
- `resolve_modrm64()` for 64-bit EA
- RIP-relative addressing mode (ModR/M = 00, R/M = 101)
- REX.B extension for R/M field
- REX.X extension for SIB index

### 4. Paging (`src/rust/paging.rs`, `src/rust/page.rs`)

**Current**: 2-level (non-PAE) and 3-level (PAE) paging.

**Changes needed**:
- 4-level paging (PML4 → PDPT → PD → PT)
- 64-bit page table entries
- Canonical address checking
- NX bit support
- CR3 format for long mode

### 5. Memory Access (`src/rust/cpu/memory.rs`)

**Current**: 32-bit addresses, i32 types.

**Changes needed**:
- 64-bit address parameters
- Canonical check before translation
- Integration with 4-level paging

### 6. Wasm Codegen (`src/rust/wasmgen/`)

**Current status**: Memory64 infrastructure implemented.

**Key additions**:
```rust
// wasm_builder.rs
pub struct WasmBuilder {
    use_memory64: bool,  // NEW: Enable memory64 mode
}

// Memory64 load functions (NEW)
pub fn load_fixed_i32_mem64(&mut self, addr: u64);
pub fn load_fixed_i64_mem64(&mut self, addr: u64);
pub fn load_fixed_u8_mem64(&mut self, addr: u64);
pub fn load_fixed_u16_mem64(&mut self, addr: u64);

// i64 operations (NEW)
pub fn and_i64(&mut self);
pub fn xor_i64(&mut self);
```

### 7. JIT (`src/rust/jit.rs`, `src/rust/jit_instructions.rs`)

**Current status**: JIT enabled for 64-bit mode, falls back to interpreter when codegen incomplete.

**Changes made**:
- Removed `is_64` skip in `jit_analyze_and_generate()` (~line 792)
- Removed `is_64` skip in `jit_increase_hotness_and_maybe_compile()` (~line 2123)
- JIT context tracks mode via `CpuContext::is_64()`

**Remaining work**:
- Wire up `gen_push64()`/`gen_pop64()` in jit_instructions.rs
- Implement `gen_call64()`/`gen_ret64()` for 64-bit call/return
- Update stack operations to use `gen_get_reg64(RSP)`/`gen_set_reg64(RSP)`

### 8. CPU Context (`src/rust/cpu_context.rs`)

**Key helpers for 64-bit mode**:
```rust
impl CpuContext {
    pub fn is_64(&self) -> bool { self.state_flags.is_64() }

    // Address size: 64-bit default in long mode, 67h -> 32-bit
    pub fn asize_32(&self) -> bool {
        if self.state_flags.is_64() {
            self.prefixes & PREFIX_MASK_ADDRSIZE != 0
        } else {
            self.state_flags.is_32() != (self.prefixes & PREFIX_MASK_ADDRSIZE != 0)
        }
    }
}
```

### 9. Codegen (`src/rust/codegen.rs`)

**64-bit register access functions (NEW)**:
```rust
pub fn gen_get_reg64(ctx: &mut JitContext, r: u32);     // Load 64-bit reg as i64
pub fn gen_set_reg64(ctx: &mut JitContext, r: u32);     // Store i64 to 64-bit reg
pub fn gen_get_reg64_low32(ctx: &mut JitContext, r: u32); // Load low 32 bits
pub fn gen_set_reg64_low32(ctx: &mut JitContext, r: u32); // Store low 32, zero-extend
pub fn gen_get_reg64_low16(ctx: &mut JitContext, r: u32); // Load low 16 bits
pub fn gen_set_reg64_low16(ctx: &mut JitContext, r: u32); // Store low 16, preserve upper
```

### 10. ModR/M Decoding (`src/rust/modrm.rs`)

**64-bit address generation (NEW)**:
```rust
pub fn gen(ctx: &mut JitContext, modrm_byte: ModrmByte, esp_offset: i32) {
    if ctx.cpu.is_64() && !ctx.cpu.asize_32() {
        gen_64(ctx, modrm_byte, esp_offset as i64);
        return;
    }
    // ... existing 32-bit logic
}

fn gen_64(ctx: &mut JitContext, modrm_byte: ModrmByte, rsp_offset: i64) {
    // Uses i64 arithmetic for 64-bit effective addresses
    // Sign-extends 32-bit displacements
    // Wraps to i32 for physical memory access
}
```

---

## Data Flow

```
Guest Code → Fetch → Decode → Execute → Memory/IO → State Update
                ↓
            [JIT Cache]
                ↓
         Wasm Compilation
                ↓
         Browser Wasm VM
```

### Interpreter path
1. `cycle()` in cpu.rs fetches instruction
2. Prefix bytes parsed (segment override, operand size, REX)
3. Opcode dispatched to handler in instructions.rs
4. ModR/M decoded if needed
5. Operation performed, flags updated

### JIT path
1. Basic block identified
2. Instructions compiled to Wasm bytecode
3. Wasm module instantiated
4. Future executions call compiled Wasm
5. Invalidation on self-modifying code or mode change

---

## Extension Points

### Adding a new opcode

1. Add handler in `instructions.rs` or `instructions_0f.rs`
2. Add JIT version in `jit_instructions.rs` if hot
3. Add microtest in `tests/nasm/`

### Adding a new CPU feature

1. Add state in `cpu.rs`
2. Add CPUID bit if discoverable
3. Update RDMSR/WRMSR if MSR-controlled
4. Add execution logic
5. Add tests

### Mode transition handling

1. CR0/CR4/EFER writes check for mode change
2. Mode flag updated
3. Segment caches may need refresh
4. JIT cache invalidated on mode change

---

## Files requiring changes for 64-bit support

| Priority | File | Status | Description |
|----------|------|--------|-------------|
| **P0** | `cpu/cpu.rs` | ✅ Done | CPU state, EFER, mode tracking, JIT enable |
| **P0** | `regs.rs` | ✅ Done | Register constants for R8-R15 |
| **P0** | `cpu/instructions.rs` | ✅ Done | REX prefix, 64-bit ops |
| **P0** | `cpu/modrm.rs` | ✅ Done | 64-bit EA (interpreter) |
| **P0** | `modrm.rs` (JIT) | ✅ Done | 64-bit EA via `gen_64()` |
| **P1** | `paging.rs` | ✅ Done | 4-level paging |
| **P1** | `page.rs` | ✅ Done | 64-bit PTE structure |
| **P1** | `cpu/memory.rs` | ✅ Done | 64-bit addresses |
| **P1** | `cpu/misc_instr.rs` | ✅ Done | SYSCALL/SYSRET, MSRs |
| **P2** | `wasmgen/wasm_builder.rs` | ✅ Done | memory64 flag, i64 load functions |
| **P2** | `codegen.rs` | ✅ Done | `gen_*_reg64()` functions |
| **P2** | `jit.rs` | ✅ Done | Removed 64-bit skip |
| **P2** | `jit_instructions.rs` | 🔄 Pending | 64-bit push/pop/call/ret |
| **P2** | `cpu_context.rs` | ✅ Done | `is_64()`, `asize_32()` helpers |
| **P3** | `prefix.rs` | ✅ Done | REX prefix integration |
| **P3** | `state_flags.rs` | ✅ Done | 64-bit state flags |

### Current Blocking Issue

**IDT initialization in 64-bit mode**: When the kernel enters 64-bit mode and triggers first page fault, the IDT isn't initialized (`idtr_size=0`). This is a boot sequence issue, not a JIT issue.

SPEC: intel-64bit-architecture.md :: Vol 3A Ch 6.14.1 -> 64-bit IDT gate descriptors are 16 bytes (vs 8 bytes in 32-bit)

---

## Testing infrastructure

### Existing tests
- `tests/nasm/`: Assembly microtests
- `tests/api/`: API tests
- `tests/full/`: Full boot tests

### 64-bit Test Setup

**Alpine Linux x86_64 kernel** (in `web/public/alpine/`):
```
vmlinuz-virt      - 64-bit kernel (6.12.65-0-virt)
initramfs-virt    - Initramfs with 9p + virtio modules
alpine-rootfs-flat/ - 9p filesystem
```

**Test runner** (custom, in web/ or tests/):
```javascript
// Boot with 64-bit kernel
const emulator = new V86({
    wasm_path: "v86.wasm",
    memory_size: 512 * 1024 * 1024,
    vga_memory_size: 8 * 1024 * 1024,
    bzimage: { url: "/alpine/vmlinuz-virt" },
    initrd: { url: "/alpine/initramfs-virt" },
    cmdline: "console=ttyS0 root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose rw",
});
```

### Current 64-bit Boot Sequence

1. ✅ Kernel decompression (32-bit protected mode)
2. ✅ Long mode entry (sets EFER.LME, CR4.PAE, CR0.PG)
3. ✅ 4-level paging initialization
4. ❌ **BLOCKED**: First page fault with IDT not initialized
   - `idtr_size=0` when exception occurs
   - Need to trace kernel IDT setup

### Needed for full 64-bit support
- [x] 64-bit assembly microtests (REX, RIP-relative, etc.)
- [x] Long mode entry tests
- [x] 4-level paging tests
- [ ] 64-bit IDT gate descriptor tests
- [ ] SYSCALL/SYSRET tests
- [ ] 64-bit Linux full boot test
