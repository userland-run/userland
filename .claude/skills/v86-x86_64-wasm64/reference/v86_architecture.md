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

**Current**: Generates wasm32 code.

**Changes needed**:
- memory64 support (i64 addressing)
- i64 operations for 64-bit arithmetic
- Mode-aware code generation

### 7. JIT (`src/rust/jit.rs`, `src/rust/jit_instructions.rs`)

**Current**: JIT compiles hot basic blocks to Wasm.

**Changes needed**:
- Track CPU mode in JIT context
- Generate 64-bit variants of instructions
- Handle REX prefixes in JIT path

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

| Priority | File | Description |
|----------|------|-------------|
| **P0** | `cpu/cpu.rs` | CPU state, EFER, mode tracking |
| **P0** | `regs.rs` | Register constants for R8-R15 |
| **P0** | `cpu/instructions.rs` | REX prefix, 64-bit ops |
| **P0** | `cpu/modrm.rs` | 64-bit EA, RIP-relative |
| **P1** | `paging.rs` | 4-level paging |
| **P1** | `page.rs` | 64-bit PTE structure |
| **P1** | `cpu/memory.rs` | 64-bit addresses |
| **P1** | `cpu/misc_instr.rs` | SYSCALL/SYSRET, MSRs |
| **P2** | `wasmgen/wasm_builder.rs` | memory64 output |
| **P2** | `jit.rs` | Mode-aware JIT |
| **P2** | `jit_instructions.rs` | 64-bit JIT handlers |
| **P3** | `prefix.rs` | REX prefix integration |
| **P3** | `state_flags.rs` | 64-bit state flags |

---

## Testing infrastructure

### Existing tests
- `tests/nasm/`: Assembly microtests
- `tests/api/`: API tests
- `tests/full/`: Full boot tests

### Needed for 64-bit
- 64-bit assembly microtests (REX, RIP-relative, etc.)
- Long mode entry tests
- 4-level paging tests
- SYSCALL/SYSRET tests
- 64-bit Linux boot test
